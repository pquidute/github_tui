import sharp from 'sharp';

export type AvatarPixels = {width: number; height: number; data: Uint8Array};
const MAX_BYTES = 2_000_000;

export function avatarColumns(columns: number, rows: number, expanded = false): number {
  return expanded
    ? Math.max(8, Math.min(64, columns - 4, 2 * Math.max(4, rows - 4)))
    : Math.max(6, Math.min(32, Math.floor(columns * 0.28), 2 * Math.max(3, rows - 15)));
}

export async function loadAvatar(avatarUrl: string, width: number, rows: number, signal: AbortSignal): Promise<AvatarPixels> {
  let url: URL;
  try { url = new URL(avatarUrl); }
  catch { throw new Error('Invalid avatar URL.'); }
  if (url.protocol !== 'https:' || !['avatars.githubusercontent.com', 'github.com'].includes(url.hostname)) {
    throw new Error('Invalid avatar URL.');
  }
  url.searchParams.set('s', String(Math.max(width, rows * 2) * 2));
  let response: Response;
  try {
    response = await fetch(url, {redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)])});
  } catch { throw new Error('Could not load avatar.'); }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.toLowerCase();
  if (!response.ok || !response.body || !contentType || !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(contentType)) {
    throw new Error('Could not load avatar.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error('Avatar is too large.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally { reader.releaseLock(); }
  const {data, info} = await sharp(Buffer.concat(chunks), {limitInputPixels: 4_000_000})
    .rotate().resize(width, rows * 2, {fit: 'cover'}).flatten({background: '#111111'})
    .raw().toBuffer({resolveWithObject: true});
  if (info.channels !== 3) throw new Error('Could not render avatar.');
  return {width: info.width, height: info.height, data};
}

export function avatarCells(pixels: AvatarPixels): {top: string; bottom: string}[][] {
  const color = (x: number, y: number) => {
    const offset = (y * pixels.width + x) * 3;
    return `#${Array.from(pixels.data.subarray(offset, offset + 3), value => value.toString(16).padStart(2, '0')).join('')}`;
  };
  return Array.from({length: Math.floor(pixels.height / 2)}, (_, row) =>
    Array.from({length: pixels.width}, (_, column) => ({top: color(column, row * 2), bottom: color(column, row * 2 + 1)})));
}
