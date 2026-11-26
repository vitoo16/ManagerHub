import { describe, expect, it } from 'vitest';
import { bindDevelopmentSource, decodeDevelopmentLibrary, emptyDevelopmentLibrary, encodeDevelopmentLibrary,
  makeDevelopmentRecord, restoreDevelopmentRecord, type DevelopmentBinding } from './development-scenario-library';
import type { PlayerExport } from './player-import';
import type { DevelopmentScenario } from './player-development';

const player: PlayerExport = { id: 'p1', name: 'Test', age: 20, position: 'ST', club: null, nationality: null,
  source: 'decoded_save', verification: 'verified', nativeId: 1, actualCa: 150, potentialAbility: 170,
  attributes: { finishing: 15, pace: 16 }, positions: { ST: 20 } };
const scenario: DevelopmentScenario = { target: { position: 'ST', roleId: 'poacher', duty: 'attack' },
  benchmark: 18, overrides: { finishing: 18 }, locked: ['pace'] };
const binding: DevelopmentBinding = { scope: 'a'.repeat(64), revision: 'b'.repeat(64) };
const time = '2026-11-26T00:00:00.000Z';

describe('development scenario library', () => {
  it('round-trips only explicit assumptions with versioned source binding', () => {
    const record = makeDevelopmentRecord(binding, player, scenario, 'Plan', 'id-1', time);
    const raw = encodeDevelopmentLibrary({ ...emptyDevelopmentLibrary(binding), records: [record] }, binding);
    expect(raw).not.toContain('actualCa');
    expect(raw).not.toContain('potentialAbility');
    expect(raw).not.toContain('Test');
    const decoded = decodeDevelopmentLibrary(raw, binding);
    expect(restoreDevelopmentRecord(decoded.records[0]!, binding, player)).toEqual(scenario);
    expect(() => restoreDevelopmentRecord(record, { ...binding, revision: 'c'.repeat(64) }, player)).toThrow('stale_development_scenario');
    expect(() => decodeDevelopmentLibrary(raw, { ...binding, scope: 'd'.repeat(64) })).toThrow();
  });
  it('rejects corrupted, incompatible, over-capacity and hidden-field payloads', () => {
    const record = makeDevelopmentRecord(binding, player, scenario, 'Plan', 'id-1', time);
    const lib = { ...emptyDevelopmentLibrary(binding), records: [record] };
    for (const payload of [
      { ...lib, model: 'future' },
      { ...lib, records: [record, record] },
      { ...lib, records: Array.from({ length: 21 }, (_, i) => ({ ...record, id: String(i) })) },
      { ...lib, records: [{ ...record, actualCa: 150 }] },
      { ...lib, records: [{ ...record, scenario: { ...scenario, overrides: { finishing: 21 } } }] }
    ]) expect(() => decodeDevelopmentLibrary(JSON.stringify(payload), binding)).toThrow();
    expect(() => makeDevelopmentRecord(binding, player, { ...scenario, overrides: { finishing: 14 } }, 'Plan', 'id-1', time)).toThrow();
  });
  it('binds to exact save/player and visible revision without depending on mode or CA/PA', async () => {
    const sha = 'a'.repeat(64);
    const a = await bindDevelopmentSource(player, sha, 'FM2013', '13.3.3');
    const redacted: PlayerExport = { ...player, actualCa: null, potentialAbility: null };
    const b = await bindDevelopmentSource(redacted, sha, 'FM2013', '13.3.3');
    expect(a).toEqual(b);
    const changed = await bindDevelopmentSource({ ...player, attributes: { ...player.attributes, finishing: 16 } }, sha, 'FM2013', '13.3.3');
    expect(changed.scope).toBe(a.scope);
    expect(changed.revision).not.toBe(a.revision);
    expect((await bindDevelopmentSource(player, 'c'.repeat(64), 'FM2013', '13.3.3')).scope).not.toBe(a.scope);
  });
});
