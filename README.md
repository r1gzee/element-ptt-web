# Nexus Web

Nexus Web is a fork of [Element Web](https://github.com/element-hq/element-web) — a Matrix web client — with a built-in **Push-to-Talk (PTT)** voice channel system layered on top of Element Call (WebRTC).

This webapp is used by [Nexus Desktop](https://github.com/r1gzee/element-ptt-desktop), the Electron wrapper that provides global PTT key capture on Wayland and other platforms.

---

## PTT features

- **Hold-to-talk button** in a collapsible panel above the message composer, shown when connected to a voice channel
- **PTT / Live Audio toggle** — switch between walkie-talkie mode and always-on live audio
- **Configurable keybind** — set your PTT key in Settings → Voice & Video
- **Electron IPC integration** — registers a global key listener in the desktop app via `ptt-register`; receives `ptt-keydown`/`ptt-keyup` events from the main process
- **Wayland-compatible** — key capture is handled by the Electron main process (evdev backend), so PTT works even when the window is not focused

### PTT data flow

```
VoiceChannelPanel (UI)
  └── usePTT(call)
        ├── useVoiceChannelMode()        — 'ptt' | 'live', persisted to localStorage
        ├── usePTTKeybind()              — stored keybind (mx_ptt_keybind)
        └── ElementCall.setAudioEnabled(bool)   — sends DeviceMute widget action
```

---

## Nexus branding

- Brand name: **Nexus**
- Accent color: orange (`#ff7f35`) replacing Element's green — applied via `apps/web/res/themes/dark/css/_nexus.pcss`
- Font: Lato

---

## Development

### Prerequisites

- Node 22+
- pnpm 10+

### Install

```bash
pnpm install
```

### Dev server

```bash
pnpm --filter element-web start
# App available at http://localhost:8080
```

### Production build

```bash
pnpm --filter element-web build
# Output: apps/web/webapp/
```

### Type-check only

```bash
cd apps/web && pnpm exec tsc --noEmit
```

### Tests

```bash
cd apps/web && pnpm test
```

---

## Monorepo structure

```
apps/web/src/           — main app source
apps/web/res/css/       — PostCSS styles (.pcss)
apps/web/res/themes/    — theme overrides (Nexus orange)
apps/web/config.json    — runtime config (brand, feature flags)
```

Key PTT files:

| File | Role |
|------|------|
| `apps/web/src/hooks/usePTT.ts` | Core mic state machine |
| `apps/web/src/hooks/usePTTKeybind.ts` | Stores keybind; sends `ptt-register` IPC |
| `apps/web/src/hooks/useVoiceChannelMode.ts` | PTT / live mode toggle |
| `apps/web/src/components/views/rooms/VoiceChannelPanel.tsx` | Panel above composer |
| `apps/web/src/components/views/rooms/PTTButton.tsx` | Hold-to-speak button |
| `apps/web/src/models/Call.ts` | `ElementCall.setAudioEnabled()` |

---

## Copyright & License

Nexus Web is a fork of Element Web.

Copyright (c) 2014-2017 OpenMarket Ltd
Copyright (c) 2017 Vector Creations Ltd
Copyright (c) 2017-2025 New Vector Ltd

This software is multi-licensed under AGPL-3.0, GPL-3.0, or a commercial Element license. See [LICENSE files](LICENSE) for details.
