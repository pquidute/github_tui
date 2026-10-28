import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {avatarCells, avatarColumns, loadAvatar} from '../src/avatar.js';

test('avatar resolution grows with terminal space and expands in photo view', () => {
  assert.equal(avatarColumns(80, 24), 18);
  assert.equal(avatarColumns(120, 40), 32);
  assert.equal(avatarColumns(80, 24, true), 40);
  assert.equal(avatarColumns(40, 20), 10);
});

test('downloads a GitHub avatar and maps top and bottom pixels to terminal colors', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const png = await sharp(Buffer.from([255, 0, 0, 0, 255, 0]), {raw: {width: 1, height: 2, channels: 3}}).png().toBuffer();
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://avatars.githubusercontent.com/u/1?s=4');
    assert.equal(options?.redirect, 'error');
    assert.equal((options?.headers as Record<string, string> | undefined)?.Authorization, undefined);
    return new Response(png, {headers: {'content-type': 'image/png'}});
  };
  const pixels = await loadAvatar('https://avatars.githubusercontent.com/u/1', 1, 1, new AbortController().signal);
  assert.deepEqual(avatarCells(pixels), [[{top: '#ff0000', bottom: '#00ff00'}]]);
});

test('avatar URLs are limited to GitHub hosts', async () => {
  await assert.rejects(loadAvatar('http://localhost/avatar.png', 8, 4, new AbortController().signal), /Invalid avatar URL/);
  await assert.rejects(loadAvatar('https://example.com/avatar.png', 8, 4, new AbortController().signal), /Invalid avatar URL/);
});
