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
import { type Call } from "../../../models/Call";
import { useCall, useConnectionState, useParticipatingMembers } from "../../../hooks/useCall";
import { usePTT } from "../../../hooks/usePTT";
import { VoiceAudioModeToggle } from "./VoiceAudioModeToggle";
import FacePile from "../elements/FacePile";

interface VoiceChannelPanelProps {
    room: Room;
}

/**
 * Collapsible voice channel panel rendered above the message composer.
 *
 * Shows: participants, mic button (PTT or mute toggle), leave, collapse.
 * In PTT mode the mic button is a hold-to-talk control; in Live Audio mode it
 * is a click-to-toggle mute control. Both are placed inline in the header row.
 */
export function VoiceChannelPanel({ room }: VoiceChannelPanelProps): JSX.Element | null {
    const call = useCall(room.roomId);
    const elementCall = call instanceof ElementCall ? call : null;
    const connectionState = useConnectionState(call);
    const isConnected = connectionState === ConnectionState.Connected;

    const { isSpeaking, startSpeaking, stopSpeaking, toggleMute, isFloorOccupied, voiceMode, setVoiceMode } =
        usePTT(elementCall);

    const participants = useParticipatingMembers(call as Call);

    const [collapsed, setCollapsed] = useState(false);

    const handleLeave = useCallback(async () => {
        try {
            await call?.disconnect();
        } catch {
            /* call already disconnected */
        }
    }, [call]);

    // Nothing to render when not connected to a call
    if (!isConnected) return null;

    // Mic button: PTT = hold-to-talk, Live = click toggle
    const micTooltip =
        voiceMode === "ptt"
            ? isSpeaking
                ? _t("voip|disable_microphone")
                : isFloorOccupied
                  ? _t("voip|ptt|floor_occupied")
                  : _t("voip|ptt|push_to_talk")
            : isSpeaking
              ? _t("voip|disable_microphone")
              : _t("voip|enable_microphone");

    const micButton = (
        <Tooltip label={micTooltip}>
            <IconButton
                aria-label={micTooltip}
                aria-pressed={isSpeaking}
                size="sm"
                className={classNames("mx_VoiceChannelPanel_micButton", {
                    mx_VoiceChannelPanel_micButton_active: isSpeaking,
                    mx_VoiceChannelPanel_micButton_blocked: voiceMode === "ptt" && isFloorOccupied && !isSpeaking,
                })}
                onPointerDown={
                    voiceMode === "ptt"
                        ? (e) => {
                              e.preventDefault();
                              startSpeaking();
                          }
                        : undefined
                }
                onPointerUp={voiceMode === "ptt" ? () => stopSpeaking() : undefined}
                onClick={voiceMode !== "ptt" ? toggleMute : undefined}
            >
                {isSpeaking ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
        </Tooltip>
    );

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
                    {micButton}
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

            {/* Body — mode toggle, hidden when collapsed */}
            {!collapsed && (
                <div className="mx_VoiceChannelPanel_body">
                    <VoiceAudioModeToggle mode={voiceMode} onChange={setVoiceMode} />
                </div>
            )}
        </div>
    );
}
