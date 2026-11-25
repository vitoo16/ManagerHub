export function clampInt(val: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(val, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
