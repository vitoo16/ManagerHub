import {
  MAX_SAVED_PLAYER_EXPORTS, isSavedPlayerExport, makeSavedPlayerExport, summarizeSavedExport,
  type PlayerDataset, type SavedPlayerExport, type SavedPlayerExportSummary
} from '@managerhub/domain';
import { EXPORTS, SUMMARIES, openDatabase, readRequest, transactionCompleted } from './database';

function isSummary(value: unknown): value is SavedPlayerExportSummary {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<SavedPlayerExportSummary>;
  return typeof s.id === 'string' && typeof s.savedAt === 'string' &&
    typeof s.fileName === 'string' && typeof s.importedAt === 'string' &&
    typeof s.playerCount === 'number' && s.playerCount >= 1 && s.playerCount <= 20000 &&
    typeof s.attributeCount === 'number' && s.attributeCount >= 0;
}

export async function listSavedPlayerExports(): Promise<SavedPlayerExportSummary[]> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(SUMMARIES, 'readonly');
    const rows = await readRequest<unknown[]>(transaction.objectStore(SUMMARIES).getAll());
    if (!rows.every(isSummary)) throw new Error('Saved library metadata is not compatible with this version.');
    return [...rows].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } finally { db.close(); }
}

export async function getSavedPlayerExport(id: string): Promise<SavedPlayerExport> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(EXPORTS, 'readonly');
    const result: unknown = await readRequest(tx.objectStore(EXPORTS).get(id));
    if (!isSavedPlayerExport(result)) {
      throw new Error('This saved player export is missing, damaged or incompatible. Reimport the source export.');
    }
    return result;
  } finally { db.close(); }
}

/** Explicit user action; no automatic persistence of imported data. */
export async function savePlayerExport(dataset: PlayerDataset): Promise<SavedPlayerExportSummary> {
  if (!globalThis.crypto?.randomUUID) throw new Error('Secure browser context required to save local snapshots.');
  const record = makeSavedPlayerExport(dataset, crypto.randomUUID(), new Date().toISOString());
  const db = await openDatabase();
  try {
    // Read/write transaction serializes simultaneous browser-tab saves and the count check.
    const tx = db.transaction([EXPORTS, SUMMARIES], 'readwrite');
    const completed = transactionCompleted(tx);
    const count = await readRequest(tx.objectStore(SUMMARIES).count());
    if (count >= MAX_SAVED_PLAYER_EXPORTS) {
      tx.abort();
      await completed.catch(() => undefined);
      throw new Error('This browser already holds 20 saved exports. Delete an older export first.');
    }
    tx.objectStore(EXPORTS).add(record);
    tx.objectStore(SUMMARIES).add(summarizeSavedExport(record));
    await completed;
    return summarizeSavedExport(record);
  } catch (cause) {
    if (cause instanceof Error && /already holds 20/.test(cause.message)) throw cause;
    throw new Error('Unable to save this export locally. Check browser storage permissions and available disk space.');
  } finally { db.close(); }
}

export async function deleteSavedPlayerExport(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([EXPORTS, SUMMARIES], 'readwrite');
    const completed = transactionCompleted(tx);
    tx.objectStore(EXPORTS).delete(id);
    tx.objectStore(SUMMARIES).delete(id);
    await completed;
  } finally { db.close(); }
}
