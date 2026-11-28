import type { AttributeKey } from '../player-import';
import { resolveSaveCompatibility } from '../save-compatibility';
import {
  computeGameDbHmacSha512,
  deflateZlib,
  encryptAfeMemberEnvelope,
  extractFm2013Member,
  MEMBER_DATA_BASE_OFFSET,
  parseFm2013Container,
  parseSaveGameSummary,
  readSlice,
  serializeRecursiveFmfDirectory,
  verifyGameDbHmacSha512,
  type BinarySliceSource,
  type FmfDirectoryFileEntry,
  type FmfDirectoryNode
} from './afe-container';
import { isoToSiDate } from './binary-reader';
import {
  applyDraftOverlayToDatabase,
  countDirtyFields,
  normalizeOverlayAgainstDatabase,
  type ClubDraftPatch,
  type PlayerDraftPatch,
  type SaveDraftOverlay,
  type StadiumDraftPatch,
  type StaffDraftPatch
} from './editor-transactions';
import { parseFm2013GameDb, type GameDbEditableOffsetMap } from './game-db-parser';
import { computeSha256Hex, decodeFm2013Save } from './index';
import {
  FM2013DecodeError,
  FM2013_EXPERIMENTAL_WRITE_BUILD,
  type DecodedHiddenPlayingAttributes,
  type DecodedPersonalityAttributes,
  type DecodedPositionRatings,
  type DecodedSaveDatabase,
  type DecodedStaffAttributes
} from './types';
import { validateDecodedSaveDatabase } from './validation';

const POSITION_BYTE_INDEX: Readonly<Record<keyof DecodedPositionRatings, number>> = {
  GK: 0, SW: 1, DL: 2, DC: 3, DR: 4, DM: 5, ML: 6, MC: 7, MR: 8,
  AML: 9, AMC: 10, AMR: 11, ST: 12, WBL: 13, WBR: 14
};

const VISIBLE_ATTR_BYTE_INDEX: Readonly<Record<AttributeKey, number>> = {
  crossing: 15,
  dribbling: 16,
  finishing: 17,
  heading: 18,
  longShots: 19,
  marking: 20,
  offTheBall: 21,
  passing: 22,
  penaltyTaking: 23,
  tackling: 24,
  vision: 25,
  handling: 26,
  aerialReach: 27,
  commandOfArea: 28,
  communication: 29,
  kicking: 30,
  throwing: 31,
  anticipation: 32,
  decisions: 33,
  oneOnOnes: 34,
  positioning: 35,
  reflexes: 36,
  firstTouch: 37,
  technique: 38,
  flair: 41,
  corners: 42,
  teamwork: 43,
  workRate: 44,
  longThrows: 45,
  eccentricity: 46,
  rushingOut: 47,
  tendencyToPunch: 48,
  punching: 48,
  acceleration: 49,
  freeKickTaking: 50,
  strength: 51,
  stamina: 52,
  pace: 53,
  jumpingReach: 54,
  leadership: 55,
  balance: 57,
  bravery: 58,
  aggression: 60,
  agility: 61,
  naturalFitness: 65,
  determination: 66,
  composure: 67,
  concentration: 68
};

const HIDDEN_PLAYING_BYTE_INDEX: Readonly<Record<keyof DecodedHiddenPlayingAttributes, number>> = {
  dirtiness: 56,
  consistency: 59,
  importantMatches: 62,
  injuryProneness: 63,
  versatility: 64
};

const PERSONALITY_BYTE_INDEX: Readonly<Record<keyof DecodedPersonalityAttributes, number>> = {
  adaptability: 0,
  ambition: 1,
  loyalty: 2,
  pressure: 3,
  professionalism: 4,
  sportsmanship: 5,
  temperament: 6,
  controversy: 7
};

