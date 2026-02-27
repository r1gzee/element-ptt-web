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
import { type VoiceMode } from "../../../hooks/useVoiceChannelMode";
import FacePile from "../elements/FacePile";

interface VoiceChannelPanelProps {
    room: Room;
}

function getMicTooltip(voiceMode: VoiceMode, isSpeaking: boolean, isFloorOccupied: boolean): string {
    if (voiceMode !== "ptt") {
        return isSpeaking ? _t("voip|disable_microphone") : _t("voip|enable_microphone");
    }
    if (isSpeaking) return _t("voip|disable_microphone");
    if (isFloorOccupied) return _t("voip|ptt|floor_occupied");
    return _t("voip|ptt|push_to_talk");
}

interface MicButtonProps {
    voiceMode: VoiceMode;
    isSpeaking: boolean;
    isFloorOccupied: boolean;
    onPTTStart: () => void;
    onPTTEnd: () => void;
    onToggleMute: () => void;
}

function MicButton({ voiceMode, isSpeaking, isFloorOccupied, onPTTStart, onPTTEnd, onToggleMute }: MicButtonProps): JSX.Element {
    const tooltip = getMicTooltip(voiceMode, isSpeaking, isFloorOccupied);
    const isBlocked = voiceMode === "ptt" && isFloorOccupied && !isSpeaking;

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            onPTTStart();
        },
        [onPTTStart],
    );

    return (
        <Tooltip label={tooltip}>
            <IconButton
                aria-label={tooltip}
                aria-pressed={isSpeaking}
                size="lg"
                className={classNames("mx_VoiceChannelPanel_micButton", {
                    mx_VoiceChannelPanel_micButton_active: isSpeaking,
                    mx_VoiceChannelPanel_micButton_blocked: isBlocked,
                })}
                onPointerDown={voiceMode === "ptt" ? handlePointerDown : undefined}
                onPointerUp={voiceMode === "ptt" ? onPTTEnd : undefined}
                onClick={voiceMode !== "ptt" ? onToggleMute : undefined}
            >
                {isSpeaking ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
        </Tooltip>
    );
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

    const { isSpeaking, startSpeaking, stopSpeaking, toggleMute, isFloorOccupied, voiceMode } =
        usePTT(elementCall);

    const participants = useParticipatingMembers(call as Call);
    const [collapsed, setCollapsed] = useState(false);

    const handleLeave = useCallback(async () => {
        await call?.disconnect().catch(() => {
            /* call already disconnected */
        });
    }, [call]);

    const toggleCollapsed = useCallback(() => setCollapsed((current) => !current), []);

    if (!isConnected) return null;

    const collapseLabel = collapsed ? _t("action|expand") : _t("action|collapse");
    const panelClass = classNames("mx_VoiceChannelPanel", {
        mx_VoiceChannelPanel_collapsed: collapsed,
    });

    return (
        <div className={panelClass} data-testid="voice-channel-panel">
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
                    <MicButton
                        voiceMode={voiceMode}
                        isSpeaking={isSpeaking}
                        isFloorOccupied={isFloorOccupied}
                        onPTTStart={startSpeaking}
                        onPTTEnd={stopSpeaking}
                        onToggleMute={toggleMute}
                    />
                    <Tooltip label={_t("action|leave")}>
                        <IconButton onClick={handleLeave} aria-label={_t("action|leave")} size="sm">
                            <LeaveIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip label={collapseLabel}>
                        <IconButton onClick={toggleCollapsed} aria-label={collapseLabel} size="sm">
                            {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

        </div>
    );
}
