import profile from './fm2013-live-profile.json' with { type: 'json' };
import type { GameSnapshot, LiveCaptureResult } from './live-snapshot';

export const HISTORICAL_SNAPSHOT_SCHEMA = 'managerhub.fm2013-historical-snapshot' as const;
export const HISTORICAL_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const MAX_HISTORICAL_CAPTURE_BYTES = 48_000_000;
export const MAX_HISTORICAL_SNAPSHOTS = 10;

export type HistoricalSnapshotMode = 'editor' | 'realism';
export type HistoricalSnapshotStatus = 'ready' | 'partial' | 'empty';

export interface HistoricalSnapshotMetadata {
  readonly fileName: string;
  readonly sourceSize: number;
  readonly sourceSha256: string;
  readonly importedAt: string;
}

export interface HistoricalSnapshotRecord {
  readonly schema: typeof HISTORICAL_SNAPSHOT_SCHEMA;
  readonly schemaVersion: typeof HISTORICAL_SNAPSHOT_SCHEMA_VERSION;
  readonly id: string;
  readonly mode: HistoricalSnapshotMode;
  readonly fileName: string;
  readonly sourceSize: number;
  readonly sourceSha256: string;
  readonly importedAt: string;
  readonly status: HistoricalSnapshotStatus;
  readonly diagnostics: readonly string[];
  readonly snapshot: GameSnapshot;
}

export interface HistoricalSnapshotSummary {
  readonly schema: typeof HISTORICAL_SNAPSHOT_SCHEMA;
  readonly schemaVersion: typeof HISTORICAL_SNAPSHOT_SCHEMA_VERSION;
  readonly id: string;
  readonly mode: HistoricalSnapshotMode;
  readonly fileName: string;
  readonly sourceSize: number;
  readonly sourceSha256: string;
  readonly importedAt: string;
  readonly capturedAt: string;
  readonly careerLabel: string;
  readonly edition: 'FM2013';
  readonly build: '13.3.3f359652';
  readonly status: HistoricalSnapshotStatus;
  readonly playerCount: number;
  readonly coverageCount: number;
}

type UnknownRecord = Record<string, unknown>;
const ATTRIBUTE_KEYS = profile.attributes.map(item => item.key);
const POSITION_KEYS = profile.positions.map(item => item.key);
const MISSING_REASONS = ['not_present', 'not_decoded', 'not_verified', 'incompatible_build', 'redacted', 'not_applicable'] as const;

function plainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: unknown, keys: readonly string[]): value is UnknownRecord {
  if (!plainRecord(value)) return false;
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every(key => typeof key === 'string' && keys.includes(key));
}

function safeText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max &&
    (allowEmpty || value.trim().length > 0) &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
}

function validTimestamp(value: unknown): value is string {
  if (!safeText(value, 40)) return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/u.exec(value);
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (days === undefined || day < 1 || day > days || Number(parts[4]) > 23 ||
      Number(parts[5]) > 59 || Number(parts[6]) > 59) return false;
  if (parts[8] !== undefined && (Number(parts[8]) > 23 || Number(parts[9]) > 59)) return false;
  return true;
}

