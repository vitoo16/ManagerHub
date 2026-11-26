import { describe, expect, it } from 'vitest';
import { inspectAbilityBudget } from './ability-budget';
import { evaluateDevelopmentScenario, type DevelopmentScenario } from './player-development';

const player = { attributes: { finishing: 15, offTheBall: 16, anticipation: 14, acceleration: 15,
  composure: 16, pace: 16, firstTouch: 14 }, positions: { ST: 20 }, actualCa: 158, potentialAbility: 170 };
const scenario: DevelopmentScenario = { target: { position: 'ST', roleId: 'poacher', duty: 'attack' },
  benchmark: 18, overrides: { finishing: 18 }, locked: [] };

describe('development what-if and RCA safety', () => {
  it('preserves original attributes and compares deterministic role fit without claiming feasibility', () => {
    const result = evaluateDevelopmentScenario(player, 'FM2013', '13.3.3', scenario)!;
    expect(result.after.score).toBeGreaterThan(result.before.score!);
    expect(result.rows.find(row => row.key === 'finishing')).toMatchObject({ current: 15, proposed: 18, change: 3 });
    expect(result.budget).toMatchObject({ remainingPotential: 12, recommendedCa: null, remainingRcaBudget: null, autoMatchAvailable: false });
    expect(result.feasibility).toBe('not-evaluated');
    expect(player.attributes.finishing).toBe(15);
    const baseline = evaluateDevelopmentScenario(player, 'FM2013', '13.3.3', { ...scenario, overrides: {} })!;
    expect(result.rows.map(row => row.key)).toEqual(baseline.rows.map(row => row.key));
    expect(evaluateDevelopmentScenario(player, 'FM2013', '13.3.3', scenario)).toEqual(result);
  });
  it('rejects locked, missing, out-of-range, non-role and decreasing attributes', () => {
    const result = evaluateDevelopmentScenario(player, 'FM2013', '13.3.3', {
      ...scenario, locked: ['finishing'], overrides: { finishing: 20, pace: 14, composure: 21, passing: 18 }
    })!;
    expect(result.rejected).toEqual(['finishing','pace','composure','passing']);
    expect(result.changes).toBe(0);
    const missing = evaluateDevelopmentScenario({ attributes: {} }, null, null, scenario)!;
    expect(missing.rejected).toEqual(['finishing']);
    expect(missing.after.score).toBeNull();
    expect(missing.budget.remainingPotential).toBeNull();
  });
  it('fails closed for incompatible targets and editions, preserves signed remaining potential', () => {
    expect(evaluateDevelopmentScenario(player, 'FM2014', '14.0', scenario)).toBeNull();
    expect(evaluateDevelopmentScenario(player, 'FM2013', '13.3.3', { ...scenario, target: { ...scenario.target, duty: 'support' } })).toBeNull();
    expect(inspectAbilityBudget('FM2013', '13.3.3', 180, 170).remainingPotential).toBe(-10);
    expect(inspectAbilityBudget(null, null, 0, 170).remainingPotential).toBeNull();
  });
});
