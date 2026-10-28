// Fake GitHub responses keep tests offline and keep real tokens out of fixtures.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authenticate} from '../src/github.js';

test('authentication gates access and handles GitHub failures', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const token = 'github_pat_fake_test_token';
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.github.com/user');
    assert.equal((options?.headers as Record<string, string>).Authorization, `Bearer ${token}`);
    assert.equal(options?.redirect, 'error');
    return Response.json({login: 'octocat'});
  };
  await assert.rejects(authenticate('ghp_classic'), /fine-grained/);
  assert.equal(calls, 0);
  assert.deepEqual(await authenticate(token), {token, login: 'octocat'});
  for (const [status, message] of [[401, /rejected/], [403, /denied/], [429, /rate-limited/], [500, /could not verify/]] as const) {
    globalThis.fetch = async () => new Response(null, {status});
    await assert.rejects(authenticate(token), message);
  }
  globalThis.fetch = async () => { throw new Error('private transport details'); };
  await assert.rejects(authenticate(token), /Could not reach GitHub/);
  globalThis.fetch = async () => Response.json({unexpected: true});
  await assert.rejects(authenticate(token), /unexpected account/);
});
