/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import { ElementCall, ConnectionState, CallEvent } from "../models/Call";
import { useConnectionState } from "./useCall";
import { usePTTKeybind } from "./usePTTKeybind";
import { useVoiceChannelMode } from "./useVoiceChannelMode";

interface UsePTTResult {
    /** Whether the local user's mic is currently open (PTT active or live-audio unmuted). */
    isSpeaking: boolean;
    /** Unmute the mic while held (PTT mode only). No-op in live mode. */
    startSpeaking: () => void;
    /** Mute the mic on release (PTT mode only). No-op in live mode. */
    stopSpeaking: () => void;
    /** Toggle the mic on/off persistently. Works in both PTT and live modes. */
    toggleMute: () => void;
    /** True when another participant is speaking (floor occupied) — PTT is blocked. */
    isFloorOccupied: boolean;
    /** Current voice mode ('ptt' | 'live'). */
    voiceMode: ReturnType<typeof useVoiceChannelMode>[0];
    /** Update the voice mode (and immediately apply the mic state). */
    setVoiceMode: ReturnType<typeof useVoiceChannelMode>[1];
}

/**
 * Core hook for Push-to-Talk and Live Audio mode logic.
 *
 * Manages the local user's microphone state in the current room's voice channel:
 * - In PTT mode: mic is muted by default; hold the PTT key (or button) to speak.
 * - In Live Audio mode: mic is always unmuted by default; use toggleMute to mute.
 *
 * A second optional keybind (muteToggleKeybind) persistently toggles the mic
 * regardless of the current mode — useful as a keyboard mute button.
 *
 * @param call - The ElementCall for the current room, or null if not in a call.
 */
export function usePTT(call: ElementCall | null): UsePTTResult {
    const connectionState = useConnectionState(call);
    const isConnected = connectionState === ConnectionState.Connected;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isFloorOccupied, setIsFloorOccupied] = useState(false);
    const [voiceMode, setVoiceModeState] = useVoiceChannelMode();
    const { keybind } = usePTTKeybind();

    // Keep refs to avoid stale closures in event handlers.
    const callRef = useRef(call);
    callRef.current = call;
    const isSpeakingRef = useRef(isSpeaking);
    isSpeakingRef.current = isSpeaking;
    const voiceModeRef = useRef(voiceMode);
    voiceModeRef.current = voiceMode;

    // Serialize widget mute actions to prevent concurrent sends racing each other.
    const muteQueueRef = useRef<Promise<void>>(Promise.resolve());

    // ---------------------------------------------------------------------------
    // Mic control helpers
    // ---------------------------------------------------------------------------

    /** Queue a mute/unmute so widget actions never run concurrently. */
    const queueSetAudio = useCallback((enabled: boolean): void => {
        muteQueueRef.current = muteQueueRef.current.then(async () => {
            const c = callRef.current;
            if (!c) return;
            try {
                await c.setAudioEnabled(enabled);
            } catch (e) {
                logger.error(`PTT: failed to ${enabled ? "unmute" : "mute"} microphone`, e);
                // Revert optimistic UI state on failure.
                setIsSpeaking(enabled ? false : isSpeakingRef.current);
            }
        });
    }, []);

    /** Unmute mic while held (PTT mode only). */
    const startSpeaking = useCallback((): void => {
        if (!callRef.current || !isConnected) return;
        if (voiceModeRef.current !== "ptt") return;
        if (isFloorOccupied) return;
        setIsSpeaking(true);
        queueSetAudio(true);
    }, [isConnected, isFloorOccupied, queueSetAudio]);

    /** Mute mic on release (PTT mode only). */
    const stopSpeaking = useCallback((): void => {
        if (!callRef.current || !isConnected) return;
        if (!isSpeakingRef.current) return;
        setIsSpeaking(false);
        queueSetAudio(false);
    }, [isConnected, queueSetAudio]);

    /** Toggle mic on/off persistently — works in both PTT and live modes. */
    const toggleMute = useCallback((): void => {
        if (!callRef.current || !isConnected) return;
        const next = !isSpeakingRef.current;
        setIsSpeaking(next);
        queueSetAudio(next);
    }, [isConnected, queueSetAudio]);

    // ---------------------------------------------------------------------------
    // Apply mic state whenever mode or connection state changes
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!call || !isConnected) return;

        if (voiceMode === "live") {
            // Live mode: start unmuted. Don't force-unmute if already in a toggleMute-muted state —
            // only apply on initial connection or mode switch (isSpeakingRef tracks current state).
            setIsSpeaking(true);
            queueSetAudio(true);
        } else {
            // PTT mode: mute on entry, but don't interrupt an active transmission.
            if (!isSpeakingRef.current) {
                queueSetAudio(false);
            }
        }
    }, [call, isConnected, voiceMode, queueSetAudio]);

    // ---------------------------------------------------------------------------
    // Keyboard shortcut — web (tab-focused only)
    // PTT mode: hold to talk. Live mode: toggle mute.
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!isConnected) return;
        if (window.electron) return;
        if (!keybind) return;

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.code !== keybind || e.repeat) return;
            e.preventDefault();
            if (voiceModeRef.current === "ptt") {
                startSpeaking();
            } else {
                toggleMute();
            }
        };
        const onKeyUp = (e: KeyboardEvent): void => {
            if (e.code !== keybind) return;
            if (voiceModeRef.current === "ptt") {
                stopSpeaking();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [isConnected, keybind, startSpeaking, stopSpeaking, toggleMute]);

    // ---------------------------------------------------------------------------
    // Electron IPC — global shortcut events from main process
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!isConnected) return;
        if (!window.electron) return;

        // Handle both PTT (hold) and live (toggle) modes.
        // voiceModeRef.current is read at event time to avoid stale closures.
        const onPTTDown = (): void => {
            if (voiceModeRef.current === "ptt") {
                startSpeaking();
            } else {
                toggleMute();
            }
        };
        const onPTTUp = (): void => {
            if (voiceModeRef.current === "ptt") stopSpeaking();
        };

        window.electron.on("ptt-keydown", onPTTDown);
        window.electron.on("ptt-keyup", onPTTUp);
        // Also register with evdev/uiohook/globalShortcut backends.
        window.electron.send("ptt-register", keybind);

        return () => {
            window.electron!.off("ptt-keydown", onPTTDown);
            window.electron!.off("ptt-keyup", onPTTUp);
            window.electron!.send("ptt-unregister", keybind);
        };
    }, [isConnected, keybind, startSpeaking, stopSpeaking, toggleMute]);

    // Clean up global shortcut when call disconnects
    useEffect(() => {
        if (isConnected || !window.electron) return;
        window.electron.send("ptt-unregister", keybind);
    }, [isConnected, keybind]);

    // ---------------------------------------------------------------------------
    // Floor control
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!call) {
            setIsFloorOccupied(false);
            return;
        }

        const onParticipants = (): void => {
            setIsFloorOccupied(false);
        };

        call.on(CallEvent.Participants, onParticipants);
        return () => void call.off(CallEvent.Participants, onParticipants);
    }, [call]);

    // ---------------------------------------------------------------------------
    // setVoiceMode
    // ---------------------------------------------------------------------------

    const setVoiceMode = useCallback(
        (mode: typeof voiceMode) => {
            setVoiceModeState(mode);
        },
        [setVoiceModeState],
    );

    return { isSpeaking, startSpeaking, stopSpeaking, toggleMute, isFloorOccupied, voiceMode, setVoiceMode };
}
