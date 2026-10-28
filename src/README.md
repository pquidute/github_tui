# GitHub TUI — Project Handoff

## 1. Project overview

I'm building a personal GitHub dashboard that runs entirely in the terminal, using a keyboard-driven TUI (Terminal User Interface).

The goal is to create a polished, useful CLI application for interacting with GitHub, rather than a web app.

Planned features may include:

- Viewing my GitHub profile.
- Browsing repositories.
- Exploring issues and pull requests.
- Viewing recent activity.
- Authenticating with GitHub to access my own data.

These are long-term possibilities, not requirements to implement immediately. Build incrementally.

## 2. Technology decisions

- **Language:** TypeScript.
- **Runtime:** Node.js.
- **Package manager:** npm.
- **TUI framework:** Ink (React for terminal interfaces).
- **UI model:** React components rendered in the terminal.
- **Target environments:** PowerShell, Bash, Zsh, and other compatible shells.
- **Development environment:** Ubuntu on WSL 2, running on Windows 11.
- **Editor:** VS Code connected to WSL.

The application should be a terminal program, not a web application. Do not introduce a browser-based UI.

## 3. Development environment

My environment is configured as follows:

- Windows 11.
- WSL 2.
- Ubuntu 26.04 LTS.
- Zsh as my default shell.
- Node.js managed through NVM.
- TypeScript, `tsx`, and npm.
- Git and basic build tools.

My preferred Linux project directory is:

`~/projects/github-tui`

I also created a separate TypeScript test project at `~/projects/ts-check` to verify that TypeScript execution and type checking work.

The test project contains a simple `hello.ts` file, which I ran with `npx tsx`. Type checking with `npx tsc --noEmit` also completed without errors.

**Important:** Inspect the actual GitHub TUI project directory before assuming its files, dependencies, or configuration have been created. The Ink project initialization commands were proposed, but their completion has not been confirmed.

## 4. My experience and learning goals

I have experience with web development, TypeScript, REST APIs, and backend development. I have worked with Node.js, Spring Boot, and CMS integrations.

However, building terminal interfaces and structuring a TUI application are new areas for me.

Don't explain basic HTTP, JSON, REST, or TypeScript concepts unless I ask. Focus explanations on the unfamiliar parts of terminal UI development, architecture, and relevant tooling.

## 5. How I want you to work

- Be direct and concise.
- Work incrementally, one milestone at a time.
- Explain unfamiliar concepts when they matter.
- Avoid giant roadmaps and unnecessary abstractions.
- Don't overengineer a personal project.
- Don't invent requirements or silently make major architectural decisions.
- Inspect the existing files before modifying anything.
- Explain what a command does when it isn't obvious.
- Prefer simple, maintainable solutions.
- Ask before introducing significant dependencies or expanding the scope.
- When a task is small and clear, implement it rather than giving me a long tutorial.
- If something is uncertain, say so instead of guessing.

I want to understand what we're building, not blindly copy code.

## 6. Current milestone

**Milestone 1: Get a minimal interactive Ink application running.**

Before making changes:

1. Inspect the current directory and identify the existing files and installed dependencies.
2. Determine whether the project has been initialized with npm and TypeScript.
3. If anything is missing, set it up without overwriting existing work.
4. Install or verify Ink and React.
5. Create a minimal terminal interface that renders successfully and responds to keyboard input.
6. Verify that the application runs and TypeScript type-checks.

Do not implement GitHub API integration or authentication yet.

## 7. First action

Start by inspecting the project and reporting its current state. Then implement the smallest working Ink application appropriate for the existing setup.

Keep me informed of the important decisions, but don't stop to ask permission for every routine implementation detail.
