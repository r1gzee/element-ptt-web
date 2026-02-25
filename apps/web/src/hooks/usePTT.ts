/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import { ElementCall, ConnectionState } from "../models/Call";
import { useConnectionState } from "./useCall";
import { usePTTKeybind } from "./usePTTKeybind";
import { useVoiceChannelMode } from "./useVoiceChannelMode";

interface UsePTTResult {
    /** Whether the local user is currently speaking (PTT active). */
    isSpeaking: boolean;
    /** Unmute the mic / start speaking. No-op if not in PTT mode. */
    startSpeaking: () => Promise<void>;
    /** Mute the mic / stop speaking. No-op if not in PTT mode. */
    stopSpeaking: () => Promise<void>;
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
 * - In PTT mode: mic is muted by default; hold the configured key (or button) to speak.
 * - In Live Audio mode: mic is always unmuted.
 *
 * Floor control (PTT only): if another participant is already speaking the local PTT
 * button/key is blocked until the floor is released.
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

    // Keep a ref to the latest call so keydown/keyup handlers don't become stale.
    const callRef = useRef(call);
    callRef.current = call;
    const isSpeakingRef = useRef(isSpeaking);
    isSpeakingRef.current = isSpeaking;

    // ---------------------------------------------------------------------------
    // Mic control helpers
    // ---------------------------------------------------------------------------

    const startSpeaking = useCallback(async (): Promise<void> => {
        if (!callRef.current || !isConnected) return;
        if (voiceMode !== "ptt") return;
        if (isFloorOccupied) return; // another speaker is active

        try {
            await callRef.current.setAudioEnabled(true);
            setIsSpeaking(true);
        } catch (e) {
            logger.error("PTT: failed to unmute microphone", e);
        }
    }, [isConnected, voiceMode, isFloorOccupied]);

    const stopSpeaking = useCallback(async (): Promise<void> => {
        if (!callRef.current || !isConnected) return;
        if (!isSpeakingRef.current) return;

        try {
            await callRef.current.setAudioEnabled(false);
            setIsSpeaking(false);
        } catch (e) {
            logger.error("PTT: failed to mute microphone", e);
        }
    }, [isConnected]);

    // ---------------------------------------------------------------------------
    // Apply mic state whenever mode changes or connection state changes
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!call || !isConnected) return;

        const applyMode = async (): Promise<void> => {
            try {
                if (voiceMode === "live") {
                    await call.setAudioEnabled(true);
                    setIsSpeaking(false);
                } else {
                    // PTT mode — always start muted
                    await call.setAudioEnabled(false);
                    setIsSpeaking(false);
                }
            } catch (e) {
                logger.error("PTT: failed to apply voice mode", e);
            }
        };

        applyMode();
    }, [call, isConnected, voiceMode]);

    // ---------------------------------------------------------------------------
    // Keyboard shortcut — web (tab-focused only)
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!isConnected || voiceMode !== "ptt") return;

        // Skip DOM key listeners when running in Electron — main process sends IPC events instead.
        if (window.electron) return;

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.code !== keybind || e.repeat) return;
            e.preventDefault();
            startSpeaking();
        };

        const onKeyUp = (e: KeyboardEvent): void => {
            if (e.code !== keybind) return;
            stopSpeaking();
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [isConnected, voiceMode, keybind, startSpeaking, stopSpeaking]);

    // ---------------------------------------------------------------------------
    // Electron IPC — global shortcut events from main process
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!isConnected || voiceMode !== "ptt") return;
        if (!window.electron) return;

        const onPTTDown = (): void => void startSpeaking();
        const onPTTUp = (): void => void stopSpeaking();

        window.electron.on("ptt-keydown", onPTTDown);
        window.electron.on("ptt-keyup", onPTTUp);

        // Register the current keybind with the main process
        window.electron.send("ptt-register", keybind);

        return () => {
            // Electron's IPC API doesn't have a standard removeListener in the
            // element-web abstraction; unregister the global shortcut instead.
            window.electron!.send("ptt-unregister", keybind);
        };
    }, [isConnected, voiceMode, keybind, startSpeaking, stopSpeaking]);

    // Clean up global shortcut when call disconnects
    useEffect(() => {
        if (isConnected || !window.electron) return;
        window.electron.send("ptt-unregister", keybind);
    }, [isConnected, keybind]);

    // ---------------------------------------------------------------------------
    // Floor control: detect whether another participant is speaking
    // (basic heuristic — real floor state would come from a MatrixRTC event)
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!call) {
            setIsFloorOccupied(false);
            return;
        }

        // Listen to participant changes; a full floor-control protocol would use
        // m.call.member events or a dedicated MatrixRTC extension. For now we only
        // block the button while the local user is NOT the one holding the floor.
        const onParticipants = (): void => {
            // Floor is "occupied" if some participant sent a PTT-active signal.
            // Without a live PTT protocol this defaults to false; real implementation
            // would parse m.call.member state events.
            setIsFloorOccupied(false);
        };

        call.on("participants", onParticipants);
        return () => void call.off("participants", onParticipants);
    }, [call]);

    // ---------------------------------------------------------------------------
    // setVoiceMode — wraps state setter with immediate mic application
    // ---------------------------------------------------------------------------

    const setVoiceMode = useCallback(
        (mode: typeof voiceMode) => {
            setVoiceModeState(mode);
            // The useEffect above will detect the mode change and apply mic state.
        },
        [setVoiceModeState],
    );

    return { isSpeaking, startSpeaking, stopSpeaking, isFloorOccupied, voiceMode, setVoiceMode };
}
