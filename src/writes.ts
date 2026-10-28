import type {Session} from './github.js';

function repoPath(repo: string): string {
  const parts = repo.split('/');
  if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_.-]+$/.test(part))) {
    throw new Error('This item has no valid repository path. Refresh and try again.');
  }
  return parts.map(encodeURIComponent).join('/');
}

async function post(session: Session, path: string, body: object, signal: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'github-tui',
      },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
  } catch {
    throw new Error('Could not reach GitHub. Check your connection and try again.');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Token expired or revoked. Press s to sign in again.');
    if (response.status === 403 || response.status === 404) throw new Error('GitHub denied this action. Check repository access and token write permissions.');
    if (response.status === 422) throw new Error('GitHub rejected this content. Check the title and body, then try again.');
    if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub rate limit reached. Try again later.');
    throw new Error('GitHub could not save this. Try again shortly.');
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('html_url' in result) || typeof result.html_url !== 'string') {
    throw new Error('GitHub returned an unexpected result. Check the repository before retrying.');
  }
  return result.html_url;
}

export async function createIssue(session: Session, repo: string, title: string, body: string, signal: AbortSignal): Promise<string> {
  if (!title.trim()) throw new Error('Enter an issue title.');
  return post(session, `/repos/${repoPath(repo)}/issues`, {title: title.trim(), body: body.trim()}, signal);
}

export async function createComment(session: Session, repo: string, number: number, body: string, signal: AbortSignal): Promise<string> {
  if (!body.trim()) throw new Error('Enter a comment.');
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('This item has no valid issue number. Refresh and try again.');
  return post(session, `/repos/${repoPath(repo)}/issues/${number}/comments`, {body: body.trim()}, signal);
}
