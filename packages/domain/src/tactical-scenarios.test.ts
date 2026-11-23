import { describe, expect, it } from 'vitest';
import type { PlayerDataset, PlayerExport } from './player-import';
import { createDefaultSquadPlans } from './squad-scenarios';
import {
  defaultTacticalScenario, defaultTacticalScenarios, makeSavedTacticalScenarios,
  positionTacticalSlot, restoreSavedTacticalScenarios, tacticalPosition, tacticalScenarioForFormation,
  TACTICAL_SCHEMA
} from './tactical-scenarios';

const player: PlayerExport = {
  id: 'player-1', name: 'Fixture Player', position: 'GK', age: 24, club: 'Test FC', nationality: null,
  attributes: { passing: 14 }, source: 'game_export', verification: 'provisional'
};
const dataset: PlayerDataset = {
  fileName: 'fixture.csv', importedAt: '2026-11-22T00:00:00.000Z', source: 'game_export',
  actualCaAvailable: false, potentialAbilityAvailable: false, players: [player],
  attributeColumns: ['passing'], warnings: []
};

describe('MH-07 tactical scenarios', () => {
  it('keeps independently authored phase coordinates and plan A/B', () => {
    const a = defaultTacticalScenario('4-3-3');
    const defaultPoint = tacticalPosition(a, 'possession', 'gk');
    const updated = positionTacticalSlot(a, 'possession', 'gk', { x: 11, y: 18 });
    expect(tacticalPosition(updated, 'possession', 'gk')).toEqual({ x: 11, y: 18 });
    expect(tacticalPosition(updated, 'defending', 'gk')).toEqual(defaultPoint);
    expect(tacticalPosition(a, 'possession', 'gk')).toEqual(defaultPoint);
    expect(defaultTacticalScenarios().A).not.toBe(defaultTacticalScenarios().B);
    expect(tacticalScenarioForFormation(updated, '4-2-3-1')).toEqual(defaultTacticalScenario('4-2-3-1'));
  });

  it('blocks unknown slots, fractional grid coordinates and out-of-bounds movements', () => {
    const scenario = defaultTacticalScenario('4-3-3');
    expect(() => tacticalPosition(scenario, 'possession', 'unknown')).toThrow();
    for (const [id, x, y] of [
      ['unknown', 10, 10], ['gk', -1, 10], ['gk', 20, 10], ['gk', 10, 1.5]
    ] as const) expect(() => positionTacticalSlot(scenario, 'defending', id, { x, y })).toThrow();
  });

  it('persists both plans by exact dataset digest with no roster copies', async () => {
    const plans = createDefaultSquadPlans();
    const scenarios = { ...defaultTacticalScenarios(),
      A: positionTacticalSlot(defaultTacticalScenario('4-3-3'), 'possession', 'rw', { x: 18, y: 3 }),
      B: positionTacticalSlot(defaultTacticalScenario('4-3-3'), 'defending', 'lb', { x: 5, y: 16 })
    };
    const saved = await makeSavedTacticalScenarios(dataset, scenarios, plans);
    expect(saved.schema).toBe(TACTICAL_SCHEMA);
    const json = JSON.stringify(saved);
    expect(json).not.toContain('Fixture Player');
    expect(json).not.toContain('Test FC');
    expect(json).not.toContain('fixture.csv');
    const restored = await restoreSavedTacticalScenarios(json, dataset, plans);
    expect(restored.scenarios).toEqual(scenarios);
    expect(restored.scenarios.A).not.toBe(scenarios.A);
    expect(restored.scenarios.A.placements.possession).not.toBe(restored.scenarios.B.placements.possession);
    await expect(restoreSavedTacticalScenarios(json, {
      ...dataset, players: [{ ...player, attributes: { passing: 15 } }]
    }, plans)).rejects.toThrow('different_player_export');
  });

  it('rejects corruption, unknown slots, prototype keys and mismatched formations', async () => {
    const plans = createDefaultSquadPlans();
    const saved = await makeSavedTacticalScenarios(dataset, defaultTacticalScenarios(), plans);
    const altered = (value: unknown) => restoreSavedTacticalScenarios(JSON.stringify(value), dataset, plans);
    await expect(altered({ ...saved, schema: 'unsupported' })).rejects.toThrow();
    await expect(altered({ ...saved, extraField: true })).rejects.toThrow();
    await expect(altered({ ...saved, savedAt: 'yesterday' })).rejects.toThrow();
    await expect(altered({ ...saved, scenarios: { ...saved.scenarios,
      A: { ...saved.scenarios.A, formation: '4-2-3-1' }
    } })).rejects.toThrow();
    await expect(altered({ ...saved, scenarios: { ...saved.scenarios,
      A: { ...saved.scenarios.A, placements: { possession: { unknown: { x: 10, y: 10 } }, defending: {} } }
    } })).rejects.toThrow();
    await expect(altered({ ...saved, scenarios: { ...saved.scenarios,
      A: { ...saved.scenarios.A, placements: { possession: JSON.parse('{"__proto__":{"x":1,"y":1}}') as unknown, defending: {} } }
    } })).rejects.toThrow();
    await expect(altered({ ...saved, scenarios: { ...saved.scenarios,
      A: { ...saved.scenarios.A, instructions: { ...saved.scenarios.A.instructions, pressing: 'world_class' } }
    } })).rejects.toThrow();
    await expect(restoreSavedTacticalScenarios('{broken', dataset, plans)).rejects.toThrow();
    await expect(restoreSavedTacticalScenarios('x'.repeat(12_001), dataset, plans)).rejects.toThrow();
  });
});
