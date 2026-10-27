import { describe, expect, it } from 'vitest';
import { makeSavedPlayerExport, isSavedPlayerExport, summarizeSavedExport, PLAYER_LIBRARY_SCHEMA } from './player-library';
import { parsePlayerExport } from './player-import';

const dataset = parsePlayerExport('Name,Position,Passing,Vision\nLocal Example,CM,18,16', 'test.csv', '2026-10-28T00:00:00Z');

describe('versioned local player exports', () => {
  it('only stores normalized observations, not raw files or real CA/PA', () => {
    const stored = makeSavedPlayerExport(dataset, 'test-uuid', '2026-10-28T01:00:00Z');
    expect(isSavedPlayerExport(stored)).toBe(true);
    expect(stored.dataset.actualCaAvailable).toBe(false);
    expect(stored.dataset.potentialAbilityAvailable).toBe(false);
    expect(stored.schemaVersion).toBe(PLAYER_LIBRARY_SCHEMA);
    expect(summarizeSavedExport(stored).playerCount).toBe(1);
  });
  it('rejects previous schemas and corrupt attributes', () => {
    const stored = makeSavedPlayerExport(dataset, 'a', 'now');
    expect(isSavedPlayerExport({ ...stored, schemaVersion: 999 })).toBe(false);
    const altered = { ...stored, dataset: { ...stored.dataset, players: [
      { ...stored.dataset.players[0], attributes: {passing: 999} }
    ] } };
    expect(isSavedPlayerExport(altered)).toBe(false);
  });
  it('rejects unsupported game ability fields falsely marked verified', () => {
    const stored = makeSavedPlayerExport(dataset, 'b', 'now');
    expect(isSavedPlayerExport({ ...stored, dataset: {
      ...stored.dataset, actualCaAvailable: true
    } })).toBe(false);
  });
});
