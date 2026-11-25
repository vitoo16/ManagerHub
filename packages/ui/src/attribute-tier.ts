/** Numeric magnitude, not football desirability or a CA/PA/role-fit scale. */
export type AttributeTier = 'very-low' | 'low' | 'average' | 'above-average' | 'good' | 'excellent' | 'maximum';

/** Zero is valid only where the calling field's contract explicitly permits it. */
export function getAttributeTier(value: unknown, allowZero = false): AttributeTier | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < (allowZero ? 0 : 1) || value > 20) {
    return undefined;
  }
  if (value <= 6) return 'very-low';
  if (value <= 9) return 'low';
  if (value <= 11) return 'average';
  if (value <= 14) return 'above-average';
  if (value <= 16) return 'good';
  if (value <= 19) return 'excellent';
  return 'maximum';
}
