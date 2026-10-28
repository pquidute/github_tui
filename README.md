# GitHub TUI

A keyboard-driven GitHub dashboard for your terminal. Browse your profile, repositories, issues, pull requests, and recent activity without leaving the shell. The app is read-only and uses the GitHub REST API.

## Get started

Requires Node.js 22 or newer, npm, and an interactive terminal.

```sh
git clone "https://github.com/OWNER/REPO.git" github_tui
cd github_tui
npm ci
npm start
```

Replace the example URL with this repository's HTTPS or SSH clone URL.

## Sign in

1. [Create a fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) on GitHub. Choose its expiration and the repositories you want to access. For private issues and pull requests, give **Issues** and **Pull requests** read access. Organization repositories may also require approval.
2. Paste the token into the masked field and press **Enter**. Press `?` at the empty field for the in-app token guide.

The token stays in memory for the current session. You will sign in again when you restart the app. What you can see depends on the token's repository access and permissions.

## Controls

| Key | Action |
| --- | --- |
| `↑` / `↓` or `j` / `k` | Move through menus and results; scroll details |
| `Enter` | Open a section or item |
| `Esc` | Go back |
| `n` / `p` | Next / previous page |
| `r` | Refresh or retry |
| `s` | Sign out |
| `q` | Quit |

## Development

`npm run dev` restarts on source changes; `npm run typecheck` checks TypeScript; `npm test` runs the offline tests. Built with TypeScript, React, and Ink.
