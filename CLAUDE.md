# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A fork of Element Web rebranded as **Nexus**, with a built-in PTT (Push-to-Talk) voice channel system layered on top of Element Call. The brand color is orange (`#ff7f35`) instead of Element's green.

## Monorepo structure

This is a pnpm monorepo. The actual app lives in `apps/web/`. Always run commands from the repo root using `--filter`, or `cd apps/web` first.

```
apps/web/src/          — main app source
apps/web/res/css/      — PostCSS styles (pcss)
apps/web/res/themes/   — theme overrides
apps/web/config.json   — runtime config (brand, feature flags)
```

## Commands

```bash
# Install
pnpm install

# Dev server (http://localhost:8080)
pnpm --filter element-web start
# or: cd apps/web && pnpm start

# Type-check only (no emit)
cd apps/web && pnpm exec tsc --noEmit

# Production build (output: apps/web/webapp/)
pnpm --filter element-web build

# Tests
cd apps/web && pnpm test                    # all tests
cd apps/web && pnpm test -- --testPathPattern=usePTT   # single file
```

## PTT architecture

The PTT feature adds walkie-talkie / push-to-talk on top of Element Call (WebRTC via widget).

### Data flow

```
VoiceChannelPanel (UI)
  └── usePTT(call)                    — mic state machine
        ├── useVoiceChannelMode()     — 'ptt' | 'live', persisted to localStorage
        ├── usePTTKeybind()           — stored keybind (localStorage mx_ptt_keybind)
        └── ElementCall.setAudioEnabled(bool)   — sends DeviceMute widget action
```

**Key files:**

| File | Role |
|------|------|
| `apps/web/src/hooks/usePTT.ts` | Core mic state machine; listens for `ptt-keydown`/`ptt-keyup` IPC when running in Electron |
| `apps/web/src/hooks/usePTTKeybind.ts` | Stores/updates the PTT keybind; sends `ptt-register` IPC to main process |
| `apps/web/src/hooks/useVoiceChannelMode.ts` | `'ptt'` or `'live'` mode, persisted as `mx_voice_channel_mode` |
| `apps/web/src/components/views/rooms/VoiceChannelPanel.tsx` | Collapsible panel above composer; holds `PTTButton` and mode toggle |
| `apps/web/src/components/views/rooms/PTTButton.tsx` | Hold-to-speak button; shows floor-occupied state |
| `apps/web/src/models/Call.ts` | `ElementCall.setAudioEnabled(bool)` — mutes/unmutes via `ElementWidgetActions.DeviceMute` |

### Electron IPC channels (defined in `apps/web/src/@types/global.d.ts`)

- `ptt-register` (renderer→main): activate global key listener with the given DOM code
- `ptt-keydown` / `ptt-keyup` (main→renderer): fire when the registered key is pressed/released globally

### localStorage keys (all prefixed `mx_` automatically by `useLocalStorageState`)

- `mx_ptt_keybind` — DOM code string (e.g. `"Space"`, `"Backquote"`)
- `mx_voice_channel_mode` — `"ptt"` or `"live"`

## Nexus branding

- `apps/web/config.json` — `"brand": "Nexus"`, `"feature_group_calls": true`
- `apps/web/res/themes/dark/css/_nexus.pcss` — remaps every Compound `--cpd-color-green-*` token to orange; imported last so it wins via cascade
- Font: `@fontsource/lato` imported in the theme entry point

## Code style

- **Single-purpose functions**: each function does one thing. Split before it grows.
- **No deep nesting**: flatten with early returns and extracted helpers instead of nested `if`/callbacks.
- **Explicit over clever**: choose the readable solution, not the concise one.
- **Name for intent**: `isFloorOccupied`, `startSpeaking` — not `flag`, `fn`, `data`.
- **Flag functions over ~20 lines**: call it out before writing more; break it up first.
- **No workaround stacking**: when something doesn't work, break the problem down and fix the root cause. Don't patch over errors with try/catch or conditionals that hide the real issue.

## CSS conventions

Styles live in `apps/web/res/css/`. Component styles use the `_ComponentName.pcss` naming convention. The Nexus color overrides must stay in `_nexus.pcss` and be imported **after** the Compound token definitions.
