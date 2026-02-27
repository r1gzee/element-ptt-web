/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useLocalStorageState } from "./useLocalStorageState";

/**
 * Voice channel mode for the local user.
 * - 'ptt': Push-to-Talk / hold-to-speak (half-duplex walkie-talkie mode)
 * - 'live': Always-on microphone (full-duplex, standard call mode)
 */
export type VoiceMode = "ptt" | "live";

/**
 * Hook to get/set the user's preferred voice channel mode.
 * Persisted per-device in localStorage.
 */
export function useVoiceChannelMode(): [VoiceMode, (mode: VoiceMode) => void] {
    return useLocalStorageState<VoiceMode>("voice_channel_mode", "live");
}