const STAFF_ATTR_SPEC: Readonly<Record<keyof DecodedStaffAttributes, { readonly index: number; readonly scaled100: boolean }>> = {
  adaptability: { index: 2, scaled100: false },
  levelOfDiscipline: { index: 4, scaled100: false },
  workingWithYoungsters: { index: 12, scaled100: false },
  determination: { index: 13, scaled100: true },
  player: { index: 26, scaled100: true },
  goalkeepers: { index: 27, scaled100: true },
  judgingPlayerAbility: { index: 28, scaled100: true },
  judgingPlayerPotential: { index: 29, scaled100: true },
  manManagement: { index: 30, scaled100: true },
  motivating: { index: 31, scaled100: true },
  physiotherapy: { index: 32, scaled100: true },
  tacticalKnowledge: { index: 33, scaled100: true },
  attacking: { index: 34, scaled100: true },
  defending: { index: 35, scaled100: true },
  fitness: { index: 36, scaled100: true },
  mental: { index: 37, scaled100: true },
  technical: { index: 38, scaled100: true },
  tactical: { index: 39, scaled100: true }
};

function toRaw100(displayVal: number): number {
  const raw = Math.round(displayVal) * 5;
  return raw < 1 ? 1 : raw > 100 ? 100 : raw;
}

function clamp20(val: number): number {
  const r = Math.round(val);
  return r < 1 ? 1 : r > 20 ? 20 : r;
}

function writeSiDate4(dv: DataView, offset: number, iso: string): void {
  const si = isoToSiDate(iso);
  if (!si) {
    throw new FM2013DecodeError('INVALID_FILE', `Invalid contract date "${iso}".`);
  }
  dv.setInt16(offset, si.dayOfYear, true);
  dv.setUint16(offset + 2, si.year, true);
}

