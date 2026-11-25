import type { AttributeKey } from '../player-import';
import { isoToSiDate } from './binary-reader';
import { formatPositionSummary } from './game-db-parser';
import {
  FM2013DecodeError,
  type DecodedHiddenPlayingAttributes,
  type DecodedPersonalityAttributes,
  type DecodedPositionRatings,
  type DecodedSaveClub,
  type DecodedSaveDatabase,
  type DecodedSaveMode,
  type DecodedSavePlayer,
  type DecodedSaveStaff,
  type DecodedSaveStadium,
  type DecodedStaffAttributes
} from './types';

const MAX_UNDO_HISTORY = 100;

export interface PlayerDraftPatch {
  readonly actualCa?: number;
  readonly potentialAbility?: number;
  readonly homeReputation?: number;
  readonly currentReputation?: number;
  readonly worldReputation?: number;
  readonly morale?: number;
  readonly marketValueGbp?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly leftFoot?: number;
  readonly rightFoot?: number;
  readonly intCaps?: number;
  readonly intGoals?: number;
  readonly weeklyWageGbp?: number;
  readonly contractExpiresAt?: string;
  readonly squadNumber?: number;
  readonly positions?: Partial<DecodedPositionRatings>;
  readonly attributes?: Partial<Record<AttributeKey, number>>;
  readonly hiddenPlaying?: Partial<DecodedHiddenPlayingAttributes>;
  readonly personality?: Partial<DecodedPersonalityAttributes>;
}

export interface StaffDraftPatch {
  readonly staffCa?: number;
  readonly staffPa?: number;
  readonly homeReputation?: number;
  readonly currentReputation?: number;
  readonly worldReputation?: number;
  readonly weeklyWageGbp?: number;
  readonly contractExpiresAt?: string;
  readonly attributes?: Partial<DecodedStaffAttributes>;
}

export interface ClubDraftPatch {
  readonly balanceGbp?: number;
  readonly transferBudgetGbp?: number;
  readonly transferBudgetSeasonGbp?: number;
  readonly weeklyWageBudgetGbp?: number;
  readonly trainingFacilities?: number;
  readonly youthFacilities?: number;
  readonly youthCoaching?: number;
  readonly youthRecruitment?: number;
  readonly yearFounded?: number;
}

export interface StadiumDraftPatch {
  readonly capacity?: number;
  readonly seatingCapacity?: number;
  readonly expansionCapacity?: number;
}

export interface SaveDraftOverlay {
  readonly players: Readonly<Record<number, PlayerDraftPatch>>;
  readonly staff: Readonly<Record<number, StaffDraftPatch>>;
  readonly clubs: Readonly<Record<number, ClubDraftPatch>>;
  readonly stadiums: Readonly<Record<number, StadiumDraftPatch>>;
}

export interface EditorHistorySnapshot {
  readonly label: string;
  readonly overlay: SaveDraftOverlay;
}

export interface EditorTransactionState {
  readonly saveId: string;
  readonly past: readonly EditorHistorySnapshot[];
  readonly present: SaveDraftOverlay;
  readonly future: readonly EditorHistorySnapshot[];
  readonly lastActionLabel: string | null;
}

export interface DraftChangeEntry {
  readonly entityKind: 'player' | 'staff' | 'club' | 'stadium';
  readonly uid: number;
  readonly entityName: string;
  readonly field: string;
  readonly before: string | number | null;
  readonly after: string | number;
}

export type PlayerPresetKind =
  | 'inspire_morale'
  | 'match_ca_to_pa'
  | 'wonderkid_pa_200'
  | 'perfect_model_professional'
  | 'natural_all_positions'
  | 'extend_contract_5y';

export type ClubSquadPresetKind =
  | 'inspire_team'
  | 'heal_fitness_morale_team'
  | 'match_squad_ca_pa'
  | 'boost_finances_facilities';

export const EMPTY_SAVE_DRAFT_OVERLAY: SaveDraftOverlay = {
  players: {},
  staff: {},
  clubs: {},
  stadiums: {}
};

export function createEmptyEditorState(saveId: string): EditorTransactionState {
  return {
    saveId,
    past: [],
    present: EMPTY_SAVE_DRAFT_OVERLAY,
    future: [],
    lastActionLabel: null
  };
}

function assertSafeInt(name: string, value: number, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new FM2013DecodeError(
      'INVALID_FILE',
      `Field "${name}" must be an integer between ${min} and ${max} (received ${value}).`
    );
  }
}

function assertValidIsoDate(name: string, value: string): void {
  if (!isoToSiDate(value)) {
    throw new FM2013DecodeError('INVALID_FILE', `Field "${name}" must be a valid YYYY-MM-DD date.`);
  }
}

