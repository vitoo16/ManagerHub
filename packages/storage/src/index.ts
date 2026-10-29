import {
  MAX_SAVED_PLAYER_EXPORTS, MAX_SAVED_SAVE_INSPECTIONS, isSaveIdentity, isSavedPlayerExport,
  makeSavedPlayerExport, summarizeSavedExport,
  type PlayerDataset, type SaveIdentity, type SavedPlayerExport, type SavedPlayerExportSummary
} from '@managerhub/domain';

const DATABASE_NAME = 'managerhub-local';
const DATABASE_VERSION = 2;
const EXPORTS = 'player-exports';
const SUMMARIES = 'player-export-summaries';
const SAVE_INSPECTIONS = 'save-inspections';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Local browser storage is unavailable. Your import is still usable in this tab.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EXPORTS)) db.createObjectStore(EXPORTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SUMMARIES)) db.createObjectStore(SUMMARIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SAVE_INSPECTIONS)) db.createObjectStore(SAVE_INSPECTIONS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open this browser’s local player library.'));
    request.onblocked = () => reject(new Error('Local player library is open in an incompatible tab. Close other ManagerHub tabs and retry.'));
  });
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage read failed.'));
  });
}

function transactionCompleted(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction aborted.'));
  });
}

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


/** Return only validated metadata; original .fm file bytes are never stored. */
export async function listSavedSaveInspections(): Promise<SaveIdentity[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(SAVE_INSPECTIONS, 'readonly');
    const rows = await readRequest<unknown[]>(tx.objectStore(SAVE_INSPECTIONS).getAll());
    if (!rows.every(isSaveIdentity)) {
      throw new Error('Saved save inspection metadata is not compatible with this version.');
    }
    return [...rows].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  } finally { db.close(); }
}

/** Explicit user action; persists the validated inspection record, never the source file. */
export async function saveSaveInspectionMetadata(identity: SaveIdentity): Promise<SaveIdentity> {
  if (!isSaveIdentity(identity)) throw new Error('This inspection metadata is not valid for local storage.');
  const db = await openDatabase();
  try {
    const tx = db.transaction(SAVE_INSPECTIONS, 'readwrite');
    const completed = transactionCompleted(tx);
    const store = tx.objectStore(SAVE_INSPECTIONS);
    const existing = await readRequest<unknown>(store.get(identity.id));
    if (existing === undefined) {
      const count = await readRequest<number>(store.count());
      if (count >= MAX_SAVED_SAVE_INSPECTIONS) {
        tx.abort();
        await completed.catch(() => undefined);
        throw new Error('This browser already holds 50 saved save inspections. Delete one first.');
      }
    }
    store.put(identity);
    await completed;
    return identity;
  } catch (cause) {
    if (cause instanceof Error &&
        /already holds 50 saved save inspections|inspection metadata is not valid/.test(cause.message)) throw cause;
    throw new Error('Unable to save inspection metadata locally. Check browser storage permissions and available disk space.');
  } finally { db.close(); }
}

export async function deleteSavedSaveInspectionMetadata(id: string): Promise<void> {
  if (!id) throw new Error('A saved inspection ID is required.');
  const db = await openDatabase();
  try {
    const tx = db.transaction(SAVE_INSPECTIONS, 'readwrite');
    const completed = transactionCompleted(tx);
    tx.objectStore(SAVE_INSPECTIONS).delete(id);
    await completed;
  } catch {
    throw new Error('Unable to remove saved inspection metadata. Check browser storage permissions and try again.');
  } finally { db.close(); }
}
