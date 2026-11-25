import {
  isValidDecodedSaveDatabase,
  isValidDecodedSaveSummary,
  summarizeSaveDatabase,
  validateDecodedSaveDatabase,
  type DecodedSaveDatabase,
  type DecodedSaveDatabaseSummary
} from '@managerhub/domain/fm2013-offline';
import { readRequest, transactionCompleted } from './database';

const SAVE_DB_NAME = 'managerhub-save-db';
const SAVE_DB_VERSION = 1;
const STORE_SUMMARIES = 'save-db-summaries';
const STORE_RECORDS = 'save-db-records';
export const MAX_SAVED_DECODED_DATABASES = 8;

export class SaveDatabaseCapacityError extends Error {
  readonly code = 'SAVE_DB_CAPACITY_EXCEEDED' as const;

  constructor(maxItems = MAX_SAVED_DECODED_DATABASES) {
    super(
      `Browser decoded-save library has reached its ${maxItems}-save limit. Remove an older saved database before saving a new one.`
    );
    this.name = 'SaveDatabaseCapacityError';
  }
}

function openSaveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Local browser storage is unavailable. Your decoded save remains active in this tab.'));
      return;
    }
    const request = indexedDB.open(SAVE_DB_NAME, SAVE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
        db.createObjectStore(STORE_SUMMARIES, { keyPath: 'saveId' });
      }
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'saveId' });
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
    request.onerror = () => reject(new Error('Could not open the local decoded-save database store.'));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Decoded-save store upgrade is blocked by another ManagerHub tab.'));
    };
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isDecodedSaveDatabaseSummary(value: unknown): value is DecodedSaveDatabaseSummary {
  return isValidDecodedSaveSummary(value);
}

interface StoredDecodedSaveEnvelope {
  readonly saveId: string;
  readonly savedAt: string;
  readonly database: DecodedSaveDatabase;
}

export function isStoredDecodedSaveEnvelope(
  value: unknown,
  expectedSaveId?: string
): value is StoredDecodedSaveEnvelope {
  if (!isObject(value) || typeof value.saveId !== 'string' || !/^[a-f0-9]{64}$/.test(value.saveId)) return false;
  if (expectedSaveId !== undefined && value.saveId !== expectedSaveId) return false;
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) return false;
  return isValidDecodedSaveDatabase(value.database, value.saveId);
}

export async function listDecodedSaveSummaries(): Promise<DecodedSaveDatabaseSummary[]> {
  const db = await openSaveDb();
  try {
    const tx = db.transaction(STORE_SUMMARIES, 'readonly');
    const raw = await readRequest<unknown[]>(tx.objectStore(STORE_SUMMARIES).getAll());
    await transactionCompleted(tx);
    const valid = raw.filter(isDecodedSaveDatabaseSummary);
    return valid.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  } finally {
    db.close();
  }
}

export async function getDecodedSaveDatabase(saveId: string): Promise<DecodedSaveDatabase | null> {
  if (!/^[a-f0-9]{64}$/.test(saveId)) return null;
  const db = await openSaveDb();
  try {
    const tx = db.transaction(STORE_RECORDS, 'readonly');
    const raw = await readRequest<unknown>(tx.objectStore(STORE_RECORDS).get(saveId));
    await transactionCompleted(tx);
    if (!raw) return null;
    if (!isStoredDecodedSaveEnvelope(raw, saveId)) {
      throw new Error('Stored decoded save record failed schema validation.');
    }
    return raw.database;
  } finally {
    db.close();
  }
}

export async function saveDecodedSaveDatabase(
  database: DecodedSaveDatabase,
  options: { readonly evictOldest?: boolean } = {}
): Promise<DecodedSaveDatabaseSummary> {
  const validated = validateDecodedSaveDatabase(database);
  const savedAt = new Date().toISOString();
  const summary = summarizeSaveDatabase(validated, savedAt);
  const envelope: StoredDecodedSaveEnvelope = {
    saveId: validated.source.saveId,
    savedAt,
    database: validated
  };
  const db = await openSaveDb();
  try {
    const tx = db.transaction([STORE_SUMMARIES, STORE_RECORDS], 'readwrite');
    const summaryStore = tx.objectStore(STORE_SUMMARIES);
    const recordStore = tx.objectStore(STORE_RECORDS);
    const existing = (await readRequest<unknown[]>(summaryStore.getAll())).filter(isDecodedSaveDatabaseSummary);
    const others = existing
      .filter(item => item.saveId !== summary.saveId)
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));

    if (others.length >= MAX_SAVED_DECODED_DATABASES) {
      if (options.evictOldest !== true) {
        tx.abort();
        throw new SaveDatabaseCapacityError(MAX_SAVED_DECODED_DATABASES);
      }
      for (const stale of others.slice(MAX_SAVED_DECODED_DATABASES - 1)) {
        summaryStore.delete(stale.saveId);
        recordStore.delete(stale.saveId);
      }
    }

    summaryStore.put(summary);
    recordStore.put(envelope);
    await transactionCompleted(tx);
    return summary;
  } finally {
    db.close();
  }
}

export async function deleteDecodedSaveDatabase(saveId: string): Promise<void> {
  const db = await openSaveDb();
  try {
    const tx = db.transaction([STORE_SUMMARIES, STORE_RECORDS], 'readwrite');
    tx.objectStore(STORE_SUMMARIES).delete(saveId);
    tx.objectStore(STORE_RECORDS).delete(saveId);
    await transactionCompleted(tx);
  } finally {
    db.close();
  }
}

export async function clearDecodedSaveDatabases(): Promise<void> {
  const db = await openSaveDb();
  try {
    const tx = db.transaction([STORE_SUMMARIES, STORE_RECORDS], 'readwrite');
    tx.objectStore(STORE_SUMMARIES).clear();
    tx.objectStore(STORE_RECORDS).clear();
    await transactionCompleted(tx);
  } finally {
    db.close();
  }
}