function applyPlayerBinaryPatch(
  dv: DataView,
  bytes: Uint8Array,
  offsets: GameDbEditableOffsetMap,
  uid: number,
  patch: PlayerDraftPatch
): void {
  const loc = offsets.playersByUid.get(uid);
  if (!loc) {
    throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Player UID ${uid} offset map not found.`);
  }
  if (patch.actualCa !== undefined) dv.setInt16(loc.actualCaOffset, patch.actualCa, true);
  if (patch.potentialAbility !== undefined) dv.setInt16(loc.potentialAbilityOffset, patch.potentialAbility, true);
  if (patch.homeReputation !== undefined) dv.setInt16(loc.homeRepOffset, patch.homeReputation, true);
  if (patch.currentReputation !== undefined) dv.setInt16(loc.currentRepOffset, patch.currentReputation, true);
  if (patch.worldReputation !== undefined) dv.setInt16(loc.worldRepOffset, patch.worldReputation, true);
  if (patch.marketValueGbp !== undefined) dv.setInt32(loc.marketValueOffset, patch.marketValueGbp, true);
  if (patch.morale !== undefined) bytes[loc.moraleOffset] = clamp20(patch.morale);
  if (patch.weightKg !== undefined) dv.setInt16(loc.weightKgOffset, patch.weightKg, true);
  if (patch.heightCm !== undefined) dv.setInt16(loc.heightCmOffset, patch.heightCm, true);
  if (patch.intCaps !== undefined) bytes[loc.intCapsOffset] = patch.intCaps & 0xff;
  if (patch.intGoals !== undefined) bytes[loc.intGoalsOffset] = patch.intGoals & 0xff;
  if (patch.leftFoot !== undefined) bytes[loc.playingDataStartOffset + 39] = toRaw100(patch.leftFoot);
  if (patch.rightFoot !== undefined) bytes[loc.playingDataStartOffset + 40] = toRaw100(patch.rightFoot);

  if (patch.weeklyWageGbp !== undefined) {
    if (loc.contractWageOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Player UID ${uid} has no active contract wage offset.`);
    }
    dv.setInt32(loc.contractWageOffset, patch.weeklyWageGbp, true);
  }
  if (patch.contractExpiresAt !== undefined) {
    if (loc.contractExpiresOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Player UID ${uid} has no active contract expiry offset.`);
    }
    writeSiDate4(dv, loc.contractExpiresOffset, patch.contractExpiresAt);
  }
  if (patch.squadNumber !== undefined) {
    if (loc.contractSquadNumberOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Player UID ${uid} has no active contract squad number offset.`);
    }
    bytes[loc.contractSquadNumberOffset] = patch.squadNumber & 0xff;
  }

  if (patch.positions) {
    for (const [k, v] of Object.entries(patch.positions)) {
      if (v === undefined) continue;
      const idx = POSITION_BYTE_INDEX[k as keyof DecodedPositionRatings];
      bytes[loc.playingDataStartOffset + idx] = clamp20(v);
    }
  }
  if (patch.attributes) {
    for (const [k, v] of Object.entries(patch.attributes)) {
      if (v === undefined) continue;
      const idx = VISIBLE_ATTR_BYTE_INDEX[k as AttributeKey];
      bytes[loc.playingDataStartOffset + idx] = toRaw100(v);
    }
  }
  if (patch.hiddenPlaying) {
    for (const [k, v] of Object.entries(patch.hiddenPlaying)) {
      if (v === undefined) continue;
      const idx = HIDDEN_PLAYING_BYTE_INDEX[k as keyof DecodedHiddenPlayingAttributes];
      bytes[loc.playingDataStartOffset + idx] = toRaw100(v);
    }
  }
  if (patch.personality) {
    if (loc.personDataStartOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Player UID ${uid} has no PERSON_DATA offset.`);
    }
    for (const [k, v] of Object.entries(patch.personality)) {
      if (v === undefined) continue;
      const idx = PERSONALITY_BYTE_INDEX[k as keyof DecodedPersonalityAttributes];
      bytes[loc.personDataStartOffset + idx] = clamp20(v);
    }
  }
}

function applyStaffBinaryPatch(
  dv: DataView,
  bytes: Uint8Array,
  offsets: GameDbEditableOffsetMap,
  uid: number,
  patch: StaffDraftPatch
): void {
  const loc = offsets.staffByUid.get(uid);
  if (!loc) {
    throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Staff UID ${uid} offset map not found.`);
  }
  if (patch.staffCa !== undefined) dv.setInt16(loc.staffCaOffset, patch.staffCa, true);
  if (patch.staffPa !== undefined) dv.setInt16(loc.staffPaOffset, patch.staffPa, true);
  if (patch.homeReputation !== undefined) dv.setInt16(loc.homeRepOffset, patch.homeReputation, true);
  if (patch.currentReputation !== undefined) dv.setInt16(loc.currentRepOffset, patch.currentReputation, true);
  if (patch.worldReputation !== undefined) dv.setInt16(loc.worldRepOffset, patch.worldReputation, true);
  if (patch.weeklyWageGbp !== undefined) {
    if (loc.contractWageOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Staff UID ${uid} has no contract wage offset.`);
    }
    dv.setInt32(loc.contractWageOffset, patch.weeklyWageGbp, true);
  }
  if (patch.contractExpiresAt !== undefined) {
    if (loc.contractExpiresOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Staff UID ${uid} has no contract expiry offset.`);
    }
    writeSiDate4(dv, loc.contractExpiresOffset, patch.contractExpiresAt);
  }
  if (patch.attributes) {
    if (loc.nonPlayingDataStartOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Staff UID ${uid} has no NON_PLAYING_DATA offset.`);
    }
    for (const [k, v] of Object.entries(patch.attributes)) {
      if (v === undefined) continue;
      const spec = STAFF_ATTR_SPEC[k as keyof DecodedStaffAttributes];
      bytes[loc.nonPlayingDataStartOffset + spec.index] = spec.scaled100 ? toRaw100(v) : clamp20(v);
    }
  }
}

function applyClubBinaryPatch(
  dv: DataView,
  bytes: Uint8Array,
  offsets: GameDbEditableOffsetMap,
  uid: number,
  patch: ClubDraftPatch
): void {
  const loc = offsets.clubsByUid.get(uid);
  if (!loc) {
    throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Club UID ${uid} offset map not found.`);
  }
  if (patch.trainingFacilities !== undefined) bytes[loc.trainingFacilitiesOffset] = clamp20(patch.trainingFacilities);
  if (patch.youthFacilities !== undefined) bytes[loc.youthFacilitiesOffset] = clamp20(patch.youthFacilities);
  if (patch.youthCoaching !== undefined) bytes[loc.youthCoachingOffset] = clamp20(patch.youthCoaching);
  if (patch.youthRecruitment !== undefined) bytes[loc.youthRecruitmentOffset] = clamp20(patch.youthRecruitment);
  if (patch.yearFounded !== undefined) dv.setUint16(loc.yearFoundedOffset, patch.yearFounded, true);

  if (patch.balanceGbp !== undefined) {
    if (loc.balanceGbpOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Club UID ${uid} has no finance balance offset.`);
    }
    dv.setInt32(loc.balanceGbpOffset, patch.balanceGbp, true);
  }
  if (patch.transferBudgetGbp !== undefined) {
    if (loc.transferBudgetGbpOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Club UID ${uid} has no transfer budget offset.`);
    }
    dv.setInt32(loc.transferBudgetGbpOffset, patch.transferBudgetGbp, true);
  }
  if (patch.transferBudgetSeasonGbp !== undefined) {
    if (loc.transferBudgetSeasonGbpOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Club UID ${uid} has no season transfer budget offset.`);
    }
    dv.setInt32(loc.transferBudgetSeasonGbpOffset, patch.transferBudgetSeasonGbp, true);
  }
  if (patch.weeklyWageBudgetGbp !== undefined) {
    if (loc.weeklyWageBudgetGbpOffset === null) {
      throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Club UID ${uid} has no wage budget offset.`);
    }
    dv.setInt32(loc.weeklyWageBudgetGbpOffset, patch.weeklyWageBudgetGbp, true);
  }
}

