import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {theme} from './theme.js';

export default function Composer({kind, repo, target, busy, error, onCancel, onSubmit}: {
  kind: 'issue' | 'comment'; repo: string; target?: string; busy: boolean; error: string;
  onCancel: () => void; onSubmit: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [field, setField] = useState<'title' | 'body'>(kind === 'issue' ? 'title' : 'body');
  const [cursor, setCursor] = useState(0);
  const value = field === 'title' ? title : body;
  const update = field === 'title' ? setTitle : setBody;
  function switchField() { setField(current => current === 'title' ? 'body' : 'title'); setCursor(field === 'title' ? body.length : title.length); }
  useInput((input, key) => {
    if (busy) return;
    if (key.escape) { onCancel(); return; }
    if (key.ctrl && input === 's') { onSubmit(title, body); return; }
    if (key.tab && kind === 'issue') { switchField(); return; }
    if (key.return) {
      if (field === 'title') { setField('body'); setCursor(body.length); }
      else { setBody(current => current.slice(0, cursor) + '\n' + current.slice(cursor)); setCursor(current => current + 1); }
      return;
    }
    if (key.leftArrow) { setCursor(current => Math.max(0, current - 1)); return; }
    if (key.rightArrow) { setCursor(current => Math.min(value.length, current + 1)); return; }
    if (key.home || (key.ctrl && input === 'a')) { setCursor(0); return; }
    if (key.end || (key.ctrl && input === 'e')) { setCursor(value.length); return; }
    if (key.ctrl && input === 'u') { update(''); setCursor(0); return; }
    if (key.backspace || key.delete) {
      const index = key.backspace ? cursor - 1 : cursor;
      if (index >= 0 && index < value.length) { update(current => current.slice(0, index) + current.slice(index + 1)); if (key.backspace) setCursor(index); }
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      const clean = input.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
      if (clean) { update(current => current.slice(0, cursor) + clean + current.slice(cursor)); setCursor(current => current + clean.length); }
    }
  });
  function display(value: string, active: boolean) {
    if (!active) return value || ' ';
    return <>{value.slice(0, cursor)}<Text inverse>{value[cursor] || ' '}</Text>{value.slice(cursor + (cursor < value.length ? 1 : 0))}</>;
  }
  return <Box flexDirection="column">
    <Text bold color={theme.accent}>{kind === 'issue' ? 'NEW ISSUE' : 'NEW COMMENT'}  /  {repo}{target ? `  /  ${target}` : ''}</Text>
    {kind === 'issue' && <Box marginTop={1} flexDirection="column"><Text color={theme.muted}>TITLE</Text><Text>{display(title, field === 'title')}</Text></Box>}
    <Box marginTop={1} flexDirection="column"><Text color={theme.muted}>BODY  /  MARKDOWN</Text><Text>{display(body, field === 'body')}</Text></Box>
    {error && <Text color={theme.error}>⚠ {error}</Text>}
    <Text color={theme.muted} wrap="truncate">{busy ? 'Publishing…' : `Ctrl+S post · Enter line · Esc cancel${kind === 'issue' ? ' · Tab field' : ''}`}</Text>
  </Box>;
}
