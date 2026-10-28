import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateProfile} from '../src/profile.js';

const session = {login: 'octocat', token: 'github_pat_fake'};
const signal = new AbortController().signal;

test('profile updates send only changed fields to the authenticated user endpoint', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.github.com/user');
    assert.equal(options?.method, 'PATCH');
    assert.equal(options?.redirect, 'error');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer github_pat_fake');
    assert.deepEqual(JSON.parse(String(options?.body)), {name: 'New name', blog: 'https://example.com', twitter_username: null});
    return Response.json({login: 'octocat'});
  };
  await updateProfile(session, {name: 'New name', blog: 'https://example.com', twitter_username: ''}, signal);
});

test('profile updates validate locally and keep GitHub failures safe', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, {status: 403}); };
  await assert.rejects(updateProfile(session, {}, signal), /Change a field/);
  await assert.rejects(updateProfile(session, {blog: 'javascript:alert(1)'}, signal), /http or https/);
  assert.equal(calls, 0);
  await assert.rejects(updateProfile(session, {bio: 'New bio'}, signal), /Profile write access/);
  assert.equal(calls, 1);
  globalThis.fetch = async () => { throw new Error('secret transport details'); };
  await assert.rejects(updateProfile(session, {name: 'New'}, signal), /Could not reach GitHub/);
});
