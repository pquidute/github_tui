// Keep authentication separate from rendering so failures stay easy to test.
export type Session = {token: string; login: string};

export async function authenticate(token: string, signal?: AbortSignal): Promise<Session> {
  if (!/^github_pat_[A-Za-z0-9_]+$/.test(token)) {
    throw new Error('Enter a fine-grained token starting with github_pat_.');
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
