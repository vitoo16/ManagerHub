import { describe, expect, it } from 'vitest';
import {
  applyDraftOverlayToDatabase,
  applyLangDbToSaveDatabase,
  buildClubSquadPresetOverlay,
  buildEditedSaveFileName,
  buildMassEditPlayersOverlay,
  buildPlayerPresetPatch,
  commitEditorTransaction,
  countDirtyEntities,
  countDirtyFields,
  createEmptyEditorState,
  decodeFm2013Save,
  deriveFm2013SigningKeyFromExecutable,
  EMPTY_SAVE_DRAFT_OVERLAY,
  extractFm2013Member,
  parseFm2013Container,
  parseFm2013LangDb,
  redoEditorTransaction,
  saveDatabaseToPlayerDataset,
  summarizeDraftChanges,
  undoEditorTransaction,
  validateDecodedSaveDatabase,
  writePatchedFm2013Save
} from './index';
import { buildSyntheticFm2013LangDb } from './lang-db';
import { buildSyntheticFm2013Save, SYNTHETIC_TEST_HMAC_KEY } from './synthetic';
import { makeSavedSquadPlans, restoreSavedSquadPlans, squadPlanStorageKey } from '../squad-plan-library';
import { createSavedScoutShortlist, createScoutShortlistCsv, restoreSavedScoutShortlist } from '../scout-shortlist';
import { createSquadPlansCsv } from '../squad-plan-report';
import { optimizeSquad } from '../squad-optimizer';
import { createDefaultSquadPlans } from '../squad-scenarios';

