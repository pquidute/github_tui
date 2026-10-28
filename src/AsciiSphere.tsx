import {theme} from './theme.js';
import {useEffect, useState} from 'react';
import {Text, useWindowSize} from 'ink';

const shades = ' .,:;irsXA253hMHGS#9B&@';
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function local(x: number, y: number, z: number, time: number) {
  const yaw = time * 0.42;
  const pitch = 0.22 + Math.sin(time * 0.19) * 0.23;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rx = x * cy + z * sy;
  const rz = z * cy - x * sy;
  return [rx, y * cp - rz * sp, y * sp + rz * cp] as const;
}

// Traveling waves change the sphere's radius in three dimensions.
function surface(x: number, y: number, z: number, time: number) {
  const [u, v, w] = local(x, y, z, time);
  const length = Math.hypot(u, v, w);
  if (length < 0.001) return -1;
  const nx = u / length, ny = v / length, nz = w / length;
  const wave = Math.sin(nx * 9 + ny * 5 - time * 1.35 + Math.sin(nz * 6 + time * 0.48)) * 0.055
    + Math.sin(ny * 13 - nz * 8 + time * 0.9) * 0.025
    + Math.sin(nx * 19 + nz * 15 - time * 0.65) * 0.011;
  return length - (1 + wave);
}

export function sphereFrame(seconds: number, width = 48, height = 11): string {
  const radius = Math.max(1, Math.min((width - 3) / 2.5, height - 2) / 2);
  const cx = (width - 1) / 2 + Math.sin(seconds * 0.31) * 0.4;
  const cy = (height - 1) / 2 + Math.sin(seconds * 0.46) * 0.24;
  const pixels = Array.from({length: height}, () => Array<string>(width).fill(' '));
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const x = (column - cx) / (radius * 2);
    const y = (cy - row) / radius;
    if (x * x + y * y > 1.17) continue;
    let z = 1.15;
    let hit = false;
    for (let step = 0; step < 32 && z > -1.1; step++) {
      const distance = surface(x, y, z, seconds);
      if (distance < 0.012) { hit = true; break; }
      z -= Math.max(0.012, distance * 0.8);
    }
    if (!hit) continue;
    const e = 0.025;
    const nx = surface(x + e, y, z, seconds) - surface(x - e, y, z, seconds);
    const ny = surface(x, y + e, z, seconds) - surface(x, y - e, z, seconds);
    const nz = surface(x, y, z + e, seconds) - surface(x, y, z - e, seconds);
    const magnitude = Math.hypot(nx, ny, nz) || 1;
    const diffuse = Math.max(0, (-0.43 * nx + 0.55 * ny + 0.72 * nz) / magnitude);
    const specular = Math.pow(Math.max(0, (-0.23 * nx + 0.29 * ny + 0.93 * nz) / magnitude), 16);
    pixels[row]![column] = shades[Math.round(clamp(0.14 + diffuse * 0.68 + specular * 0.18) * (shades.length - 1))]!;
  }

  // HUD elements share the animation's fixed canvas, so the login form stays put.
  const label = (row: number, column: number, value: string) => {
    for (let i = 0; i < value.length && column + i < width; i++) {
      if (column + i >= 0 && pixels[row]?.[column + i] === ' ') pixels[row]![column + i] = value[i]!;
    }
  };
  if (width >= 35 && height >= 9) {
    label(height - 1, 1, `WAVE ${Math.round(50 + Math.sin(seconds * 1.1) * 38).toString().padStart(2, '0')}%`);
    label(height - 1, width - 14, '● AUTH STANDBY');
  }
  for (const phase of [0, Math.PI]) {
    const orbit = seconds * 0.7 + phase;
    const column = Math.round(cx + Math.cos(orbit) * (radius * 2 + 3));
    const row = Math.round(cy + Math.sin(orbit) * (radius + 1));
    if (row >= 0 && row < height && column >= 0 && column < width && pixels[row]![column] === ' ') pixels[row]![column] = '·';
  }
  return pixels.map(line => line.join('')).join('\n');
}

export default function AsciiSphere() {
  const {columns, rows} = useWindowSize();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setSeconds((performance.now() - start) / 1000), 50);
    return () => clearInterval(timer);
  }, []);
  const width = Math.max(4, Math.min(56, columns - 2));
  const height = Math.max(4, Math.min(20, rows - 17));
  return <Text color={theme.accent}>{sphereFrame(seconds, width, height)}</Text>;
}
