export const CALENDAR_AGE_MODEL_VERSION = 'gregorian-month-day-v1' as const;
export type CalendarAgeResult =
  | { readonly status: 'calculated'; readonly value: number; readonly modelVersion: typeof CALENDAR_AGE_MODEL_VERSION }
  | { readonly status: 'unknown'; readonly reason: 'invalid_date' | 'future_birth_date'; readonly modelVersion: typeof CALENDAR_AGE_MODEL_VERSION };

function calendarParts(iso: string): readonly [number, number, number] | null {
  if (typeof iso !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maximum = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return year > 1000 && year < 3000 && maximum !== undefined && day > 0 && day <= maximum ? [year, month, day] : null;
}

/** Completed calendar years, with a Feb29 anniversary on March1 in common years.
 * A derived calendar policy, not a claim about the game engine or FMRTE's age getter.
 */
export function calculateCalendarAge(bornIso: string, asOfIso: string): CalendarAgeResult {
  const born = calendarParts(bornIso), current = calendarParts(asOfIso);
  if (!born || !current) return Object.freeze({ status: 'unknown', reason: 'invalid_date', modelVersion: CALENDAR_AGE_MODEL_VERSION });
  if (asOfIso < bornIso) return Object.freeze({ status: 'unknown', reason: 'future_birth_date', modelVersion: CALENDAR_AGE_MODEL_VERSION });
  const beforeAnniversary = current[1] < born[1] || (current[1] === born[1] && current[2] < born[2]);
  return Object.freeze({ status: 'calculated', value: current[0] - born[0] - Number(beforeAnniversary), modelVersion: CALENDAR_AGE_MODEL_VERSION });
}
