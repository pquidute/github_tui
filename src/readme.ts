import type {Session} from './github.js';

export async function loadReadme(session: Session, repository: string, signal: AbortSignal): Promise<string | null> {
  const parts = repository.split('/');
  if (parts.length !== 2 || parts.some(part => !/^[\w.-]+$/.test(part))) throw new Error('Invalid repository name.');
  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${parts.map(encodeURIComponent).join('/')}/readme`, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
        Authorization: `Bearer ${session.token}`,
        'User-Agent': 'github-tui',
      },
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
  } catch {
    throw new Error('Could not load README. Check your connection, then press r to retry.');
  }
  if (response.status === 404) return null;
  if (response.status === 401) throw new Error('Token expired or revoked. Press s to sign in again.');
  if (response.status === 403) throw new Error('README access unavailable. Check token Contents permission, then press r to retry.');
  if (!response.ok) throw new Error('Could not load README. Press r to retry.');
  const content = await response.text();
  return content.slice(0, 150_000);
}

export type ReadmePart = {text: string; style?: 'strong' | 'emphasis' | 'code' | 'link'};
export type ReadmeLine = {kind: 'body' | 'heading' | 'subheading' | 'list' | 'quote' | 'code' | 'rule' | 'blank'; parts: ReadmePart[]};

function inlineParts(source: string): ReadmePart[] {
  const parts: ReadmePart[] = [];
  const pattern = /!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index;
    if (index > last) parts.push({text: source.slice(last, index)});
    if (match[1] !== undefined) parts.push({text: `[image: ${match[1] || 'untitled'}]`, style: 'emphasis'});
    else if (match[2] !== undefined) parts.push({text: `${match[2]} (${match[3]})`, style: 'link'});
    else if (match[4] !== undefined) parts.push({text: match[4], style: 'code'});
    else if (match[5] !== undefined || match[6] !== undefined) parts.push({text: match[5] ?? match[6]!, style: 'strong'});
    else parts.push({text: match[7] ?? match[8]!, style: 'emphasis'});
    last = index + match[0].length;
  }
  if (last < source.length) parts.push({text: source.slice(last)});
  return parts;
}

function wrapLine(kind: ReadmeLine['kind'], parts: ReadmePart[], width: number, prefix = ''): ReadmeLine[] {
  if (kind === 'blank') return [{kind, parts: [{text: ''}]}];
  const glyphs = parts.flatMap(part => Array.from(part.text, text => ({text, style: part.style})));
  const result: ReadmeLine[] = [];
  let position = 0;
  do {
    const continuation = result.length > 0;
    const lead = continuation ? ' '.repeat(prefix.length) : prefix;
    const capacity = Math.max(1, width - lead.length);
    let take = Math.min(capacity, glyphs.length - position);
    if (kind !== 'code' && position + take < glyphs.length && glyphs[position + take]?.text !== ' ') {
      for (let cursor = take - 1; cursor > 0; cursor--) {
        if (/\s/.test(glyphs[position + cursor]!.text)) { take = cursor; break; }
      }
    }
    const chunk = glyphs.slice(position, position + take);
    const wrapped: ReadmePart[] = [{text: lead}];
    for (const glyph of chunk) {
      const previous = wrapped.at(-1);
      if (previous && previous.style === glyph.style) previous.text += glyph.text;
      else wrapped.push({text: glyph.text, style: glyph.style});
    }
    result.push({kind, parts: wrapped});
    position += take;
    if (kind !== 'code') while (glyphs[position]?.text === ' ') position++;
  } while (position < glyphs.length);
  return result;
}

export function renderReadmeLines(markdown: string, width: number): ReadmeLine[] {
  let inCode = false;
  const result: ReadmeLine[] = [];
  const source = markdown.replace(/\r\n?/g, '\n')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
  const sourceLines = source.split('\n');
  for (let index = 0; index < sourceLines.length; index++) {
    let line = sourceLines[index]!;
    if (/^\s*(```|~~~)/.test(line)) { inCode = !inCode; continue; }
    if (inCode || /^( {4}|\t)\S/.test(line)) {
      result.push(...wrapLine('code', [{text: inCode ? line : line.replace(/^( {4}|\t)/, ''), style: 'code'}], width, '│ '));
      continue;
    }
    if (!line.trim()) { result.push(...wrapLine('blank', [], width)); continue; }
    if (/^\s{0,3}(?:[-*_]\s*){3,}$/.test(line)) { result.push(...wrapLine('rule', [{text: '─'.repeat(Math.min(24, width))}], width)); continue; }
    const underline = sourceLines[index + 1];
    if (underline && /^\s{0,3}(?:={3,}|-{3,})\s*$/.test(underline)) {
      result.push(...wrapLine(underline.trim().startsWith('=') ? 'heading' : 'subheading', inlineParts(line.trim()), width, '▸ '));
      index++;
      continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
    if (heading) {
      result.push(...wrapLine(heading[1]!.length <= 2 ? 'heading' : 'subheading', inlineParts(heading[2]!), width, '▸ '));
      continue;
    }
    const quote = line.match(/^\s{0,3}>\s?(.*)$/);
    if (quote) { result.push(...wrapLine('quote', inlineParts(quote[1]!), width, '│ ')); continue; }
    const list = line.match(/^(\s{0,6})(?:[-+*]|\d+[.)])\s+(.+)$/);
    if (list) { result.push(...wrapLine('list', inlineParts(list[2]!), width, `${' '.repeat(Math.floor(list[1]!.length / 2) * 2)}• `)); continue; }
    line = line.replace(/^\s{0,3}/, '');
    result.push(...wrapLine('body', inlineParts(line), width));
  }
  while (result.at(-1)?.kind === 'blank') result.pop();
  return result;
}

export function formatReadme(markdown: string): string {
  return renderReadmeLines(markdown, 100_000).map(line => line.parts.map(part => part.text).join('')).join('\n').trim();
}