export function validatePlayerDraftPatch(patch: PlayerDraftPatch, base?: DecodedSavePlayer): void {
  if (patch.actualCa !== undefined) assertSafeInt('actualCa', patch.actualCa, 1, 200);
  if (patch.potentialAbility !== undefined) assertSafeInt('potentialAbility', patch.potentialAbility, 1, 200);
  if (patch.homeReputation !== undefined) assertSafeInt('homeReputation', patch.homeReputation, 1, 10_000);
  if (patch.currentReputation !== undefined) assertSafeInt('currentReputation', patch.currentReputation, 1, 10_000);
  if (patch.worldReputation !== undefined) assertSafeInt('worldReputation', patch.worldReputation, 1, 10_000);
  if (patch.morale !== undefined) assertSafeInt('morale', patch.morale, 1, 20);
  if (patch.marketValueGbp !== undefined) assertSafeInt('marketValueGbp', patch.marketValueGbp, 0, 1_500_000_000);
  if (patch.heightCm !== undefined) assertSafeInt('heightCm', patch.heightCm, 130, 225);
  if (patch.weightKg !== undefined) assertSafeInt('weightKg', patch.weightKg, 45, 135);
  if (patch.leftFoot !== undefined) assertSafeInt('leftFoot', patch.leftFoot, 1, 20);
  if (patch.rightFoot !== undefined) assertSafeInt('rightFoot', patch.rightFoot, 1, 20);
  if (patch.intCaps !== undefined) assertSafeInt('intCaps', patch.intCaps, 0, 250);
  if (patch.intGoals !== undefined) assertSafeInt('intGoals', patch.intGoals, 0, 250);
  if (patch.weeklyWageGbp !== undefined) {
    if (base && !base.contract) {
      throw new FM2013DecodeError('INVALID_FILE', 'Cannot edit weekly wage for a free-agent player without an active contract.');
    }
    assertSafeInt('weeklyWageGbp', patch.weeklyWageGbp, 0, 10_000_000);
  }
  if (patch.contractExpiresAt !== undefined) {
    if (base && !base.contract) {
      throw new FM2013DecodeError('INVALID_FILE', 'Cannot edit contract expiry for a free-agent player without an active contract.');
    }
    assertValidIsoDate('contractExpiresAt', patch.contractExpiresAt);
  }
  if (patch.squadNumber !== undefined) {
    if (base && !base.contract) {
      throw new FM2013DecodeError('INVALID_FILE', 'Cannot edit squad number for a free-agent player without an active contract.');
    }
    assertSafeInt('squadNumber', patch.squadNumber, 1, 99);
  }
  if (patch.positions) {
    for (const [k, v] of Object.entries(patch.positions)) {
      if (v !== undefined) assertSafeInt(`positions.${k}`, v, 1, 20);
    }
  }
  if (patch.attributes) {
    for (const [k, v] of Object.entries(patch.attributes)) {
      if (v !== undefined) assertSafeInt(`attributes.${k}`, v, 1, 20);
    }
  }
  if (patch.hiddenPlaying) {
    for (const [k, v] of Object.entries(patch.hiddenPlaying)) {
      if (v !== undefined) assertSafeInt(`hiddenPlaying.${k}`, v, 1, 20);
    }
  }
  if (patch.personality) {
    if (base && !base.personality) {
      throw new FM2013DecodeError('INVALID_FILE', 'Player does not have an editable PERSON_DATA personality record.');
    }
    for (const [k, v] of Object.entries(patch.personality)) {
      if (v !== undefined) assertSafeInt(`personality.${k}`, v, 1, 20);
    }
  }
}

export function validateStaffDraftPatch(patch: StaffDraftPatch, base?: DecodedSaveStaff): void {
  if (patch.staffCa !== undefined) assertSafeInt('staffCa', patch.staffCa, 1, 200);
  if (patch.staffPa !== undefined) assertSafeInt('staffPa', patch.staffPa, 1, 200);
  if (patch.homeReputation !== undefined) assertSafeInt('homeReputation', patch.homeReputation, 1, 10_000);
  if (patch.currentReputation !== undefined) assertSafeInt('currentReputation', patch.currentReputation, 1, 10_000);
  if (patch.worldReputation !== undefined) assertSafeInt('worldReputation', patch.worldReputation, 1, 10_000);
  if (patch.weeklyWageGbp !== undefined) {
    if (base && base.weeklyWageGbp === null) {
      throw new FM2013DecodeError('INVALID_FILE', 'Staff member has no active club contract wage to edit.');
    }
    assertSafeInt('weeklyWageGbp', patch.weeklyWageGbp, 0, 10_000_000);
  }
  if (patch.contractExpiresAt !== undefined) {
    if (base && base.contractExpiresAt === null) {
      throw new FM2013DecodeError('INVALID_FILE', 'Staff member has no active contract expiry date to edit.');
    }
    assertValidIsoDate('contractExpiresAt', patch.contractExpiresAt);
  }
  if (patch.attributes) {
    if (base && !base.attributes) {
      throw new FM2013DecodeError('INVALID_FILE', 'Staff member has no NON_PLAYING_DATA record to edit.');
    }
    for (const [k, v] of Object.entries(patch.attributes)) {
      if (v !== undefined) assertSafeInt(`staff.attributes.${k}`, v, 1, 20);
    }
  }
}

export function validateClubDraftPatch(patch: ClubDraftPatch, base?: DecodedSaveClub): void {
  if (patch.balanceGbp !== undefined) {
    if (base && base.financeType === 'none') {
      throw new FM2013DecodeError('INVALID_FILE', 'Club has no finance record in this save.');
    }
    assertSafeInt('balanceGbp', patch.balanceGbp, -1_000_000_000, 1_500_000_000);
  }
  if (
    patch.transferBudgetGbp !== undefined ||
    patch.transferBudgetSeasonGbp !== undefined ||
    patch.weeklyWageBudgetGbp !== undefined
  ) {
    if (base && base.financeType !== 'full') {
      throw new FM2013DecodeError('INVALID_FILE', 'Transfer and wage budgets require a full club finance record.');
    }
    if (patch.transferBudgetGbp !== undefined) assertSafeInt('transferBudgetGbp', patch.transferBudgetGbp, 0, 1_500_000_000);
    if (patch.transferBudgetSeasonGbp !== undefined) assertSafeInt('transferBudgetSeasonGbp', patch.transferBudgetSeasonGbp, 0, 1_500_000_000);
    if (patch.weeklyWageBudgetGbp !== undefined) assertSafeInt('weeklyWageBudgetGbp', patch.weeklyWageBudgetGbp, 0, 50_000_000);
  }
  if (patch.trainingFacilities !== undefined) assertSafeInt('trainingFacilities', patch.trainingFacilities, 1, 20);
  if (patch.youthFacilities !== undefined) assertSafeInt('youthFacilities', patch.youthFacilities, 1, 20);
  if (patch.youthCoaching !== undefined) assertSafeInt('youthCoaching', patch.youthCoaching, 1, 20);
  if (patch.youthRecruitment !== undefined) assertSafeInt('youthRecruitment', patch.youthRecruitment, 1, 20);
  if (patch.yearFounded !== undefined) assertSafeInt('yearFounded', patch.yearFounded, 1800, 2100);
}

