import {useEffect, useState} from 'react';
import {Text, useInput, useWindowSize} from 'ink';
import {theme} from './theme.js';

export type CompanionMood = 'idle' | 'busy' | 'error' | 'success';
type Gesture = 'left' | 'right' | 'up' | 'down' | 'action' | null;

export function companionFrame(mood: CompanionMood, gesture: Gesture, tick: number): string {
  let eyes = tick % 14 === 0 ? '▀ ▀' : '▄ ▄';
  if (gesture === 'left') eyes = '█ ▄';
  else if (gesture === 'right') eyes = '▄ █';
  else if (gesture === 'up') eyes = '▀ ▀';
  else if (gesture === 'down') eyes = '▄█▄';
  else if (gesture === 'action') eyes = '█ █';
  if (mood === 'success' && !gesture) eyes = '█ █';
  if (mood === 'busy') eyes = tick % 2 ? '▄ █' : '█ ▄';
  if (mood === 'error') eyes = '▀▄▀';
  const antenna = mood === 'busy' && tick % 2 ? '█' : '▄';
  const arms = tick % 2 ? ' ▄▀ █ ▀▄ ' : ' ▀▄ █ ▄▀ ';
  return [`    ${antenna}    `, '  ▄███▄  ', `  █${eyes}█  `, '  ▀███▀  ', arms].join('\n');
}

export default function Companion({mood = 'idle'}: {mood?: CompanionMood}) {
  const [tick, setTick] = useState(1);
  const [reaction, setReaction] = useState<{gesture: Gesture} | null>(null);
  const {columns} = useWindowSize();
  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 240);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(() => setReaction(null), 650);
    return () => clearTimeout(timer);
  }, [reaction]);
  useInput((_input, key) => {
    // React to a key's direction only; never keep typed characters or tokens.
    const gesture = key.leftArrow ? 'left' : key.rightArrow ? 'right' : key.upArrow ? 'up' : key.downArrow ? 'down' : 'action';
    setReaction({gesture});
  });
  const lines = companionFrame(mood, reaction?.gesture ?? null, tick).split('\n');
  return <Text color={theme.accent}>{(columns < 50 ? lines.slice(1, 4) : lines).join('\n')}</Text>;
}
