import { describe, expect, it } from 'vitest';
import type { PlayerDataset, PlayerExport } from './player-import';
import {
  createSavedScoutShortlist, createScoutShortlistCsv, MAX_SCOUT_SHORTLIST_PLAYERS,
  restoreSavedScoutShortlist, scoutShortlistFilename, scoutShortlistStorageKey,
  validateScoutShortlistIds
} from './scout-shortlist';

function player(id: string, name = id): PlayerExport {
  return {
    id, name, position: 'M (C)', age: 23, club: 'Scout FC', nationality: null,
    attributes: { passing: 17, vision: 16, decisions: 15, firstTouch: 14,
      technique: 15, composure: 14, flair: 13 },
    source: 'game_export', verification: 'provisional'
  };
}
function dataset(players: readonly PlayerExport[] = [player('one'), player('two')]): PlayerDataset {
  return {
    fileName: 'roster.csv', importedAt: '2026-11-21T00:00:00.000Z',
    source: 'game_export', actualCaAvailable: false, potentialAbilityAvailable: false,
    players, attributeColumns: ['passing', 'vision'], warnings: []
  };
}

describe('Source-bound scouting shortlist', () => {
  it('stores only row IDs with a digest; restores the same re-imported source', async () => {
    const input = dataset();
    const record = await createSavedScoutShortlist(input, ['two', 'one']);
    const json = JSON.stringify(record);
    expect(json).not.toContain('Scout FC');
    expect(json).not.toContain('passing');
    expect(json).not.toContain('roster.csv');
    expect((await restoreSavedScoutShortlist(json, input)).playerIds).toEqual(['two', 'one']);
    expect(await scoutShortlistStorageKey(input)).toContain(record.rosterSha256);
    const later = { ...input, importedAt: '2026-11-21T15:00:00.000Z' };
    expect((await restoreSavedScoutShortlist(json, later)).playerIds).toEqual(['two', 'one']);
  });

  it('does not attach a saved candidate list to a different career or modified export', async () => {
    const input = dataset();
    const json = JSON.stringify(await createSavedScoutShortlist(input, ['one']));
    await expect(restoreSavedScoutShortlist(json, dataset([player('one', 'Different')]))).rejects.toThrow('different_player_export');
    await expect(restoreSavedScoutShortlist(json, { ...input, fileName: 'other.csv' })).rejects.toThrow('different_player_export');
  });

  it('rejects duplicate, foreign, non-string and too many candidate IDs', () => {
    const input = dataset();
    expect(() => validateScoutShortlistIds(['one', 'one'], input)).toThrow();
    expect(() => validateScoutShortlistIds(['unknown'], input)).toThrow();
    expect(() => validateScoutShortlistIds([false], input)).toThrow();
    expect(() => validateScoutShortlistIds(Array.from({ length: MAX_SCOUT_SHORTLIST_PLAYERS + 1 }, () => 'one'), input)).toThrow();
    expect(() => validateScoutShortlistIds([], input)).not.toThrow();
  });

  it('fails closed for broken schema, extra keys, bad timestamp and malformed JSON', async () => {
    const input = dataset();
    const good = await createSavedScoutShortlist(input, ['one']);
    for (const modified of [
      { ...good, schema: 'unknown' },
      { ...good, playerIds: ['one', 'one'] },
      { ...good, rosterSha256: 'invalid' },
      { ...good, savedAt: 'not-a-date' },
      { ...good, extraData: 'private' }
    ]) {
      await expect(restoreSavedScoutShortlist(JSON.stringify(modified), input)).rejects.toThrow();
    }
    await expect(restoreSavedScoutShortlist('{not-json', input)).rejects.toThrow();
    await expect(restoreSavedScoutShortlist('x'.repeat(5001), input)).rejects.toThrow();
  });

  it('exports only explicit candidates with provenance, honest role-fit and formula-safe text', () => {
    const input = dataset([player('safe', '=HYPERLINK("http://bad.test")'), player('other', 'Other')]);
    const csv = createScoutShortlistCsv(input, ['safe']);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain('"=HYPERLINK');
    expect(csv).toContain('"game_export (provisional)"');
    expect(csv).toContain('"Role fit / 100 (heuristic)"');
    expect(csv).toContain('not verified CA/PA, transfer value');
    expect(csv).not.toContain('"Other"');
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('retains missing information as blanks and protects generated download names', () => {
    const p = player('unknown');
    const noAttributes = { ...p, attributes: {}, club: null, age: null, position: null };
    const csv = createScoutShortlistCsv(dataset([noAttributes]), ['unknown']);
    expect(csv).toContain('"unknown","","","","","",""');
    expect(scoutShortlistFilename('../scout?recruit.csv')).toBe('ManagerHub-scout-recruit-shortlist.csv');
    expect(scoutShortlistFilename('')).toBe('ManagerHub-roster-shortlist.csv');
  });
});