function applyStadiumBinaryPatch(
  dv: DataView,
  offsets: GameDbEditableOffsetMap,
  uid: number,
  patch: StadiumDraftPatch
): void {
  const loc = offsets.stadiumsByUid.get(uid);
  if (!loc) {
    throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', `Stadium UID ${uid} offset map not found.`);
  }
  if (patch.capacity !== undefined) dv.setInt32(loc.capacityOffset, patch.capacity, true);
  if (patch.seatingCapacity !== undefined) dv.setInt32(loc.seatingCapacityOffset, patch.seatingCapacity, true);
  if (patch.expansionCapacity !== undefined) dv.setInt32(loc.expansionCapacityOffset, patch.expansionCapacity, true);
}

function shiftDirectoryTreeForGameDb(
  node: FmfDirectoryNode,
  oldGameDbOffset: number,
  newGameDbStoredBytes: number,
  newGameDbUncompressedBytes: number,
  delta: number
): FmfDirectoryNode {
  const mapFile = (file: FmfDirectoryFileEntry): FmfDirectoryFileEntry => {
    if (file.fullPath === 'game_db.dat') {
      return {
        ...file,
        storedBytes: newGameDbStoredBytes,
        reportedUncompressedBytes: newGameDbUncompressedBytes
      };
    }
    if (file.offset > oldGameDbOffset) {
      return {
        ...file,
        offset: file.offset + delta
      };
    }
    return file;
  };

  return {
    ...node,
    files: node.files.map(mapFile),
    subDirs: node.subDirs.map(sub =>
      shiftDirectoryTreeForGameDb(sub, oldGameDbOffset, newGameDbStoredBytes, newGameDbUncompressedBytes, delta)
    )
  };
}

