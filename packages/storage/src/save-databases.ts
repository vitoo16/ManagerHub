import {
  DECODED_SAVE_DB_SCHEMA_VERSION,
  summarizeSaveDatabase,
  type DecodedSaveDatabase,
  type DecodedSaveDatabaseSummary
} from '@managerhub/domain/fm2013-offline';
import { readRequest, transactionCompleted } from './database';

const SAVE_DB_NAME = 'managerhub-save-db';
const SAVE_DB_VERSION = 1;
const STORE_SUMMARIES = 'save-db-summaries';
const STORE_RECORDS = 'save-db-records';
export const MAX_SAVED_DECODED_DATABASES = 8;

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
  if (!isObject(value)) return false;
  if (value.schemaVersion !== DECODED_SAVE_DB_SCHEMA_VERSION) return false;
  if (typeof value.saveId !== 'string' || !/^[a-f0-9]{64}$/.test(value.saveId)) return false;
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) return false;
  if (!isObject(value.source) || !isObject(value.counts) || !Array.isArray(value.humans)) return false;
  return typeof value.source.fileName === 'string' &&
    value.source.edition === 'FM2013' &&
    value.source.writeCapability === false &&
    typeof value.counts.players === 'number';
}

interface StoredDecodedSaveEnvelope {
  readonly saveId: string;
  readonly savedAt: string;
  readonly database: DecodedSaveDatabase;
}

export function isStoredDecodedSaveEnvelope(value: unknown): value is StoredDecodedSaveEnvelope {
  if (!isObject(value) || typeof value.saveId !== 'string' || !/^[a-f0-9]{64}$/.test(value.saveId)) return false;
  if (!isObject(value.database)) return false;
  const db = value.database;
  return db.schemaVersion === DECODED_SAVE_DB_SCHEMA_VERSION &&
    isObject(db.source) &&
    db.source.saveId === value.saveId &&
    db.source.writeCapability === false &&
    Array.isArray(db.players) &&
    Array.isArray(db.clubs) &&
    Array.isArray(db.staff) &&
    Array.isArray(db.teams) &&
    Array.isArray(db.stadiums) &&
    Array.isArray(db.nations) &&
    Array.isArray(db.competitions);
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
    if (!isStoredDecodedSaveEnvelope(raw)) {
      throw new Error('Stored decoded save record failed schema validation.');
    }
    return raw.database;
  } finally {
    db.close();
  }
}

export async function saveDecodedSaveDatabase(database: DecodedSaveDatabase): Promise<DecodedSaveDatabaseSummary> {
  const savedAt = new Date().toISOString();
  const summary = summarizeSaveDatabase(database, savedAt);
  const envelope: StoredDecodedSaveEnvelope = {
    saveId: database.source.saveId,
    savedAt,
    database
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
    // Enforce bounded storage ceiling by evicting oldest decoded databases beyond capacity.
    for (const stale of others.slice(MAX_SAVED_DECODED_DATABASES - 1)) {
      summaryStore.delete(stale.saveId);
      recordStore.delete(stale.saveId);
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
