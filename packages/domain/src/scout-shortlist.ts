import { analyzeRoles } from './player-analysis';
import type { PlayerDataset } from './player-import';
import { squadDatasetSha256 } from './squad-plan-library';

export const SCOUT_SHORTLIST_SCHEMA = 'managerhub.scout-shortlist.v1' as const;
export const SCOUT_SHORTLIST_STORAGE_PREFIX = 'mh.scout-shortlist.v1:';
export const MAX_SCOUT_SHORTLIST_PLAYERS = 50;
const MAX_SHORTLIST_JSON = 5000;

export interface SavedScoutShortlist {
  readonly schema: typeof SCOUT_SHORTLIST_SCHEMA;
  readonly rosterSha256: string;
  readonly savedAt: string;
  readonly playerIds: readonly string[];
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return plainObject(value) && Reflect.ownKeys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}

export function validateScoutShortlistIds(value: unknown, dataset: PlayerDataset): string[] {
  if (!Array.isArray(value) || value.length > MAX_SCOUT_SHORTLIST_PLAYERS ||
    dataset.source !== 'game_export' || dataset.actualCaAvailable !== false ||
    dataset.potentialAbilityAvailable !== false) throw new Error('invalid_shortlist');
  const roster = new Set(dataset.players.map(player => player.id));
  if (roster.size !== dataset.players.length || roster.size === 0) throw new Error('invalid_roster');
  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id !== 'string' || !roster.has(id) || seen.has(id)) throw new Error('invalid_shortlist');
    seen.add(id);
  }
  return [...seen];
}

export async function scoutShortlistStorageKey(dataset: PlayerDataset): Promise<string> {
  return SCOUT_SHORTLIST_STORAGE_PREFIX + await squadDatasetSha256(dataset);
}

/** Only the roster hash and local row IDs are stored; never player names/attributes. */
export async function createSavedScoutShortlist(
  dataset: PlayerDataset, playerIds: readonly string[], savedAt = new Date().toISOString()
): Promise<SavedScoutShortlist> {
  const ids = validateScoutShortlistIds(playerIds, dataset);
  if (!Number.isFinite(Date.parse(savedAt)) || new Date(savedAt).toISOString() !== savedAt) {
    throw new Error('invalid_shortlist_time');
  }
  const record: SavedScoutShortlist = {
    schema: SCOUT_SHORTLIST_SCHEMA,
    rosterSha256: await squadDatasetSha256(dataset),
    savedAt,
    playerIds: ids
  };
  if (JSON.stringify(record).length > MAX_SHORTLIST_JSON) throw new Error('invalid_shortlist');
  return record;
}

export async function restoreSavedScoutShortlist(
  raw: string, dataset: PlayerDataset
): Promise<SavedScoutShortlist> {
  if (!raw || raw.length > MAX_SHORTLIST_JSON) throw new Error('invalid_shortlist');
  const value: unknown = JSON.parse(raw);
  if (!exactKeys(value, ['schema', 'rosterSha256', 'savedAt', 'playerIds']) ||
    value.schema !== SCOUT_SHORTLIST_SCHEMA ||
    typeof value.rosterSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(value.rosterSha256) ||
    typeof value.savedAt !== 'string' || value.savedAt.length > 40 ||
    !Number.isFinite(Date.parse(value.savedAt)) || new Date(value.savedAt).toISOString() !== value.savedAt) {
    throw new Error('invalid_shortlist');
  }
  const digest = await squadDatasetSha256(dataset);
  if (digest !== value.rosterSha256) throw new Error('different_player_export');
  return {
    schema: SCOUT_SHORTLIST_SCHEMA,
    rosterSha256: digest,
    savedAt: value.savedAt,
    playerIds: validateScoutShortlistIds(value.playerIds, dataset)
  };
}

function csvCell(value: string | number): string {
  let text = String(value);
  // eslint-disable-next-line no-control-regex
  if (/^[\u0000-\u0020]*[=+@-]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

/** Data is derived only from the imported roster; unknown role-fit stays blank. */
export function createScoutShortlistCsv(dataset: PlayerDataset, playerIds: readonly string[]): string {
  const ids = validateScoutShortlistIds(playerIds, dataset);
  const byId = new Map(dataset.players.map(p => [p.id, p] as const));
  const columns = [
    'Player', 'Position', 'Club', 'Age', 'Best observed role (heuristic)',
    'Role fit / 100 (heuristic)', 'Attribute coverage (%)', 'Source', 'Interpretation'
  ];
  const rows: (string | number)[][] = [columns];
  for (const id of ids) {
    const player = byId.get(id)!;
    const topRole = analyzeRoles(player).find(role => role.score !== null);
    rows.push([
      player.name, player.position ?? '', player.club ?? '', player.age ?? '',
      topRole?.title ?? '', topRole?.score ?? '',
      topRole ? Math.round(topRole.coverage * 100) : '',
      'game_export (provisional)',
      'Observed exported attributes only; not verified CA/PA, transfer value or a signing recommendation.'
    ]);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function scoutShortlistFilename(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/u, '')
    .replace(/[^a-zA-Z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48) || 'roster';
  return 'ManagerHub-' + base + '-shortlist.csv';
}