function validDate(value: unknown): value is string {
  if (!safeText(value, 10) || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function finiteInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isEvidenceField(value: unknown, expectedSource: 'live_game' | 'manual' | 'derived_model',
  accepts: (item: unknown) => boolean): boolean {
  if (!exactKeys(value, ['value', 'source', 'verification', 'edition', 'build', 'missingReason'])) return false;
  if (value.source !== expectedSource || value.edition !== profile.edition || value.build !== profile.build) return false;
  if (value.missingReason !== null && !MISSING_REASONS.includes(value.missingReason as typeof MISSING_REASONS[number])) return false;
  if (value.value === null) return value.verification === 'unsupported' && value.missingReason !== null;
  return value.verification === 'provisional' && value.missingReason === null && accepts(value.value);
}

function isModeField(value: unknown, mode: HistoricalSnapshotMode, expectedSource: 'live_game' | 'derived_model',
  accepts: (item: unknown) => boolean, realismMissingReasons: readonly string[] = ['redacted']): boolean {
  if (!plainRecord(value) || !isEvidenceField(value, expectedSource, accepts)) return false;
  if (mode === 'realism') return value.value === null && realismMissingReasons.includes(String(value.missingReason));
  return true;
}

function isCoverage(value: unknown): boolean {
  if (!exactKeys(value, ['nativeKind', 'observedRecordCount', 'declaration', 'verification', 'bytesScanned', 'matches',
    'rejected', 'duplicates', 'faultCount', 'stopReason', 'selectedMappingsExhausted', 'elapsedMs'])) return false;
  if (value.nativeKind !== 'player' && value.nativeKind !== 'playerStaff') return false;
  if (value.declaration !== 'caller_declared' || value.verification !== 'provisional') return false;
  if (!finiteInteger(value.observedRecordCount, 0, profile.limits.maxRecords) ||
      !finiteInteger(value.bytesScanned, 0, profile.limits.maxBytes) ||
      !finiteInteger(value.matches, 0, profile.limits.maxMatches) ||
      !finiteInteger(value.rejected, 0, profile.limits.maxMatches) ||
      !finiteInteger(value.duplicates, 0, profile.limits.maxMatches) ||
      !finiteInteger(value.faultCount, 0, profile.limits.maxMatches) ||
      !finiteInteger(value.elapsedMs, 0, profile.limits.maxDurationMs + 1_000)) return false;
  if (value.matches !== value.observedRecordCount + value.rejected + value.duplicates) return false;
  if (value.stopReason !== null && !['byte_limit', 'time_limit', 'record_limit', 'match_limit'].includes(String(value.stopReason))) return false;
  if (typeof value.selectedMappingsExhausted !== 'boolean') return false;
  return !(value.selectedMappingsExhausted && (value.stopReason !== null || value.faultCount > 0));
}

function isAttribute(value: unknown, key: string, mode: HistoricalSnapshotMode): boolean {
  if (!exactKeys(value, ['value', 'source', 'verification', 'edition', 'build', 'missingReason', 'sourceName'])) return false;
  const definition = profile.attributes.find(item => item.key === key);
  if (!definition || value.sourceName !== definition.sourceName) return false;
  const field = { value: value.value, source: value.source, verification: value.verification,
    edition: value.edition, build: value.build, missingReason: value.missingReason };
  return isModeField(field, mode, 'live_game', item => finiteInteger(item, 1, 20));
}

function isPosition(value: unknown, key: string, mode: HistoricalSnapshotMode): boolean {
  if (!exactKeys(value, ['value', 'source', 'verification', 'edition', 'build', 'missingReason', 'nativeCode'])) return false;
  const definition = profile.positions.find(item => item.key === key);
  if (!definition || value.nativeCode !== definition.nativeCode) return false;
  const field = { value: value.value, source: value.source, verification: value.verification,
    edition: value.edition, build: value.build, missingReason: value.missingReason };
  return isModeField(field, mode, 'live_game', item => finiteInteger(item, 0, 20), ['redacted', 'not_decoded']);
}

function isPlayer(value: unknown, snapshotId: string, mode: HistoricalSnapshotMode): boolean {
  const keys = ['id', 'nativeId', 'nativeKind', 'firstName', 'lastName', 'name', 'birthDate', 'calendarAge',
    'primaryNation', 'attributes', 'positions', 'club', 'actualCa', 'potentialAbility', 'contract'];
  if (!exactKeys(value, keys) || value.id !== snapshotId + ':' + String(value.nativeId) ||
      !finiteInteger(value.nativeId, 1, 2_147_483_647) ||
      (value.nativeKind !== 'player' && value.nativeKind !== 'playerStaff')) return false;
  const shortName = (item: unknown) => safeText(item, 64, true);
  const fullName = (item: unknown) => safeText(item, 129);
  if (!isEvidenceField(value.firstName, 'live_game', shortName) ||
      !isEvidenceField(value.lastName, 'live_game', shortName) ||
      !isEvidenceField(value.name, 'live_game', fullName) ||
      !isModeField(value.birthDate, mode, 'live_game', validDate, ['redacted', 'not_decoded'])) return false;

  const age = value.calendarAge;
  if (!exactKeys(age, ['value', 'source', 'verification', 'edition', 'build', 'missingReason', 'modelVersion', 'asOf']) ||
      age.modelVersion !== 'gregorian-month-day-v1' || age.asOf !== 'snapshot_game_date' ||
      !isModeField({ value: age.value, source: age.source, verification: age.verification, edition: age.edition,
        build: age.build, missingReason: age.missingReason }, mode, 'derived_model', item => finiteInteger(item, 0, 150))) return false;

  const nationValid = isModeField(value.primaryNation, mode, 'live_game', item =>
    exactKeys(item, ['nativeId', 'name', 'relation']) &&
    finiteInteger(item.nativeId, 1, 2_147_483_647) && safeText(item.name, 128) &&
    item.relation === 'person_primary_nation');
  if (!nationValid) return false;

  const attributes = value.attributes;
  if (!exactKeys(attributes, ATTRIBUTE_KEYS) || !ATTRIBUTE_KEYS.every(key => isAttribute(attributes[key], key, mode))) return false;
  const positions = value.positions;
  if (!exactKeys(positions, POSITION_KEYS) || !POSITION_KEYS.every(key => isPosition(positions[key], key, mode))) return false;

  const clubValid = isEvidenceField(value.club, 'live_game', item =>
    exactKeys(item, ['nativeId', 'name', 'relation']) &&
    finiteInteger(item.nativeId, 1, 2_147_483_647) && safeText(item.name, 128) &&
    (item.relation === 'player_team_pointer' || item.relation === 'primary_contract_team'));
  if (!clubValid) return false;

  const abilityReason = mode === 'realism' ? 'redacted' : 'not_verified';
  for (const ability of [value.actualCa, value.potentialAbility]) {
    if (!isEvidenceField(ability, 'live_game', () => false) || ability.value !== null || ability.missingReason !== abilityReason) return false;
  }
  if (!exactKeys(value.contract, ['weeklyWage', 'wageFrequency', 'currency', 'expiresAt'])) return false;
  for (const contractField of Object.values(value.contract)) {
    if (!isEvidenceField(contractField, 'live_game', () => false) || contractField.value !== null || contractField.missingReason !== 'not_decoded') return false;
  }
  return true;
}

function isGameSnapshot(value: unknown, mode: HistoricalSnapshotMode, id: string): value is GameSnapshot {
  const keys = ['id', 'careerId', 'capturedAt', 'gameDate', 'captureTimeAuthority', 'sourceIdentity', 'readerVersion',
    'edition', 'build', 'source', 'verification', 'mode', 'rosterCompleteness', 'scoutingKnowledge', 'captureCoverage', 'players'];
  if (!exactKeys(value, keys) || value.id !== id || !safeText(value.id, 128) ||
      !validTimestamp(value.capturedAt) || value.captureTimeAuthority !== 'caller_declared' ||
      value.edition !== profile.edition || value.build !== profile.build || value.source !== 'live_game' ||
      value.verification !== 'provisional' || value.mode !== mode ||
      value.rosterCompleteness !== 'unverified' || value.scoutingKnowledge !== 'not_decoded' ||
      value.readerVersion !== profile.profileVersion) return false;

  const career = value.careerId;
  if (!exactKeys(career, ['value', 'source', 'verification', 'edition', 'build', 'missingReason', 'declaration']) ||
      career.declaration !== 'user_declared' || !isEvidenceField({
        value: career.value, source: career.source, verification: career.verification, edition: career.edition,
        build: career.build, missingReason: career.missingReason
      }, 'manual', item => safeText(item, 128))) return false;

  if (!isEvidenceField(value.gameDate, 'live_game', validDate)) return false;
  const identity = value.sourceIdentity;
  if (!exactKeys(identity, ['binarySha256', 'targetPid', 'arch', 'pointerSize', 'profileVersion', 'runtimeImageBytesAuthenticated', 'localOnly']) ||
      identity.binarySha256 !== profile.binarySha256 || !finiteInteger(identity.targetPid, 1, 4_294_967_295) ||
      identity.arch !== 'ia32' || identity.pointerSize !== 4 || identity.profileVersion !== profile.profileVersion ||
      identity.runtimeImageBytesAuthenticated !== false || identity.localOnly !== true) return false;

  if (!Array.isArray(value.captureCoverage) || value.captureCoverage.length > 2 ||
      !value.captureCoverage.every(isCoverage)) return false;
  const coverage = value.captureCoverage;
  const kinds = new Set(coverage.map(item => plainRecord(item) ? item.nativeKind : null));
  if (kinds.size !== coverage.length) return false;
  if (!Array.isArray(value.players) || value.players.length > profile.limits.maxRecords ||
      !value.players.every(player => isPlayer(player, id, mode))) return false;
  const players = value.players;
  const ids = new Set(players.map(player => plainRecord(player) ? player.nativeId : null));
  if (ids.size !== players.length) return false;
  return true;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.values(value as UnknownRecord).forEach(item => deepFreeze(item));
    Object.freeze(value);
  }
  return value;
}

export function createHistoricalSnapshotRecord(result: Exclude<LiveCaptureResult, { status: 'rejected' }>,
  metadata: HistoricalSnapshotMetadata): HistoricalSnapshotRecord {
  if (!validTimestamp(metadata.importedAt) || !safeText(metadata.fileName, 255) ||
      metadata.fileName.includes('/') || metadata.fileName.includes('\\') ||
      !finiteInteger(metadata.sourceSize, 1, MAX_HISTORICAL_CAPTURE_BYTES) ||
      !/^[a-f0-9]{64}$/u.test(metadata.sourceSha256)) {
    throw new TypeError('Historical snapshot source metadata is invalid.');
  }
  const snapshot = result.snapshot;
  if (!isGameSnapshot(snapshot, snapshot.mode, snapshot.id)) throw new TypeError('The parsed historical snapshot failed schema validation.');
  const record: HistoricalSnapshotRecord = {
    schema: HISTORICAL_SNAPSHOT_SCHEMA,
    schemaVersion: HISTORICAL_SNAPSHOT_SCHEMA_VERSION,
    id: snapshot.id,
    mode: snapshot.mode,
    fileName: metadata.fileName,
    sourceSize: metadata.sourceSize,
    sourceSha256: metadata.sourceSha256,
    importedAt: metadata.importedAt,
    status: result.status,
    diagnostics: [...result.diagnostics],
    snapshot
  };
  if (!isHistoricalSnapshotRecord(record)) throw new TypeError('The historical snapshot record is inconsistent.');
  return deepFreeze(record);
}

export function isHistoricalSnapshotRecord(value: unknown): value is HistoricalSnapshotRecord {
  if (!exactKeys(value, ['schema', 'schemaVersion', 'id', 'mode', 'fileName', 'sourceSize', 'sourceSha256', 'importedAt', 'status', 'diagnostics', 'snapshot']) ||
      value.schema !== HISTORICAL_SNAPSHOT_SCHEMA || value.schemaVersion !== HISTORICAL_SNAPSHOT_SCHEMA_VERSION ||
      !safeText(value.id, 128) || (value.mode !== 'editor' && value.mode !== 'realism') ||
      !safeText(value.fileName, 255) || value.fileName.includes('/') || value.fileName.includes('\\') ||
      !finiteInteger(value.sourceSize, 1, MAX_HISTORICAL_CAPTURE_BYTES) ||
      typeof value.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(value.sourceSha256) ||
      !validTimestamp(value.importedAt) ||
      (value.status !== 'ready' && value.status !== 'partial' && value.status !== 'empty') ||
      !Array.isArray(value.diagnostics) || value.diagnostics.length > 20 ||
      !value.diagnostics.every(item => safeText(item, 300, true))) return false;
  const snapshotValue = value.snapshot;
  if (!isGameSnapshot(snapshotValue, value.mode, value.id)) return false;
  const snapshot = snapshotValue;
  if (value.status === 'empty') return snapshot.players.length === 0;
  if (snapshot.players.length === 0) return false;
  if (value.status === 'ready') {
    return snapshot.captureCoverage.length === 2 && snapshot.captureCoverage.every(item =>
      item.stopReason === null && item.faultCount === 0 && item.rejected === 0 && item.duplicates === 0 && item.selectedMappingsExhausted);
  }
  return true;
}

export function parseHistoricalSnapshotRecord(value: unknown): HistoricalSnapshotRecord {
  if (!isHistoricalSnapshotRecord(value)) throw new TypeError('The saved historical snapshot failed schema validation.');
  return deepFreeze(value);
}

export function toHistoricalSnapshotSummary(record: HistoricalSnapshotRecord): HistoricalSnapshotSummary {
  if (!isHistoricalSnapshotRecord(record)) throw new TypeError('Cannot summarize an invalid historical snapshot.');
  return deepFreeze({
    schema: HISTORICAL_SNAPSHOT_SCHEMA,
    schemaVersion: HISTORICAL_SNAPSHOT_SCHEMA_VERSION,
    id: record.id,
    mode: record.mode,
    fileName: record.fileName,
    sourceSize: record.sourceSize,
    sourceSha256: record.sourceSha256,
    importedAt: record.importedAt,
    capturedAt: record.snapshot.capturedAt,
    careerLabel: record.snapshot.careerId.value ?? 'Unlabelled career',
    edition: 'FM2013',
    build: '13.3.3f359652',
    status: record.status,
    playerCount: record.snapshot.players.length,
    coverageCount: record.snapshot.captureCoverage.length
  });
}

export function isHistoricalSnapshotSummary(value: unknown): value is HistoricalSnapshotSummary {
  return exactKeys(value, ['schema', 'schemaVersion', 'id', 'mode', 'fileName', 'sourceSize', 'sourceSha256', 'importedAt',
    'capturedAt', 'careerLabel', 'edition', 'build', 'status', 'playerCount', 'coverageCount']) &&
    value.schema === HISTORICAL_SNAPSHOT_SCHEMA && value.schemaVersion === HISTORICAL_SNAPSHOT_SCHEMA_VERSION &&
    safeText(value.id, 128) && (value.mode === 'editor' || value.mode === 'realism') &&
    safeText(value.fileName, 255) && !value.fileName.includes('/') && !value.fileName.includes('\\') &&
    finiteInteger(value.sourceSize, 1, MAX_HISTORICAL_CAPTURE_BYTES) &&
    typeof value.sourceSha256 === 'string' && /^[a-f0-9]{64}$/u.test(value.sourceSha256) &&
    validTimestamp(value.importedAt) && validTimestamp(value.capturedAt) &&
    safeText(value.careerLabel, 128) && value.edition === profile.edition && value.build === profile.build &&
    (value.status === 'ready' || value.status === 'partial' || value.status === 'empty') &&
    finiteInteger(value.playerCount, 0, profile.limits.maxRecords) &&
    finiteInteger(value.coverageCount, 0, 2);
}
