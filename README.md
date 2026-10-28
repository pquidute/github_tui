# GitHub TUI

A keyboard-driven GitHub dashboard for your terminal. Browse and update your profile, explore repositories, issues, pull requests, and recent activity. Create issues and comment on issues or pull requests through the GitHub REST API.

Open a repository to read its preferred README below the repository details. Headings, lists, quotes, links, and code blocks are formatted for the terminal. Use `↑`/`↓` to scroll; a missing README or missing Contents permission is shown in place.

The small block-art robot in the header reacts to keys, loading, errors, and successful actions.
Profile opens directly to your information and renders your GitHub avatar with colored terminal blocks when your terminal supports true color. The portrait grows with the terminal, and `a` opens a larger photo view.


## Get started

[Watch the demo video](src/assets/demo.mp4).
Requires Node.js 22 or newer, npm, and an interactive terminal.

```sh
git clone "https://github.com/pquidute/github_tui.git" github_tui
cd github_tui
npm ci
npm start
```

## Sign in

Choose an option with `↑`/`↓` and `→` (or `>`/`Enter`), or press `1`–`4` to open it directly:

1. **Paste token:** Paste a [fine-grained token](https://github.com/settings/personal-access-tokens/new) or a [classic token](https://github.com/settings/tokens) into the masked field. Fine-grained tokens need **Profile** user write access to edit your profile, **Issues** write access to create issues, and **Issues** or **Pull requests** write access to comment. Classic tokens generally need the `user` scope to edit your profile, `repo` for private repositories, or `public_repo` for public repositories. Press `?` at the empty field for the in-app token guide.
2. **GitHub CLI:** `gh` is [GitHub's official command-line tool](https://cli.github.com/). Install it and run `gh auth login` in your shell first. The app uses the active CLI account for `github.com`; it does not change your CLI login.
3. **Environment token:** Set `GH_TOKEN` or `GITHUB_TOKEN` before starting the app. `GH_TOKEN` takes precedence when both are set.
4. **Help:** Opens a short installation manual for GitHub CLI: install `gh`, verify it with `gh --version`, run `gh auth login`, then restart the app. It shows a command for your platform and the official guide. Press `y` to request a clipboard copy if your terminal supports OSC 52. If `gh` is missing when you select method 2, Help opens automatically.

On Ubuntu or WSL Ubuntu, the quick command is `sudo apt update && sudo apt install gh`. For GitHub's maintained package repository, follow the [official Linux installation guide](https://github.com/cli/cli/blob/trunk/docs/install_linux.md). Install `gh` in the same environment where you run this app.

The app keeps its selected token in memory for the current session. You will sign in again when you restart it. What you can see and write depends on the token's repository access and permissions.

## Controls

| Key | Action |
| --- | --- |
| `↑` / `↓` or `j` / `k` | Move through menus and results; scroll details |
| `→`, `>`, or `Enter` | Open the selected menu option or result |
| `←`, `<`, or `Esc` | Return to the parent menu or result list |
| `1`–`5` | Open a dashboard section directly |
| `1`–`9` | Open a numbered result visible on the current screen |
| `e` | Edit name, bio, company, location, website, and Twitter username in Profile |
| `a` | Expand or close the profile photo |
| `i` | Create an issue while viewing a repository |
| `c` | Comment while viewing an issue or pull request |
| `Tab` | Switch between issue title and body |
| `Ctrl+S` | Publish a draft |
| `n` / `p` | Next / previous page |
| `r` | Refresh or retry |
| `s` | Sign out |
| `q` | Quit |

Number shortcuts in result lists refer to the rows currently visible. In token and draft fields, `←`/`→` move the text cursor; `Esc` returns. The profile editor uses `↑`/`↓` or `Tab` to change fields and `Ctrl+S` to save. In the issue/comment editor, Enter adds a line to the body. Esc discards the draft. Failed saves keep the draft available for correction and retry.

## Development

`npm run dev` restarts on source changes; `npm run typecheck` checks TypeScript; `npm test` runs the offline tests. Built with TypeScript, React, and Ink.
