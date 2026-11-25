import { describe, expect, it } from 'vitest';
import {
  decodeFm2013Save,
  FM2013DecodeError,
  projectPlayerHiddenFields,
  projectStaffAbility,
  saveDatabaseToPlayerDataset
} from './index';
import { buildSyntheticFm2013Save } from './synthetic';
import { createSaveCompatibilityReport } from '../save-compatibility';
import { optimizeSquad } from '../squad-optimizer';

describe('FM2013 offline save decoder (synthetic fixtures)', () => {
  it('decodes a compressed AFE FM2013 save end-to-end into players, staff, clubs, finances, contracts, teams, stadiums, nations, and competitions', async () => {
    const bytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe', gameDbVersion: 0x774 });
    const beforeCopy = bytes.slice();

    const db = await decodeFm2013Save(bytes, { fileName: 'northbridge-career.fm', lastModified: 1_700_000_000_000 });

    // Original input buffer must remain byte-for-byte immutable.
    expect(bytes).toEqual(beforeCopy);
    expect(db.source.edition).toBe('FM2013');
    expect(db.source.build).toBe('13.3.3');
    expect(db.source.family).toBe('afe');
    expect(db.source.compressed).toBe(true);
    expect(db.source.gameDbVersion).toBe(0x774);
    expect(db.source.gameDate).toBe('2012-07-17');
    expect(db.source.writeCapability).toBe(false);
    expect(db.coverage.gameDbExactEof).toBe(true);

    // Entities decoded accurately
    expect(db.players).toHaveLength(14);
    expect(db.clubs).toHaveLength(2);
    expect(db.teams).toHaveLength(2);
    expect(db.stadiums).toHaveLength(2);
    expect(db.nations).toHaveLength(2);
    expect(db.competitions).toHaveLength(1);
    expect(db.staff).toHaveLength(2); // 1 coach + 1 human manager
    expect(db.humans).toHaveLength(1);
    expect(db.humans[0]?.managerName).toBe('Alex Mercer');
    expect(db.humans[0]?.clubUid).toBe(9001);
    expect(db.humans[0]?.clubName).toBe('Northbridge');

    // Verify club finance, stadium, and facilities
    const club0 = db.clubs.find(c => c.uid === 9001)!;
    expect(club0.fullName).toBe('Northbridge Athletic');
    expect(club0.yearFounded).toBe(1892);
    expect(club0.financeType).toBe('full');
    expect(club0.balanceGbp).toBe(45_000_000);
    expect(club0.transferBudgetGbp).toBe(18_500_000);
    expect(club0.weeklyWageBudgetGbp).toBe(950_000);
    expect(club0.playerCount).toBe(12);

    // Verify player fields, loan vs parent club, CA/PA, personality, hidden traits
    const striker = db.players.find(p => p.uid === 10011)!;
    expect(striker.displayName).toBe('Owen Shaw');
    expect(striker.clubUid).toBe(9001);
    expect(striker.actualCa).toBe(168);
    expect(striker.potentialAbility).toBe(182);
    expect(striker.contract?.weeklyWageGbp).toBe(145_000);
    expect(striker.contract?.expiresAt).toBe('2016-06-29');
    expect(striker.positions.ST).toBe(20);
    expect(striker.hiddenPlaying.consistency).toBe(14);
    expect(striker.personality?.professionalism).toBe(17);

    const loanee = db.players.find(p => p.uid === 10012)!;
    expect(loanee.isLoanedIn).toBe(true);
    expect(loanee.clubUid).toBe(9001);
    expect(loanee.parentClubUid).toBe(9002);
    expect(loanee.parentClubName).toBe('Harbor City');

    // Exact-build compatibility report verifies read domains and keeps tactics/matches unsupported + write false
    const compat = createSaveCompatibilityReport({
      id: db.source.saveId,
      name: db.source.fileName,
      importedAt: db.source.decodedAt,
      lastModified: db.source.lastModified,
      size: db.source.fileSize,
      sha256: db.source.sha256,
      signature: db.source.signature,
      detectedFamily: db.source.family,
      edition: db.source.edition,
      build: db.source.build,
      support: 'decoded',
      inspectionStatus: 'inspected',
      warnings: [],
      archiveIndex: null
    });
    expect(compat.resolution.status).toBe('verified');
    expect(compat.writeCapability).toBe(false);
    expect(compat.coverage.find(c => c.domain === 'actual_ca')?.state).toBe('verified');
    expect(compat.coverage.find(c => c.domain === 'tactics')?.state).toBe('unsupported');
  });

  it('decodes uncompressed AFE and plain FMF variants cleanly', async () => {
    const uncompAfe = await buildSyntheticFm2013Save({ compressed: false, family: 'afe', gameDbVersion: 0x757 });
    const dbAfe = await decodeFm2013Save(uncompAfe, { fileName: 'uncompressed-afe.fm' });
    expect(dbAfe.source.compressed).toBe(false);
    expect(dbAfe.source.family).toBe('afe');
    expect(dbAfe.source.gameDbVersion).toBe(0x757);
    expect(dbAfe.players).toHaveLength(14);

    const plainFmf = await buildSyntheticFm2013Save({ compressed: false, family: 'fmf', gameDbVersion: 0x773 });
    const dbFmf = await decodeFm2013Save(plainFmf, { fileName: 'plain-fmf.fm' });
    expect(dbFmf.source.family).toBe('fmf');
    expect(dbFmf.source.compressed).toBe(false);
    expect(dbFmf.players).toHaveLength(14);
  });

  it('strictly enforces Editor vs Realism redaction and feeds Squad Planner directly with zero CSV', async () => {
    const bytes = await buildSyntheticFm2013Save();
    const db = await decodeFm2013Save(bytes, { fileName: 'mode-check.fm' });
    const player = db.players[0]!;
    const staff = db.staff[0]!;

    const realismHidden = projectPlayerHiddenFields(player, 'realism', db.source.edition, db.source.build);
    expect(realismHidden.actualCa.value).toBeNull();
    expect(realismHidden.actualCa.missingReason).toBe('redacted');
    expect(realismHidden.potentialAbility.value).toBeNull();
    expect(realismHidden.hiddenPlaying.value).toBeNull();
    expect(realismHidden.personality.value).toBeNull();

    const editorHidden = projectPlayerHiddenFields(player, 'editor', db.source.edition, db.source.build);
    expect(editorHidden.actualCa.value).toBe(player.actualCa);
    expect(editorHidden.actualCa.verification).toBe('verified');
    expect(editorHidden.actualCa.source).toBe('decoded_save');
    expect(editorHidden.personality.value?.professionalism).toBe(17);

    const staffRealism = projectStaffAbility(staff, 'realism', db.source.edition, db.source.build);
    expect(staffRealism.staffCa.value).toBeNull();
    expect(staffRealism.staffCa.missingReason).toBe('redacted');

    // Dataset adapter in Realism vs Editor mode
    const realismDs = saveDatabaseToPlayerDataset(db, 'realism', { clubUid: 9001 });
    expect(realismDs.source).toBe('decoded_save');
    expect(realismDs.actualCaAvailable).toBe(false);
    expect(realismDs.players).toHaveLength(12);
    expect(realismDs.players.every(p => p.actualCa === null && p.potentialAbility === null && p.personality === null)).toBe(true);

    const editorDs = saveDatabaseToPlayerDataset(db, 'editor', { clubUid: 9001 });
    expect(editorDs.actualCaAvailable).toBe(true);
    expect(editorDs.players.every(p => typeof p.actualCa === 'number' && typeof p.potentialAbility === 'number')).toBe(true);

    // Squad Planner solves a complete 4-3-3 and 4-2-3-1 XI directly from the decoded .fm save!
    const xi433 = optimizeSquad(realismDs.players, '4-3-3');
    expect(xi433.complete).toBe(true);
    expect(xi433.lineup).toHaveLength(11);
    const xi4231 = optimizeSquad(editorDs.players, '4-2-3-1');
    expect(xi4231.complete).toBe(true);
    expect(xi4231.lineup).toHaveLength(11);
  });

  it('rejects malformed, truncated, unsupported-version, and non-.fm inputs fail-closed', async () => {
    await expect(decodeFm2013Save(new Uint8Array(64), { fileName: 'bad.txt' }))
      .rejects.toMatchObject({ name: 'FM2013DecodeError', code: 'INVALID_FILE' });

    await expect(decodeFm2013Save(new Uint8Array(0), { fileName: 'empty.fm' }))
      .rejects.toMatchObject({ name: 'FM2013DecodeError', code: 'SIZE_LIMIT_EXCEEDED' });

    await expect(decodeFm2013Save(new Uint8Array(64).fill(0x41), { fileName: 'garbage.fm' }))
      .rejects.toMatchObject({ name: 'FM2013DecodeError', code: 'INVALID_SIGNATURE' });

    const valid = await buildSyntheticFm2013Save();
    // Truncated save
    await expect(decodeFm2013Save(valid.slice(0, 64), { fileName: 'truncated.fm' }))
      .rejects.toBeInstanceOf(FM2013DecodeError);

    // Corrupted ciphertext byte inside game_db member
    const corrupted = valid.slice();
    const mid = Math.floor(corrupted.byteLength / 2);
    corrupted[mid] = (corrupted[mid] ?? 0) ^ 0xff;
    await expect(decodeFm2013Save(corrupted, { fileName: 'corrupted.fm' }))
      .rejects.toBeInstanceOf(FM2013DecodeError);

    // Unsupported game_db version (outside verified 0x757..0x774)
    const futureVer = await buildSyntheticFm2013Save({ gameDbVersion: 0x799 });
    await expect(decodeFm2013Save(futureVer, { fileName: 'future.fm' }))
      .rejects.toMatchObject({ name: 'FM2013DecodeError', code: 'UNSUPPORTED_DB_VERSION' });
  });
});
