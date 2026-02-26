/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type Dispatch, useCallback, useEffect, useState } from "react";

const getValue = <T>(key: string, initialValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
    } catch {
        return initialValue;
    }
};

/** Custom event name used to synchronise useLocalStorageState instances within the same page. */
const MX_STORAGE_EVENT = "mx_local_storage_changed";

// Hook behaving like useState but persisting the value to localStorage. Returns same as useState
export const useLocalStorageState = <T>(key: string, initialValue: T): [T, Dispatch<T>] => {
    const lsKey = "mx_" + key;

    const [value, setValue] = useState<T>(getValue(lsKey, initialValue));

    useEffect(() => {
        setValue(getValue(lsKey, initialValue));
    }, [lsKey, initialValue]);

    // Keep all instances on the same page in sync when any instance writes.
    useEffect(() => {
        const handler = (e: Event): void => {
            const ce = e as CustomEvent<{ key: string; value: unknown }>;
            if (ce.detail.key === lsKey) setValue(ce.detail.value as T);
        };
        window.addEventListener(MX_STORAGE_EVENT, handler);
        return () => window.removeEventListener(MX_STORAGE_EVENT, handler);
    }, [lsKey]);

    const _setValue: Dispatch<T> = useCallback(
        (v: T) => {
            window.localStorage.setItem(lsKey, JSON.stringify(v));
            setValue(v);
            // Notify sibling hook instances on the same page.
            window.dispatchEvent(new CustomEvent(MX_STORAGE_EVENT, { detail: { key: lsKey, value: v } }));
        },
        [lsKey],
    );

    return [value, _setValue];
};
