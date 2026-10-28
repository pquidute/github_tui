// Fake GitHub responses keep tests offline and keep real tokens out of fixtures.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, chmod, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authenticate, cliToken, environmentToken, GhMissingError} from '../src/github.js';

test('authentication gates access and handles GitHub failures', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const token = 'github_pat_fake_test_token';
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.github.com/user');
    assert.match((options?.headers as Record<string, string>).Authorization, /^Bearer (?:github_pat_|ghp_|gho_)/);
    assert.equal(options?.redirect, 'error');
    return Response.json({login: 'octocat'});
  };
  await assert.rejects(authenticate('not_a_token'), /valid GitHub token/);
  assert.equal(calls, 0);
  assert.deepEqual(await authenticate(token), {token, login: 'octocat'});
  assert.deepEqual(await authenticate('ghp_classic'), {token: 'ghp_classic', login: 'octocat'});
  assert.deepEqual(await authenticate('gho_cli'), {token: 'gho_cli', login: 'octocat'});
  for (const [status, message] of [[401, /rejected/], [403, /denied/], [429, /rate-limited/], [500, /could not verify/]] as const) {
    globalThis.fetch = async () => new Response(null, {status});
    await assert.rejects(authenticate(token), message);
  }
  globalThis.fetch = async () => { throw new Error('private transport details'); };
  await assert.rejects(authenticate(token), /Could not reach GitHub/);
  globalThis.fetch = async () => Response.json({unexpected: true});
  await assert.rejects(authenticate(token), /unexpected account/);
});

test('environment sign-in chooses GH_TOKEN before GITHUB_TOKEN', () => {
  assert.equal(environmentToken({GH_TOKEN: ' ghp_primary ', GITHUB_TOKEN: 'ghp_secondary'}), 'ghp_primary');
  assert.equal(environmentToken({GITHUB_TOKEN: 'github_pat_fine'}), 'github_pat_fine');
  assert.throws(() => environmentToken({}), /Set GH_TOKEN or GITHUB_TOKEN/);
});

test('GitHub CLI sign-in reports an unavailable CLI without leaking command errors', async () => {
  const previousPath = process.env.PATH;
  process.env.PATH = '';
  try { await assert.rejects(cliToken(), GhMissingError); }
  finally { if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath; }
});

test('GitHub CLI reads the active github.com credential without environment overrides', {skip: process.platform === 'win32'}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'github-tui-gh-'));
  const executable = join(directory, 'gh');
  await writeFile(executable, '#!/bin/sh\n[ "$1 $2 $3 $4" = "auth token --hostname github.com" ] || exit 2\n[ -z "$GH_TOKEN" ] && [ -z "$GITHUB_TOKEN" ] || exit 3\nprintf gho_cli_test\n');
  await chmod(executable, 0o700);
  const previous = {PATH: process.env.PATH, GH_TOKEN: process.env.GH_TOKEN, GITHUB_TOKEN: process.env.GITHUB_TOKEN};
  process.env.PATH = `${directory}:${previous.PATH ?? ''}`;
  process.env.GH_TOKEN = 'ghp_environment';
  try { assert.equal(await cliToken(), 'gho_cli_test'); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(directory, {recursive: true, force: true});
  }
});
