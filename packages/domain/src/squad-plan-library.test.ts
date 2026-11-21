import { describe, expect, it } from 'vitest';
import { createDefaultSquadPlans } from './squad-scenarios';
import type { PlayerDataset, PlayerExport } from './player-import';
import {
  SAVED_SQUAD_PLAN_SCHEMA, decodeSavedSquadPlans, makeSavedSquadPlans,
  restoreSavedSquadPlans, squadPlanStorageKey
} from './squad-plan-library';

function player(id: string, position: string): PlayerExport {
  return {
    id, name: id, position, age: 24, club: 'Fixture FC', nationality: null,
    attributes: { passing: 15, stamina: 14 },
    source: 'game_export', verification: 'provisional'
  };
}
function dataset(players: readonly PlayerExport[] = [
  player('gk', 'GK'), player('defender', 'D (C)'), player('midfielder', 'M (C)'), player('forward', 'ST (C)')
]): PlayerDataset {
  return {
    fileName: 'local-export.csv', importedAt: '2026-11-21T00:00:00.000Z',
    source: 'game_export', actualCaAvailable: false, potentialAbilityAvailable: false,
    players, attributeColumns: ['passing', 'stamina'], warnings: []
  };
}

describe('Squad Planner user-controlled persistence', () => {
  it('roundtrips Plan A/B, active tab and formation without storing names or attributes', async () => {
    const input = dataset();
    const plans = {
      A: { formation: '4-3-3' as const, lockedSlots: { gk: 'gk', cm: 'midfielder' }, excludedPlayerIds: ['forward'] },
      B: { formation: '4-2-3-1' as const, lockedSlots: { st: 'forward' }, excludedPlayerIds: ['midfielder'] }
    };
    const saved = await makeSavedSquadPlans(input, plans, 'B');
    expect(saved.schema).toBe(SAVED_SQUAD_PLAN_SCHEMA);
    expect(saved.datasetSha256).toMatch(/^[a-f0-9]{64}$/);
    const json = JSON.stringify(saved);
    expect(json).not.toContain('Fixture FC');
    expect(json).not.toContain('passing');
    expect(json).not.toContain('local-export.csv');
    const restored = await restoreSavedSquadPlans(decodeSavedSquadPlans(json), input);
    expect(restored.active).toBe('B');
    expect(restored.plans).toEqual(plans);
    expect(restored.plans).not.toBe(plans);
    expect(await squadPlanStorageKey(input)).toContain(saved.datasetSha256);
  });

  it('binds restoration to every observed input, not just the filename', async () => {
    const original = dataset();
    const saved = await makeSavedSquadPlans(original, createDefaultSquadPlans(), 'A');
    expect(await restoreSavedSquadPlans(saved, original)).toBeDefined();
    const modified = dataset(original.players.map(p => p.id === 'midfielder'
      ? { ...p, attributes: { passing: 17, stamina: 14 } } : p));
    await expect(restoreSavedSquadPlans(saved, modified)).rejects.toThrow('different_player_export');
    await expect(restoreSavedSquadPlans(saved, { ...original, importedAt: '2026-11-21T00:00:01.000Z' }))
      .rejects.toThrow('different_player_export');
  });

  it('rejects tampered schema, unknown keys and malformed persistence payloads', async () => {
    const input = dataset();
    const good = await makeSavedSquadPlans(input, createDefaultSquadPlans(), 'A');
    await expect(restoreSavedSquadPlans({ ...good, schema: 'wrong' }, input)).rejects.toThrow();
    await expect(restoreSavedSquadPlans({ ...good, privateField: 123 }, input)).rejects.toThrow();
    await expect(restoreSavedSquadPlans({ ...good, savedAt: 'not-a-date' }, input)).rejects.toThrow();
    await expect(restoreSavedSquadPlans({ ...good, datasetSha256: '0'.repeat(64) }, input)).rejects.toThrow();
    expect(() => decodeSavedSquadPlans('{broken-json')).toThrow();
    expect(() => decodeSavedSquadPlans('x'.repeat(12_001))).toThrow();
    await expect(makeSavedSquadPlans(input, createDefaultSquadPlans(), 'C' as 'A')).rejects.toThrow();
  });

  it('rejects foreign player IDs, wrong slots and duplicate or contradictory pins', async () => {
    const input = dataset(), good = await makeSavedSquadPlans(input, createDefaultSquadPlans(), 'A');
    for (const modified of [
      { gk: 'not-in-source' }, { unknownSlot: 'gk' }, { cm: 'forward' },
      { gk: 'gk', lb: 'gk' }, JSON.parse('{"__proto__":"gk"}')
    ]) {
      await expect(restoreSavedSquadPlans({
        ...good, plans: { ...good.plans, A: { ...good.plans.A, lockedSlots: modified } }
      }, input)).rejects.toThrow();
    }
    await expect(restoreSavedSquadPlans({
      ...good, plans: { ...good.plans, A: { ...good.plans.A, lockedSlots: { gk: 'gk' }, excludedPlayerIds: ['gk'] } }
    }, input)).rejects.toThrow();
    await expect(restoreSavedSquadPlans({
      ...good, plans: { ...good.plans, A: { ...good.plans.A, excludedPlayerIds: ['gk', 'gk'] } }
    }, input)).rejects.toThrow();
    await expect(restoreSavedSquadPlans({
      ...good, plans: { ...good.plans, A: { ...good.plans.A, excludedPlayerIds: ['foreign'] } }
    }, input)).rejects.toThrow();
  });

  it('does not mutate original state and keeps plan A/B independently owned', async () => {
    const plans = createDefaultSquadPlans();
    const saved = await makeSavedSquadPlans(dataset(), plans, 'A');
    const restored = await restoreSavedSquadPlans(saved, dataset());
    expect(restored.plans).not.toBe(plans);
    expect(restored.plans.A).not.toBe(plans.A);
    expect(restored.plans.B).not.toBe(plans.B);
    expect(restored.plans.A.lockedSlots).not.toBe(restored.plans.B.lockedSlots);
  });
});