export interface WritePatchedFm2013SaveOptions {
  readonly signingKey: Uint8Array;
  readonly outputFileName?: string;
  readonly expectedOriginalSha256?: string;
}

export interface WrittenFm2013SaveResult {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly sha256: string;
  readonly originalSha256: string;
  readonly patchedFieldCount: number;
  readonly database: DecodedSaveDatabase;
}

/**
 * Experimental offline `Save As .fm` surgical writer (`Gate C`).
 *
 * Guarantees:
 * 1. Original `source` (`File` or `Uint8Array`) is NEVER mutated.
 * 2. Requires an exact-build `'verified'` FM2013 `afe` v4 save AND valid incoming 64B `HMAC-SHA512`.
 * 3. Modifies ONLY verified fixed-width scalar offsets inside a copy of `game_db.dat` and recomputes `HMAC-SHA512`.
 * 4. Preserves all 770+ non-`game_db.dat` members (including `rgman/` subdirectories and inter-member slack gaps) byte-for-byte.
 * 5. Independently re-decodes and schema-validates the output `.fm` bytes before returning, failing closed on any discrepancy.
 */
export async function writePatchedFm2013Save(
  source: BinarySliceSource,
  overlay: SaveDraftOverlay,
  options: WritePatchedFm2013SaveOptions
): Promise<WrittenFm2013SaveResult> {
  if (!(options.signingKey instanceof Uint8Array) || options.signingKey.byteLength !== 32) {
    throw new FM2013DecodeError(
      'UNSUPPORTED_WRITE_TARGET',
      'Experimental Save As .fm requires an authorized 32-byte FM2013 signing key.'
    );
  }

  const originalSha256 = await computeSha256Hex(source);
  if (options.expectedOriginalSha256 && options.expectedOriginalSha256 !== originalSha256) {
    throw new FM2013DecodeError(
      'UNSUPPORTED_WRITE_TARGET',
      'Source .fm SHA-256 no longer matches the active session.'
    );
  }

  const container = await parseFm2013Container(source);
  if (container.family !== 'afe' || container.formatVersion !== 4) {
    throw new FM2013DecodeError(
      'UNSUPPORTED_WRITE_TARGET',
      'Experimental Save As .fm requires a verified FM2013 AFE v4 read profile.'
    );
  }

  const [summaryBytes, gameDbBytes] = await Promise.all([
    extractFm2013Member(source, container, 'save_game_summary.dat'),
    extractFm2013Member(source, container, 'game_db.dat')
  ]);

  if (!summaryBytes || !gameDbBytes) {
    throw new FM2013DecodeError(
      'UNSUPPORTED_WRITE_TARGET',
      'Save is missing save_game_summary.dat or game_db.dat required for exact-build write validation.'
    );
  }

  const summary = parseSaveGameSummary(summaryBytes);
  const compat = resolveSaveCompatibility({
    detectedFamily: container.family,
    edition: summary?.gameVersion ? 'FM2013' : null,
    build: summary?.gameVersion ?? null
  });
  if (compat.status !== 'verified' || summary?.gameVersion !== FM2013_EXPERIMENTAL_WRITE_BUILD) {
    throw new FM2013DecodeError(
      'UNSUPPORTED_WRITE_TARGET',
      `Experimental Save As requires FM2013 ${FM2013_EXPERIMENTAL_WRITE_BUILD}; source reports ${summary?.gameVersion ?? 'unknown'}.`
    );
  }

  const incomingValidHmac = await verifyGameDbHmacSha512(gameDbBytes, options.signingKey);
  if (!incomingValidHmac) {
    throw new FM2013DecodeError(
      'TAMPERED_CHECKSUM',
      'Incoming game_db.dat failed HMAC-SHA512 verification with the supplied FM2013 key.'
    );
  }

  // Revalidate against source bytes, never a caller-supplied working database.
  const input = source instanceof Uint8Array ? source : await readSlice(source, 0, source.size);
  const baseDb = await decodeFm2013Save(input, { signingKey: options.signingKey });
  if (baseDb.source.sha256 !== originalSha256) {
    throw new FM2013DecodeError('UNSUPPORTED_WRITE_TARGET', 'Source changed during write preparation.');
  }
  const normalized = normalizeOverlayAgainstDatabase(baseDb, overlay);
  const expectedDb = applyDraftOverlayToDatabase(baseDb, normalized);
  const outputFileName = options.outputFileName?.toLowerCase().endsWith('.fm')
    ? options.outputFileName
    : `${(options.outputFileName ?? 'edited-career').replace(/\.fm$/iu, '')}.fm`;
  if (countDirtyFields(normalized) === 0) {
    return {
      bytes: input.slice(), fileName: outputFileName, sha256: originalSha256, originalSha256,
      patchedFieldCount: 0, database: { ...baseDb, source: { ...baseDb.source, fileName: outputFileName } }
    };
  }

  const parsed = parseFm2013GameDb(gameDbBytes, summary?.gameDate ?? null, undefined, { collectOffsets: true });
  if (!parsed.editableOffsets) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', 'Failed to collect editable field offset map.');
  }

  const patchedGameDb = gameDbBytes.slice();
  const dv = new DataView(patchedGameDb.buffer, patchedGameDb.byteOffset, patchedGameDb.byteLength);

  for (const [uidStr, patch] of Object.entries(normalized.players)) {
    applyPlayerBinaryPatch(dv, patchedGameDb, parsed.editableOffsets, Number(uidStr), patch);
  }
  for (const [uidStr, patch] of Object.entries(normalized.staff)) {
    applyStaffBinaryPatch(dv, patchedGameDb, parsed.editableOffsets, Number(uidStr), patch);
  }
  for (const [uidStr, patch] of Object.entries(normalized.clubs)) {
    applyClubBinaryPatch(dv, patchedGameDb, parsed.editableOffsets, Number(uidStr), patch);
  }
  for (const [uidStr, patch] of Object.entries(normalized.stadiums)) {
    applyStadiumBinaryPatch(dv, parsed.editableOffsets, Number(uidStr), patch);
  }

  const newHmac = await computeGameDbHmacSha512(patchedGameDb, options.signingKey);
  patchedGameDb.set(newHmac, patchedGameDb.byteLength - 64);

  const innerMemberBytes = container.compressed ? await deflateZlib(patchedGameDb) : patchedGameDb;
  const newGameDbStored = await encryptAfeMemberEnvelope(innerMemberBytes);

  const gameDbDirEntry = container.directoryTree.files.find(f => f.fullPath === 'game_db.dat');
  if (!gameDbDirEntry) {
    throw new FM2013DecodeError('MISSING_GAME_DB', 'Root directory entry for game_db.dat was not found.');
  }

  const oldOff = gameDbDirEntry.offset;
  const oldStored = gameDbDirEntry.storedBytes;
  const delta = newGameDbStored.byteLength - oldStored;

  const updatedTree = shiftDirectoryTreeForGameDb(
    container.directoryTree,
    oldOff,
    newGameDbStored.byteLength,
    patchedGameDb.byteLength,
    delta
  );
  const updatedDirRaw = serializeRecursiveFmfDirectory(updatedTree);
  const updatedDirCompressed = await deflateZlib(updatedDirRaw);

  const prefixEnd = MEMBER_DATA_BASE_OFFSET + oldOff;
  const suffixStart = prefixEnd + oldStored;
  const [prefixBytes, suffixMembersBytes] = await Promise.all([
    readSlice(source, 0, prefixEnd),
    readSlice(source, suffixStart, container.directoryOffset)
  ]);

  const fmf4Header = Uint8Array.of(0x02, 0x01, 0x66, 0x6d, 0x66, 0x2e, 0x04, 0x00, 0x00);
  const newDirectoryOffset = container.directoryOffset + delta;
  const totalOutBytes =
    prefixBytes.byteLength +
    newGameDbStored.byteLength +
    suffixMembersBytes.byteLength +
    fmf4Header.byteLength +
    updatedDirCompressed.byteLength;

  const outBytes = new Uint8Array(totalOutBytes);
  let pos = 0;
  outBytes.set(prefixBytes, pos); pos += prefixBytes.byteLength;
  outBytes.set(newGameDbStored, pos); pos += newGameDbStored.byteLength;
  outBytes.set(suffixMembersBytes, pos); pos += suffixMembersBytes.byteLength;
  if (pos !== newDirectoryOffset) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Internal splice offset mismatch during Save As .fm assembly.');
  }
  outBytes.set(fmf4Header, pos); pos += fmf4Header.byteLength;
  outBytes.set(updatedDirCompressed, pos);

  const outHeaderDv = new DataView(outBytes.buffer, outBytes.byteOffset, 18);
  outHeaderDv.setUint32(9, newDirectoryOffset - 9, true);
  outHeaderDv.setUint32(13, 9, true);

  // Verify rebuilt directory and all bytes outside the changed member/header.
  const actualContainer = await parseFm2013Container(outBytes);
  if (JSON.stringify(actualContainer.directoryTree) !== JSON.stringify(updatedTree)) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Post-write archive directory mismatch.');
  }
  const equalBytes = (a: Uint8Array, b: Uint8Array): boolean =>
    a.length === b.length && a.every((byte, i) => byte === b[i]);
  if (!equalBytes(input.subarray(18, prefixEnd), outBytes.subarray(18, prefixEnd)) ||
      !equalBytes(input.subarray(suffixStart, container.directoryOffset),
        outBytes.subarray(prefixEnd + newGameDbStored.length, newDirectoryOffset))) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Post-write unrelated member or gap bytes changed.');
  }
  const actualGameDb = await extractFm2013Member(outBytes, actualContainer, 'game_db.dat');
  if (!actualGameDb || !equalBytes(actualGameDb, patchedGameDb)) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', 'Post-write raw game_db mismatch.');
  }
  // Re-decode with the same decoder and compare all normalized entity records.
  const verifiedDb = await decodeFm2013Save(outBytes, {
    fileName: outputFileName,
    signingKey: options.signingKey
  });
  validateDecodedSaveDatabase(verifiedDb, verifiedDb.source.saveId);

  for (const domain of ['players', 'staff', 'clubs', 'stadiums', 'teams', 'nations', 'competitions', 'humans'] as const) {
    const expected = expectedDb[domain];
    const actual = verifiedDb[domain];
    if (expected.length !== actual.length) {
      throw new FM2013DecodeError('CORRUPT_DATABASE', `Post-write ${domain} count mismatch.`);
    }
    for (let i = 0; i < expected.length; i++) {
      if (JSON.stringify(expected[i]) !== JSON.stringify(actual[i])) {
        throw new FM2013DecodeError('CORRUPT_DATABASE', `Post-write ${domain} record mismatch at index ${i}.`);
      }
    }
  }
  if (JSON.stringify(expectedDb.counts) !== JSON.stringify(verifiedDb.counts)) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', 'Post-write entity count mismatch.');
  }

  return {
    bytes: outBytes,
    fileName: outputFileName,
    sha256: verifiedDb.source.sha256,
    originalSha256,
    patchedFieldCount: countDirtyFields(normalized),
    database: verifiedDb
  };
}

/** Sanitize a default `Save As .fm` download filename so it never overwrites the original name silently. */
export function buildEditedSaveFileName(originalFileName: string): string {
  const stem = originalFileName
    .replace(/\.fm$/iu, '')
    .replace(/[^a-zA-Z0-9._ -]+/gu, '-')
    .trim()
    .slice(0, 80) || 'career';
  if (stem.toLowerCase().endsWith('-edited')) {
    return `${stem}.fm`;
  }
  return `${stem}-edited.fm`;
}
