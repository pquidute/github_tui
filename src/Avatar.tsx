import {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {avatarCells, loadAvatar, type AvatarPixels} from './avatar.js';
import {theme} from './theme.js';

const cache = new Map<string, AvatarPixels>();

export default function Avatar({url, width}: {url: string; width: number}) {
  const rows = Math.max(2, Math.floor(width / 2));
  const key = `${url}|${width}|${rows}`;
  const [pixels, setPixels] = useState<AvatarPixels | null>(cache.get(key) ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const cached = cache.get(key);
    if (cached) { setPixels(cached); setFailed(false); return; }
    const controller = new AbortController();
    setPixels(null); setFailed(false);
    loadAvatar(url, width, rows, controller.signal).then(value => {
      if (!controller.signal.aborted) { cache.set(key, value); setPixels(value); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [url, width, rows, key]);
  if (!pixels) return <Box width={width}><Text color={theme.muted} wrap="truncate">{failed ? '◇ no photo' : '◌ photo'}</Text></Box>;
  return <Box width={width} flexDirection="column">
    {avatarCells(pixels).map((row, index) => <Text key={index}>{row.map((cell, column) =>
      <Text key={column} color={cell.top} backgroundColor={cell.bottom}>▀</Text>)}</Text>)}
  </Box>;
}
