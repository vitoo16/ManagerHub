import { describe, expect, it } from 'vitest';
import { planMassEdit } from './mass-edit-plan';

const players = [
  { uid: 1, clubUid: 9, calendarAge: 20 },
  { uid: 2, clubUid: 9, calendarAge: null },
  { uid: 3, clubUid: 10, calendarAge: 25 }
];
const empty = { club: 'all', maximumAge: '', morale: '', actualCa: '' };
describe('mass edit selection and explicit patch', () => {
  it('does not apply a default edit or change morale/PA on a CA-only edit', () => {
    expect(planMassEdit(players, empty).patch).toBeNull();
    expect(planMassEdit(players, { ...empty, actualCa: '180' }).patch).toEqual({ actualCa: 180 });
    expect(planMassEdit(players, { ...empty, morale: '17' }).patch).toEqual({ morale: 17 });
  });
  it('excludes unknown ages only when an age filter is requested and respects club scope', () => {
    expect(planMassEdit(players, { ...empty, club: '9' }).matches.map(player => player.uid)).toEqual([1, 2]);
    expect(planMassEdit(players, { ...empty, club: '9', maximumAge: '22' }).matches.map(player => player.uid)).toEqual([1]);
  });
  it('fails closed for invalid numeric ranges or invalid club selectors', () => {
    for (const inputs of [{ morale: '21' }, { actualCa: '150.5' }, { maximumAge: '0' }, { club: '' }]) {
      const plan = planMassEdit(players, { ...empty, ...inputs });
      expect(plan.valid).toBe(false);
      expect(plan.patch).toBeNull();
      expect(plan.matches).toEqual([]);
    }
  });
});
