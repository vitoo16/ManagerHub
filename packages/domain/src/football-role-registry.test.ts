import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_LABELS, parsePlayerExport } from './player-import';
import { ROLE_PROFILES, scoreRole } from './player-analysis';
import { FM2013_ROLE_POSITIONS, FM2013_ROLE_REFERENCES, getEditionRoles, getRoleDutyProfile } from './football-role-registry';

describe('edition-aware role catalog', () => {
  const roles = getEditionRoles('FM2013');
  it('keeps the original optimizer profiles stable and provides only reference-backed FM13 candidates', () => {
    expect(ROLE_PROFILES.map(role => role.id)).toEqual(['advanced-forward','target-forward','winger','advanced-playmaker','deep-playmaker','box-to-box','ball-winner','centre-back','wing-back','goalkeeper']);
    expect(roles).toHaveLength(28);
    expect(new Set(roles.map(role => role.id)).size).toBe(roles.length);
    expect(getEditionRoles('FM2014')).toEqual([]);
    for (const id of ['false-nine','regista','half-back','shadow-striker','enganche','complete-wing-back','wide-target-man','limited-full-back']) {
      expect(roles.some(role => role.id === id)).toBe(false);
    }
    for (const position of FM2013_ROLE_POSITIONS) expect(roles.some(role => role.positions.includes(position))).toBe(true);
    for (const role of roles) {
      expect(role.references.length).toBeGreaterThan(0);
      for (const reference of role.references) expect(FM2013_ROLE_REFERENCES[reference].url).toMatch(/^https:/);
      for (const key of Object.keys(role.demands)) expect(Object.hasOwn(ATTRIBUTE_LABELS, key)).toBe(true);
      for (const weights of [role.demands, ...Object.values(role.dutyImportance)]) {
        for (const [key, value] of Object.entries(weights)) {
          expect(Object.hasOwn(ATTRIBUTE_LABELS, key)).toBe(true);
          expect([1, 2, 3]).toContain(value);
        }
      }
    }
  });
  it('rejects incompatible positions and duties; automatic requires a concrete duty', () => {
    expect(getRoleDutyProfile('FM2013','poacher','ST','support')).toBeNull();
    expect(getRoleDutyProfile('FM2013','goalkeeper','DC','defend')).toBeNull();
    expect(getRoleDutyProfile('FM2013','full-back','DL','automatic')).toBeNull();
    expect(getRoleDutyProfile('FM2014','goalkeeper','GK','defend')).toBeNull();
    expect(getRoleDutyProfile('FM2013','centre-back','DC','stopper')?.demands.bravery).toBe(3);
    expect(getRoleDutyProfile('FM2013','centre-back','DC','cover')?.demands.acceleration).toBe(2);
  });
  it('does not use CA, PA, or positional familiarity as role importance or fabricate missing observations', () => {
    const player = parsePlayerExport('Name;Finishing\nTest;20','test.csv').players[0]!;
    const profile = getRoleDutyProfile('FM2013','poacher','ST','attack')!;
    expect(scoreRole({ ...player, actualCa: 200, potentialAbility: 200, positions: { ST: 20 } }, profile).score).toBeNull();
    const invalid = { ...player, attributes: { finishing: 99 } };
    expect(scoreRole(invalid, profile).evidence).toEqual([]);
  });
});