export function validateStadiumDraftPatch(patch: StadiumDraftPatch): void {
  if (patch.capacity !== undefined) assertSafeInt('capacity', patch.capacity, 100, 500_000);
  if (patch.seatingCapacity !== undefined) assertSafeInt('seatingCapacity', patch.seatingCapacity, 0, 500_000);
  if (patch.expansionCapacity !== undefined) assertSafeInt('expansionCapacity', patch.expansionCapacity, 0, 500_000);
}

function assertKnownPatchKeys(value: unknown, allowed: readonly string[], label: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new FM2013DecodeError('INVALID_FILE', `Invalid ${label} patch object.`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new FM2013DecodeError('INVALID_FILE', `Unknown ${label} field "${key}".`);
    }
  }
}

function assertKnownNestedPatch(value: unknown, base: object | null, label: string): void {
  if (value === undefined) return;
  assertKnownPatchKeys(value, base ? Object.keys(base) : [], label);
}

function normalizePlayerPatch(base: DecodedSavePlayer, merged: PlayerDraftPatch): PlayerDraftPatch | null {
  assertKnownPatchKeys(merged, [
    'actualCa', 'potentialAbility', 'homeReputation', 'currentReputation', 'worldReputation',
    'morale', 'marketValueGbp', 'heightCm', 'weightKg', 'leftFoot', 'rightFoot',
    'intCaps', 'intGoals', 'weeklyWageGbp', 'contractExpiresAt', 'squadNumber',
    'positions', 'attributes', 'hiddenPlaying', 'personality'
  ], 'player');
  assertKnownNestedPatch(merged.positions, base.positions, 'player.positions');
  assertKnownNestedPatch(merged.attributes, base.attributes, 'player.attributes');
  assertKnownNestedPatch(merged.hiddenPlaying, base.hiddenPlaying, 'player.hiddenPlaying');
  assertKnownNestedPatch(merged.personality, base.personality, 'player.personality');
  if (merged.attributes?.punching !== undefined && merged.attributes.tendencyToPunch !== undefined &&
      merged.attributes.punching !== merged.attributes.tendencyToPunch) {
    throw new FM2013DecodeError('INVALID_FILE', 'Conflicting values for shared punching attribute.');
  }
  validatePlayerDraftPatch(merged, base);
  const out: Record<string, unknown> = {};
  const scalarPairs: ReadonlyArray<readonly [keyof PlayerDraftPatch, unknown]> = [
    ['actualCa', base.actualCa],
    ['potentialAbility', base.potentialAbility],
    ['homeReputation', base.homeReputation],
    ['currentReputation', base.currentReputation],
    ['worldReputation', base.worldReputation],
    ['morale', base.morale],
    ['marketValueGbp', base.marketValueGbp],
    ['heightCm', base.heightCm],
    ['weightKg', base.weightKg],
    ['leftFoot', base.leftFoot],
    ['rightFoot', base.rightFoot],
    ['intCaps', base.intCaps],
    ['intGoals', base.intGoals],
    ['weeklyWageGbp', base.contract?.weeklyWageGbp ?? null],
    ['contractExpiresAt', base.contract?.expiresAt ?? null],
    ['squadNumber', base.squadNumber]
  ];
  for (const [k, baseVal] of scalarPairs) {
    const nextVal = merged[k];
    if (nextVal !== undefined && nextVal !== baseVal) out[k] = nextVal;
  }

  if (merged.positions) {
    const sub: Record<string, number> = {};
    for (const [k, v] of Object.entries(merged.positions)) {
      if (v !== undefined && v !== base.positions[k as keyof DecodedPositionRatings]) {
        sub[k] = v;
      }
    }
    if (Object.keys(sub).length > 0) out.positions = sub;
  }

  if (merged.attributes) {
    const patchedAttrs: Record<string, number> = { ...merged.attributes } as Record<string, number>;
    // FM2013 shares byte 48 between tendencyToPunch and punching.
    if (patchedAttrs.tendencyToPunch !== undefined && patchedAttrs.punching === undefined) {
      patchedAttrs.punching = patchedAttrs.tendencyToPunch;
    } else if (patchedAttrs.punching !== undefined && patchedAttrs.tendencyToPunch === undefined) {
      patchedAttrs.tendencyToPunch = patchedAttrs.punching;
    }
    const sub: Record<string, number> = {};
    for (const [k, v] of Object.entries(patchedAttrs)) {
      if (v !== undefined && v !== base.attributes[k as AttributeKey]) {
        sub[k] = v;
      }
    }
    if (Object.keys(sub).length > 0) out.attributes = sub;
  }

  if (merged.hiddenPlaying) {
    const sub: Record<string, number> = {};
    for (const [k, v] of Object.entries(merged.hiddenPlaying)) {
      if (v !== undefined && v !== base.hiddenPlaying[k as keyof DecodedHiddenPlayingAttributes]) {
        sub[k] = v;
      }
    }
    if (Object.keys(sub).length > 0) out.hiddenPlaying = sub;
  }

  if (merged.personality && base.personality) {
    const sub: Record<string, number> = {};
    for (const [k, v] of Object.entries(merged.personality)) {
      if (v !== undefined && v !== base.personality[k as keyof DecodedPersonalityAttributes]) {
        sub[k] = v;
      }
    }
    if (Object.keys(sub).length > 0) out.personality = sub;
  }

  return Object.keys(out).length > 0 ? (out as PlayerDraftPatch) : null;
}

