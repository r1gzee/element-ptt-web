/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useState, useEffect, useCallback } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

export const DEFAULT_PTT_KEYBIND = "Space";

/**
 * Hook that manages the user-configured PTT key binding and optional mute-toggle key binding.
 *
 * Returns:
 * - keybind: current PTT KeyboardEvent.code (e.g. "Space", "AltLeft", "KeyV")
 * - setKeybind: update and persist the PTT binding
 * - muteToggleKeybind: key that toggles mic on/off persistently (empty string = disabled)
 * - setMuteToggleKeybind: update and persist the mute toggle binding
 * - isCapturing / isMuteCapturing: capture-mode flags for each binding
 * - startCapture / startMuteCapture: enter capture mode
 * - cancelCapture / cancelMuteCapture: abort capture mode
 */
export function usePTTKeybind(): {
    keybind: string;
    setKeybind: (key: string) => void;
    muteToggleKeybind: string;
    setMuteToggleKeybind: (key: string) => void;
    isCapturing: boolean;
    isMuteCapturing: boolean;
    startCapture: () => void;
    cancelCapture: () => void;
    startMuteCapture: () => void;
    cancelMuteCapture: () => void;
} {
    const [keybind, setKeybind] = useLocalStorageState<string>("ptt_keybind", DEFAULT_PTT_KEYBIND);
    const [muteToggleKeybind, setMuteToggleKeybind] = useLocalStorageState<string>("ptt_mute_toggle_keybind", "");
    const [isCapturing, setIsCapturing] = useState(false);
    const [isMuteCapturing, setIsMuteCapturing] = useState(false);

    const startCapture = useCallback(() => setIsCapturing(true), []);
    const cancelCapture = useCallback(() => setIsCapturing(false), []);
    const startMuteCapture = useCallback(() => setIsMuteCapturing(true), []);
    const cancelMuteCapture = useCallback(() => setIsMuteCapturing(false), []);

    // Capture PTT key
    useEffect(() => {
        if (!isCapturing) return;

        const onKeyDown = (e: KeyboardEvent): void => {
            e.preventDefault();
            e.stopPropagation();
            if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
            setKeybind(e.code);
            setIsCapturing(false);
            if (window.electron) window.electron.send("ptt-register", e.code);
        };

        window.addEventListener("keydown", onKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
    }, [isCapturing, setKeybind]);

    // Capture mute-toggle key
    useEffect(() => {
        if (!isMuteCapturing) return;

        const onKeyDown = (e: KeyboardEvent): void => {
            e.preventDefault();
            e.stopPropagation();
            if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
            // Escape = clear the binding
            setMuteToggleKeybind(e.code === "Escape" ? "" : e.code);
            setIsMuteCapturing(false);
        };

        window.addEventListener("keydown", onKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
    }, [isMuteCapturing, setMuteToggleKeybind]);

    return {
        keybind,
        setKeybind,
        muteToggleKeybind,
        setMuteToggleKeybind,
        isCapturing,
        isMuteCapturing,
        startCapture,
        cancelCapture,
        startMuteCapture,
        cancelMuteCapture,
    };
}
