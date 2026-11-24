import { describe, expect, it } from 'vitest';
import {
  analyzeRoleInteractions,
  applyRoleInteractionAdjustment,
  ROLE_INTERACTION_VERSION,
  type RoleInteractionFinding
} from './role-interactions';
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
    const duplicateSlot = { ...valid, lineup: valid.lineup.map((item, index) =>
      index === 2 ? { ...item, slot: valid.lineup[1]!.slot } : item) };
    const roleMismatch = { ...valid, lineup: valid.lineup.map(item =>
      item.slot.id === 'lb' ? { ...item, slot: { ...item.slot, roleId: 'winger' } } : item) };
    const positionMismatch = { ...valid, lineup: valid.lineup.map(item =>
      item.slot.id === 'lb' ? { ...item, slot: { ...item.slot, position: 'RB' as const } } : item) };
    const unknownSlot = { ...valid, lineup: valid.lineup.map(item =>
      item.slot.id === 'lb' ? { ...item, slot: { ...item.slot, id: 'unknown' } } : item) };
    for (const input of [null, xi('4-2-3-1'), bad, duplicateSlot, roleMismatch, positionMismatch,
      unknownSlot, { ...valid, complete: false }, { ...valid, lineup: valid.lineup.slice(1) }]) {
      const report = analyzeRoleInteractions(scenario, input);
      expect(report.status).toBe('incomplete-xi');
      expect(report.findings.map(item => item.id)).toEqual(['incomplete-role-evidence']);
      expect(report.findings[0]?.playerNames).toEqual([]);
    }
  });

  it('does not declare a partnership risk on neutral formations', () => {
    const report = analyzeRoleInteractions(defaultTacticalScenario('4-3-3'), xi('4-3-3'));
    expect(report.model).toBe(ROLE_INTERACTION_VERSION);
    expect(report.findings).toEqual([]);
    expect(analyzeRoleInteractions(defaultTacticalScenario('4-2-3-1'), xi('4-2-3-1')).findings).toEqual([]);
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

  it('checks exact advance/corridor boundaries, retreat, and an inverted winger', () => {
    const base = defaultTacticalScenario('4-3-3');
    const valid = xi('4-3-3');
    const move = (x: number, y: number) =>
      analyzeRoleInteractions(positionTacticalSlot(base, 'possession', 'lb', { x, y }), valid);
    expect(move(2, 12).findings).toEqual([]);
    expect(move(6, 11).findings.map(item => item.id)).toEqual(['flank-advance-exposure']);
    expect(move(7, 11).findings).toEqual([]);
    expect(move(2, 15).findings).toEqual([]);
    const central = positionTacticalSlot(
      positionTacticalSlot(base, 'possession', 'lb', { x: 10, y: 11 }),
      'possession', 'lw', { x: 10, y: 5 });
    expect(analyzeRoleInteractions(central, valid).findings).toEqual([]);
  });

  it('recomputes the exact player names for each XI without retaining previous results', () => {
    const scenario = positionTacticalSlot(defaultTacticalScenario('4-3-3'), 'possession', 'lb', { x: 2, y: 11 });
    const a = xi('4-3-3');
    const b = { ...a, lineup: a.lineup.map(item => item.slot.id === 'lb'
      ? { ...item, playerId: 'alternate', name: 'Alternate LB' } : item) };
    expect(analyzeRoleInteractions(scenario, a).findings[0]?.playerNames).toEqual(['Test lb', 'Test lw']);
    expect(analyzeRoleInteractions(scenario, b).findings[0]?.playerNames).toEqual(['Alternate LB', 'Test lw']);
    expect(analyzeRoleInteractions(scenario, a).findings[0]?.playerNames).toEqual(['Test lb', 'Test lw']);
  });

  it('shows position-based central cover as a qualified observation, not match certainty', () => {
    const base = positionTacticalSlot(defaultTacticalScenario('4-2-3-1'), 'possession', 'rb', {x:18,y:10});
    const scenario = positionTacticalSlot(base, 'possession', 'ldm', {x:10,y:14});
    const report = analyzeRoleInteractions(scenario, xi('4-2-3-1'));
    expect(report.findings.map(item => item.id)).toEqual(['flank-advance-exposure','central-cover-partnership']);
    expect(report.findings[1]?.playerNames).toEqual(['Test ldm']);
    expect(report.findings[1]?.limitation).toContain('does not verify');
    const deeperBack = positionTacticalSlot(
      positionTacticalSlot(scenario, 'defending', 'rb', { x: 18, y: 19 }),
      'possession', 'rb', { x: 18, y: 15 });
    expect(analyzeRoleInteractions(deeperBack, xi('4-2-3-1')).findings.map(item => item.id))
      .toEqual(['flank-advance-exposure']);
  });

  it('detects uncovered central pivot when all central midfielders advance into attacking depth', () => {
    // In 4-3-3: lcm, cm, rcm
    const base = defaultTacticalScenario('4-3-3');
    const valid = xi('4-3-3');
    const allPushed = positionTacticalSlot(
      positionTacticalSlot(
        positionTacticalSlot(base, 'possession', 'lcm', { x: 7, y: 7 }),
        'possession', 'cm', { x: 10, y: 6 }
      ),
      'possession', 'rcm', { x: 13, y: 7 }
    );
    const report = analyzeRoleInteractions(allPushed, valid);
    expect(report.findings.map(item => item.id)).toContain('uncovered-central-pivot');
    const finding = report.findings.find(item => item.id === 'uncovered-central-pivot')!;
    expect(finding.slotIds).toEqual(['lcm', 'cm', 'rcm']);
    expect(finding.playerNames).toEqual(['Test lcm', 'Test cm', 'Test rcm']);

    // Applying adjustment pulls cm back to y=12
    const adjusted = applyRoleInteractionAdjustment(allPushed, valid, finding);
    expect(adjusted.placements.possession.cm).toEqual({ x: 10, y: 12 });
    const adjustedReport = analyzeRoleInteractions(adjusted, valid);
    expect(adjustedReport.findings.map(item => item.id)).not.toContain('uncovered-central-pivot');
  });

  it('detects and adjusts central midfield spatial congestion', () => {
    // In 4-2-3-1: am is default at x=10, y=6. Move ldm directly next to it: x=10, y=7
    const base = defaultTacticalScenario('4-2-3-1');
    const valid = xi('4-2-3-1');
    const congested = positionTacticalSlot(base, 'possession', 'ldm', { x: 10, y: 7 });
    const report = analyzeRoleInteractions(congested, valid);
    expect(report.findings.map(item => item.id)).toContain('central-midfield-congestion');
    const finding = report.findings.find(item => item.id === 'central-midfield-congestion')!;
    expect(finding.slotIds).toEqual(['ldm', 'am']);
    expect(finding.playerNames).toEqual(['Test ldm', 'Test am']);

    // Applying adjustment staggers the deeper one back
    const adjusted = applyRoleInteractionAdjustment(congested, valid, finding);
    expect(adjusted.placements.possession.am?.y).toBe(9);
    const adjustedReport = analyzeRoleInteractions(adjusted, valid);
    expect(adjustedReport.findings.map(item => item.id)).not.toContain('central-midfield-congestion');
  });

  it('applies flank advance exposure adjustment by retreating the wing-back', () => {
    const base = defaultTacticalScenario('4-3-3');
    const advanced = positionTacticalSlot(base, 'possession', 'lb', { x: 2, y: 10 });
    const valid = xi('4-3-3');
    const finding = analyzeRoleInteractions(advanced, valid).findings.find(item => item.id === 'flank-advance-exposure')!;
    const adjusted = applyRoleInteractionAdjustment(advanced, valid, finding);
    expect(adjusted.placements.possession.lb?.y).toBe(15);
  });

  it('applies the selected right flank finding when both flanks are advanced', () => {
    const valid = xi('4-3-3');
    const base = defaultTacticalScenario('4-3-3');
    const both = positionTacticalSlot(positionTacticalSlot(base, 'possession', 'lb', { x: 2, y: 11 }),
      'possession', 'rb', { x: 18, y: 11 });
    const findings = analyzeRoleInteractions(both, valid).findings;
    const right = findings.find(item => item.id === 'flank-advance-exposure' && item.slotIds[0] === 'rb')!;
    const adjusted = applyRoleInteractionAdjustment(both, valid, right);
    expect(adjusted.placements.possession.lb).toEqual({ x: 2, y: 11 });
    expect(adjusted.placements.possession.rb).toEqual({ x: 18, y: 15 });
    expect(adjusted.placements.defending).toBe(both.placements.defending);
    expect(adjusted.instructions).toBe(both.instructions);
    expect(analyzeRoleInteractions(adjusted, valid).findings.filter(item => item.id === 'flank-advance-exposure')
      .map(item => item.slotIds)).toEqual([['lb', 'lw']]);
    expect(applyRoleInteractionAdjustment(adjusted, valid, right)).toBe(adjusted);
    expect(applyRoleInteractionAdjustment(both, null, right)).toBe(both);
    expect(applyRoleInteractionAdjustment(both, xi('4-2-3-1'), right)).toBe(both);
    const changedXI = { ...valid, lineup: valid.lineup.map(item =>
      item.slot.id === 'rb' ? { ...item, name: 'Replacement RB' } : item) };
    expect(applyRoleInteractionAdjustment(both, changedXI, right)).toBe(both);
  });

  it('targets the selected congestion pair rather than the first repeated rule', () => {
    const valid = xi('4-3-3');
    let scenario = defaultTacticalScenario('4-3-3');
    for (const [id, x] of [['lcm', 9], ['cm', 10], ['rcm', 11]] as const) {
      scenario = positionTacticalSlot(scenario, 'possession', id, { x, y: 8 });
    }
    const pairs = analyzeRoleInteractions(scenario, valid).findings.filter(item => item.id === 'central-midfield-congestion');
    expect(pairs.map(item => item.slotIds)).toEqual([['lcm', 'cm'], ['cm', 'rcm']]);
    const adjusted = applyRoleInteractionAdjustment(scenario, valid, pairs[1]!);
    expect(adjusted.placements.possession.cm).toEqual({ x: 10, y: 8 });
    expect(adjusted.placements.possession.rcm).toEqual({ x: 11, y: 11 });
    expect(analyzeRoleInteractions(adjusted, valid).findings.filter(item => item.id === 'central-midfield-congestion')
      .map(item => item.slotIds)).toEqual([['lcm', 'cm']]);
    expect(applyRoleInteractionAdjustment(scenario, valid, { ...pairs[1]!, slotIds: ['gk', 'st'] })).toBe(scenario);
  });

  it('does not apply a fabricated pivot warning to a neutral XI', () => {
    const base = defaultTacticalScenario('4-3-3');
    expect(applyRoleInteractionAdjustment(base, xi('4-3-3'), {
      id: 'uncovered-central-pivot', slotIds: ['lcm', 'cm', 'rcm'],
      playerNames: ['Test lcm', 'Test cm', 'Test rcm']
    })).toBe(base);
  });

  it('throws on unknown role adjustment IDs', () => {
    const base = defaultTacticalScenario('4-3-3');
    expect(() => applyRoleInteractionAdjustment(base, xi('4-3-3'), {
      id: 'unknown-id' as unknown as RoleInteractionFinding['id'], slotIds: [], playerNames: []
    }))
      .toThrow('unknown_role_adjustment');
  });
});
