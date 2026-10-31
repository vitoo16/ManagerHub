import profile from './fm2013-live-profile.json' with { type: 'json' };
import { decodeFm2013Date } from './fm2013-date.ts';
import type { EvidenceField, MissingReason } from './types';

export type LiveNativeKind = 'player' | 'playerStaff';
export interface LiveSnapshotContext {
  readonly snapshotId: string;
  readonly careerId: string;
  readonly capturedAt: string;
  readonly mode: 'realism' | 'editor';
}
export interface LiveAttribute extends EvidenceField<number> {
  readonly sourceName: string;
}
export interface LivePosition extends EvidenceField<number> {
  readonly nativeCode: string;
}
export interface LiveCaptureCoverage {
  readonly nativeKind: LiveNativeKind;
  readonly observedRecordCount: number;
  readonly declaration: 'caller_declared';
  readonly verification: 'provisional';
  readonly bytesScanned: number;
  readonly matches: number;
  readonly rejected: number;
  readonly duplicates: number;
  readonly faultCount: number;
  readonly stopReason: 'byte_limit' | 'time_limit' | 'record_limit' | 'match_limit' | null;
  readonly selectedMappingsExhausted: boolean;
  readonly elapsedMs: number;
}
export interface LivePlayer {
  /** Snapshot-local identity; native IDs never establish identity across careers. */
  readonly id: string;
  readonly nativeId: number;
  readonly nativeKind: LiveNativeKind;
  readonly firstName: EvidenceField<string>;
  readonly lastName: EvidenceField<string>;
  readonly name: EvidenceField<string>;
  readonly birthDate: EvidenceField<string>;
  /** Observed primary-person link only; no citizenship or national-team eligibility inference. */
  readonly primaryNation: EvidenceField<{
    readonly nativeId: number;
    readonly name: string;
    readonly relation: 'person_primary_nation';
  }>;
  readonly attributes: Readonly<Record<string, LiveAttribute>>;
  readonly positions: Readonly<Record<string, LivePosition>>;
  /** Observed link only; neither relationship establishes current employment or loan status. */
  readonly club: EvidenceField<{
    readonly nativeId: number;
    readonly name: string;
    readonly relation: 'player_team_pointer' | 'primary_contract_team';
  }>;
  readonly actualCa: EvidenceField<number>;
  readonly potentialAbility: EvidenceField<number>;
  readonly contract: {
    readonly weeklyWage: EvidenceField<number>;
    readonly wageFrequency: EvidenceField<string>;
    readonly currency: EvidenceField<string>;
    readonly expiresAt: EvidenceField<string>;
  };
}
export interface GameSnapshot {
  readonly id: string;
  readonly careerId: EvidenceField<string> & { readonly declaration: 'user_declared' };
  readonly capturedAt: string;
  readonly captureTimeAuthority: 'caller_declared';
  readonly sourceIdentity: {
    readonly binarySha256: string;
    readonly targetPid: number;
    readonly arch: 'ia32';
    readonly pointerSize: 4;
    readonly profileVersion: string;
    readonly runtimeImageBytesAuthenticated: false;
    readonly localOnly: true;
  };
  readonly readerVersion: string;
  readonly edition: string;
  readonly build: string;
  readonly source: 'live_game';
  readonly verification: 'provisional';
  readonly mode: 'realism' | 'editor';
  readonly rosterCompleteness: 'unverified';
  readonly scoutingKnowledge: 'not_decoded';
  readonly captureCoverage: readonly LiveCaptureCoverage[];
  readonly players: readonly LivePlayer[];
}
export type LiveCaptureResult =
  | { readonly status: 'rejected'; readonly snapshot: null; readonly diagnostics: readonly string[] }
  | { readonly status: 'ready' | 'partial' | 'empty'; readonly snapshot: GameSnapshot; readonly diagnostics: readonly string[] };

