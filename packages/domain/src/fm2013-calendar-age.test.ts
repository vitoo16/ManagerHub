import { describe, expect, it } from 'vitest';
import { calculateCalendarAge, CALENDAR_AGE_MODEL_VERSION } from './fm2013-calendar-age';

describe('derived month/day calendar age', () => {
  it('uses completed years and preserves newborn zero', () => {
    expect(calculateCalendarAge('2000-07-17', '2020-07-16')).toMatchObject({ status: 'calculated', value: 19 });
    expect(calculateCalendarAge('2000-07-17', '2020-07-17')).toMatchObject({ status: 'calculated', value: 20 });
    expect(calculateCalendarAge('2000-07-17', '2000-07-17')).toMatchObject({ status: 'calculated', value: 0 });
  });
  it('states a March1 common-year anniversary for leap-day births', () => {
    expect(calculateCalendarAge('2000-02-29', '2001-02-28')).toMatchObject({ value: 0 });
    expect(calculateCalendarAge('2000-02-29', '2001-03-01')).toMatchObject({ value: 1 });
    expect(calculateCalendarAge('2000-02-29', '2004-02-29')).toMatchObject({ value: 4 });
  });
  it('rejects future births, malformed dates and invalid Gregorian boundaries', () => {
    expect(calculateCalendarAge('2020-01-02', '2020-01-01')).toMatchObject({ status: 'unknown', reason: 'future_birth_date' });
    for (const bad of ['1900-02-29', '2001-02-29', '2000-02-30', '2000-00-01', '2000-13-01', '2000-01-00', '1000-01-01', '3000-01-01', '2000-1-01', '2000-01-01T00:00:00Z', '']) {
      expect(calculateCalendarAge(bad, '2020-01-01')).toMatchObject({ status: 'unknown', reason: 'invalid_date' });
      expect(calculateCalendarAge('2000-01-01', bad)).toMatchObject({ status: 'unknown', reason: 'invalid_date' });
    }
  });
  it('is immutable, versioned and distinct from elapsed-duration age', () => {
    const result = calculateCalendarAge('1896-01-01', '1896-12-31');
    expect(result).toEqual({ status: 'calculated', value: 0, modelVersion: CALENDAR_AGE_MODEL_VERSION });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(calculateCalendarAge('bad', 'bad'))).toBe(true);
    expect(result).not.toHaveProperty('verified');
  });
});
