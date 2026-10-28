import type {Session} from './github.js';
import type {Profile} from './dashboard.js';

export async function updateProfile(session: Session, changes: Partial<Profile>, signal: AbortSignal): Promise<void> {
  if (Object.keys(changes).length === 0) throw new Error('Change a field before saving.');
  if (changes.blog?.trim()) {
    let url: URL;
    try { url = new URL(changes.blog.trim()); }
    catch { throw new Error('Website must be a full http or https URL.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Website must be a full http or https URL.');
  }
  const payload = {...changes, ...(changes.twitter_username === '' ? {twitter_username: null} : {})};
  let response: Response;
  try {
    response = await fetch('https://api.github.com/user', {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json', Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json', 'User-Agent': 'github-tui',
      },
      body: JSON.stringify(payload), redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
  } catch { throw new Error('Could not reach GitHub. Check your connection and try again.'); }
  if (response.status === 401) throw new Error('Token expired or revoked. Press s to sign in again.');
  if (response.status === 403 || response.status === 404) throw new Error('Profile update denied. Your token needs Profile write access.');
  if (response.status === 422) throw new Error('GitHub rejected a profile field. Check its value and try again.');
  if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub rate limit reached. Try again later.');
  if (!response.ok) throw new Error('GitHub could not update your profile. Try again shortly.');
}
