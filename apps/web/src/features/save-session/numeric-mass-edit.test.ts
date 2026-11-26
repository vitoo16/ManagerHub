import { describe, expect, it } from 'vitest';
import { validatePlayerDraftPatch, type PlayerDraftPatch } from '@managerhub/domain/fm2013-offline';
import { planNumericMassEdit, type NumericMassField } from './numeric-mass-edit';

const records = [
  { uid: 1, name: 'Alpha', morale: 12 },
  { uid: 2, name: 'Alpha', morale: null },
  { uid: 3, name: 'Alpha', morale: 18 },
  { uid: 4, name: 'Beta', morale: 10 }
];
type RecordType = typeof records[number];
const field: NumericMassField<RecordType, PlayerDraftPatch> = {
  id: 'morale', label: 'Morale', group: 'Ability', read: record => record.morale, patch: value => ({ morale: value })
};
const plan = (query: string, all: boolean, raw: string) =>
  planNumericMassEdit(records, field, { query, all, raw }, record => record.name, validatePlayerDraftPatch);
describe('explicit numeric mass edit planning', () => {
  it('requires a scope and a valid explicit value', () => {
    expect(plan('', false, '18').changes).toEqual([]);
    expect(plan('', true, '').patch).toBeNull();
    for (const raw of ['21', '12.5', '1e1', 'NaN']) expect(plan('', true, raw).invalid).toBe(true);
  });
  it('classifies observed changes, unavailable values and no-ops without changing PA', () => {
    const result = plan('alpha', false, '18');
    expect(result).toMatchObject({ matched: 3, unavailable: 1, unchanged: 1, patch: { morale: 18 } });
    expect(result.changes.map(change => change.record.uid)).toEqual([1]);
    expect(plan('', true, '18').changes.map(change => change.record.uid)).toEqual([1, 4]);
  });
});
