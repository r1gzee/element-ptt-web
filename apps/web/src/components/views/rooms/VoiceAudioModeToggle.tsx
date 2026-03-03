/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useId } from "react";
import { ToggleInput, Text } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import { type VoiceMode } from "../../../hooks/useVoiceChannelMode";

interface VoiceAudioModeToggleProps {
    /** Current mode for this user. */
    mode: VoiceMode;
    /** Called when the user clicks the toggle. */
    onChange: (mode: VoiceMode) => void;
}

/**
 * Toggle switch that lets the user switch between PTT (walkie-talkie) mode
 * and Live Audio (always-on mic / full-duplex) mode.
 *
 * The chosen mode is per-user, not per-room.
 */
export function VoiceAudioModeToggle({ mode, onChange }: VoiceAudioModeToggleProps): JSX.Element {
    const id = useId();
    return (
        <div className="mx_VoiceAudioModeToggle">
            <Text as="span" size="sm" className="mx_VoiceAudioModeToggle_label">
                {_t("voip|mode|push_to_talk")}
            </Text>
            <ToggleInput
                id={id}
                checked={mode === "live"}
                onChange={(e) => onChange(e.target.checked ? "live" : "ptt")}
                aria-label={_t("voip|mode|toggle_label")}
            />
            <Text as="span" size="sm" className="mx_VoiceAudioModeToggle_label">
                {_t("voip|mode|live_audio")}
            </Text>
        </div>
    );
}
