import { resolveSaveCompatibility } from '../save-compatibility';
import { MAX_FM_SAVE_BYTES } from './afe-container';
import {
  DECODED_SAVE_DB_SCHEMA_VERSION,
  FM2013_OFFLINE_ADAPTER_VERSION,
  OBSERVED_FM2013_GAME_DB_VERSIONS,
  type DecodedSaveDatabase,
  type DecodedSaveDatabaseSummary
} from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

const SHA256_RE = /^[a-f0-9]{64}$/u;
const MAX_VALIDATED_ENTITIES = 500_000;

/**
 * Deep, bounded runtime schema validator shared by Web Worker IPC boundary (`decode-save-in-worker.ts`)
 * and IndexedDB persistence (`save-databases.ts`) (`AUD-11`).
 */
export function validateDecodedSaveDatabase(
  value: unknown,
  expectedSaveId?: string
): DecodedSaveDatabase {
  if (!isPlainObject(value)) {
    throw new Error('Decoded save payload is not an object.');
  }
  if (value.schemaVersion !== DECODED_SAVE_DB_SCHEMA_VERSION) {
    throw new Error('Decoded save schemaVersion mismatch.');
  }
  if (
    !isPlainObject(value.source) ||
    !isPlainObject(value.counts) ||
    !isPlainObject(value.coverage) ||
    !Array.isArray(value.humans) ||
    !Array.isArray(value.players) ||
    !Array.isArray(value.staff) ||
    !Array.isArray(value.clubs) ||
    !Array.isArray(value.teams) ||
    !Array.isArray(value.stadiums) ||
    !Array.isArray(value.nations) ||
    !Array.isArray(value.competitions)
  ) {
    throw new Error('Decoded save top-level collections failed structural validation.');
  }

  const src = value.source;
  if (
    typeof src.saveId !== 'string' ||
    !SHA256_RE.test(src.saveId) ||
    src.sha256 !== src.saveId ||
    (expectedSaveId !== undefined && src.saveId !== expectedSaveId) ||
    typeof src.fileName !== 'string' ||
    src.fileName.length === 0 ||
    src.fileName.length > 260 ||
    !isSafeIntInRange(src.fileSize, 1, MAX_FM_SAVE_BYTES) ||
    (src.family !== 'afe' && src.family !== 'fmf') ||
    typeof src.compressed !== 'boolean' ||
    src.edition !== 'FM2013' ||
    typeof src.build !== 'string' ||
    src.build.length === 0 ||
    !(OBSERVED_FM2013_GAME_DB_VERSIONS as readonly number[]).includes(src.gameDbVersion as number) ||
    !isSafeIntInRange(src.gameDbBytes, 64, 200 * 1024 * 1024) ||
    src.adapterVersion !== FM2013_OFFLINE_ADAPTER_VERSION ||
    src.writeCapability !== false ||
    typeof src.decodedAt !== 'string' ||
    !Number.isFinite(Date.parse(src.decodedAt))
  ) {
    throw new Error('Decoded save source metadata failed integrity validation.');
  }

  const counts = value.counts;
  if (
    value.players.length > MAX_VALIDATED_ENTITIES ||
    value.staff.length > MAX_VALIDATED_ENTITIES ||
    value.clubs.length > MAX_VALIDATED_ENTITIES ||
    value.teams.length > MAX_VALIDATED_ENTITIES ||
    value.stadiums.length > MAX_VALIDATED_ENTITIES ||
    value.nations.length > MAX_VALIDATED_ENTITIES ||
    value.competitions.length > MAX_VALIDATED_ENTITIES ||
    counts.players !== value.players.length ||
    counts.staff !== value.staff.length ||
    counts.clubs !== value.clubs.length ||
    counts.teams !== value.teams.length ||
    counts.stadiums !== value.stadiums.length ||
    counts.nations !== value.nations.length ||
    counts.competitions !== value.competitions.length
  ) {
    throw new Error('Decoded save entity counts do not match collection lengths.');
  }

  const cov = value.coverage;
  if (
    !Array.isArray(cov.verifiedDomains) ||
    !Array.isArray(cov.notStoredInSave) ||
    !Array.isArray(cov.notDecoded) ||
    typeof cov.gameDbExactEof !== 'boolean'
  ) {
    throw new Error('Decoded save coverage metadata is malformed.');
  }

  const summaryMissing = src.build === `game_db-0x${(src.gameDbVersion as number).toString(16)}`;
  const compatibility = resolveSaveCompatibility({
    detectedFamily: src.family,
    edition: summaryMissing ? null : 'FM2013',
    build: summaryMissing ? null : src.build
  });
  const expectedDomains = compatibility.status === 'verified' ? compatibility.profile.readableDomains : [];
  if (src.compatibilityStatus !== compatibility.status ||
      (src.checksumStatus !== 'verified_hmac_sha512' && src.checksumStatus !== 'structural_64b_unverified') ||
      cov.gameDbExactEof !== true ||
      cov.verifiedDomains.length !== expectedDomains.length ||
      !expectedDomains.every(domain => (cov.verifiedDomains as unknown[]).includes(domain)) ||
      !cov.notStoredInSave.every(item => typeof item === 'string') ||
      !cov.notDecoded.every(item => typeof item === 'string')) {
    throw new Error('Decoded save compatibility or coverage claims failed validation.');
  }

  const checkUniqueUids = (items: readonly unknown[], label: string): void => {
    const seen = new Set<number>();
    for (const item of items) {
      if (!isPlainObject(item) || !isSafeIntInRange(item.uid, 0, 2_147_483_647)) {
        throw new Error(`Invalid UID in ${label} table.`);
      }
      if (seen.has(item.uid)) {
        throw new Error(`Duplicate UID ${item.uid} in ${label} table.`);
      }
      seen.add(item.uid);
    }
  };

  checkUniqueUids(value.players, 'players');
  checkUniqueUids(value.staff, 'staff');
  checkUniqueUids(value.clubs, 'clubs');
  checkUniqueUids(value.teams, 'teams');
  checkUniqueUids(value.stadiums, 'stadiums');
  checkUniqueUids(value.nations, 'nations');
  checkUniqueUids(value.competitions, 'competitions');

  for (const p of value.players as Record<string, unknown>[]) {
    if (
      typeof p.displayName !== 'string' ||
      typeof p.positionSummary !== 'string' ||
      !isSafeIntInRange(p.actualCa, 0, 200) ||
      !isSafeIntInRange(p.potentialAbility, -10, 200) ||
      !isPlainObject(p.positions) ||
      !isPlainObject(p.attributes)
    ) {
      throw new Error('Decoded player record failed field validation.');
    }
    for (const rating of Object.values(p.positions)) {
      if (!isSafeIntInRange(rating, 1, 20)) {
        throw new Error('Decoded player position rating out of 1..20 range.');
      }
    }
    for (const attr of Object.values(p.attributes)) {
      if (!isSafeIntInRange(attr, 1, 20)) {
        throw new Error('Decoded player visible attribute out of 1..20 range.');
      }
    }
  }

  for (const s of value.staff as Record<string, unknown>[]) {
    if (
      typeof s.displayName !== 'string' ||
      typeof s.isHuman !== 'boolean' ||
      !isSafeIntInRange(s.staffCa, 0, 200) ||
      !isSafeIntInRange(s.staffPa, -10, 200)
    ) {
      throw new Error('Decoded staff record failed field validation.');
    }
  }

  for (const c of value.clubs as Record<string, unknown>[]) {
    if (typeof c.fullName !== 'string' || typeof c.shortName !== 'string') {
      throw new Error('Decoded club record failed field validation.');
    }
  }

  for (const st of value.stadiums as Record<string, unknown>[]) {
    if (
      !isSafeIntInRange(st.capacity, 0, 500_000) ||
      !isSafeIntInRange(st.seatingCapacity, 0, 500_000) ||
      !isSafeIntInRange(st.expansionCapacity, 0, 500_000)
    ) {
      throw new Error('Decoded stadium record failed field validation.');
    }
  }

  return value as unknown as DecodedSaveDatabase;
}

