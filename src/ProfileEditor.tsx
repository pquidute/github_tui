import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {Profile} from './dashboard.js';
import {theme} from './theme.js';

const fields: {key: keyof Profile; label: string}[] = [
  {key: 'name', label: 'Name'}, {key: 'bio', label: 'Bio'}, {key: 'company', label: 'Company'},
  {key: 'location', label: 'Location'}, {key: 'blog', label: 'Website'}, {key: 'twitter_username', label: 'Twitter'},
];

export default function ProfileEditor({initial, busy, error, onCancel, onSave}: {
  initial: Profile; busy: boolean; error: string; onCancel: () => void; onSave: (changes: Partial<Profile>) => void;
}) {
  const [draft, setDraft] = useState<Profile>({...initial});
  const [selected, setSelected] = useState(0);
  const [cursor, setCursor] = useState(initial.name.length);
  const field = fields[selected]!.key;
  const value = draft[field];
  function select(index: number) {
    const next = (index + fields.length) % fields.length;
    setSelected(next); setCursor(draft[fields[next]!.key].length);
  }
  function change(next: string, position: number) {
    setDraft(current => ({...current, [field]: next})); setCursor(position);
  }
  useInput((input, key) => {
    if (busy) return;
    if (key.escape) { onCancel(); return; }
    if (key.ctrl && input === 's') {
      const changes: Partial<Profile> = {};
      for (const {key: name} of fields) {
        const next = draft[name].trim();
        if (next !== initial[name]) changes[name] = next;
      }
      onSave(changes);
      return;
    }
    if (key.upArrow) { select(selected - 1); return; }
    if (key.downArrow || key.tab || key.return) { select(selected + 1); return; }
    if (key.leftArrow) { setCursor(current => Math.max(0, current - 1)); return; }
    if (key.rightArrow) { setCursor(current => Math.min(value.length, current + 1)); return; }
    if (key.home || (key.ctrl && input === 'a')) { setCursor(0); return; }
    if (key.end || (key.ctrl && input === 'e')) { setCursor(value.length); return; }
    if (key.ctrl && input === 'u') { change('', 0); return; }
    if (key.backspace || key.delete) {
      const index = key.backspace ? cursor - 1 : cursor;
      if (index >= 0 && index < value.length) change(value.slice(0, index) + value.slice(index + 1), key.backspace ? index : cursor);
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      const clean = input.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ');
      if (clean) change(value.slice(0, cursor) + clean + value.slice(cursor), cursor + clean.length);
    }
  });
  return <Box flexDirection="column">
    <Text bold color={theme.accent}>EDIT PROFILE</Text>
    {fields.map(({key, label}, index) => {
      const text = draft[key];
      const active = index === selected;
      return <Text key={key} wrap="truncate" color={active ? theme.accent : theme.muted}>
        {active ? '❯ ' : '  '}{label.padEnd(9)}
        {active ? <>{text.slice(0, cursor)}<Text inverse>{text[cursor] || ' '}</Text>{text.slice(cursor + (cursor < text.length ? 1 : 0))}</> : text || '—'}
      </Text>;
    })}
    {error && <Text color={theme.error}>⚠ {error}</Text>}
    <Text color={theme.muted} wrap="truncate">{busy ? 'Saving…' : '↑↓ field · ←→ cursor · Ctrl+S save · Esc cancel'}</Text>
  </Box>;
}
