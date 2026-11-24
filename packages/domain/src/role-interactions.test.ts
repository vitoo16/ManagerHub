import { describe, expect, it } from 'vitest';
import { analyzeRoleInteractions, ROLE_INTERACTION_VERSION } from './role-interactions';
import { FORMATIONS, type FormationId, type SquadSolution } from './squad-optimizer';
import { defaultTacticalScenario } from './tactical-state';
import { positionTacticalSlot } from './tactical-scenarios';

function xi(formation: FormationId): SquadSolution {
  return {
    formation, complete: true,
    lineup: FORMATIONS[formation].map((slot, index) => ({
      slot, playerId: String(index), name: 'Test ' + slot.id, roleScore: 80, coverage: 1
    })),
    averageRoleScore: 80, diagnostics: [], reason: null, model: 'role-fit-heuristic-v1'
  };
}

describe('MH-09 source-bound role partnerships', () => {
  it('fails closed on absent XI, mismatched formation and duplicate player assignments', () => {
    const scenario = defaultTacticalScenario('4-3-3');
    const valid = xi('4-3-3');
    const bad = { ...valid, lineup: valid.lineup.map((item, index) =>
      index === 2 ? { ...item, playerId: valid.lineup[0]!.playerId } : item) };
    for (const input of [null, xi('4-2-3-1'), bad]) {
      const report = analyzeRoleInteractions(scenario, input);
      expect(report.status).toBe('incomplete-xi');
      expect(report.findings.map(item => item.id)).toEqual(['incomplete-role-evidence']);
    }
  });

  it('does not declare a partnership risk on neutral formations', () => {
    const report = analyzeRoleInteractions(defaultTacticalScenario('4-3-3'), xi('4-3-3'));
    expect(report.model).toBe(ROLE_INTERACTION_VERSION);
    expect(report.findings).toEqual([]);
  });

  it('links a named winger and wing-back only on the advanced shared flank', () => {
    const base = defaultTacticalScenario('4-3-3');
    const scenario = positionTacticalSlot(base, 'possession', 'lb', {x:2,y:10});
    const report = analyzeRoleInteractions(scenario, xi('4-3-3'));
    expect(report.findings.map(item => item.id)).toContain('flank-advance-exposure');
    const finding = report.findings.find(item => item.id === 'flank-advance-exposure')!;
    expect(finding.slotIds).toEqual(['lb','lw']);
    expect(finding.playerNames).toEqual(['Test lb','Test lw']);
    expect(analyzeRoleInteractions(positionTacticalSlot(scenario, 'possession', 'lb', {x:10,y:10}), xi('4-3-3')).findings).toEqual([]);
  });

  it('shows position-based central cover as a qualified observation, not match certainty', () => {
    const base = positionTacticalSlot(defaultTacticalScenario('4-2-3-1'), 'possession', 'rb', {x:18,y:10});
    const scenario = positionTacticalSlot(base, 'possession', 'ldm', {x:10,y:14});
    const report = analyzeRoleInteractions(scenario, xi('4-2-3-1'));
    expect(report.findings.map(item => item.id)).toEqual(['flank-advance-exposure','central-cover-partnership']);
    expect(report.findings[1]?.playerNames).toEqual(['Test ldm']);
    expect(report.findings[1]?.limitation).toContain('does not verify');
  });
});
