import { describe, expect, it } from 'vitest';
import { applyTacticalDiagnosticAdjustment, diagnoseTacticalScenario, TACTICAL_DIAGNOSTIC_VERSION, type TacticalAdjustmentId } from './tactical-diagnostics';
import { FORMATIONS, type FormationId, type SquadSolution } from './squad-optimizer';
import { defaultTacticalScenario } from './tactical-state';
import { positionTacticalSlot, type TacticalScenario } from './tactical-scenarios';

function completeXI(formation: FormationId): SquadSolution {
  return {
    formation,
    complete: true,
    lineup: FORMATIONS[formation].map((slot, index) => ({
      slot, playerId: `player-${index}`, name: `Player ${index}`, roleScore: 80, coverage: 1
    })),
    diagnostics: [], averageRoleScore: 80, reason: null, model: 'role-fit-heuristic-v1'
  };
}

function ruleIds(scenario: TacticalScenario, solution: SquadSolution | null) {
  return diagnoseTacticalScenario(scenario, solution).diagnostics.map(item => item.id);
}

describe('MH-07 deterministic tactical diagnostics', () => {
  it('reports the source and an empty result for a complete neutral shape', () => {
    const scenario = defaultTacticalScenario('4-3-3');
    const report = diagnoseTacticalScenario(scenario, completeXI('4-3-3'));
    expect(report).toEqual({
      model: TACTICAL_DIAGNOSTIC_VERSION,
      source: 'manager-authored-scenario',
      lineupEvidence: 'complete-xi',
      diagnostics: []
    });
  });

  it('requires eleven distinct players, all formation slots, and matching formation', () => {
    const scenario = defaultTacticalScenario('4-3-3');
    const xi = completeXI('4-3-3');
    const invalid: (SquadSolution | null)[] = [
      null,
      { ...xi, complete: false },
      { ...xi, lineup: xi.lineup.slice(1) },
      { ...xi, lineup: xi.lineup.map((entry, index) => index === 1 ? { ...entry, playerId: xi.lineup[0]!.playerId } : entry) },
      { ...xi, lineup: xi.lineup.map((entry, index) => index === 1 ? { ...entry, slot: xi.lineup[0]!.slot } : entry) },
      completeXI('4-2-3-1')
    ];
    for (const candidate of invalid) {
      const report = diagnoseTacticalScenario(scenario, candidate);
      expect(report.lineupEvidence).toBe('incomplete-xi');
      expect(report.diagnostics.map(item => item.id)).toEqual(['incomplete-xi']);
    }
  });

  it('flags high defensive line with low pressing and clears on correction', () => {
    const initial = defaultTacticalScenario('4-3-3');
    const scenario = { ...initial, instructions: { ...initial.instructions, defensiveLine: 'high' as const, pressing: 'low' as const } };
    expect(ruleIds(scenario, completeXI('4-3-3'))).toEqual(['high-line-low-press']);
    expect(ruleIds({ ...scenario, instructions: { ...scenario.instructions, pressing: 'balanced' } }, completeXI('4-3-3'))).toEqual([]);
    expect(ruleIds(initial, completeXI('4-3-3'))).toEqual([]);
  });

  it('finds both advancing fullbacks without deep midfield cover and resolves with cover', () => {
    const xi = completeXI('4-2-3-1');
    const base = defaultTacticalScenario('4-2-3-1');
    const left = positionTacticalSlot(base, 'possession', 'lb', { x: 2, y: 10 });
    const advanced = positionTacticalSlot(left, 'possession', 'rb', { x: 18, y: 10 });
    expect(ruleIds(advanced, xi)).toContain('advanced-fullbacks-without-cover');
    const covered = positionTacticalSlot(advanced, 'possession', 'ldm', { x: 10, y: 14 });
    expect(ruleIds(covered, xi)).not.toContain('advanced-fullbacks-without-cover');
    expect(ruleIds(left, xi)).not.toContain('advanced-fullbacks-without-cover');
    expect(ruleIds(base, xi)).toEqual([]);
  });

  it('detects a drawn central defensive gap and clears with narrower centre-backs or cover', () => {
    const xi = completeXI('4-3-3');
    const base = defaultTacticalScenario('4-3-3');
    const widened = positionTacticalSlot(
      positionTacticalSlot(base, 'defending', 'lcb', { x: 3, y: 15 }),
      'defending', 'rcb', { x: 17, y: 15 }
    );
    expect(ruleIds(widened, xi)).toEqual(['open-central-channel']);
    const covered = positionTacticalSlot(widened, 'defending', 'cm', { x: 10, y: 14 });
    expect(ruleIds(covered, xi)).toEqual([]);
    const narrower = positionTacticalSlot(widened, 'defending', 'rcb', { x: 12, y: 15 });
    expect(ruleIds(narrower, xi)).toEqual([]);
    expect(ruleIds(base, xi)).toEqual([]);
  });

  it('suggests an opt-in high-line correction without mutating input', () => {
    const base = defaultTacticalScenario('4-3-3');
    const scenario = { ...base, instructions: { ...base.instructions, defensiveLine: 'high' as const, pressing: 'low' as const } };
    const changed = applyTacticalDiagnosticAdjustment(scenario, 'high-line-low-press');
    expect(changed.instructions.defensiveLine).toBe('balanced');
    expect(changed.instructions.pressing).toBe('low');
    expect(scenario.instructions.defensiveLine).toBe('high');
    expect(ruleIds(changed, completeXI('4-3-3'))).not.toContain('high-line-low-press');
  });

  it('suggests retaining one fullback for cover without changing defending positions', () => {
    const base = defaultTacticalScenario('4-2-3-1');
    const scenario = positionTacticalSlot(positionTacticalSlot(base, 'possession', 'lb', {x:2,y:10}), 'possession', 'rb', {x:18,y:10});
    const changed = applyTacticalDiagnosticAdjustment(scenario, 'advanced-fullbacks-without-cover');
    expect(ruleIds(scenario, completeXI('4-2-3-1'))).toContain('advanced-fullbacks-without-cover');
    expect(ruleIds(changed, completeXI('4-2-3-1'))).not.toContain('advanced-fullbacks-without-cover');
    expect(changed.placements.defending).toEqual(scenario.placements.defending);
    expect(changed.placements.possession.lb).toEqual(scenario.placements.possession.lb);
  });

  it('narrows the centre-back gap without changing the possession phase', () => {
    const base = defaultTacticalScenario('4-3-3');
    const scenario = positionTacticalSlot(positionTacticalSlot(base, 'defending', 'lcb', {x:3,y:15}), 'defending', 'rcb', {x:17,y:15});
    const changed = applyTacticalDiagnosticAdjustment(scenario, 'open-central-channel');
    expect(changed.placements.defending.rcb).toEqual({ x:12, y:15 });
    expect(changed.placements.possession).toEqual(scenario.placements.possession);
    expect(ruleIds(changed, completeXI('4-3-3'))).not.toContain('open-central-channel');
    const reversed = positionTacticalSlot(positionTacticalSlot(base, 'defending', 'lcb', {x:17,y:15}), 'defending', 'rcb', {x:2,y:15});
    expect(applyTacticalDiagnosticAdjustment(reversed, 'open-central-channel').placements.defending.rcb?.x).toBe(8);
  });

  it('rejects unsupported tactical adjustment identifiers', () => {
    const base = defaultTacticalScenario('4-3-3');
    expect(() => applyTacticalDiagnosticAdjustment(base, 'unknown-id' as unknown as TacticalAdjustmentId)).toThrow('unknown_tactical_adjustment');
    expect(() => applyTacticalDiagnosticAdjustment(base, 'incomplete-xi' as unknown as TacticalAdjustmentId)).toThrow('unknown_tactical_adjustment');
  });

  it('handles multiple concurrent warnings by adjusting only the targeted finding', () => {
    const xi = completeXI('4-3-3');
    const base = defaultTacticalScenario('4-3-3');
    const multi = positionTacticalSlot(
      positionTacticalSlot(
        { ...base, instructions: { ...base.instructions, defensiveLine: 'high', pressing: 'low' } },
        'defending', 'lcb', { x: 3, y: 15 }
      ),
      'defending', 'rcb', { x: 17, y: 15 }
    );
    expect(ruleIds(multi, xi)).toEqual(['high-line-low-press', 'open-central-channel']);

    // Fix only defensive line
    const fixedLine = applyTacticalDiagnosticAdjustment(multi, 'high-line-low-press');
    expect(ruleIds(fixedLine, xi)).toEqual(['open-central-channel']);
    expect(fixedLine.placements.defending.rcb).toEqual({ x: 17, y: 15 });

    // Fix only centre-back channel
    const fixedChannel = applyTacticalDiagnosticAdjustment(multi, 'open-central-channel');
    expect(ruleIds(fixedChannel, xi)).toEqual(['high-line-low-press']);
    expect(fixedChannel.instructions.defensiveLine).toBe('high');
  });

  it('clamps open-central-channel adjustment within pitch boundaries [1..19]', () => {
    const base = defaultTacticalScenario('4-2-3-1');
    // Extreme left: left CB at 1, right CB at 15 -> target is 1 + 9 = 10
    const extremeLeft = positionTacticalSlot(
      positionTacticalSlot(base, 'defending', 'lcb', { x: 1, y: 15 }),
      'defending', 'rcb', { x: 15, y: 15 }
    );
    expect(applyTacticalDiagnosticAdjustment(extremeLeft, 'open-central-channel').placements.defending.rcb?.x).toBe(10);

    // Extreme right: left CB at 19, right CB at 5 -> target is 19 - 9 = 10
    const extremeRight = positionTacticalSlot(
      positionTacticalSlot(base, 'defending', 'lcb', { x: 19, y: 15 }),
      'defending', 'rcb', { x: 5, y: 15 }
    );
    expect(applyTacticalDiagnosticAdjustment(extremeRight, 'open-central-channel').placements.defending.rcb?.x).toBe(10);
  });

  it('keeps the authored phases and A/B scenarios independent', () => {
    const xi = completeXI('4-3-3');
    const a = defaultTacticalScenario('4-3-3');
    const b = { ...a, instructions: { ...a.instructions, defensiveLine: 'high' as const, pressing: 'low' as const } };
    const editedB = positionTacticalSlot(b, 'defending', 'lcb', { x: 3, y: 15 });
    expect(ruleIds(a, xi)).toEqual([]);
    expect(ruleIds(b, xi)).toEqual(['high-line-low-press']);
    expect(ruleIds(editedB, xi)).toEqual(['high-line-low-press', 'open-central-channel']);
    expect(a.placements.defending).toEqual({});
    expect(b.placements.defending).toEqual({});
  });
});