const MAX_TEXT = 12_000_000;
const MAX_PLAYERS = profile.limits.maxRecords;
const MAX_COUNTER = profile.limits.maxMatches;
// A scan can cross its deadline while completing one bounded read operation.
const MAX_ELAPSED_MS = profile.limits.maxDurationMs + 1_000;
function scanStopReason(value: unknown): LiveCaptureCoverage['stopReason'] {
  if (value === null || value === 'byte_limit' || value === 'time_limit' || value === 'record_limit' || value === 'match_limit') return value;
  throw new Error('Unknown scan stop reason.');
}

function record(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected an object.');
  const result = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(result).some(key => !allowed.has(key)) || required.some(key => !Object.hasOwn(result, key))) {
    throw new Error('Unexpected or missing capture fields.');
  }
  return result;
}
function integer(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error('Capture numeric value is outside its bounds.');
  }
  return value;
}
function boundedText(value: unknown, maximum: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > maximum || (!allowEmpty && !value.trim()) || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    throw new Error('Capture text is invalid.');
  }
  return value;
}
function numericArray(value: unknown, length: number, minimum: number, maximum: number): number[] {
  if (!Array.isArray(value) || value.length !== length) throw new Error('Capture field count is incompatible with the profile.');
  return value.map(item => integer(item, minimum, maximum));
}
function captureTimestamp(value: unknown): string {
  const text = boundedText(value, 40);
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u.exec(text);
  if (!parts || !Number.isFinite(Date.parse(text))) throw new Error('A valid declared capture timestamp is required.');
  const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (days === undefined || day < 1 || day > days || Number(parts[4]) > 23 || Number(parts[5]) > 59 || Number(parts[6]) > 59) {
    throw new Error('A valid declared capture timestamp is required.');
  }
  return text;
}
function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
function observed<T>(value: T): EvidenceField<T> {
  return { value, source: 'live_game', verification: 'provisional', edition: profile.edition, build: profile.build, missingReason: null };
}
function missing<T>(reason: MissingReason): EvidenceField<T> {
  return { value: null, source: 'live_game', verification: 'unsupported', edition: profile.edition, build: profile.build, missingReason: reason };
}

