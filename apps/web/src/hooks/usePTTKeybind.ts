/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useState, useEffect, useCallback } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

export const DEFAULT_PTT_KEYBIND = "Space";

/**
 * Hook that manages the user-configured PTT key binding.
 *
 * Returns:
 * - keybind: current KeyboardEvent.code value (e.g. "Space", "AltLeft", "KeyV")
 * - setKeybind: update and persist the binding
 * - isCapturing: true while waiting for the user to press the next key
 * - startCapture: enter capture mode (next key press becomes the new binding)
 * - cancelCapture: abort capture mode without changing the binding
 */
export function usePTTKeybind(): {
    keybind: string;
    setKeybind: (key: string) => void;
    isCapturing: boolean;
    startCapture: () => void;
    cancelCapture: () => void;
} {
    const [keybind, setKeybind] = useLocalStorageState<string>("ptt_keybind", DEFAULT_PTT_KEYBIND);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCapture = useCallback(() => setIsCapturing(true), []);
    const cancelCapture = useCallback(() => setIsCapturing(false), []);

    useEffect(() => {
        if (!isCapturing) return;

        const onKeyDown = (e: KeyboardEvent): void => {
            e.preventDefault();
            e.stopPropagation();
            // Ignore pure modifier keys — require a primary key
            if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
            setKeybind(e.code);
            setIsCapturing(false);

            // If running in Electron, inform the main process about the new binding
            if (window.electron) {
                window.electron.send("ptt-register", e.code);
            }
        };

        window.addEventListener("keydown", onKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
    }, [isCapturing, setKeybind]);

    return { keybind, setKeybind, isCapturing, startCapture, cancelCapture };
}
