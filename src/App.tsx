import {theme} from './theme.js';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import Login from './Login.js';
import type {Session} from './github.js';
import {loadPage, sections, type Page, type Profile} from './dashboard.js';
import Composer from './Composer.js';
import ProfileEditor from './ProfileEditor.js';
import Avatar from './Avatar.js';
import {avatarColumns} from './avatar.js';
import Companion from './Companion.js';
import {createComment, createIssue} from './writes.js';
import {numberedOption} from './navigation.js';
import {updateProfile} from './profile.js';
import {loadReadme, renderReadmeLines, type ReadmeLine} from './readme.js';

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
  const [readme, setReadme] = useState<{repository: string; content: string | null; loading: boolean; error: string} | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [composer, setComposer] = useState<{kind: 'issue' | 'comment'; repo: string; number?: number; target?: string} | null>(null);
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [writeError, setWriteError] = useState('');
  const [writeBusy, setWriteBusy] = useState(false);
  const [message, setMessage] = useState('');
  const writeRequest = useRef<AbortController | null>(null);
  const {exit} = useApp();
  const {rows, columns} = useWindowSize();
  const visible = Math.max(1, rows - 17);
  const listVisible = Math.min(9, visible);
  const avatarWidth = avatarColumns(columns, rows);
  useEffect(() => () => writeRequest.current?.abort(), []);
  useEffect(() => {
    if (section === null) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setData(null); setSelected(0); setDetail(section === 0); setOffset(0);
    loadPage(session, section, page, controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Request failed.');
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [session, section, page, revision]);
  const entry = data?.entries[selected];
  const repository = section === 1 && detail ? entry?.repo : undefined;
  useEffect(() => {
    if (!repository) return;
    const controller = new AbortController();
    setReadme({repository, content: null, loading: true, error: ''});
    loadReadme(session, repository, controller.signal).then(content => {
      if (!controller.signal.aborted) setReadme({repository, content, loading: false, error: ''});
    }).catch(failure => {
      if (!controller.signal.aborted) setReadme({repository, content: null, loading: false, error: failure instanceof Error ? failure.message : 'Could not load README.'});
    });
    return () => controller.abort();
  }, [session, repository, revision]);
  const activeReadme = repository && readme?.repository === repository ? readme : null;
  const detailWidth = Math.max(1, columns - (section === 0 && data?.avatarUrl ? avatarWidth + 9 : 6));
  const readmeLines = useMemo(() => activeReadme?.content ? renderReadmeLines(activeReadme.content, detailWidth) : [], [activeReadme?.content, detailWidth]);
  const detailLines = (entry?.detail ?? '').split('\n').flatMap(line => {
    const width = detailWidth;
    return line.match(new RegExp(`.{1,${width}}`, 'gu')) ?? [''];
  });
  const repoLines: ReadmeLine[] | null = section === 1 && detail && repository ? [
    ...detailLines.map(text => ({kind: 'body' as const, parts: [{text}]})),
    {kind: 'blank', parts: [{text: ''}]},
    {kind: 'heading', parts: [{text: '▰ README'}]},
    {kind: 'blank', parts: [{text: ''}]},
    ...(activeReadme?.loading || !activeReadme
      ? [{kind: 'quote' as const, parts: [{text: 'Loading README…'}]}]
      : activeReadme.error || activeReadme.content === null || !activeReadme.content.trim()
        ? [{kind: 'quote' as const, parts: [{text: activeReadme.error || (activeReadme.content === null ? 'No README found, or Contents access is unavailable.' : 'README is empty.')}]}]
        : readmeLines),
  ] : null;
  const detailLength = repoLines?.length ?? detailLines.length;
  const start = Math.floor(selected / listVisible) * listVisible;
  async function publish(title: string, body: string) {
    if (!composer || writeRequest.current) return;
    const controller = new AbortController();
    writeRequest.current = controller;
    setWriteBusy(true); setWriteError('');
    try {
      const url = composer.kind === 'issue'
        ? await createIssue(session, composer.repo, title, body, controller.signal)
        : await createComment(session, composer.repo, composer.number!, body, controller.signal);
      if (!controller.signal.aborted) {
        setComposer(null);
        setMessage(`${composer.kind === 'issue' ? 'Issue' : 'Comment'} published: ${url}`);
        setRevision(value => value + 1);
      }
    } catch (failure) {
      if (!controller.signal.aborted) setWriteError(failure instanceof Error ? failure.message : 'Publishing failed.');
    } finally {
      writeRequest.current = null;
      if (!controller.signal.aborted) setWriteBusy(false);
    }
  }
  async function saveProfile(changes: Partial<Profile>) {
    if (writeRequest.current) return;
    const controller = new AbortController();
    writeRequest.current = controller;
    setWriteBusy(true); setWriteError('');
    try {
      await updateProfile(session, changes, controller.signal);
      if (!controller.signal.aborted) {
        setProfileDraft(null);
        setMessage('Profile updated.');
        setRevision(value => value + 1);
      }
    } catch (failure) {
      if (!controller.signal.aborted) setWriteError(failure instanceof Error ? failure.message : 'Could not update profile.');
    } finally {
      writeRequest.current = null;
      if (!controller.signal.aborted) setWriteBusy(false);
    }
  }
  useInput((input, key) => {
    if (composer || profileDraft) return;
    if (input === 'q') { exit(); return; }
    if (input === 's') { signOut(); return; }
    if (avatarExpanded) { if (key.escape || key.leftArrow || input === '<' || input === 'a') setAvatarExpanded(false); return; }
    if (key.escape || key.leftArrow || input === '<') { if (section === 0) setSection(null); else if (detail) setDetail(false); else if (section !== null) setSection(null); return; }
    if (section === null) {
      if (key.upArrow || input === 'k') setMenu(value => (value + sections.length - 1) % sections.length);
      if (key.downArrow || input === 'j') setMenu(value => (value + 1) % sections.length);
      const choice = numberedOption(input, sections.length);
      if (choice !== null || key.return || key.rightArrow || input === '>') { if (choice !== null) setMenu(choice); setPage(1); setSection(choice ?? menu); }
      return;
    }
    if (input === 'r') { setRevision(value => value + 1); return; }
    if (busy) return;
    if (input === 'a' && section === 0 && data?.avatarUrl) { setAvatarExpanded(true); return; }
    if (input === 'e' && section === 0 && data?.profile) { setWriteError(''); setProfileDraft(data.profile); return; }
    if (detail) {
      if (input === 'c' && entry?.repo && entry.number) { setWriteError(''); setComposer({kind: 'comment', repo: entry.repo, number: entry.number, target: entry.title}); return; }
      if (input === 'i' && section === 1 && entry?.repo && entry.canCreateIssue) { setWriteError(''); setComposer({kind: 'issue', repo: entry.repo}); return; }
      if (key.downArrow || input === 'j') setOffset(value => Math.min(Math.max(0, detailLength - visible), value + 1));
      if (key.upArrow || input === 'k') setOffset(value => Math.max(0, value - 1));
      return;
    }
    if (input === 'n' && data?.next) setPage(value => value + 1);
    if (input === 'p' && page > 1) setPage(value => value - 1);
    const choice = numberedOption(input, Math.min(listVisible, (data?.entries.length ?? 0) - start));
    if (choice !== null) { setSelected(start + choice); setDetail(true); setOffset(0); return; }
    if (key.downArrow || input === 'j') setSelected(value => Math.min((data?.entries.length ?? 1) - 1, value + 1));
    if (key.upArrow || input === 'k') setSelected(value => Math.max(0, value - 1));
    if ((key.return || key.rightArrow || input === '>') && entry) { setDetail(true); setOffset(0); }
  });
  const selectedStyle = (active: boolean) => ({
    color: active ? 'black' : theme.text,
    backgroundColor: active ? theme.highlight : undefined,
  } as const);
  const hint = section === null ? '↑↓ move · →/> open · 1–5 · s out · q quit'
    : detail ? `↑↓ scroll · ←/< back${section === 0 ? ' · e edit · a photo' : ''}${section === 1 && entry?.canCreateIssue ? ' · i issue' : ''}${(section === 2 || section === 3) && entry?.repo ? ' · c comment' : ''}`
    : `↑↓ move · →/> open · 1–9 · ←/< back${section === 0 ? ' · e edit · a photo' : ' · n/p page'} · r reload`;
  if (avatarExpanded && data?.avatarUrl) return <Box flexDirection="column" height={rows} paddingX={1}>
    <Text bold color={theme.accent}>◈ PROFILE PHOTO  /  @{session.login}</Text>
    <Box flexGrow={1} alignItems="center" justifyContent="center"><Avatar url={data.avatarUrl} width={avatarColumns(columns, rows, true)} /></Box>
    <Text color={theme.muted}>{'←/< back · a close'}</Text>
  </Box>;
  return <Box flexDirection="column" paddingX={1}>
    <Box borderStyle="single" borderColor={theme.frame} paddingX={1} justifyContent="space-between" alignItems="center">
      <Box flexDirection="column"><Text bold color={theme.accent}>◈ GITHUB // TUI</Text><Text color={theme.signal}>● CONNECTED  @{session.login}</Text>{section === null && <Text color={theme.muted}>Pedro Quidute</Text>}</Box>
      <Companion mood={busy || writeBusy ? 'busy' : error || writeError ? 'error' : message ? 'success' : 'idle'} />
    </Box>
    <Box marginTop={1}>
      <Text color={theme.accent}>▸ </Text><Text bold>{section === null ? 'COMMAND CENTER' : `${sections[section]!.toUpperCase()}  /  PAGE ${page}`}</Text>
      {busy && <Text color={theme.warning}>  ◌ SYNCING</Text>}
    </Box>
    <Box flexDirection="column" borderStyle="round" borderColor={theme.frame} paddingX={2} paddingY={1} minHeight={Math.min(rows - 12, 9)}>
      {profileDraft ? <ProfileEditor initial={profileDraft} busy={writeBusy} error={writeError} onCancel={() => setProfileDraft(null)} onSave={changes => { void saveProfile(changes); }} /> : composer ? <Composer kind={composer.kind} repo={composer.repo} target={composer.target} busy={writeBusy} error={writeError} onCancel={() => setComposer(null)} onSubmit={(title, body) => { void publish(title, body); }} /> : section === null ? sections.map((name, index) => <Text key={name} {...selectedStyle(index === menu)}>{index === menu ? ' ❯ ' : '   '}{index + 1}  {name.toUpperCase()}  {index === menu ? '→' : ''}</Text>) : busy ? <Text color={theme.warning}>◌ Retrieving data from GitHub…</Text> : error ? <Text color={theme.error}>⚠ {error}</Text> : section === 0 && data?.avatarUrl && entry ? <Box flexDirection="row">
        <Avatar url={data.avatarUrl} width={avatarWidth} />
        <Box flexDirection="column" marginLeft={2}>
          <Text bold color={theme.accent} wrap="truncate">{detail ? entry.title : `❯ 1  ${entry.title}`}</Text>
          {detail && <><Text color={theme.signal} wrap="truncate">↗ {entry.url}</Text><Text>{detailLines.slice(offset, offset + visible).join('\n')}</Text></>}
        </Box>
      </Box> : detail && entry ? <>
        <Text bold color={theme.accent} wrap="truncate">{entry.title}</Text>
        <Text color={theme.signal} wrap="truncate">↗ {entry.url}</Text>
        <Box marginTop={1} flexDirection="column">{repoLines ? repoLines.slice(offset, offset + visible).map((line, index) => <Text key={offset + index} wrap="truncate" bold={line.kind === 'heading' || line.kind === 'subheading'} italic={line.kind === 'quote'} color={line.kind === 'heading' ? theme.accent : line.kind === 'subheading' || line.kind === 'list' ? theme.signal : line.kind === 'quote' || line.kind === 'rule' ? theme.muted : theme.text} backgroundColor={line.kind === 'code' ? '#222222' : undefined}>{line.parts.map((part, partIndex) => <Text key={partIndex} bold={part.style === 'strong'} italic={part.style === 'emphasis'} underline={part.style === 'link'} color={part.style === 'link' ? theme.accent : part.style === 'code' ? theme.signal : undefined}>{part.text}</Text>)}</Text>) : <Text>{detailLines.slice(offset, offset + visible).join('\n')}</Text>}</Box>
      </> : data?.entries.length ? data.entries.slice(start, start + listVisible).map((item, index) => <Text key={start + index} wrap="truncate" {...selectedStyle(start + index === selected)}>{start + index === selected ? ' ❯ ' : '   '}{index + 1}  {item.title}</Text>) : <Text color={theme.muted}>◇ No accessible results found.</Text>}
    </Box>
    {message && <Text color={theme.signal} wrap="truncate">✓ {message}</Text>}
    {section !== null && data && <Text color={theme.warning} wrap="truncate">◈ {data.notice}</Text>}
    {!composer && !profileDraft && <Text color={theme.muted} wrap="truncate"> {hint}</Text>}
  </Box>;
}