function normalizeStaffPatch(base: DecodedSaveStaff, merged: StaffDraftPatch): StaffDraftPatch | null {
  assertKnownPatchKeys(merged, [
    'staffCa', 'staffPa', 'homeReputation', 'currentReputation', 'worldReputation',
    'weeklyWageGbp', 'contractExpiresAt', 'attributes'
  ], 'staff');
  assertKnownNestedPatch(merged.attributes, base.attributes, 'staff.attributes');
  validateStaffDraftPatch(merged, base);
  const out: Record<string, unknown> = {};
  const scalarPairs: ReadonlyArray<readonly [keyof StaffDraftPatch, unknown]> = [
    ['staffCa', base.staffCa],
    ['staffPa', base.staffPa],
    ['homeReputation', base.homeReputation],
    ['currentReputation', base.currentReputation],
    ['worldReputation', base.worldReputation],
    ['weeklyWageGbp', base.weeklyWageGbp],
    ['contractExpiresAt', base.contractExpiresAt]
  ];
  for (const [k, baseVal] of scalarPairs) {
    const nextVal = merged[k];
    if (nextVal !== undefined && nextVal !== baseVal) out[k] = nextVal;
  }
  if (merged.attributes && base.attributes) {
    const sub: Record<string, number> = {};
    for (const [k, v] of Object.entries(merged.attributes)) {
      if (v !== undefined && v !== base.attributes[k as keyof DecodedStaffAttributes]) {
        sub[k] = v;
      }
    }
    if (Object.keys(sub).length > 0) out.attributes = sub;
  }
  return Object.keys(out).length > 0 ? (out as StaffDraftPatch) : null;
}

function normalizeClubPatch(base: DecodedSaveClub, merged: ClubDraftPatch): ClubDraftPatch | null {
  assertKnownPatchKeys(merged, [
    'balanceGbp', 'transferBudgetGbp', 'transferBudgetSeasonGbp', 'weeklyWageBudgetGbp',
    'trainingFacilities', 'youthFacilities', 'youthCoaching', 'youthRecruitment', 'yearFounded'
  ], 'club');
  validateClubDraftPatch(merged, base);
  const out: Record<string, unknown> = {};
  const pairs: ReadonlyArray<readonly [keyof ClubDraftPatch, unknown]> = [
    ['balanceGbp', base.balanceGbp],
    ['transferBudgetGbp', base.transferBudgetGbp],
    ['transferBudgetSeasonGbp', base.transferBudgetSeasonGbp],
    ['weeklyWageBudgetGbp', base.weeklyWageBudgetGbp],
    ['trainingFacilities', base.trainingFacilities],
    ['youthFacilities', base.youthFacilities],
    ['youthCoaching', base.youthCoaching],
    ['youthRecruitment', base.youthRecruitment],
    ['yearFounded', base.yearFounded]
  ];
  for (const [k, baseVal] of pairs) {
    const nextVal = merged[k];
    if (nextVal !== undefined && nextVal !== baseVal) out[k] = nextVal;
  }
  return Object.keys(out).length > 0 ? (out as ClubDraftPatch) : null;
}

function normalizeStadiumPatch(base: DecodedSaveStadium, merged: StadiumDraftPatch): StadiumDraftPatch | null {
  assertKnownPatchKeys(merged, ['capacity', 'seatingCapacity', 'expansionCapacity'], 'stadium');
  validateStadiumDraftPatch(merged);
  if ((merged.capacity !== undefined || merged.seatingCapacity !== undefined) &&
      (merged.seatingCapacity ?? base.seatingCapacity) > (merged.capacity ?? base.capacity)) {
    throw new FM2013DecodeError('INVALID_FILE', 'Stadium seating capacity cannot exceed total capacity.');
  }
  const out: Record<string, unknown> = {};
  if (merged.capacity !== undefined && merged.capacity !== base.capacity) out.capacity = merged.capacity;
  if (merged.seatingCapacity !== undefined && merged.seatingCapacity !== base.seatingCapacity) {
    out.seatingCapacity = merged.seatingCapacity;
  }
  if (merged.expansionCapacity !== undefined && merged.expansionCapacity !== base.expansionCapacity) {
    out.expansionCapacity = merged.expansionCapacity;
  }
  return Object.keys(out).length > 0 ? (out as StadiumDraftPatch) : null;
}

export function mergePlayerPatch(prev: PlayerDraftPatch | undefined, next: PlayerDraftPatch): PlayerDraftPatch {
  return {
    ...prev,
    ...next,
    ...(prev?.positions || next.positions ? { positions: { ...prev?.positions, ...next.positions } } : {}),
    ...(prev?.attributes || next.attributes ? { attributes: { ...prev?.attributes, ...next.attributes } } : {}),
    ...(prev?.hiddenPlaying || next.hiddenPlaying ? { hiddenPlaying: { ...prev?.hiddenPlaying, ...next.hiddenPlaying } } : {}),
    ...(prev?.personality || next.personality ? { personality: { ...prev?.personality, ...next.personality } } : {})
  };
}

