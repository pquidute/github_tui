import {theme} from './theme.js';
import {useEffect, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import AsciiSpinner from './AsciiSpinner.js';
import {authenticate, type Session} from './github.js';

export default function Login({onLogin}: {onLogin: (session: Session) => void}) {
  const [field, setField] = useState({token: '', cursor: 0});
  const {token, cursor} = field;
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const {exit} = useApp();
  const {columns} = useWindowSize();
  useEffect(() => () => request.current?.abort(), []);

  async function submit() {
    if (request.current || !token.trim()) { if (!token.trim()) setError('Paste a GitHub token to continue.'); return; }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const session = await authenticate(token.trim(), controller.signal);
      if (!controller.signal.aborted) { setField({token: '', cursor: 0}); onLogin(session); }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Authentication failed. Try again.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  useInput((input, key) => {
    if (key.escape) { if (showGuide) { setShowGuide(false); return; } request.current?.abort(); setField({token: '', cursor: 0}); exit(); return; }
    if (busy) return;
    if ((!token && input === '?') || (key.ctrl && input === 'g')) { setShowGuide(value => !value); return; }
    if (showGuide) { if (key.return) setShowGuide(false); return; }
    if (key.return) { void submit(); return; }
    if (key.leftArrow) { setField(value => ({...value, cursor: Math.max(0, value.cursor - 1)})); return; }
    if (key.rightArrow) { setField(value => ({...value, cursor: Math.min(value.token.length, value.cursor + 1)})); return; }
    if (key.home || (key.ctrl && input === 'a')) { setField(value => ({...value, cursor: 0})); return; }
    if (key.end || (key.ctrl && input === 'e')) { setField(value => ({...value, cursor: value.token.length})); return; }
    if (key.backspace || key.delete) {
      setField(value => {
        const index = key.backspace ? value.cursor - 1 : value.cursor;
        if (index < 0 || index >= value.token.length) return value;
        return {token: value.token.slice(0, index) + value.token.slice(index + 1), cursor: index};
      });
      return;
    }
    if (key.ctrl && input === 'u') { setField({token: '', cursor: 0}); return; }
    if (!key.ctrl && !key.meta) {
      const clean = input.replace(/[^\x21-\x7e]/g, '');
      if (clean) {
        setField(value => {
          const inserted = clean.slice(0, 512 - value.token.length);
          return {token: value.token.slice(0, value.cursor) + inserted + value.token.slice(value.cursor), cursor: value.cursor + inserted.length};
        });
        setError('');
      }
    }
  });

  const fieldWidth = Math.max(8, Math.min(48, columns - 10));
  const offset = Math.max(0, cursor - fieldWidth + 1);
  const before = '•'.repeat(Math.max(0, cursor - offset));
  const after = '•'.repeat(Math.min(token.length - cursor, fieldWidth - before.length - 1));
  return <Box flexDirection="column" paddingX={1}>
    <Box borderStyle="single" borderColor={theme.frame} paddingX={1} justifyContent="space-between">
      <Text bold color={theme.accent}>◈ GITHUB // TUI</Text><Text color={theme.muted}>SECURE ACCESS</Text>
    </Box>
    {!showGuide && <Box justifyContent="center"><AsciiSpinner /></Box>}
    <Box flexDirection="column" borderStyle="round" borderColor={theme.frame} paddingX={2} paddingY={1}>
      <Text bold color={theme.accent}>AUTHENTICATE  /  PERSONAL ACCESS TOKEN</Text>
      {showGuide && <Box flexDirection="column" marginY={1}>
        <Text bold>CREATE A TOKEN  /  QUICK GUIDE</Text>
        <Text>1. Open github.com/settings/personal-access-tokens/new</Text>
        <Text>2. Set a name, expiration, resource owner, and repository access.</Text>
        <Text>3. For private issues and PRs, grant read access to Issues and Pull requests.</Text>
        <Text>4. Generate, copy once, paste here, and press Enter.</Text>
        <Text color={theme.muted}>Full guide: docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens</Text>
        <Text color={theme.muted}>Org repositories may require approval. Esc closes this guide.</Text>
      </Box>}
      <Text color={theme.muted} wrap="truncate">Fine-grained token · github.com/settings/personal-access-tokens/new</Text>
      <Box marginTop={1} borderStyle="single" borderColor={error ? theme.error : busy ? theme.warning : theme.signal} paddingX={1}>
        <Text color={theme.signal}>❯ </Text><Text color={theme.signal}>{before}</Text><Text backgroundColor={theme.signal} color="black">{busy ? '·' : cursor < token.length ? '•' : ' '}</Text><Text color={theme.signal}>{after}</Text>
        {!token && <Text color={theme.muted}>  paste token here</Text>}
      </Box>
      <Text color={error ? theme.error : busy ? theme.warning : theme.muted}>{error || (busy ? 'Verifying with GitHub…' : `TOKEN LENGTH ${token.length}  ·  CURSOR ${cursor + 1}  ·  in memory only`)}</Text>
    </Box>
    <Text color={theme.muted}>  ? token guide · ENTER sign in · ←/→ move · ^U clear · ESC exit</Text>
  </Box>;
}
