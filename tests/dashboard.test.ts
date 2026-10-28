import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPage} from '../src/dashboard.js';
const session = {login: 'octocat', token: 'github_pat_fake'};
test('dashboard fallback, pagination, and failure handling', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls: {url: string; auth: string | undefined}[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url: String(url), auth: (options?.headers as Record<string, string>).Authorization});
    if (calls.length === 1) return new Response(null, {status: 403});
    return Response.json([{full_name: 'octocat/repo', description: '\u001b[31mtest', html_url: 'https://github.com/octocat/repo'}], {headers: {link: '<https://api.github.com/users/octocat/repos?page=3>; rel="next"'}});
  };
  const result = await loadPage(session, 1, 2, new AbortController().signal);
  assert.match(result.notice, /public data only/);
  assert.equal(result.next, true);
  assert.equal(calls[0]?.auth, 'Bearer github_pat_fake');
  assert.equal(calls[1]?.auth, undefined);
  assert.match(calls[1]!.url, /users\/octocat\/repos.*page=2/);
  assert.ok(!result.entries[0]!.detail.includes('\u001b'));
  for (const status of [401, 429, 500]) {
    calls = [];
    globalThis.fetch = async url => { calls.push({url: String(url), auth: undefined}); return new Response(null, {status}); };
    await assert.rejects(loadPage(session, 1, 1, new AbortController().signal));
    assert.equal(calls.length, 1);
  }
  let count = 0;
  globalThis.fetch = async () => { count++; return new Response(null, {status: 403, headers: {'x-ratelimit-remaining': '0'}}); };
  await assert.rejects(loadPage(session, 0, 1, new AbortController().signal), /rate limit/);
  assert.equal(count, 1);
  globalThis.fetch = async () => Response.json({items: [], incomplete_results: false});
  assert.deepEqual((await loadPage(session, 2, 1, new AbortController().signal)).entries, []);
  globalThis.fetch = async () => Response.json({items: [{number: 7, title: 'Review', repository_url: 'https://api.github.com/repos/octocat/repo', html_url: 'https://github.com/octocat/repo/pull/7'}]});
  assert.deepEqual((await loadPage(session, 3, 1, new AbortController().signal)).entries[0]?.repo, 'octocat/repo');
  assert.equal((await loadPage(session, 3, 1, new AbortController().signal)).entries[0]?.number, 7);
  globalThis.fetch = async () => Response.json({login: 'octocat', name: 'Mona', bio: 'Hi', company: 'GitHub', location: 'San Francisco', blog: 'https://example.com', twitter_username: 'mona', avatar_url: 'https://avatars.githubusercontent.com/u/1', html_url: 'https://github.com/octocat', public_repos: 1, followers: 2, following: 3});
  const profile = await loadPage(session, 0, 1, new AbortController().signal);
  assert.deepEqual(profile.profile, {name: 'Mona', bio: 'Hi', company: 'GitHub', location: 'San Francisco', blog: 'https://example.com', twitter_username: 'mona'});
  assert.match(profile.entries[0]!.detail, /Website: https:\/\/example.com/);
  assert.equal(profile.avatarUrl, 'https://avatars.githubusercontent.com/u/1');
  globalThis.fetch = async () => { throw new Error('secret transport detail'); };
  await assert.rejects(loadPage(session, 4, 1, new AbortController().signal), /Check your connection/);
});