export function isValidDecodedSaveDatabase(
  value: unknown,
  expectedSaveId?: string
): value is DecodedSaveDatabase {
  try {
    validateDecodedSaveDatabase(value, expectedSaveId);
    return true;
  } catch {
    return false;
  }
}

export function isValidDecodedSaveSummary(value: unknown): value is DecodedSaveDatabaseSummary {
  if (!isPlainObject(value)) return false;
  if (value.schemaVersion !== DECODED_SAVE_DB_SCHEMA_VERSION) return false;
  if (typeof value.saveId !== 'string' || !SHA256_RE.test(value.saveId)) return false;
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) return false;
  if (!isPlainObject(value.source) || !isPlainObject(value.counts) || !Array.isArray(value.humans)) return false;
  const src = value.source;
  return (
    src.saveId === value.saveId &&
    src.sha256 === value.saveId &&
    typeof src.fileName === 'string' &&
    src.edition === 'FM2013' &&
    src.adapterVersion === FM2013_OFFLINE_ADAPTER_VERSION &&
    src.writeCapability === false &&
    isSafeIntInRange(value.counts.players, 0, MAX_VALIDATED_ENTITIES) &&
    isSafeIntInRange(value.counts.clubs, 0, MAX_VALIDATED_ENTITIES)
  );
}

/** A restored snapshot may supply draft values, but only matching native records
 * from a fresh read of the exact file may unlock write access. Compare per row
 * to avoid serializing the entire database into one large temporary string.
 */
export function matchesDecodedWriteSource(cached: DecodedSaveDatabase, decoded: DecodedSaveDatabase): boolean {
  const leftSource = cached.source;
  const rightSource = decoded.source;
  if (leftSource.saveId !== rightSource.saveId ||
      leftSource.adapterVersion !== rightSource.adapterVersion ||
      leftSource.family !== rightSource.family || leftSource.edition !== rightSource.edition ||
      leftSource.build !== rightSource.build || leftSource.compatibilityStatus !== rightSource.compatibilityStatus ||
      leftSource.signature !== rightSource.signature || leftSource.fileSize !== rightSource.fileSize ||
      leftSource.compressed !== rightSource.compressed || leftSource.gameDbVersion !== rightSource.gameDbVersion ||
      leftSource.gameDbBytes !== rightSource.gameDbBytes) return false;
  const sameRecords = (left: readonly unknown[], right: readonly unknown[]) =>
    left.length === right.length && left.every((record, index) => JSON.stringify(record) === JSON.stringify(right[index]));
  return sameRecords(cached.players, decoded.players) &&
    sameRecords(cached.staff, decoded.staff) &&
    sameRecords(cached.clubs, decoded.clubs) &&
    sameRecords(cached.stadiums, decoded.stadiums);
}
