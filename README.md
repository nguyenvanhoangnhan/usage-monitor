# Usage Monitor

macOS desktop app that shows how much of your Claude and Codex (ChatGPT plan) quota is left, for the rolling 5-hour session window and the weekly window. Lives in a resizable window and in the menubar.

Design notes and the maintenance guide are kept outside the repository.

## How data is obtained

| Provider | Source | Notes |
|---|---|---|
| Claude | Claude Code statusline hook | Claude Code pipes `rate_limits` into the statusline command. The app installs a small `sh` script that saves that JSON to `~/.config/usage-monitor/claude-statusline.json`. No token or cookie is read. Updates only while Claude Code is running. |
| Codex | `~/.codex/auth.json` + `GET https://chatgpt.com/backend-api/wham/usage` | Uses the token the Codex CLI already keeps. The app never refreshes or writes tokens; on 401 it asks you to run `codex` again. |

## Development

```bash
pnpm install
pnpm dev            # start Electron with HMR
pnpm test           # vitest
pnpm typecheck
pnpm lint
pnpm build:mac      # dmg for arm64 and x64 in dist/
pnpm build:mac:arm64
```

## Installing the dmg

The build is not signed with a developer certificate (`mac.identity: null` in `electron-builder.yml`, so electron-builder never grabs a random certificate from the keychain). macOS will refuse to open it on first launch. Either right-click the app and choose Open, or clear the quarantine flag once:

```bash
xattr -dr com.apple.quarantine "/Applications/Usage Monitor.app"
```

Settings live in `~/Library/Application Support/usage-monitor/settings.json`.

Dev-only environment variables (ignored in production builds):

| Variable | Effect |
|---|---|
| `USAGE_MONITOR_SCREENSHOT=/path.png` | Capture the window a few seconds after load |
| `USAGE_MONITOR_SCREENSHOT_DELAY=4000` | Delay before the capture, in ms |
| `USAGE_MONITOR_WINDOW_SIZE=960x600` | Force an initial window size for layout checks |

## Project layout

```
src/shared     types, IPC contract, i18n locales (en, vi), usage helpers
src/main       Electron main: providers (claude, codex), window, tray, settings, IPC
src/preload    typed bridge exposed as window.api
src/renderer   React UI: layout, dashboard, settings, stores, hooks
```

Conventions:

- Every user-facing string lives in `src/shared/i18n/locales/<lang>/*.json`. Add keys to both `en` and `vi`.
- Providers implement `UsageProvider` (`src/main/providers/types.ts`) and map their API shape to `UsageSnapshot` in a `mapper.ts` with unit tests.
- Components keep private sub components in the same file when they are not reused.