export function mergeStaffPatch(prev: StaffDraftPatch | undefined, next: StaffDraftPatch): StaffDraftPatch {
  return {
    ...prev,
    ...next,
    ...(prev?.attributes || next.attributes ? { attributes: { ...prev?.attributes, ...next.attributes } } : {})
  };
}

/** Normalize an entire overlay against `baseDb`, pruning no-op changes and rejecting invalid values. */
export function normalizeOverlayAgainstDatabase(
  baseDb: DecodedSaveDatabase,
  candidate: SaveDraftOverlay
): SaveDraftOverlay {
  assertKnownPatchKeys(candidate, ['players', 'staff', 'clubs', 'stadiums'], 'overlay');
  for (const [label, records] of Object.entries(candidate)) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
      throw new FM2013DecodeError('INVALID_FILE', `Invalid ${label} overlay.`);
    }
    for (const uid of Object.keys(records)) {
      if (!/^(0|[1-9][0-9]*)$/.test(uid) || !Number.isSafeInteger(Number(uid))) {
        throw new FM2013DecodeError('INVALID_FILE', `Invalid ${label} UID.`);
      }
    }
  }
  const playerMap = new Map(baseDb.players.map(p => [p.uid, p] as const));
  const staffMap = new Map(baseDb.staff.map(s => [s.uid, s] as const));
  const clubMap = new Map(baseDb.clubs.map(c => [c.uid, c] as const));
  const stadiumMap = new Map(baseDb.stadiums.map(st => [st.uid, st] as const));

  const players: Record<number, PlayerDraftPatch> = {};
  for (const [uidStr, patch] of Object.entries(candidate.players)) {
    const uid = Number(uidStr);
    const base = playerMap.get(uid);
    if (!base) throw new FM2013DecodeError('INVALID_FILE', `Unknown player UID ${uid}.`);
    const norm = normalizePlayerPatch(base, patch);
    if (norm) players[uid] = norm;
  }

  const staff: Record<number, StaffDraftPatch> = {};
  for (const [uidStr, patch] of Object.entries(candidate.staff)) {
    const uid = Number(uidStr);
    const base = staffMap.get(uid);
    if (!base) throw new FM2013DecodeError('INVALID_FILE', `Unknown staff UID ${uid}.`);
    const norm = normalizeStaffPatch(base, patch);
    if (norm) staff[uid] = norm;
  }

  const clubs: Record<number, ClubDraftPatch> = {};
  for (const [uidStr, patch] of Object.entries(candidate.clubs)) {
    const uid = Number(uidStr);
    const base = clubMap.get(uid);
    if (!base) throw new FM2013DecodeError('INVALID_FILE', `Unknown club UID ${uid}.`);
    const norm = normalizeClubPatch(base, patch);
    if (norm) clubs[uid] = norm;
  }

  const stadiums: Record<number, StadiumDraftPatch> = {};
  for (const [uidStr, patch] of Object.entries(candidate.stadiums)) {
    const uid = Number(uidStr);
    const base = stadiumMap.get(uid);
    if (!base) throw new FM2013DecodeError('INVALID_FILE', `Unknown stadium UID ${uid}.`);
    const norm = normalizeStadiumPatch(base, patch);
    if (norm) stadiums[uid] = norm;
  }

  return { players, staff, clubs, stadiums };
}

export function countDirtyEntities(overlay: SaveDraftOverlay): number {
  return (
    Object.keys(overlay.players).length +
    Object.keys(overlay.staff).length +
    Object.keys(overlay.clubs).length +
    Object.keys(overlay.stadiums).length
  );
}

export function countDirtyFields(overlay: SaveDraftOverlay): number {
  let count = 0;
  for (const patch of Object.values(overlay.players)) {
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === 'positions' || k === 'attributes' || k === 'hiddenPlaying' || k === 'personality') {
        count += Object.keys(v as Record<string, unknown>).length;
      } else {
        count += 1;
      }
    }
  }
  for (const patch of Object.values(overlay.staff)) {
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === 'attributes') count += Object.keys(v as Record<string, unknown>).length;
      else count += 1;
    }
  }
  for (const patch of Object.values(overlay.clubs)) {
    count += Object.keys(patch).length;
  }
  for (const patch of Object.values(overlay.stadiums)) {
    count += Object.keys(patch).length;
  }
  return count;
}

/**
 * Commit an atomic edit transaction in Editor mode.
 * Strictly blocks all mutations when `mode === 'realism'`.
 */
export function commitEditorTransaction(
  state: EditorTransactionState,
  baseDb: DecodedSaveDatabase,
  mode: DecodedSaveMode,
  label: string,
  produceNextOverlay: (current: SaveDraftOverlay) => SaveDraftOverlay
): EditorTransactionState {
  if (mode !== 'editor') {
    throw new FM2013DecodeError(
      'UNSUPPORTED_WRITE_TARGET',
      'Editing is disabled in Realism mode. Switch to Editor mode before modifying save records.'
    );
  }
  if (state.saveId !== baseDb.source.saveId) {
    throw new FM2013DecodeError('INVALID_FILE', 'Editor transaction saveId does not match active save.');
  }
  const normalized = normalizeOverlayAgainstDatabase(baseDb, produceNextOverlay(state.present));
  if (JSON.stringify(normalized) === JSON.stringify(state.present)) {
    return state;
  }
  const nextPast = [...state.past, { label, overlay: state.present }].slice(-MAX_UNDO_HISTORY);
  return {
    saveId: state.saveId,
    past: nextPast,
    present: normalized,
    future: [],
    lastActionLabel: label
  };
}

