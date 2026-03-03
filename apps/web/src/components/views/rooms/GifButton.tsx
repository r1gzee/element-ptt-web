/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import classNames from "classnames";
import React, { type JSX, useContext } from "react";

import ContextMenu, { aboveLeftOf, type MenuProps, useContextMenu } from "../../structures/ContextMenu";
import { CollapsibleButton } from "./CollapsibleButton";
import { OverflowMenuContext } from "./MessageComposerButtons";
import { GifPicker, type GiphyGif } from "./GifPicker";

interface IGifButtonProps {
    onInsertGif: (gif: GiphyGif) => void;
    menuPosition?: MenuProps;
    className?: string;
}

export function GifButton({ onInsertGif, menuPosition, className }: IGifButtonProps): JSX.Element {
    const overflowMenuCloser = useContext(OverflowMenuContext);
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    let contextMenu: React.ReactElement | null = null;
    if (menuDisplayed && button.current) {
        const position = menuPosition ?? aboveLeftOf(button.current.getBoundingClientRect());
        const onFinished = (): void => {
            closeMenu();
            overflowMenuCloser?.();
        };

        contextMenu = (
            <ContextMenu {...position} onFinished={onFinished} managed={false} focusLock>
                <GifPicker
                    onChoose={(gif) => {
                        onInsertGif(gif);
                    }}
                    onFinished={onFinished}
                />
            </ContextMenu>
        );
    }

    const computedClassName = classNames("mx_GifButton", className, {
        mx_GifButton_highlight: menuDisplayed,
    });

    return (
        <>
            <CollapsibleButton className={computedClassName} onClick={openMenu} title="GIF" inputRef={button}>
                <span className="mx_GifButton_label">GIF</span>
            </CollapsibleButton>

            {contextMenu}
        </>
    );
}