describe('FM2013 P0 integrity, mode-independent persistence, transactions, and lossless Save As .fm writer', () => {
  it('enforces HMAC-SHA512 verification, rejects tampered checksums, and keeps unverified builds/FMF unverified (AUD-08..AUD-11)', async () => {
    const valid = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
    const db = await decodeFm2013Save(valid, {
      fileName: 'signed.fm',
      signingKey: SYNTHETIC_TEST_HMAC_KEY
    });

    expect(db.source.checksumStatus).toBe('verified_hmac_sha512');
    expect(db.source.compatibilityStatus).toBe('verified');
    expect(db.coverage.verifiedDomains).toContain('actual_ca');
    expect(validateDecodedSaveDatabase(db, db.source.saveId)).toBe(db);
    expect(() => validateDecodedSaveDatabase({
      ...db, source: { ...db.source, build: 'unsupported-build' }
    })).toThrow('compatibility or coverage');
    expect(() => validateDecodedSaveDatabase({
      ...db, coverage: { ...db.coverage, verifiedDomains: ['invented-domain'] }
    })).toThrow('compatibility or coverage');

    // Staff NON_PLAYING_DATA attributes are decoded (Gate B)
    expect(db.staff[0]?.attributes?.workingWithYoungsters).toBe(17);
    expect(db.staff[0]?.attributes?.determination).toBe(16);
    expect(db.staff[0]?.attributes?.levelOfDiscipline).toBe(16);

    // Wrong HMAC key must fail closed with TAMPERED_CHECKSUM
    const wrongKey = new Uint8Array(32).fill(0x55);
    await expect(decodeFm2013Save(valid, { fileName: 'signed.fm', signingKey: wrongKey }))
      .rejects.toMatchObject({ name: 'FM2013DecodeError', code: 'TAMPERED_CHECKSUM' });

    // Missing save_game_summary.dat must NEVER claim verified compatibility (AUD-10)
    const summaryless = await buildSyntheticFm2013Save({ omitSummary: true });
    const dbNoSummary = await decodeFm2013Save(summaryless, { fileName: 'no-summary.fm' });
    expect(dbNoSummary.source.compatibilityStatus).toBe('edition_build_unknown');
    expect(dbNoSummary.coverage.verifiedDomains).toEqual([]);

    // Plain FMF profile is research_only, never verified (AUD-10)
    const fmfBytes = await buildSyntheticFm2013Save({ family: 'fmf', compressed: false });
    const fmfDb = await decodeFm2013Save(fmfBytes, { fileName: 'research-fmf.fm' });
    expect(fmfDb.source.compatibilityStatus).toBe('research_only');
    expect(fmfDb.coverage.verifiedDomains).toEqual([]);
  });

  it('resolves base stadium, competition, and city names from lang_db.dat with exact EOF (Gate B)', async () => {
    const [saveBytes, langBytes] = await Promise.all([
      buildSyntheticFm2013Save(),
      buildSyntheticFm2013LangDb({
        cities: [[500, 'Northbridge City'], [501, 'Harborport']],
        stadiums: [[8000, 'Old Northbridge Ground']]
      })
    ]);
    const langDb = await parseFm2013LangDb(langBytes);
    const db = await decodeFm2013Save(saveBytes, { fileName: 'career.fm' });
    const enriched = applyLangDbToSaveDatabase(db, langDb);

    expect(enriched.source.langDbAttached).toBe(true);
    expect(enriched.clubs[0]?.cityName).toBe('Northbridge City');
    expect(enriched.players[0]?.birthCityName).toBe('Northbridge City');
    // Inline custom stadium name from save stays authoritative over lang_db
    expect(enriched.stadiums[0]?.customName).toBe('Northbridge Park');
    expect(enriched.stadiums[0]?.nameProvenance).toBe('decoded_save');
  });

  it('preserves Squad Plans, Scouting Shortlists, and Realism-safe CSV exports across Realism ↔ Editor toggles (AUD-05..AUD-07, S04)', async () => {
    const saveBytes = await buildSyntheticFm2013Save();
    const db = await decodeFm2013Save(saveBytes, { fileName: 'career.fm' });

    const realismDs = saveDatabaseToPlayerDataset(db, 'realism', { clubUid: 9001 });
    const editorDs = saveDatabaseToPlayerDataset(db, 'editor', { clubUid: 9001 });
    const otherClubDs = saveDatabaseToPlayerDataset(db, 'realism', { clubUid: 9002 });

    // Mode-independent storage identity!
    expect(await squadPlanStorageKey(realismDs)).toBe(await squadPlanStorageKey(editorDs));
    expect(await squadPlanStorageKey(realismDs)).not.toBe(await squadPlanStorageKey(otherClubDs));

    const plans = createDefaultSquadPlans();
    const savedPlans = await makeSavedSquadPlans(editorDs, plans, 'B');
    const restoredInRealism = await restoreSavedSquadPlans(savedPlans, realismDs);
    expect(restoredInRealism.active).toBe('B');

    const firstId = realismDs.players[0]!.id;
    const shortlist = await createSavedScoutShortlist(editorDs, [firstId]);
    const restoredShortlist = await restoreSavedScoutShortlist(JSON.stringify(shortlist), realismDs);
    expect(restoredShortlist.playerIds).toEqual([firstId]);

    const shortlistCsv = createScoutShortlistCsv(realismDs, [firstId]);
    expect(shortlistCsv).toContain('decoded_save (FM2013 13.3.3 · realism)');
    expect(shortlistCsv).not.toContain(String(db.players[0]!.actualCa));

    const squadCsv = createSquadPlansCsv(realismDs, {
      A: optimizeSquad(realismDs.players, '4-3-3'),
      B: optimizeSquad(realismDs.players, '4-2-3-1')
    });
    expect(squadCsv).toContain('decoded_save (FM2013 13.3.3 · realism)');
    expect(squadCsv).not.toContain('Actual CA');
  });

  it('supports Undo/Redo, FMRTE13 Presets, Mass Edit, Realism write-blocking, and lossless Save As .fm roundtrip (S06, S08)', async () => {
    const originalBytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
    const immutableSnapshot = originalBytes.slice();
    const baseDb = await decodeFm2013Save(originalBytes, {
      fileName: 'career.fm',
      signingKey: SYNTHETIC_TEST_HMAC_KEY
    });

    // 1. No-op roundtrip preserves every entity and opaque non-game_db members byte-for-byte
    const origContainer = await parseFm2013Container(originalBytes);
    const origHumansRaw = await extractFm2013Member(originalBytes, origContainer, 'humans.dat');
    const noopWritten = await writePatchedFm2013Save(originalBytes, EMPTY_SAVE_DRAFT_OVERLAY, {
      signingKey: SYNTHETIC_TEST_HMAC_KEY,
      outputFileName: buildEditedSaveFileName('career.fm')
    });
    expect(originalBytes).toEqual(immutableSnapshot);
    expect(noopWritten.fileName).toBe('career-edited.fm');
    expect(noopWritten.patchedFieldCount).toBe(0);
    expect(noopWritten.bytes).toEqual(originalBytes);
    expect(noopWritten.sha256).toBe(noopWritten.originalSha256);
    expect(noopWritten.database.players).toEqual(baseDb.players);
    expect(noopWritten.database.clubs).toEqual(baseDb.clubs);
    expect(noopWritten.database.staff).toEqual(baseDb.staff);

    const noopContainer = await parseFm2013Container(noopWritten.bytes);
    const noopHumansRaw = await extractFm2013Member(noopWritten.bytes, noopContainer, 'humans.dat');
    expect(noopHumansRaw).toEqual(origHumansRaw);

    // 2. Realism mode strictly rejects edit transactions
    let tx = createEmptyEditorState(baseDb.source.saveId);
    expect(() =>
      commitEditorTransaction(tx, baseDb, 'realism', 'Illegal edit', cur => ({
        ...cur,
        players: { 10011: { actualCa: 190 } }
      }))
    ).toThrow('Editing is disabled in Realism mode');

    // 3. Multi-entity transaction + Undo/Redo + Presets + Mass Edit
    tx = commitEditorTransaction(tx, baseDb, 'editor', 'Edit Owen Shaw CA/PA & finishing', cur => ({
      ...cur,
      players: {
        ...cur.players,
        10011: {
          actualCa: 188,
          potentialAbility: 196,
          weeklyWageGbp: 210_000,
          contractExpiresAt: '2019-06-30',
          squadNumber: 99,
          positions: { AMC: 20 },
          attributes: { finishing: 20, pace: 19 },
          hiddenPlaying: { consistency: 19 },
          personality: { professionalism: 20 }
        }
      },
      staff: {
        ...cur.staff,
        50001: {
          staffCa: 175,
          staffPa: 185,
          attributes: { tacticalKnowledge: 20, workingWithYoungsters: 20 }
        }
      },
      clubs: {
        ...cur.clubs,
        9001: {
          balanceGbp: 120_000_000,
          transferBudgetGbp: 85_000_000,
          weeklyWageBudgetGbp: 1_800_000,
          trainingFacilities: 20,
          youthFacilities: 19
        }
      },
      stadiums: {
        ...cur.stadiums,
        8000: {
          capacity: 68_000,
          seatingCapacity: 68_000,
          expansionCapacity: 80_000
        }
      }
    }));

    expect(countDirtyEntities(tx.present)).toBe(4);
    expect(countDirtyFields(tx.present)).toBeGreaterThanOrEqual(18);
    expect(summarizeDraftChanges(baseDb, tx.present).length).toBeGreaterThanOrEqual(18);

    // Apply preset + Undo + Redo
    const presetTx = commitEditorTransaction(tx, baseDb, 'editor', 'Inspire Squad', cur =>
      buildClubSquadPresetOverlay(baseDb, cur, 9001, 'inspire_team')
    );
    expect(countDirtyEntities(presetTx.present)).toBeGreaterThan(4);
    const undone = undoEditorTransaction(presetTx);
    expect(undone.present).toEqual(tx.present);
    const redone = redoEditorTransaction(undone);
    expect(redone.present).toEqual(presetTx.present);

    // Mass Edit Harbor City players + Player preset check
    const wonderPatch = buildPlayerPresetPatch(baseDb.players[0]!, 'wonderkid_pa_200', baseDb.source.gameDate);
    expect(wonderPatch.potentialAbility).toBe(200);
    const massEdited = commitEditorTransaction(tx, baseDb, 'editor', 'Mass edit Harbor City morale', cur =>
      buildMassEditPlayersOverlay(cur, [20001], { morale: 19 })
    );

    const projectedOverlayDb = applyDraftOverlayToDatabase(baseDb, massEdited.present);
    expect(projectedOverlayDb.players.find(p => p.uid === 10011)?.actualCa).toBe(188);

    // 4. Write patched Save As .fm and independently re-decode from raw bytes!
    const written = await writePatchedFm2013Save(originalBytes, massEdited.present, {
      signingKey: SYNTHETIC_TEST_HMAC_KEY,
      expectedOriginalSha256: baseDb.source.sha256,
      outputFileName: 'northbridge-edited.fm'
    });

    // Original buffer is STILL 100% unchanged!
    expect(originalBytes).toEqual(immutableSnapshot);
    expect(written.sha256).not.toBe(written.originalSha256);

    const redecoded = await decodeFm2013Save(written.bytes, {
      fileName: 'northbridge-edited.fm',
      signingKey: SYNTHETIC_TEST_HMAC_KEY
    });

    const editedStriker = redecoded.players.find(p => p.uid === 10011)!;
    expect(editedStriker.actualCa).toBe(188);
    expect(editedStriker.potentialAbility).toBe(196);
    expect(editedStriker.contract?.weeklyWageGbp).toBe(210_000);
    expect(editedStriker.contract?.expiresAt).toBe('2019-06-30');
    expect(editedStriker.squadNumber).toBe(99);
    expect(editedStriker.positions.AMC).toBe(20);
    expect(editedStriker.attributes.finishing).toBe(20);
    expect(editedStriker.attributes.pace).toBe(19);
    expect(editedStriker.hiddenPlaying.consistency).toBe(19);
    expect(editedStriker.personality?.professionalism).toBe(20);

    const editedMoralePlayer = redecoded.players.find(p => p.uid === 20001)!;
    expect(editedMoralePlayer.morale).toBe(19);

    // Unedited player (Hugo Navarro, UID 20002) MUST remain 100% identical!
    const uneditedOrig = baseDb.players.find(p => p.uid === 20002)!;
    const uneditedAfter = redecoded.players.find(p => p.uid === 20002)!;
    expect(uneditedAfter).toEqual(uneditedOrig);

    const editedCoach = redecoded.staff.find(s => s.uid === 50001)!;
    expect(editedCoach.staffCa).toBe(175);
    expect(editedCoach.staffPa).toBe(185);
    expect(editedCoach.attributes?.tacticalKnowledge).toBe(20);
    expect(editedCoach.attributes?.workingWithYoungsters).toBe(20);

    const editedClub = redecoded.clubs.find(c => c.uid === 9001)!;
    expect(editedClub.balanceGbp).toBe(120_000_000);
    expect(editedClub.transferBudgetGbp).toBe(85_000_000);
    expect(editedClub.weeklyWageBudgetGbp).toBe(1_800_000);
    expect(editedClub.trainingFacilities).toBe(20);
    expect(editedClub.youthFacilities).toBe(19);

    const editedStadium = redecoded.stadiums.find(st => st.uid === 8000)!;
    expect(editedStadium.capacity).toBe(68_000);
    expect(editedStadium.seatingCapacity).toBe(68_000);
    expect(editedStadium.expansionCapacity).toBe(80_000);
  });

  it('rejects invalid direct writer overlays before serializing (R02)', async () => {
    const bytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
    const original = bytes.slice();
    const options = { signingKey: SYNTHETIC_TEST_HMAC_KEY };
    await expect(writePatchedFm2013Save(bytes, {
      ...EMPTY_SAVE_DRAFT_OVERLAY, players: { 10011: { actualCa: 999 } }
    }, options)).rejects.toThrow('actualCa');
    await expect(writePatchedFm2013Save(bytes, {
      ...EMPTY_SAVE_DRAFT_OVERLAY, players: { 10011: { attributes: { punching: 1, tendencyToPunch: 20 } } }
    }, options)).rejects.toThrow('Conflicting values');
    await expect(writePatchedFm2013Save(bytes, {
      ...EMPTY_SAVE_DRAFT_OVERLAY, stadiums: { 8000: { capacity: 100, seatingCapacity: 200 } }
    }, options)).rejects.toThrow('seating capacity');
    expect(bytes).toEqual(original);
  });

  it('supports canonical AFE v4 container saves and printable ASCII space (0x20) in PE key derivation', async () => {
    const v4Bytes = await buildSyntheticFm2013Save({ compressed: true, family: 'afe' });
    expect(new DataView(v4Bytes.buffer, v4Bytes.byteOffset, 18).getUint16(6, true)).toBe(4);

    const decodedV4 = await decodeFm2013Save(v4Bytes, {
      fileName: 'canonical-v4.fm',
      signingKey: SYNTHETIC_TEST_HMAC_KEY
    });
    expect(decodedV4.source.compatibilityStatus).toBe('verified');
    expect(decodedV4.source.checksumStatus).toBe('verified_hmac_sha512');

    let tx = createEmptyEditorState(decodedV4.source.saveId);
    tx = commitEditorTransaction(tx, decodedV4, 'editor', 'Patch v4 CA', cur => ({
      ...cur,
      players: { 10011: { actualCa: 194 } }
    }));

    const writtenV4 = await writePatchedFm2013Save(v4Bytes, tx.present, {
      signingKey: SYNTHETIC_TEST_HMAC_KEY,
      outputFileName: 'canonical-v4-edited.fm'
    });
    expect(new DataView(writtenV4.bytes.buffer, writtenV4.bytes.byteOffset, 18).getUint16(6, true)).toBe(4);
    expect(writtenV4.database.players.find(p => p.uid === 10011)?.actualCa).toBe(194);

    // Construct a minimal synthetic 32-bit x86 PE image (4.5 MiB) mapping VA 0x2474be0 with an ASCII key containing 0x20
    const syntheticPe = new Uint8Array(4_500_000);
    const peDv = new DataView(syntheticPe.buffer);
    syntheticPe[0] = 0x4d; syntheticPe[1] = 0x5a; // MZ
    const peOff = 0x80;
    peDv.setUint32(0x3c, peOff, true);
    syntheticPe.set([0x50, 0x45, 0x00, 0x00], peOff); // PE\0\0
    peDv.setUint16(peOff + 6, 1, true); // 1 section
    peDv.setUint16(peOff + 20, 0xe0, true); // SizeOfOptionalHeader
    peDv.setUint16(peOff + 24, 0x10b, true); // PE32 magic
    peDv.setUint32(peOff + 24 + 28, 0x400000, true); // ImageBase
    const secBase = peOff + 24 + 0xe0;
    peDv.setUint32(secBase + 8, 0x2000, true); // VirtualSize
    peDv.setUint32(secBase + 12, 0x2074000, true); // VirtualAddress (VA 0x2474000)
    peDv.setUint32(secBase + 16, 0x2000, true); // SizeOfRawData
    peDv.setUint32(secBase + 20, 0x1000, true); // PointerToRawData
    const keyAscii = 'Test Key 1234567'; // 16 chars including 0x20 spaces + trailing NUL
    const rawKeyOff = 0x1000 + (0x2074be0 - 0x2074000);
    for (let i = 0; i < 16; i++) syntheticPe[rawKeyOff + i] = keyAscii.charCodeAt(i);
    syntheticPe[rawKeyOff + 16] = 0;

    const derived = await deriveFm2013SigningKeyFromExecutable(syntheticPe);
    expect(derived.byteLength).toBe(32);
    expect(new DataView(derived.buffer).getUint16(8, true)).toBe(0x20);
  });
});
