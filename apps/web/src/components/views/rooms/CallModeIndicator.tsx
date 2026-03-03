/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import type { Room } from "matrix-js-sdk/src/matrix";

import { useCall, useConnectionState } from "../../../hooks/useCall";
import { ConnectionState } from "../../../models/Call";
import { usePTT } from "../../../hooks/usePTT";
import { useVoiceChannelMode } from "../../../hooks/useVoiceChannelMode";
import { ElementCall } from "../../../models/Call";

interface Props {
    room: Room;
}

export function CallModeIndicator({ room }: Props): React.JSX.Element | null {
    const call = useCall(room.roomId);
    const connectionState = useConnectionState(call);
    usePTT(call instanceof ElementCall ? call : null);
    const [voiceMode, setVoiceMode] = useVoiceChannelMode();

    if (!call || connectionState !== ConnectionState.Connected) return null;

    return (
        <div className="mx_CallModeIndicator">
            <button className={voiceMode === "ptt" ? "active" : ""} onClick={() => setVoiceMode("ptt")}>
                PTT
            </button>
            <button className={voiceMode === "live" ? "active" : ""} onClick={() => setVoiceMode("live")}>
                Live Audio
            </button>
        </div>
    );
}
