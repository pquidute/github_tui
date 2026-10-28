// Keep authentication separate from rendering so failures stay easy to test.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

export type Session = {token: string; login: string};
const execFileAsync = promisify(execFile);

export class GhMissingError extends Error {
  constructor() { super('gh is not installed. Follow the installation steps below.'); }
}

export function environmentToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GH_TOKEN or GITHUB_TOKEN before starting the app.');
  return token.trim();
}

export async function cliToken(signal?: AbortSignal): Promise<string> {
  try {
    // Explicit host avoids taking credentials from a repository's enterprise host.
    // gh gives environment tokens precedence, so remove them for this method.
    const {GH_TOKEN: _ghToken, GITHUB_TOKEN: _githubToken, ...env} = process.env;
    const {stdout} = await execFileAsync('gh', ['auth', 'token', '--hostname', 'github.com'], {
      env, signal, timeout: 15000, maxBuffer: 4096,
    });
    const token = stdout.trim();
    if (!token) throw new Error('empty token');
    return token;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') throw new GhMissingError();
    throw new Error('GitHub CLI login unavailable. Run gh auth login, then try again.');
  }
}

export async function authenticate(token: string, signal?: AbortSignal): Promise<Session> {
  if (!/^(?:github_pat_|ghp_|gho_|ghu_)[A-Za-z0-9_]+$/.test(token)) {
    throw new Error('Enter a valid GitHub token (github_pat_ or ghp_), or choose another sign-in method.');
  }

  let response: Response;
  try {
    response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'github-tui',
      },
      // Never forward credentials to a redirect destination; never wait forever.
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch {
    // Raw errors and response bodies can contain details we shouldn't print.
    throw new Error('Could not reach GitHub. Check your connection and try again.');
  }
  if (response.status === 401) throw new Error('GitHub rejected this token. Check whether it expired or was revoked.');
  if (response.status === 403 || response.status === 429) throw new Error('GitHub denied access or rate-limited this request. Try again later.');
  if (!response.ok) throw new Error('GitHub could not verify the token. Try again shortly.');
  const user: unknown = await response.json();
  if (!user || typeof user !== 'object' || !('login' in user) || typeof user.login !== 'string') {
    throw new Error('GitHub returned an unexpected account response.');
  }
  // Only retain the account name, not the entire private profile response.
  return {token, login: user.login};
}
