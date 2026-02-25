/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useCallback, useState } from "react";
import classNames from "classnames";
import { Text, IconButton, Tooltip } from "@vector-im/compound-web";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";
import ChevronUpIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-up";
import MicIcon from "@vector-im/compound-design-tokens/assets/web/icons/mic-on-solid";
import MicOffIcon from "@vector-im/compound-design-tokens/assets/web/icons/mic-off-solid";
import LeaveIcon from "@vector-im/compound-design-tokens/assets/web/icons/leave";
import type { Room } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../languageHandler";
import { ElementCall, ConnectionState } from "../../../models/Call";
import { useCall, useConnectionState, useParticipatingMembers } from "../../../hooks/useCall";
import { usePTT } from "../../../hooks/usePTT";
import { PTTButton, type PTTButtonState } from "./PTTButton";
import { VoiceAudioModeToggle } from "./VoiceAudioModeToggle";
import FacePile from "../elements/FacePile";
import { usePTTKeybind } from "../../../hooks/usePTTKeybind";

interface VoiceChannelPanelProps {
    room: Room;
}

/**
 * Collapsible voice channel panel rendered above the message composer.
 *
 * Shows: participants, speaking indicator, PTT button (PTT mode) or mute toggle
 * (Live Audio mode), and a mode toggle.
 */
export function VoiceChannelPanel({ room }: VoiceChannelPanelProps): JSX.Element | null {
    const call = useCall(room.roomId);
    const elementCall = call instanceof ElementCall ? call : null;
    const connectionState = useConnectionState(call);
    const isConnected = connectionState === ConnectionState.Connected;

    const { isSpeaking, startSpeaking, stopSpeaking, isFloorOccupied, voiceMode, setVoiceMode } =
        usePTT(elementCall);

    const participants = useParticipatingMembers(call ?? ({ participants: new Map() } as unknown as ElementCall));
    const { keybind } = usePTTKeybind();

    const [collapsed, setCollapsed] = useState(false);

    const handleLeave = useCallback(async () => {
        try {
            await call?.disconnect();
        } catch {
            /* call already disconnected */
        }
    }, [call]);

    const handleMuteToggle = useCallback(async () => {
        // Live Audio mode: toggle mic on/off
        if (isSpeaking) {
            await stopSpeaking();
        } else {
            await startSpeaking();
        }
    }, [isSpeaking, startSpeaking, stopSpeaking]);

    // Nothing to render when not connected to a call
    if (!isConnected) return null;

    const pttState: PTTButtonState = !isConnected
        ? "inactive"
        : isSpeaking
          ? "speaking"
          : isFloorOccupied
            ? "blocked"
            : "ready";

    const panelClass = classNames("mx_VoiceChannelPanel", {
        mx_VoiceChannelPanel_collapsed: collapsed,
    });

    return (
        <div className={panelClass} data-testid="voice-channel-panel">
            {/* Header row */}
            <div className="mx_VoiceChannelPanel_header">
                <Text as="span" size="sm" weight="semibold" className="mx_VoiceChannelPanel_title">
                    {_t("voip|voice_channel")}
                </Text>
                <div className="mx_VoiceChannelPanel_participants">
                    <FacePile members={participants} size="20px" overflow={false} />
                    <Text as="span" size="xs">
                        {participants.length}
                    </Text>
                </div>
                <div className="mx_VoiceChannelPanel_controls">
                    <VoiceAudioModeToggle mode={voiceMode} onChange={setVoiceMode} />
                    <Tooltip label={_t("action|leave")}>
                        <IconButton onClick={handleLeave} aria-label={_t("action|leave")} size="sm">
                            <LeaveIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip label={collapsed ? _t("action|expand") : _t("action|collapse")}>
                        <IconButton
                            onClick={() => setCollapsed((c) => !c)}
                            aria-label={collapsed ? _t("action|expand") : _t("action|collapse")}
                            size="sm"
                        >
                            {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            {/* Body — hidden when collapsed */}
            {!collapsed && (
                <div className="mx_VoiceChannelPanel_body">
                    {voiceMode === "ptt" ? (
                        <PTTButton
                            state={pttState}
                            keybindLabel={keybind}
                            onPTTStart={() => void startSpeaking()}
                            onPTTEnd={() => void stopSpeaking()}
                        />
                    ) : (
                        /* Live Audio mode: show a regular mute/unmute toggle */
                        <Tooltip label={isSpeaking ? _t("voip|disable_microphone") : _t("voip|enable_microphone")}>
                            <IconButton
                                onClick={handleMuteToggle}
                                aria-label={isSpeaking ? _t("voip|disable_microphone") : _t("voip|enable_microphone")}
                                aria-pressed={isSpeaking}
                                className={classNames("mx_VoiceChannelPanel_muteButton", {
                                    mx_VoiceChannelPanel_muteButton_muted: !isSpeaking,
                                })}
                            >
                                {isSpeaking ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
}
