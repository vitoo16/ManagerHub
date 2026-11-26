import { localContentSha256 } from './local-content-hash';
import { FORMATIONS, declaredPositions } from './squad-optimizer';
import type { PlayerDataset, PlayerExport } from './player-import';
import type { SquadPlanConfig, SquadPlanKey, SquadPlans } from './squad-scenarios';

/** Local-only user plan preferences: no source file, player names or attributes are persisted. */
export const SAVED_SQUAD_PLAN_SCHEMA = 'managerhub.squad-plans.v1' as const;
export const SAVED_SQUAD_PLAN_STORAGE_PREFIX = 'mh.squad-plans.v1:';
const MAX_PLAN_JSON_CHARS = 12_000;
const MAX_DATASET_BYTES = 24_000_000;

export interface SavedSquadPlans {
  readonly schema: typeof SAVED_SQUAD_PLAN_SCHEMA;
  readonly datasetSha256: string;
  readonly savedAt: string;
  readonly active: SquadPlanKey;
  readonly plans: SquadPlans;
}

function plain(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return plain(value) && Reflect.ownKeys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}

function canonicalPlan(value: unknown, dataset: PlayerDataset): SquadPlanConfig {
  if (!exact(value, ['formation', 'lockedSlots', 'excludedPlayerIds']) ||
      (value.formation !== '4-3-3' && value.formation !== '4-2-3-1') ||
      !plain(value.lockedSlots) || !Array.isArray(value.excludedPlayerIds)) {
    throw new Error('invalid_squad_plan');
  }

  const formation = value.formation;
  const roster = new Map<string, PlayerExport>(dataset.players.map(player => [player.id, player] as const));
  if (roster.size !== dataset.players.length || roster.size === 0) throw new Error('invalid_roster');
  const slots = new Map(FORMATIONS[formation].map(slot => [slot.id, slot] as const));
  const lockedSlots: Record<string, string> = {};
  const pinnedIds = new Set<string>();
  if (Object.keys(value.lockedSlots).length > slots.size) throw new Error('invalid_squad_plan');
  for (const [slotId, id] of Object.entries(value.lockedSlots)) {
    if (typeof id !== 'string' || !roster.has(id) || !slots.has(slotId) || pinnedIds.has(id)) {
      throw new Error('invalid_squad_plan');
    }
    const player = roster.get(id)!;
    if (!declaredPositions(player.position).has(slots.get(slotId)!.position)) throw new Error('invalid_squad_plan');
    pinnedIds.add(id);
    lockedSlots[slotId] = id;
  }

  if (value.excludedPlayerIds.length > roster.size) throw new Error('invalid_squad_plan');
  const excludedIds = new Set<string>();
  for (const id of value.excludedPlayerIds) {
    if (typeof id !== 'string' || !roster.has(id) || excludedIds.has(id) || pinnedIds.has(id)) {
      throw new Error('invalid_squad_plan');
    }
    excludedIds.add(id);
  }
  return { formation, lockedSlots, excludedPlayerIds: [...excludedIds] };
}

function canonicalPlans(value: unknown, dataset: PlayerDataset): SquadPlans {
  if (!exact(value, ['A', 'B'])) throw new Error('invalid_squad_plans');
  return { A: canonicalPlan(value.A, dataset), B: canonicalPlan(value.B, dataset) };
}

/**
 * Binds a plan to the *complete imported or decoded roster*. SHA-256 prevents
 * accidental cross-career restore; for `decoded_save`, the hash excludes
 * `saveMode` (`realism` vs `editor`), CA/PA, reputations, and hidden fields so
 * toggling Realism ↔ Editor keeps saved plans, tactical scenarios, and shortlists intact.
 */
export async function squadDatasetSha256(dataset: PlayerDataset): Promise<string> {
  if (
    !dataset ||
    (dataset.source !== 'game_export' && dataset.source !== 'decoded_save') ||
    !Array.isArray(dataset.players) ||
    dataset.players.length === 0 ||
    dataset.players.length > 20_000
  ) {
    throw new Error('invalid_roster');
  }

  let canonicalPayload: unknown;
  if (dataset.source === 'decoded_save') {
    if (typeof dataset.saveId !== 'string' || !/^[a-f0-9]{64}$/u.test(dataset.saveId)) {
      throw new Error('invalid_roster');
    }
    canonicalPayload = {
      source: 'decoded_save',
      saveId: dataset.saveId,
      clubFilterUid: dataset.clubFilterUid ?? null,
      attributeColumns: dataset.attributeColumns,
      players: dataset.players.map(player => ({
        id: player.id,
        nativeId: player.nativeId ?? null,
        name: player.name,
        position: player.position,
        club: player.club,
        attributes: player.attributes,
        positions: player.positions ?? null
      }))
    };
  } else {
    canonicalPayload = {
      fileName: dataset.fileName,
      source: dataset.source,
      players: dataset.players,
      attributeColumns: dataset.attributeColumns
    };
  }

  try {
    return await localContentSha256(canonicalPayload, MAX_DATASET_BYTES);
  } catch {
    throw new Error('dataset_hash_unavailable');
  }
}

export async function squadPlanStorageKey(dataset: PlayerDataset): Promise<string> {
  return SAVED_SQUAD_PLAN_STORAGE_PREFIX + await squadDatasetSha256(dataset);
}

export async function makeSavedSquadPlans(
  dataset: PlayerDataset, plans: SquadPlans, active: SquadPlanKey, savedAt = new Date().toISOString()
): Promise<SavedSquadPlans> {
  if (active !== 'A' && active !== 'B') throw new Error('invalid_squad_plan');
  if (!Number.isFinite(Date.parse(savedAt)) || new Date(savedAt).toISOString() !== savedAt) {
    throw new Error('invalid_saved_time');
  }
  const validatedPlans = canonicalPlans(plans, dataset);
  const snapshot: SavedSquadPlans = {
    schema: SAVED_SQUAD_PLAN_SCHEMA,
    datasetSha256: await squadDatasetSha256(dataset),
    savedAt,
    active,
    plans: validatedPlans
  };
  if (JSON.stringify(snapshot).length > MAX_PLAN_JSON_CHARS) throw new Error('plan_too_large');
  return snapshot;
}

/** Never return partially restored constraints from damaged or mismatched local storage. */
export async function restoreSavedSquadPlans(
  value: unknown, dataset: PlayerDataset
): Promise<SavedSquadPlans> {
  if (!exact(value, ['schema', 'datasetSha256', 'savedAt', 'active', 'plans']) ||
      value.schema !== SAVED_SQUAD_PLAN_SCHEMA ||
      typeof value.datasetSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(value.datasetSha256) ||
      typeof value.savedAt !== 'string' || value.savedAt.length > 40 ||
      !Number.isFinite(Date.parse(value.savedAt)) ||
      new Date(value.savedAt).toISOString() !== value.savedAt ||
      (value.active !== 'A' && value.active !== 'B')) throw new Error('invalid_squad_plans');

  const digest = await squadDatasetSha256(dataset);
  if (digest !== value.datasetSha256) throw new Error('different_player_export');
  const plans = canonicalPlans(value.plans, dataset);
  return {
    schema: SAVED_SQUAD_PLAN_SCHEMA,
    datasetSha256: digest,
    savedAt: value.savedAt,
    active: value.active,
    plans
  };
}

export function decodeSavedSquadPlans(raw: string): unknown {
  if (raw.length === 0 || raw.length > MAX_PLAN_JSON_CHARS) throw new Error('invalid_squad_plans');
  return JSON.parse(raw) as unknown;
}
