import type { AttributeKey, PlayerDataset, PlayerExport } from './player-import';

/** Versioned local snapshot. Never stores raw .fm saves or executable HTML. */
export const PLAYER_LIBRARY_SCHEMA = 1;
export const MAX_SAVED_PLAYER_EXPORTS = 20;

export interface SavedPlayerExport {
  readonly id: string;
  readonly schemaVersion: typeof PLAYER_LIBRARY_SCHEMA;
  readonly savedAt: string;
  readonly dataset: PlayerDataset;
}
export interface SavedPlayerExportSummary {
  readonly id: string;
  readonly savedAt: string;
  readonly fileName: string;
  readonly playerCount: number;
  readonly attributeCount: number;
  readonly importedAt: string;
}

export function summarizeSavedExport(snapshot: SavedPlayerExport): SavedPlayerExportSummary {
  return {
    id: snapshot.id,
    savedAt: snapshot.savedAt,
    fileName: snapshot.dataset.fileName,
    importedAt: snapshot.dataset.importedAt,
    playerCount: snapshot.dataset.players.length,
    attributeCount: snapshot.dataset.attributeColumns.length
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Treat anything loaded from browser storage as potentially incompatible data. */
export function isSavedPlayerExport(value: unknown): value is SavedPlayerExport {
  if (!isObject(value) || value.schemaVersion !== PLAYER_LIBRARY_SCHEMA ||
      typeof value.id !== 'string' || !value.id ||
      typeof value.savedAt !== 'string' || !value.savedAt ||
      !isObject(value.dataset)) return false;
  const d = value.dataset;
  if (d.source !== 'game_export' || d.actualCaAvailable !== false ||
      d.potentialAbilityAvailable !== false ||
      typeof d.fileName !== 'string' || typeof d.importedAt !== 'string' ||
      !Array.isArray(d.players) || !d.players.length || d.players.length > 20000 ||
      !Array.isArray(d.attributeColumns) || !Array.isArray(d.warnings)) return false;
  return d.players.every((player: unknown) => {
    if (!isObject(player) || typeof player.id !== 'string' || typeof player.name !== 'string' ||
        player.source !== 'game_export' || player.verification !== 'provisional' ||
        !isObject(player.attributes)) return false;
    return Object.values(player.attributes).every(n => typeof n === 'number' &&
      Number.isInteger(n) && n >= 1 && n <= 20);
  });
}

export function makeSavedPlayerExport(dataset: PlayerDataset, id: string, savedAt: string): SavedPlayerExport {
  const record: SavedPlayerExport = { id, savedAt, schemaVersion: PLAYER_LIBRARY_SCHEMA, dataset };
  if (!isSavedPlayerExport(record)) throw new Error('Player export has an unsupported or invalid schema.');
  return record;
}
