import {theme} from './theme.js';
import {useEffect, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import Login from './Login.js';
import type {Session} from './github.js';
import {loadPage, sections, type Page} from './dashboard.js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  return session ? <Dashboard session={session} signOut={() => setSession(null)} /> : <Login onLogin={setSession} />;
}
function Dashboard({session, signOut}: {session: Session; signOut: () => void}) {
  const [menu, setMenu] = useState(0);
  const [section, setSection] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState(false);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const {exit} = useApp();
  const {rows, columns} = useWindowSize();
  const visible = Math.max(1, rows - 15);
  useEffect(() => {
    if (section === null) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setData(null); setSelected(0); setDetail(false); setOffset(0);
    loadPage(session, section, page, controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Request failed.');
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [session, section, page, revision]);
  const entry = data?.entries[selected];
  const detailLines = (entry?.detail ?? '').split('\n').flatMap(line => {
    const width = Math.max(1, columns - 6);
    return line.match(new RegExp(`.{1,${width}}`, 'gu')) ?? [''];
  });
  useInput((input, key) => {
    if (input === 'q') { exit(); return; }
    if (input === 's') { signOut(); return; }
    if (key.escape) { if (detail) setDetail(false); else setSection(null); return; }
    if (section === null) {
      if (key.upArrow || input === 'k') setMenu(value => (value + sections.length - 1) % sections.length);
      if (key.downArrow || input === 'j') setMenu(value => (value + 1) % sections.length);
      if (key.return) { setPage(1); setSection(menu); }
      return;
    }
    if (input === 'r') { setRevision(value => value + 1); return; }
    if (busy) return;
    if (detail) {
      if (key.downArrow || input === 'j') setOffset(value => Math.min(Math.max(0, detailLines.length - visible), value + 1));
      if (key.upArrow || input === 'k') setOffset(value => Math.max(0, value - 1));
      return;
    }
    if (input === 'n' && data?.next) setPage(value => value + 1);
    if (input === 'p' && page > 1) setPage(value => value - 1);
    if (key.downArrow || input === 'j') setSelected(value => Math.min((data?.entries.length ?? 1) - 1, value + 1));
    if (key.upArrow || input === 'k') setSelected(value => Math.max(0, value - 1));
    if (key.return && entry) { setDetail(true); setOffset(0); }
  });
  const start = Math.floor(selected / visible) * visible;
  const selectedStyle = (active: boolean) => ({
    color: active ? 'black' : theme.text,
    backgroundColor: active ? theme.highlight : undefined,
  } as const);
  return <Box flexDirection="column" paddingX={1}>
    <Box borderStyle="single" borderColor={theme.frame} paddingX={1} justifyContent="space-between">
      <Text bold color={theme.accent}>◈ GITHUB // TUI</Text>
      <Text color={theme.signal}>● CONNECTED  @{session.login}</Text>
    </Box>
    <Box marginTop={1}>
      <Text color={theme.accent}>▸ </Text><Text bold>{section === null ? 'COMMAND CENTER' : `${sections[section]!.toUpperCase()}  /  PAGE ${page}`}</Text>
      {busy && <Text color={theme.warning}>  ◌ SYNCING</Text>}
    </Box>
    <Box flexDirection="column" borderStyle="round" borderColor={theme.frame} paddingX={2} paddingY={1} minHeight={Math.min(rows - 8, 9)}>
      {section === null ? sections.map((name, index) => <Text key={name} {...selectedStyle(index === menu)}>{index === menu ? ' ❯ ' : '   '}{String(index + 1).padStart(2, '0')}  {name.toUpperCase()}  {index === menu ? '↵' : ''}</Text>) : busy ? <Text color={theme.warning}>◌ Retrieving data from GitHub…</Text> : error ? <Text color={theme.error}>⚠ {error}</Text> : detail && entry ? <>
        <Text bold color={theme.accent} wrap="truncate">{entry.title}</Text>
        <Text color={theme.signal} wrap="truncate">↗ {entry.url}</Text>
        <Box marginTop={1}><Text>{detailLines.slice(offset, offset + visible).join('\n')}</Text></Box>
      </> : data?.entries.length ? data.entries.slice(start, start + visible).map((item, index) => <Text key={start + index} wrap="truncate" {...selectedStyle(start + index === selected)}>{start + index === selected ? ' ❯ ' : '   '}{item.title}</Text>) : <Text color={theme.muted}>◇ No accessible results found.</Text>}
    </Box>
    {section !== null && data && <Text color={theme.warning} wrap="truncate">◈ {data.notice}</Text>}
    <Box borderStyle="single" borderColor={theme.muted} paddingX={1} flexDirection="column">
      <Text color={theme.muted}>{section === null ? '↑/↓ NAVIGATE  ·  ENTER OPEN' : detail ? '↑/↓ SCROLL  ·  ESC BACK' : `↑/↓ NAVIGATE  ·  ENTER DETAILS  ·  N NEXT  ·  P PREVIOUS  ·  R REFRESH  ·  ESC BACK`}</Text>
      <Text color={theme.muted}>S SIGN OUT  ·  Q QUIT</Text>
    </Box>
  </Box>;
}
