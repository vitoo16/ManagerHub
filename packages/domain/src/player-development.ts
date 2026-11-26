import type { AttributeKey, PlayerExport } from './player-import';
import { getRoleDutyProfile, type RoleDuty, type RolePosition } from './football-role-registry';
import { scoreRole } from './player-analysis';
import { inspectAbilityBudget } from './ability-budget';

export interface DevelopmentRoleTarget {
  readonly position: RolePosition;
  readonly roleId: string;
  readonly duty: RoleDuty;
}
export interface DevelopmentScenario {
  readonly target: DevelopmentRoleTarget;
  /** User-selected reference level, not a predicted training outcome. */
  readonly benchmark: number;
  readonly overrides: Readonly<Partial<Record<AttributeKey, number>>>;
  readonly locked: readonly AttributeKey[];
}

const observed = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20;

/** Conditional, manual what-if comparison. It is deliberately not a CA-constrained optimizer. */
export function evaluateDevelopmentScenario(player: Pick<PlayerExport, 'attributes' | 'positions' | 'actualCa' | 'potentialAbility'>,
  edition: string | null, build: string | null, scenario: DevelopmentScenario) {
  const profile = getRoleDutyProfile('FM2013', scenario.target.roleId, scenario.target.position, scenario.target.duty);
  const budget = inspectAbilityBudget(edition, build, player.actualCa, player.potentialAbility);
  const benchmarkValid = observed(scenario.benchmark);
  if (!profile || !benchmarkValid || (edition !== null && edition !== 'FM2013')) return null;
  const before = scoreRole(player, profile);
  const keys = Object.keys(profile.demands) as AttributeKey[];
  const projected = { ...player.attributes };
  const rejected: AttributeKey[] = [];
  const locks = new Set(scenario.locked);
  for (const [key, value] of Object.entries(scenario.overrides) as [AttributeKey, number][]) {
    const original = player.attributes[key];
    if (!keys.includes(key) || locks.has(key) || !observed(original) || !observed(value) || value < original) {
      rejected.push(key);
      continue;
    }
    projected[key] = value;
  }
  const after = scoreRole({ attributes: projected }, profile);
  const rows = keys.map(key => {
    const current = player.attributes[key];
    const value = observed(current) ? current : null;
    const target = value === null ? null : projected[key]!;
    const weight = profile.demands[key]!;
    const gap = target === null ? null : Math.max(0, scenario.benchmark - target);
    return { key, current: value, proposed: target, change: target === null || value === null ? null : target - value,
      weight, gap, priority: gap === null ? null : gap * weight,
      initialPriority: value === null ? null : Math.max(0, scenario.benchmark - value) * weight, locked: locks.has(key) };
  }).sort((a, b) => (b.initialPriority ?? -1) - (a.initialPriority ?? -1) || a.key.localeCompare(b.key, 'en'));
  const native = player.positions?.[scenario.target.position];
  return {
    model: 'manual-role-what-if-v1' as const, before, after, rows, rejected,
    familiarity: typeof native === 'number' && Number.isInteger(native) && native >= 0 && native <= 20 ? native : null,
    budget, feasibility: 'not-evaluated' as const,
    changes: rows.filter(row => row.change !== null && row.change > 0).length
  };
}
