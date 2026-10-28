import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatReadme, loadReadme, renderReadmeLines} from '../src/readme.js';

const session = {login: 'octocat', token: 'github_pat_fake'};
const signal = new AbortController().signal;

test('loads preferred README with the session token and makes Markdown readable', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.github.com/repos/octocat/repo/readme');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer github_pat_fake');
    assert.equal((options?.headers as Record<string, string>).Accept, 'application/vnd.github.raw+json');
    assert.equal(options?.redirect, 'error');
    return new Response('# Title\n\nSee [docs](https://example.com).\n\n```sh\nnpm start\n```\n\x1b[31m');
  };
  const content = await loadReadme(session, 'octocat/repo', signal);
  assert.match(formatReadme(content!), /Title\n\nSee docs \(https:\/\/example.com\)/);
  assert.match(formatReadme(content!), /│ npm start/);
  assert.ok(!formatReadme(content!).includes('\x1b'));
  assert.ok(!formatReadme(content!).includes('[31m'));
});

test('styles and wraps common Markdown elements for a narrow terminal', () => {
  const lines = renderReadmeLines('# Heading\n\n- **Strong** and [docs](https://example.com)\n> A note\n```sh\nnpm start\n```', 24);
  assert.equal(lines[0]?.kind, 'heading');
  assert.equal(lines[0]?.parts.map(part => part.text).join(''), '▸ Heading');
  assert.equal(lines[2]?.kind, 'list');
  assert.ok(lines.some(line => line.parts.some(part => part.style === 'strong')));
  assert.ok(lines.some(line => line.parts.some(part => part.style === 'link')));
  assert.ok(lines.some(line => line.kind === 'quote'));
  assert.ok(lines.some(line => line.kind === 'code'));
  assert.ok(lines.every(line => Array.from(line.parts.map(part => part.text).join('')).length <= 24));
  const wrapped = renderReadmeLines('A short paragraph with several words.', 12);
  assert.deepEqual(wrapped.map(line => line.parts.map(part => part.text).join('')), ['A short', 'paragraph', 'with several', 'words.']);
  assert.equal(renderReadmeLines('Title\n=====', 20)[0]?.kind, 'heading');
});

test('handles missing and inaccessible READMEs', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, {status: 404}); };
  assert.equal(await loadReadme(session, 'octocat/repo', signal), null);
  await assert.rejects(loadReadme(session, 'octocat/repo/extra', signal), /Invalid repository/);
  assert.equal(calls, 1);
  globalThis.fetch = async () => new Response(null, {status: 403});
  await assert.rejects(loadReadme(session, 'octocat/repo', signal), /Contents permission/);
});
