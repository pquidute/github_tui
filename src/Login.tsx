import {theme} from './theme.js';
import {useEffect, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import AsciiSphere from './AsciiSphere.js';
import Companion from './Companion.js';
import {authenticate, cliToken, environmentToken, GhMissingError, type Session} from './github.js';
import {clipboardSequence, installInfo} from './ghInstall.js';
import {numberedOption} from './navigation.js';

const methods = ['Paste token', 'GitHub CLI', 'Environment token', 'Help'] as const;
const installation = installInfo();

export default function Login({onLogin}: {onLogin: (session: Session) => void}) {
  const [field, setField] = useState({token: '', cursor: 0});
  const {token, cursor} = field;
  const [view, setView] = useState<'menu' | 'token' | 'help'>('menu');
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState(0);
  const request = useRef<AbortController | null>(null);
  const {exit} = useApp();
  const {columns} = useWindowSize();
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!copyToast) return;
    const timer = setTimeout(() => setCopyToast(0), 3000);
    return () => clearTimeout(timer);
  }, [copyToast]);

  async function submit(method: number) {
    if (request.current) return;
    if (method === 0 && !token.trim()) { setError('Paste a GitHub token to continue.'); return; }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const credential = method === 0 ? token.trim() : method === 1 ? await cliToken(controller.signal) : environmentToken();
      const session = await authenticate(credential, controller.signal);
      if (!controller.signal.aborted) { setField({token: '', cursor: 0}); onLogin(session); }
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof GhMissingError) setView('help');
        setError(failure instanceof Error ? failure.message : 'Authentication failed. Try again.');
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  useInput((input, key) => {
    if (busy) return;
    if (key.escape || ((key.leftArrow || input === '<') && (view === 'help' || (view === 'token' && !token)))) {
      if (showGuide) { setShowGuide(false); return; }
      if (view !== 'menu') { setView('menu'); setField({token: '', cursor: 0}); setError(''); setCopyToast(0); return; }
      if (key.escape) exit();
      return;
    }
    if (view === 'help') {
      if (input === 'y' && installation.command) {
        process.stdout.write(clipboardSequence(installation.command));
        setCopyToast(value => value + 1);
      }
      return;
    }
    if (view === 'menu') {
      if (key.upArrow || input === 'k') { setSelected(value => (value + methods.length - 1) % methods.length); setError(''); return; }
      if (key.downArrow || input === 'j') { setSelected(value => (value + 1) % methods.length); setError(''); return; }
      const choice = numberedOption(input, methods.length);
      if (choice !== null || key.return || key.rightArrow || input === '>') {
        const index = choice ?? selected;
        setSelected(index); setError('');
        if (index === 0) setView('token'); else if (index === 3) setView('help'); else void submit(index);
      }
      return;
    }
    if ((!token && input === '?') || (key.ctrl && input === 'g')) { setShowGuide(value => !value); return; }
    if (showGuide) { if (key.return) setShowGuide(false); return; }
    if (key.return) { void submit(0); return; }
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
    <Box borderStyle="single" borderColor={theme.frame} paddingX={1} justifyContent="space-between" alignItems="center">
      <Box flexDirection="column"><Text bold color={theme.accent}>◈ GITHUB // TUI</Text><Text color={theme.muted}>SECURE ACCESS</Text>{view === 'menu' && <Text color={theme.muted}>Pedro Quidute</Text>}</Box>
      <Companion mood={busy ? 'busy' : error ? 'error' : copyToast ? 'success' : 'idle'} />
    </Box>
    {!showGuide && view !== 'help' && <Box justifyContent="center"><AsciiSphere /></Box>}
    <Box flexDirection="column" borderStyle="round" borderColor={theme.frame} paddingX={2} paddingY={1}>
      <Text bold color={theme.accent}>AUTHENTICATE  /  {view === 'menu' ? 'MAIN MENU' : view === 'help' ? 'HELP' : 'PERSONAL ACCESS TOKEN'}</Text>
      {view === 'menu' && <Box flexDirection="column" marginTop={1}>
        {methods.map((method, index) => <Text key={method} color={selected === index ? 'black' : theme.text} backgroundColor={selected === index ? theme.highlight : undefined}>{selected === index ? ' ❯ ' : '   '}{index + 1}  {method.toUpperCase()}</Text>)}
        <Text color={theme.muted}>Use a token you already have, a gh login, or GH_TOKEN / GITHUB_TOKEN.</Text>
      </Box>}
      {view === 'token' && <>
      {showGuide && <Box flexDirection="column" marginY={1}>
        <Text bold>CREATE A TOKEN  /  QUICK GUIDE</Text>
        <Text>1. Fine-grained: github.com/settings/personal-access-tokens/new</Text>
        <Text>2. Grant Profile user write to edit your profile; Issues write for new issues.</Text>
        <Text>   Grant Issues or Pull requests write for comments.</Text>
        <Text>3. Classic: github.com/settings/tokens; choose user for profile edits.</Text>
        <Text>   Choose repo or public_repo for repository actions.</Text>
        <Text>4. Generate, copy once, paste here, and press Enter.</Text>
        <Text color={theme.muted}>Full guide: docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens</Text>
        <Text color={theme.muted}>Org repositories may require approval. Esc closes this guide.</Text>
      </Box>}
      <Text color={theme.muted} wrap="truncate">Fine-grained or classic token · github.com/settings/tokens</Text>
      <Box marginTop={1} borderStyle="single" borderColor={error ? theme.error : busy ? theme.warning : theme.signal} paddingX={1}>
        <Text color={theme.signal}>❯ </Text><Text color={theme.signal}>{before}</Text><Text backgroundColor={theme.signal} color="black">{busy ? '·' : cursor < token.length ? '•' : ' '}</Text><Text color={theme.signal}>{after}</Text>
        {!token && <Text color={theme.muted}>  paste token here</Text>}
      </Box>
      <Text color={busy ? theme.warning : theme.muted}>{busy ? 'Verifying with GitHub…' : `TOKEN LENGTH ${token.length}  ·  CURSOR ${cursor + 1}  ·  in memory only`}</Text>
      </>}
      {view === 'help' && <Box flexDirection="column" marginTop={1}>
        <Text bold>GITHUB CLI  /  INSTALLATION MANUAL</Text>
        <Text>gh is GitHub's command-line tool. Install it where this app runs.</Text>
        <Text color={theme.muted}>1. In a separate shell, install gh:</Text>
        {installation.command ? <Text color={theme.accent}>   $ {installation.command}</Text> : <Text color={theme.muted}>   See the official guide for your platform.</Text>}
        {installation.command && <Text color={theme.muted}>   Press y to copy the command, or select it with your mouse.</Text>}
        <Text color={theme.muted}>2. Confirm the installation:</Text>
        <Text color={theme.accent}>   $ gh --version</Text>
        <Text color={theme.muted}>3. Sign in to GitHub when gh prompts you:</Text>
        <Text color={theme.accent}>   $ gh auth login</Text>
        <Text color={theme.muted}>4. Restart this app and choose GitHub CLI from the menu.</Text>
        <Text color={theme.muted}>Official instructions: {installation.guide}</Text>
      </Box>}
      {error && <Text color={theme.error}>⚠ {error}</Text>}
      {busy && view === 'menu' && <Text color={theme.warning}>Verifying with GitHub…</Text>}
    </Box>
    {copyToast > 0 && view === 'help' && <Box borderStyle="round" borderColor={theme.signal} paddingX={1} marginTop={1}>
      <Text color={theme.signal}>✓ Clipboard copy requested · Paste the command in your shell</Text>
    </Box>}
    <Text color={theme.muted} wrap="truncate">{view === 'menu' ? ' ↑↓ move · →/> open · 1–4 · Esc quit' : view === 'help' ? ' y copy · ←/< back' : ' Enter sign in · ? guide · ←→ cursor · ^U clear · Esc back'}</Text>
  </Box>;
}
