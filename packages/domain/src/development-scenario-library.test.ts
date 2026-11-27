import { describe, expect, it } from 'vitest';
import { bindDevelopmentSource, decodeDevelopmentLibrary, emptyDevelopmentLibrary, encodeDevelopmentLibrary,
  importDevelopmentLibrary, makeDevelopmentRecord, previewDevelopmentRebase, rebaseDevelopmentRecord, restoreDevelopmentRecord, type DevelopmentBinding } from './development-scenario-library';
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

  it('imports exact-scope records atomically without changing existing records or assumptions', () => {
    const record = makeDevelopmentRecord(binding, player, scenario, 'Plan', 'id-1', time);
    const current = { ...emptyDevelopmentLibrary(binding), records: [record] };
    const imported = { ...record, id: 'id-2', name: 'Imported' };
    const json = (records: readonly typeof record[]) => JSON.stringify({ ...emptyDevelopmentLibrary(binding), records });
    expect(importDevelopmentLibrary(json([imported]), current, binding, player).records).toEqual([imported, record]);
    expect(current.records).toEqual([record]);
    for (const invalid of [
      json([]), json([imported, record]), json([{ ...imported, scenario: { ...scenario, overrides: { finishing: 14 } } }]),
      JSON.stringify({ ...emptyDevelopmentLibrary({ ...binding, scope: 'c'.repeat(64) }), records: [imported] }),
      json(Array.from({ length: 20 }, (_, i) => ({ ...imported, id: 'other-' + i }))),
      json([{ ...imported, scenario: { ...scenario, actualCa: 150 } } as typeof record])
    ]) expect(() => importDevelopmentLibrary(invalid, current, binding, player)).toThrow();
    expect(current.records).toEqual([record]);
  });
  it('retains stale imports for review, drops met targets and preserves locks on a new revision', () => {
    const record = makeDevelopmentRecord(binding, player, scenario, 'Plan', 'id-1', time);
    const newBinding = { ...binding, revision: 'c'.repeat(64) };
    const library = { ...emptyDevelopmentLibrary(binding), records: [record] };
    const changed = { ...player, attributes: { finishing: 19, pace: 17 } };
    const raw = encodeDevelopmentLibrary({ ...emptyDevelopmentLibrary(binding), records: [record] }, binding);
    expect(importDevelopmentLibrary(raw, emptyDevelopmentLibrary(newBinding), newBinding, changed).records).toEqual([record]);
    expect(() => restoreDevelopmentRecord(record, newBinding, changed)).toThrow('stale_development_scenario');
    expect(previewDevelopmentRebase(library, record.id, newBinding, changed).rows).toEqual([
      { key: 'finishing', current: 19, previousTarget: 18, proposed: 19, status: 'satisfied' },
      { key: 'pace', current: 17, previousTarget: null, proposed: 17, status: 'locked' }
    ]);
    const copy = rebaseDevelopmentRecord(library, record.id, newBinding, changed, 'New plan', 'id-2', time);
    expect(copy.revision).toBe(newBinding.revision);
    expect(copy.scenario).toEqual({ ...scenario, overrides: {} });
    expect(record.scenario.overrides).toEqual({ finishing: 18 });
    expect(restoreDevelopmentRecord(copy, newBinding, changed)).toEqual(copy.scenario);
    const retained = previewDevelopmentRebase(library, record.id, newBinding, { ...player, attributes: { finishing: 16, pace: 17 } });
    expect(retained.rows[0]).toEqual({ key: 'finishing', current: 16, previousTarget: 18, proposed: 18, status: 'retained' });
    expect(retained.scenario).toEqual(scenario);
  });
  it('blocks rebase when a target or locked attribute becomes unknown, or a revision did not change', () => {
    const record = makeDevelopmentRecord(binding, player, scenario, 'Plan', 'id-1', time);
    const newBinding = { ...binding, revision: 'c'.repeat(64) };
    const library = { ...emptyDevelopmentLibrary(binding), records: [record] };
    for (const attributes of [{ pace: 16 }, { finishing: 15 }, { finishing: 0, pace: 16 }]) {
      const changed = { ...player, attributes };
      expect(previewDevelopmentRebase(library, record.id, newBinding, changed).scenario).toBeNull();
      expect(() => rebaseDevelopmentRecord(library, record.id, newBinding, changed, 'Copy', 'id-2', time)).toThrow();
    }
    expect(() => previewDevelopmentRebase(library, record.id, binding, player)).toThrow();
    expect(() => previewDevelopmentRebase(library, record.id, { ...newBinding, scope: 'd'.repeat(64) }, player)).toThrow();
    expect(() => previewDevelopmentRebase(library, 'unknown', newBinding, player)).toThrow();
    expect(() => rebaseDevelopmentRecord(library, record.id, newBinding, player, 'Copy', record.id, time)).toThrow();
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
