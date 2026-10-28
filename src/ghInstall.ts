import {readFileSync} from 'node:fs';

export type InstallInfo = {command: string; guide: string};

export function installInfo(platform = process.platform, osRelease?: string): InstallInfo {
  if (platform === 'darwin') return {command: 'brew install gh', guide: 'https://cli.github.com/'};
  if (platform === 'win32') return {command: 'winget install --id GitHub.cli', guide: 'https://cli.github.com/'};
  if (platform === 'linux') {
    let release = osRelease;
    if (release === undefined) {
      try { release = readFileSync('/etc/os-release', 'utf8'); } catch { release = ''; }
    }
    if (/^(?:ID|ID_LIKE)=.*(?:ubuntu|debian)/m.test(release)) return {command: 'sudo apt update && sudo apt install gh', guide: 'https://github.com/cli/cli/blob/trunk/docs/install_linux.md'};
    if (/^(?:ID|ID_LIKE)=.*(?:fedora|rhel)/m.test(release)) return {command: 'sudo dnf install gh', guide: 'https://github.com/cli/cli/blob/trunk/docs/install_linux.md'};
    if (/^(?:ID|ID_LIKE)=.*arch/m.test(release)) return {command: 'sudo pacman -S github-cli', guide: 'https://github.com/cli/cli/blob/trunk/docs/install_linux.md'};
  }
  return {command: '', guide: 'https://cli.github.com/'};
}

export function clipboardSequence(value: string): string {
  return `\x1b]52;c;${Buffer.from(value).toString('base64')}\x07`;
}
