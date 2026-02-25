/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useCallback } from "react";
import classNames from "classnames";
import { Tooltip } from "@vector-im/compound-web";
import MicIcon from "@vector-im/compound-design-tokens/assets/web/icons/mic-on-solid";
import MicOffIcon from "@vector-im/compound-design-tokens/assets/web/icons/mic-off-solid";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";

export type PTTButtonState = "inactive" | "ready" | "speaking" | "blocked";

interface PTTButtonProps {
    /** Current visual/interaction state of the button. */
    state: PTTButtonState;
    /** Display label for the configured PTT key (e.g. "Space", "AltLeft"). */
    keybindLabel: string;
    /** Called when the user presses the button (mousedown / touchstart). */
    onPTTStart: () => void;
    /** Called when the user releases the button (mouseup / touchend). */
    onPTTEnd: () => void;
}

/**
 * Large hold-to-speak PTT button.
 *
 * Visual states:
 * - **inactive** (grey)   — not in a voice channel
 * - **ready** (green pulse) — in voice channel, floor is free
 * - **speaking** (red/active) — local user is holding the floor
 * - **blocked** (dim)     — another participant is speaking
 */
export function PTTButton({ state, keybindLabel, onPTTStart, onPTTEnd }: PTTButtonProps): JSX.Element {
    const className = classNames("mx_PTTButton", {
        mx_PTTButton_inactive: state === "inactive",
        mx_PTTButton_ready: state === "ready",
        mx_PTTButton_speaking: state === "speaking",
        mx_PTTButton_blocked: state === "blocked",
    });

    const tooltip =
        state === "blocked"
            ? _t("voip|ptt|floor_occupied")
            : state === "speaking"
              ? _t("voip|ptt|release_to_stop")
              : _t("voip|ptt|hold_to_speak", { key: keybindLabel });

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (state !== "blocked" && state !== "inactive") onPTTStart();
        },
        [state, onPTTStart],
    );

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            onPTTEnd();
        },
        [onPTTEnd],
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            if (state !== "blocked" && state !== "inactive") onPTTStart();
        },
        [state, onPTTStart],
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            onPTTEnd();
        },
        [onPTTEnd],
    );

    return (
        <Tooltip label={tooltip}>
            <AccessibleButton
                className={className}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                disabled={state === "blocked" || state === "inactive"}
                aria-label={tooltip}
                aria-pressed={state === "speaking"}
            >
                {state === "speaking" ? <MicIcon /> : <MicOffIcon />}
                <span className="mx_PTTButton_label">
                    {state === "speaking" ? _t("voip|ptt|speaking") : _t("voip|ptt|push_to_talk")}
                </span>
            </AccessibleButton>
        </Tooltip>
    );
}
