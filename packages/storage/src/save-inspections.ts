import { MAX_SAVED_SAVE_INSPECTIONS, isSaveIdentity } from '@managerhub/domain/save-library';
import type { SaveIdentity } from '@managerhub/domain/types';
import { SAVE_INSPECTIONS, openDatabase, readRequest, transactionCompleted } from './database';

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