export function undoEditorTransaction(state: EditorTransactionState): EditorTransactionState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1]!;
  return {
    saveId: state.saveId,
    past: state.past.slice(0, -1),
    present: previous.overlay,
    future: [{ label: previous.label, overlay: state.present }, ...state.future],
    lastActionLabel: `Undo: ${previous.label}`
  };
}

export function redoEditorTransaction(state: EditorTransactionState): EditorTransactionState {
  if (state.future.length === 0) return state;
  const next = state.future[0]!;
  return {
    saveId: state.saveId,
    past: [...state.past, { label: next.label, overlay: state.present }].slice(-MAX_UNDO_HISTORY),
    present: next.overlay,
    future: state.future.slice(1),
    lastActionLabel: next.label
  };
}

export function discardEditorTransactions(state: EditorTransactionState): EditorTransactionState {
  return createEmptyEditorState(state.saveId);
}

/** Purely overlay pending draft edits onto `baseDb` so every workspace reflects live draft values immediately. */
export function applyDraftOverlayToDatabase(
  baseDb: DecodedSaveDatabase,
  overlay: SaveDraftOverlay
): DecodedSaveDatabase {
  if (countDirtyEntities(overlay) === 0) return baseDb;

  const players = Object.keys(overlay.players).length === 0
    ? baseDb.players
    : baseDb.players.map(player => {
        const patch = overlay.players[player.uid];
        if (!patch) return player;
        const nextPositions: DecodedPositionRatings = patch.positions
          ? { ...player.positions, ...patch.positions }
          : player.positions;
        const nextAttributes = patch.attributes
          ? ({ ...player.attributes, ...patch.attributes } as Readonly<Record<AttributeKey, number>>)
          : player.attributes;
        const nextHidden: DecodedHiddenPlayingAttributes = patch.hiddenPlaying
          ? { ...player.hiddenPlaying, ...patch.hiddenPlaying }
          : player.hiddenPlaying;
        const nextPersonality: DecodedPersonalityAttributes | null = player.personality && patch.personality
          ? { ...player.personality, ...patch.personality }
          : player.personality;
        const nextSquadNumber = patch.squadNumber !== undefined ? patch.squadNumber : player.squadNumber;
        const nextContract = player.contract
          ? {
              ...player.contract,
              weeklyWageGbp: patch.weeklyWageGbp !== undefined ? patch.weeklyWageGbp : player.contract.weeklyWageGbp,
              expiresAt: patch.contractExpiresAt !== undefined ? patch.contractExpiresAt : player.contract.expiresAt,
              squadNumber: nextSquadNumber
            }
          : null;
        return {
          ...player,
          actualCa: patch.actualCa ?? player.actualCa,
          potentialAbility: patch.potentialAbility ?? player.potentialAbility,
          homeReputation: patch.homeReputation ?? player.homeReputation,
          currentReputation: patch.currentReputation ?? player.currentReputation,
          worldReputation: patch.worldReputation ?? player.worldReputation,
          morale: patch.morale !== undefined ? patch.morale : player.morale,
          marketValueGbp: patch.marketValueGbp !== undefined ? patch.marketValueGbp : player.marketValueGbp,
          heightCm: patch.heightCm !== undefined ? patch.heightCm : player.heightCm,
          weightKg: patch.weightKg !== undefined ? patch.weightKg : player.weightKg,
          leftFoot: patch.leftFoot ?? player.leftFoot,
          rightFoot: patch.rightFoot ?? player.rightFoot,
          intCaps: patch.intCaps ?? player.intCaps,
          intGoals: patch.intGoals ?? player.intGoals,
          squadNumber: nextSquadNumber,
          contract: nextContract,
          positions: nextPositions,
          positionSummary: patch.positions ? formatPositionSummary(nextPositions) : player.positionSummary,
          attributes: nextAttributes,
          hiddenPlaying: nextHidden,
          personality: nextPersonality
        };
      });

  const staff = Object.keys(overlay.staff).length === 0
    ? baseDb.staff
    : baseDb.staff.map(member => {
        const patch = overlay.staff[member.uid];
        if (!patch) return member;
        return {
          ...member,
          staffCa: patch.staffCa ?? member.staffCa,
          staffPa: patch.staffPa ?? member.staffPa,
          homeReputation: patch.homeReputation ?? member.homeReputation,
          currentReputation: patch.currentReputation ?? member.currentReputation,
          worldReputation: patch.worldReputation ?? member.worldReputation,
          weeklyWageGbp: patch.weeklyWageGbp !== undefined ? patch.weeklyWageGbp : member.weeklyWageGbp,
          contractExpiresAt: patch.contractExpiresAt !== undefined ? patch.contractExpiresAt : member.contractExpiresAt,
          attributes: member.attributes && patch.attributes
            ? { ...member.attributes, ...patch.attributes }
            : member.attributes
        };
      });

  const clubs = Object.keys(overlay.clubs).length === 0
    ? baseDb.clubs
    : baseDb.clubs.map(club => {
        const patch = overlay.clubs[club.uid];
        if (!patch) return club;
        return {
          ...club,
          balanceGbp: patch.balanceGbp !== undefined ? patch.balanceGbp : club.balanceGbp,
          transferBudgetGbp: patch.transferBudgetGbp !== undefined ? patch.transferBudgetGbp : club.transferBudgetGbp,
          transferBudgetSeasonGbp: patch.transferBudgetSeasonGbp !== undefined
            ? patch.transferBudgetSeasonGbp
            : club.transferBudgetSeasonGbp,
          weeklyWageBudgetGbp: patch.weeklyWageBudgetGbp !== undefined
            ? patch.weeklyWageBudgetGbp
            : club.weeklyWageBudgetGbp,
          trainingFacilities: patch.trainingFacilities !== undefined
            ? patch.trainingFacilities
            : club.trainingFacilities,
          youthFacilities: patch.youthFacilities !== undefined ? patch.youthFacilities : club.youthFacilities,
          youthCoaching: patch.youthCoaching !== undefined ? patch.youthCoaching : club.youthCoaching,
          youthRecruitment: patch.youthRecruitment !== undefined ? patch.youthRecruitment : club.youthRecruitment,
          yearFounded: patch.yearFounded !== undefined ? patch.yearFounded : club.yearFounded
        };
      });

  const stadiums = Object.keys(overlay.stadiums).length === 0
    ? baseDb.stadiums
    : baseDb.stadiums.map(stadium => {
        const patch = overlay.stadiums[stadium.uid];
        if (!patch) return stadium;
        return {
          ...stadium,
          capacity: patch.capacity ?? stadium.capacity,
          seatingCapacity: patch.seatingCapacity ?? stadium.seatingCapacity,
          expansionCapacity: patch.expansionCapacity ?? stadium.expansionCapacity
        };
      });

  return {
    ...baseDb,
    players,
    staff,
    clubs,
    stadiums
  };
}

