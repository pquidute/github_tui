import type {Session} from './github.js';
export const sections = ['Profile', 'Repositories', 'Issues', 'Pull requests', 'Activity'] as const;
export type Entry = {title: string; detail: string; url: string; repo?: string; number?: number; canCreateIssue?: boolean};
export type Profile = {name: string; bio: string; company: string; location: string; blog: string; twitter_username: string};
export type Page = {entries: Entry[]; next: boolean; notice: string; profile?: Profile; avatarUrl?: string};
const clean = (value: unknown) => String(value ?? '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
class ApiError extends Error {
  constructor(public status: number, public limited: boolean, message: string) { super(message); }
}
async function request(path: string, token: string | undefined, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'github-tui', ...(token ? {Authorization: `Bearer ${token}`} : {})},
      redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
  } catch { throw new Error('Could not reach GitHub. Check your connection, then press r to retry.'); }
  const limited = response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after');
  if (!response.ok) throw new ApiError(response.status, limited,
    limited ? 'GitHub rate limit reached. Wait before pressing r to retry.' :
    response.status === 401 ? 'Token expired or revoked. Press s to sign in again.' :
    response.status === 403 || response.status === 404 ? 'Access unavailable. Check token repository selection, permissions, and organization approval.' :
    'GitHub is unavailable. Press r to retry.');
  return {data: await response.json(), next: /rel="next"/.test(response.headers.get('link') ?? '')};
}
export async function loadPage(session: Session, section: number, page: number, signal: AbortSignal): Promise<Page> {
  const user = encodeURIComponent(session.login);
  const paging = `per_page=20&page=${page}`;
  const search = `/search/issues?q=${encodeURIComponent(`involves:${session.login} is:${section === 2 ? 'issue' : 'pr'}`)}&sort=updated&order=desc&${paging}`;
  const paths = ['/user', `/user/repos?sort=updated&${paging}`, search, search, `/users/${user}/events?${paging}`];
  const publicPaths = [`/users/${user}`, `/users/${user}/repos?sort=updated&${paging}`, search, search, `/users/${user}/events/public?${paging}`];
  let result;
  let notice = section === 2 || section === 3 ? 'Items involving you; results depend on token repository access.' : 'Results depend on token repository access.';
  try { result = await request(paths[section]!, session.token, signal); }
  catch (error) {
    if (!(error instanceof ApiError) || error.limited || ![403, 404].includes(error.status) || signal.aborted) throw error;
    result = await request(publicPaths[section]!, undefined, signal);
    notice = 'Permission restricted: showing public data only. For private data, update token repository access and organization approval.';
  }
  const {data, next} = result;
  if (section === 0) {
    if (!data || typeof data.login !== 'string') throw new Error('Unexpected GitHub profile response.');
    const profile: Profile = {name: clean(data.name), bio: clean(data.bio), company: clean(data.company), location: clean(data.location), blog: clean(data.blog), twitter_username: clean(data.twitter_username)};
    const detail = [
      `Name: ${profile.name || '—'}`, `Bio: ${profile.bio || '—'}`, `Company: ${profile.company || '—'}`,
      `Location: ${profile.location || '—'}`, `Website: ${profile.blog || '—'}`, `Twitter: ${profile.twitter_username ? `@${profile.twitter_username}` : '—'}`,
      `${data.public_repos} public repositories · ${data.followers} followers · ${data.following} following`,
    ].join('\n');
    return {next: false, notice, profile, avatarUrl: typeof data.avatar_url === 'string' ? data.avatar_url : undefined, entries: [{title: clean(data.name || data.login), url: clean(data.html_url), detail}]};
  }
  const items = section === 2 || section === 3 ? data.items : data;
  if (!Array.isArray(items)) throw new Error('Unexpected GitHub response. Press r to retry.');
  if (data.incomplete_results) notice += ' GitHub returned incomplete search results; refresh to retry.';
  const entries = items.map((item): Entry => {
    if (section === 1) return {title: clean(item.full_name), url: clean(item.html_url), repo: item.full_name, canCreateIssue: item.has_issues !== false, detail: `${clean(item.description)}\n${item.private ? 'Private' : 'Public'} · ${clean(item.language || 'No language')} · ★ ${item.stargazers_count} · Forks ${item.forks_count}\nUpdated ${clean(item.updated_at)}`};
    if (section === 4) return {title: `${clean(item.type).replace(/Event$/, '')} · ${clean(item.repo?.name)}`, url: `https://github.com/${clean(item.repo?.name)}`, detail: `${clean(item.actor?.login)} · ${clean(item.created_at)}\n${clean(item.payload?.action)}`};
    const repository = typeof item.repository_url === 'string' ? item.repository_url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)$/)?.[1] : undefined;
    return {title: `#${item.number} ${clean(item.title)}`, url: clean(item.html_url), repo: repository, number: item.number, detail: `${clean(item.state)} · @${clean(item.user?.login)} · Updated ${clean(item.updated_at)}\n${clean(item.body || 'No description.')}`};
  });
  return {entries, next, notice};
}
