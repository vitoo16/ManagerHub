const DATABASE_NAME = 'managerhub-local';
const DATABASE_VERSION = 4;

export const EXPORTS = 'player-exports';
export const SUMMARIES = 'player-export-summaries';
export const SAVE_INSPECTIONS = 'save-inspections';
export const HISTORICAL_EDITOR_SNAPSHOTS = 'historical-editor-snapshots';
export const HISTORICAL_EDITOR_SUMMARIES = 'historical-editor-summaries';
export const HISTORICAL_REALISM_SNAPSHOTS = 'historical-realism-snapshots';
export const HISTORICAL_REALISM_SUMMARIES = 'historical-realism-summaries';

/** Shared IndexedDB opener owns schema migrations for all local libraries. */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
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
      const transaction = request.transaction;
      if (!transaction) throw new Error('Database migration transaction is unavailable.');
      for (const name of [
        HISTORICAL_EDITOR_SNAPSHOTS, HISTORICAL_EDITOR_SUMMARIES,
        HISTORICAL_REALISM_SNAPSHOTS, HISTORICAL_REALISM_SUMMARIES
      ]) {
        const store = db.objectStoreNames.contains(name)
          ? transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: 'id' });
        if (name.endsWith('-summaries') && !store.indexNames.contains('bySourceSha256')) {
          store.createIndex('bySourceSha256', 'sourceSha256', { unique: false });
        }
      }
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(new Error('Could not open this browser’s local library.'));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Local library upgrade is blocked by another ManagerHub tab. Close other tabs and retry.'));
    };
  });
}

export function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage read failed.'));
  });
}

export function transactionCompleted(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction aborted.'));
  });
}