/** Build a human-readable list of field diffs for the pre-export `Save As .fm` review dialog. */
export function summarizeDraftChanges(
  baseDb: DecodedSaveDatabase,
  overlay: SaveDraftOverlay
): readonly DraftChangeEntry[] {
  const entries: DraftChangeEntry[] = [];
  const playerMap = new Map(baseDb.players.map(p => [p.uid, p] as const));
  const staffMap = new Map(baseDb.staff.map(s => [s.uid, s] as const));
  const clubMap = new Map(baseDb.clubs.map(c => [c.uid, c] as const));
  const stadiumMap = new Map(baseDb.stadiums.map(st => [st.uid, st] as const));

  for (const [uidStr, patch] of Object.entries(overlay.players)) {
    const uid = Number(uidStr);
    const base = playerMap.get(uid);
    if (!base) continue;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === 'positions' || k === 'attributes' || k === 'hiddenPlaying' || k === 'personality') {
        const baseGroup = (base[k as keyof DecodedSavePlayer] ?? {}) as Record<string, number>;
        for (const [subKey, subVal] of Object.entries(v as Record<string, number>)) {
          entries.push({
            entityKind: 'player',
            uid,
            entityName: base.displayName,
            field: `${k}.${subKey}`,
            before: baseGroup[subKey] ?? null,
            after: subVal
          });
        }
      } else if (k === 'weeklyWageGbp') {
        entries.push({ entityKind: 'player', uid, entityName: base.displayName, field: k, before: base.contract?.weeklyWageGbp ?? null, after: v as number });
      } else if (k === 'contractExpiresAt') {
        entries.push({ entityKind: 'player', uid, entityName: base.displayName, field: k, before: base.contract?.expiresAt ?? null, after: v as string });
      } else {
        entries.push({
          entityKind: 'player',
          uid,
          entityName: base.displayName,
          field: k,
          before: (base[k as keyof DecodedSavePlayer] as string | number | null) ?? null,
          after: v as string | number
        });
      }
    }
  }

  for (const [uidStr, patch] of Object.entries(overlay.staff)) {
    const uid = Number(uidStr);
    const base = staffMap.get(uid);
    if (!base) continue;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (k === 'attributes') {
        const baseGroup = (base.attributes ?? {}) as Record<string, number>;
        for (const [subKey, subVal] of Object.entries(v as Record<string, number>)) {
          entries.push({
            entityKind: 'staff',
            uid,
            entityName: base.displayName,
            field: `attributes.${subKey}`,
            before: baseGroup[subKey] ?? null,
            after: subVal
          });
        }
      } else {
        entries.push({
          entityKind: 'staff',
          uid,
          entityName: base.displayName,
          field: k,
          before: (base[k as keyof DecodedSaveStaff] as string | number | null) ?? null,
          after: v as string | number
        });
      }
    }
  }

  for (const [uidStr, patch] of Object.entries(overlay.clubs)) {
    const uid = Number(uidStr);
    const base = clubMap.get(uid);
    if (!base) continue;
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) {
        entries.push({
          entityKind: 'club',
          uid,
          entityName: base.shortName || base.fullName,
          field: k,
          before: (base[k as keyof DecodedSaveClub] as number | null) ?? null,
          after: v as number
        });
      }
    }
  }

  for (const [uidStr, patch] of Object.entries(overlay.stadiums)) {
    const uid = Number(uidStr);
    const base = stadiumMap.get(uid);
    if (!base) continue;
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) {
        entries.push({
          entityKind: 'stadium',
          uid,
          entityName: base.customName || `Stadium #${uid}`,
          field: k,
          before: (base[k as keyof DecodedSaveStadium] as number | null) ?? null,
          after: v as number
        });
      }
    }
  }

  return entries;
}

// --- FMRTE 13 Presets & Mass Edit Builders ---