/** Strict boundary for address-free, build-bound local captures. Input claims never certify fields. */
export function parseFm2013LiveCapture(text: string, context: LiveSnapshotContext): LiveCaptureResult {
  try {
    const declared = record(context, ['snapshotId', 'careerId', 'capturedAt', 'mode']);
    const snapshotId = boundedText(declared.snapshotId, 128);
    const careerId = boundedText(declared.careerId, 128);
    const capturedAt = captureTimestamp(declared.capturedAt);
    if (declared.mode !== 'realism' && declared.mode !== 'editor') throw new Error('Unknown visibility mode.');
    const mode = declared.mode;
    if (typeof text !== 'string' || text.length > MAX_TEXT) throw new Error('Capture exceeds the text limit.');
    const capture = record(JSON.parse(text) as unknown, ['schema', 'profileVersion', 'target', 'passes']);
    if (capture.schema !== profile.schema || capture.profileVersion !== profile.profileVersion) throw new Error('Unsupported capture profile.');
    const target = record(capture.target, ['pid', 'arch', 'pointerSize', 'imagePath', 'binarySha256']);
    const targetPid = integer(target.pid, 1, 4_294_967_295);
    if (target.arch !== 'ia32' || target.pointerSize !== 4 || target.imagePath !== profile.imagePath || target.binarySha256 !== profile.binarySha256) {
      throw new Error('Capture target does not match the exact FM2013 build.');
    }
    if (!Array.isArray(capture.passes) || capture.passes.length > 2) throw new Error('Invalid native pass count.');
    const players: LivePlayer[] = [];
    const captureCoverage: LiveCaptureCoverage[] = [];
    const kinds = new Set<LiveNativeKind>();
    const ids = new Set<number>();
    const diagnostics = ['Research capture: all observed fields remain provisional; roster completeness and loaded career identity are unverified.'];
    if (mode === 'realism') diagnostics.push('Research Realism redacts exact numeric ratings because manager scouting and visibility knowledge have not been decoded.');
    if (mode === 'realism') diagnostics.push('Research Realism also redacts supplied birth dates and primary-nation links pending manager visibility evidence.');
    let partial = false;
    for (const rawPass of capture.passes) {
      const pass = record(rawPass, ['nativeKind', 'imageTypeMetadataVerified', 'coverage', 'records']);
      if (pass.nativeKind !== 'player' && pass.nativeKind !== 'playerStaff') throw new Error('Unknown native kind.');
      const nativeKind = pass.nativeKind;
      if (kinds.has(nativeKind)) throw new Error('Duplicate native pass.');
      kinds.add(nativeKind);
      if (pass.imageTypeMetadataVerified !== true) throw new Error('File-bound native type metadata is required.');
      if (!Array.isArray(pass.records) || players.length + pass.records.length > MAX_PLAYERS) throw new Error('Capture player limit exceeded.');
      const coverage = record(pass.coverage, ['bytesScanned', 'matches', 'rejected', 'duplicates', 'faultCount', 'stopReason', 'selectedMappingsExhausted', 'elapsedMs']);
      const bytes = integer(coverage.bytesScanned, 0, profile.limits.maxBytes);
      const matches = integer(coverage.matches, 0, MAX_COUNTER);
      const rejected = integer(coverage.rejected, 0, MAX_COUNTER);
      const duplicates = integer(coverage.duplicates, 0, MAX_COUNTER);
      const faults = integer(coverage.faultCount, 0, MAX_COUNTER);
      const elapsedMs = integer(coverage.elapsedMs, 0, MAX_ELAPSED_MS);
      if (matches !== pass.records.length + rejected + duplicates || (matches > 0 && bytes < 4)) throw new Error('Inconsistent capture coverage counters.');
      const stopReason = scanStopReason(coverage.stopReason);
      if (typeof coverage.selectedMappingsExhausted !== 'boolean' || (coverage.selectedMappingsExhausted && (stopReason !== null || faults > 0))) {
        throw new Error('Contradictory scan coverage.');
      }
      captureCoverage.push({ nativeKind, observedRecordCount: pass.records.length, declaration: 'caller_declared', verification: 'provisional',
        bytesScanned: bytes, matches, rejected, duplicates, faultCount: faults, stopReason, selectedMappingsExhausted: coverage.selectedMappingsExhausted, elapsedMs });
      if (stopReason !== null || faults > 0 || !coverage.selectedMappingsExhausted) {
        partial = true;
        diagnostics.push(`${nativeKind}: bounded or incomplete scan; ${faults} read faults.`);
      }
      if (rejected > 0 || duplicates > 0) {
        partial = true;
        diagnostics.push(`${nativeKind}: ${rejected} rejected candidates; ${duplicates} duplicate candidates. Coverage may omit records.`);
      }
      for (const rawPlayer of pass.records) {
        const player = record(rawPlayer, ['nativeId', 'firstName', 'lastName', 'attributeBytes'], ['positionBytes', 'club', 'birthDateBytes', 'primaryNation']);
        const nativeId = integer(player.nativeId, 1, 2_147_483_647);
        if (ids.has(nativeId)) throw new Error('Duplicate native ID across capture records.');
        ids.add(nativeId);
        const firstName = boundedText(player.firstName, 64, true);
        const lastName = boundedText(player.lastName, 64, true);
        if (!firstName.trim() && !lastName.trim()) throw new Error('Player has no observed name.');
        let birthDate: LivePlayer['birthDate'] = missing('not_decoded');
        if (Object.hasOwn(player, 'birthDateBytes')) {
          const rawDate = numericArray(player.birthDateBytes, 4, 0, 255);
          const decoded = decodeFm2013Date(Uint8Array.from(rawDate));
          birthDate = mode === 'realism' ? missing('redacted') : decoded.status === 'decoded' ? observed(decoded.iso) : missing('not_decoded');
        }
        let primaryNation: LivePlayer['primaryNation'] = missing('not_decoded');
        if (Object.hasOwn(player, 'primaryNation')) {
          const nation = record(player.primaryNation, ['nativeId', 'name']);
          const value = { nativeId: integer(nation.nativeId, 1, 2_147_483_647), name: boundedText(nation.name, 128), relation: 'person_primary_nation' as const };
          primaryNation = mode === 'realism' ? missing('redacted') : observed(value);
        }
        const attributeBytes = numericArray(player.attributeBytes, profile.attributes.length, -128, 127);
        const attributes: Record<string, LiveAttribute> = Object.create(null) as Record<string, LiveAttribute>;
        profile.attributes.forEach((attribute, index) => {
          const raw = attributeBytes[index];
          if (raw === undefined) throw new Error('Missing attribute byte.');
          const value = Math.max(1, Math.round(raw / 5));
          if (value > 20) throw new Error('Attribute normalization exceeds the FM2013 display scale.');
          attributes[attribute.key] = { ...(mode === 'realism' ? missing<number>('redacted') : observed(value)), sourceName: attribute.sourceName };
        });
        const positionBytes = Object.hasOwn(player, 'positionBytes') ? numericArray(player.positionBytes, profile.positions.length, 0, 20) : null;
        const positions: Record<string, LivePosition> = Object.create(null) as Record<string, LivePosition>;
        profile.positions.forEach((position, index) => {
          const value = positionBytes?.[index];
          positions[position.key] = { ...(value === undefined ? missing<number>('not_decoded') : mode === 'realism' ? missing<number>('redacted') : observed(value)), nativeCode: position.nativeCode };
        });
        let club: LivePlayer['club'] = missing('not_decoded');
        if (Object.hasOwn(player, 'club')) {
          const rawClub = record(player.club, ['nativeId', 'name', 'relation']);
          if (rawClub.relation !== 'player_team_pointer' && rawClub.relation !== 'primary_contract_team') {
            throw new Error('Unknown club relationship.');
          }
          club = observed({ nativeId: integer(rawClub.nativeId, 1, 2_147_483_647), name: boundedText(rawClub.name, 128), relation: rawClub.relation });
        }
        players.push({ id: `${snapshotId}:${nativeId}`, nativeId, nativeKind, firstName: observed(firstName), lastName: observed(lastName),
          name: observed([firstName.trim(), lastName.trim()].filter(Boolean).join(' ')), birthDate, primaryNation, attributes, positions, club,
          actualCa: missing(mode === 'realism' ? 'redacted' : 'not_verified'), potentialAbility: missing(mode === 'realism' ? 'redacted' : 'not_verified'),
          contract: { weeklyWage: missing('not_decoded'), wageFrequency: missing('not_decoded'), currency: missing('not_decoded'), expiresAt: missing('not_decoded') } });
      }
    }
    if (kinds.size !== 2) { partial = true; diagnostics.push('One or both native player kinds were not scanned.'); }
    if (players.length === 0) diagnostics.push('No accepted player records; this does not establish whether a career is loaded.');
    const snapshot: GameSnapshot = { id: snapshotId, careerId: { ...observed(careerId), source: 'manual', declaration: 'user_declared' },
      capturedAt, captureTimeAuthority: 'caller_declared', sourceIdentity: { binarySha256: profile.binarySha256, targetPid, arch: 'ia32', pointerSize: 4,
        profileVersion: profile.profileVersion, runtimeImageBytesAuthenticated: false, localOnly: true },
      readerVersion: profile.profileVersion, edition: profile.edition, build: profile.build, source: 'live_game', verification: 'provisional',
      mode, rosterCompleteness: 'unverified', scoutingKnowledge: 'not_decoded', captureCoverage, players };
    return freeze({ status: players.length === 0 ? 'empty' : partial ? 'partial' : 'ready', snapshot, diagnostics });
  } catch (error: unknown) {
    // Diagnostics are fixed parser messages, never strings copied from untrusted JSON.
    const diagnostic = error instanceof SyntaxError ? 'Malformed capture JSON.' : error instanceof Error ? error.message : 'Invalid capture.';
    return freeze({ status: 'rejected', snapshot: null, diagnostics: [diagnostic] });
  }
}
