# GitHub TUI — Project Notes

This file is contributor context. The root [README](../README.md) is the user guide.

## Current app

GitHub TUI is a keyboard-driven terminal application built with TypeScript, React, and Ink. It runs on Node.js 22 or newer with npm. It is a TUI, not a browser app.

- Sign in with a fine-grained or classic personal access token, an existing GitHub CLI login, or `GH_TOKEN` / `GITHUB_TOKEN`. Tokens stay in memory for the session.
- Browse the authenticated profile, repositories, issues, pull requests, and activity.
- Edit profile fields, create issues, and comment on issues or pull requests when the token has the needed write permissions.
- Render the profile avatar as terminal color blocks, with an expanded photo view. A block-art robot reacts to input and request state.
- Navigate with arrows, Enter, and numbered shortcuts. The root README lists the controls.

## Code map

- `index.tsx` starts Ink and restores the terminal on exit.
- `App.tsx` owns dashboard navigation and screen state; `Login.tsx` owns sign-in.
- `github.ts` authenticates; `dashboard.ts` loads and formats read-only GitHub data.
- `writes.ts` creates issues and comments; `profile.ts` updates profile fields.
- `Composer.tsx` and `ProfileEditor.tsx` keep drafts until publication succeeds or the user cancels.
- `avatar.ts` fetches and decodes GitHub avatars; `Avatar.tsx` draws them with half-block characters. `Companion.tsx` and `AsciiSphere.tsx` provide animations.
- `tests/` contains offline tests with fake GitHub responses and tokens.

## Development context

The primary development environment is Ubuntu on WSL 2, with Windows 11, Zsh, VS Code, Node.js through NVM, and npm. Keep PowerShell, Bash, and other compatible terminals in mind when changing terminal input or output.

Run `npm run typecheck` for TypeScript and `npm test` for the offline test suite. `npm run dev` restarts the app on source changes. Interactive keyboard behavior needs a real terminal.

## Working preferences

- Work incrementally, one milestone at a time. Keep the app simple and maintainable.
- Inspect the existing project before modifying it; do not assume an older handoff describes the current state.
- Explain terminal UI decisions and unfamiliar tooling when they matter, without tutorials on basic TypeScript or REST concepts.
- Avoid unnecessary abstractions, major architecture changes, and significant dependencies without discussion.
- Be direct about uncertainty and verify behavior before calling a feature complete.