export function buildPlayerPresetPatch(
  player: DecodedSavePlayer,
  preset: PlayerPresetKind,
  gameDateIso: string | null = null
): PlayerDraftPatch {
  switch (preset) {
    case 'inspire_morale':
      return {
        morale: 20,
        hiddenPlaying: { consistency: 20, importantMatches: 20, injuryProneness: 1 }
      };
    case 'match_ca_to_pa': {
      const targetCa = Math.max(1, Math.min(200, player.potentialAbility > 0 ? player.potentialAbility : player.actualCa));
      return { actualCa: targetCa };
    }
    case 'wonderkid_pa_200':
      return {
        potentialAbility: 200,
        actualCa: Math.max(player.actualCa, 155),
        attributes: { determination: 20, naturalFitness: 19, workRate: 18 },
        ...(player.personality ? { personality: { ambition: 20, professionalism: 20 } } : {})
      };
    case 'perfect_model_professional':
      return {
        attributes: { determination: 20, leadership: 18, teamwork: 19, workRate: 19 },
        hiddenPlaying: { consistency: 20, importantMatches: 20, dirtiness: 1, injuryProneness: 1 },
        ...(player.personality
          ? {
              personality: {
                adaptability: 20,
                ambition: 20,
                loyalty: 20,
                pressure: 20,
                professionalism: 20,
                sportsmanship: 20,
                temperament: 20,
                controversy: 1
              }
            }
          : {})
      };
    case 'natural_all_positions':
      return {
        positions: {
          GK: player.positions.GK >= 15 ? 20 : player.positions.GK,
          SW: 20, DL: 20, DC: 20, DR: 20, DM: 20,
          ML: 20, MC: 20, MR: 20, AML: 20, AMC: 20, AMR: 20,
          ST: 20, WBL: 20, WBR: 20
        },
        leftFoot: 20,
        rightFoot: 20,
        hiddenPlaying: { versatility: 20 }
      };
    case 'extend_contract_5y': {
      if (!player.contract) return {};
      const baseYear = gameDateIso ? Number(gameDateIso.slice(0, 4)) : 2013;
      const safeYear = Number.isFinite(baseYear) && baseYear >= 1990 && baseYear <= 2150 ? baseYear + 5 : 2018;
      return { contractExpiresAt: `${safeYear}-06-30` };
    }
  }
}

export function buildClubSquadPresetOverlay(
  baseDb: DecodedSaveDatabase,
  currentOverlay: SaveDraftOverlay,
  clubUid: number,
  preset: ClubSquadPresetKind
): SaveDraftOverlay {
  const working = applyDraftOverlayToDatabase(baseDb, currentOverlay);
  const club = working.clubs.find(c => c.uid === clubUid);
  if (!club) {
    throw new FM2013DecodeError('INVALID_FILE', `Club UID ${clubUid} not found in active save.`);
  }

  if (preset === 'boost_finances_facilities') {
    const clubPatch: ClubDraftPatch = {
      trainingFacilities: 20,
      youthFacilities: 20,
      youthCoaching: 20,
      youthRecruitment: 20,
      ...(club.financeType !== 'none' ? { balanceGbp: Math.max(club.balanceGbp ?? 0, 250_000_000) } : {}),
      ...(club.financeType === 'full'
        ? {
            transferBudgetGbp: Math.max(club.transferBudgetGbp ?? 0, 150_000_000),
            transferBudgetSeasonGbp: Math.max(club.transferBudgetSeasonGbp ?? 0, 150_000_000),
            weeklyWageBudgetGbp: Math.max(club.weeklyWageBudgetGbp ?? 0, 3_500_000)
          }
        : {})
    };
    return {
      ...currentOverlay,
      clubs: {
        ...currentOverlay.clubs,
        [clubUid]: { ...currentOverlay.clubs[clubUid], ...clubPatch }
      }
    };
  }

  const nextPlayers: Record<number, PlayerDraftPatch> = { ...currentOverlay.players };
  for (const player of working.players) {
    if (player.clubUid !== clubUid) continue;
    let delta: PlayerDraftPatch = {};
    if (preset === 'inspire_team') {
      delta = { morale: 20 };
    } else if (preset === 'heal_fitness_morale_team') {
      delta = {
        morale: 20,
        attributes: { stamina: Math.max(player.attributes.stamina, 18), naturalFitness: Math.max(player.attributes.naturalFitness, 18) },
        hiddenPlaying: { injuryProneness: 1 }
      };
    } else if (preset === 'match_squad_ca_pa') {
      const targetCa = Math.max(1, Math.min(200, player.potentialAbility > 0 ? player.potentialAbility : player.actualCa));
      delta = { actualCa: targetCa };
    }
    nextPlayers[player.uid] = mergePlayerPatch(nextPlayers[player.uid], delta);
  }

  return {
    ...currentOverlay,
    players: nextPlayers
  };
}

export function buildMassEditPlayersOverlay(
  currentOverlay: SaveDraftOverlay,
  playerUids: readonly number[],
  patch: PlayerDraftPatch
): SaveDraftOverlay {
  const nextPlayers: Record<number, PlayerDraftPatch> = { ...currentOverlay.players };
  for (const uid of playerUids) {
    nextPlayers[uid] = mergePlayerPatch(nextPlayers[uid], patch);
  }
  return { ...currentOverlay, players: nextPlayers };
}

export function buildMassEditStaffOverlay(
  currentOverlay: SaveDraftOverlay,
  staffUids: readonly number[],
  patch: StaffDraftPatch
): SaveDraftOverlay {
  const nextStaff: Record<number, StaffDraftPatch> = { ...currentOverlay.staff };
  for (const uid of staffUids) {
    nextStaff[uid] = mergeStaffPatch(nextStaff[uid], patch);
  }
  return { ...currentOverlay, staff: nextStaff };
}

export function buildMassEditClubsOverlay(
  currentOverlay: SaveDraftOverlay,
  clubUids: readonly number[],
  patch: ClubDraftPatch
): SaveDraftOverlay {
  const nextClubs: Record<number, ClubDraftPatch> = { ...currentOverlay.clubs };
  for (const uid of clubUids) {
    nextClubs[uid] = { ...nextClubs[uid], ...patch };
  }
  return { ...currentOverlay, clubs: nextClubs };
}
