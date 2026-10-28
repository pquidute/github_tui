// Menu shortcuts are single keys; the caller decides what each visible option opens.
export function numberedOption(input: string, count: number): number | null {
  if (!/^[1-9]$/.test(input)) return null;
  const index = Number(input) - 1;
  return index < count ? index : null;
}
