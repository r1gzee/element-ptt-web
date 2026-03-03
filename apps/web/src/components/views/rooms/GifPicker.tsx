/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect, useRef, useState } from "react";

import SdkConfig from "../../../SdkConfig";

interface GiphyImage {
    url: string;
    width: string;
    height: string;
}

export interface GiphyGif {
    id: string;
    title: string;
    images: {
        fixed_height_small: GiphyImage;
        original: GiphyImage;
    };
}

interface IGifPickerProps {
    onChoose: (gif: GiphyGif) => void;
    onFinished: () => void;
}

const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";

export function GifPicker({ onChoose, onFinished }: IGifPickerProps): JSX.Element {
    const apiKey = SdkConfig.get().giphy_api_key;
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!apiKey) return;
        fetchGifs("");
    }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

    function fetchGifs(searchQuery: string): void {
        if (!apiKey) return;
        setLoading(true);

        const endpoint = searchQuery
            ? `${GIPHY_API_BASE}/search?api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
            : `${GIPHY_API_BASE}/trending?api_key=${apiKey}&limit=20&rating=g`;

        fetch(endpoint)
            .then((res) => res.json())
            .then((json) => {
                setResults(json.data ?? []);
            })
            .catch(() => {
                setResults([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }

    function onQueryChange(ev: React.ChangeEvent<HTMLInputElement>): void {
        const value = ev.target.value;
        setQuery(value);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchGifs(value);
        }, 300);
    }

    function onGifClick(gif: GiphyGif): void {
        onChoose(gif);
        onFinished();
    }

    if (!apiKey) {
        return (
            <div className="mx_GifPicker">
                <div className="mx_GifPicker_nokey">No Giphy API key configured. Add giphy_api_key to config.json.</div>
            </div>
        );
    }

    return (
        <div className="mx_GifPicker">
            <input
                className="mx_GifPicker_search"
                type="text"
                placeholder="Search GIFs..."
                value={query}
                onChange={onQueryChange}
                autoFocus
            />
            {loading ? (
                <div className="mx_GifPicker_loading">Loading...</div>
            ) : (
                <div className="mx_GifPicker_grid">
                    {results.map((gif) => (
                        <div key={gif.id} className="mx_GifPicker_gif" onClick={() => onGifClick(gif)}>
                            <img src={gif.images.fixed_height_small.url} alt={gif.title} loading="lazy" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
