import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createComment, createIssue} from '../src/writes.js';

const session = {login: 'octocat', token: 'github_pat_fake'};
const signal = new AbortController().signal;

test('publishes issues and pull request comments with the session token', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const requests: {url: string; method: string; body: unknown; headers: Record<string, string>}[] = [];
  globalThis.fetch = async (url, options) => {
    requests.push({url: String(url), method: options?.method ?? '', body: JSON.parse(String(options?.body)), headers: options?.headers as Record<string, string>});
    assert.equal(options?.redirect, 'error');
    return Response.json({html_url: 'https://github.com/octocat/repo/issues/3'}, {status: 201});
  };
  assert.equal(await createIssue(session, 'octocat/repo', '  Bug  ', '  Details  ', signal), 'https://github.com/octocat/repo/issues/3');
  assert.equal(await createComment(session, 'octocat/repo', 3, '  Looks good  ', signal), 'https://github.com/octocat/repo/issues/3');
  assert.deepEqual(requests.map(({url, method, body}) => ({url, method, body})), [
    {url: 'https://api.github.com/repos/octocat/repo/issues', method: 'POST', body: {title: 'Bug', body: 'Details'}},
    {url: 'https://api.github.com/repos/octocat/repo/issues/3/comments', method: 'POST', body: {body: 'Looks good'}},
  ]);
  assert.ok(requests.every(request => request.headers.Authorization === 'Bearer github_pat_fake'));
});

test('rejects invalid drafts locally and keeps API failures safe', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, {status: 403}); };
  await assert.rejects(createIssue(session, 'octocat/repo', ' ', '', signal), /title/);
  await assert.rejects(createComment(session, 'octocat/repo', 3, ' ', signal), /comment/);
  await assert.rejects(createIssue(session, 'bad/repo/extra', 'Title', '', signal), /repository path/);
  assert.equal(calls, 0);
  await assert.rejects(createIssue(session, 'octocat/repo', 'Title', '', signal), /write permissions/);
  assert.equal(calls, 1);
  globalThis.fetch = async () => { throw new Error('private transport details'); };
  await assert.rejects(createComment(session, 'octocat/repo', 3, 'Text', signal), /Could not reach GitHub/);
});
