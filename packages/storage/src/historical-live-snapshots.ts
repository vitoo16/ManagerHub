import {
  MAX_HISTORICAL_SNAPSHOTS, isHistoricalSnapshotRecord, isHistoricalSnapshotSummary,
  toHistoricalSnapshotSummary, type HistoricalSnapshotMode, type HistoricalSnapshotRecord,
  type HistoricalSnapshotSummary
} from '@managerhub/domain';
import {
  HISTORICAL_EDITOR_SNAPSHOTS, HISTORICAL_EDITOR_SUMMARIES,
  HISTORICAL_REALISM_SNAPSHOTS, HISTORICAL_REALISM_SUMMARIES,
  openDatabase, readRequest, transactionCompleted
} from './database';

export type HistoricalSnapshotSaveResult =
  | { readonly status: 'saved'; readonly summary: HistoricalSnapshotSummary }
  | { readonly status: 'duplicate'; readonly summary: HistoricalSnapshotSummary };

function storeNames(mode: HistoricalSnapshotMode): { data: string; summaries: string } {
  return mode === 'editor'
    ? { data: HISTORICAL_EDITOR_SNAPSHOTS, summaries: HISTORICAL_EDITOR_SUMMARIES }
    : { data: HISTORICAL_REALISM_SNAPSHOTS, summaries: HISTORICAL_REALISM_SUMMARIES };
}

export async function listHistoricalSnapshotSummaries(mode: HistoricalSnapshotMode): Promise<HistoricalSnapshotSummary[]> {
  const names = storeNames(mode);
  const db = await openDatabase();
  try {
    const tx = db.transaction(names.summaries, 'readonly');
    const rows = await readRequest<unknown[]>(tx.objectStore(names.summaries).getAll());
    if (!rows.every(isHistoricalSnapshotSummary) || rows.some(row => row.mode !== mode)) {
      throw new Error('Saved historical snapshot metadata is incompatible with this version.');
    }
    return [...rows].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  } finally { db.close(); }
}

export async function getHistoricalSnapshot(id: string, mode: HistoricalSnapshotMode): Promise<HistoricalSnapshotRecord> {
  if (!id) throw new Error('A historical snapshot ID is required.');
  const names = storeNames(mode);
  const db = await openDatabase();
  try {
    const tx = db.transaction(names.data, 'readonly');
    const value: unknown = await readRequest(tx.objectStore(names.data).get(id));
    if (!isHistoricalSnapshotRecord(value) || value.mode !== mode || value.id !== id) {
      throw new Error('This historical snapshot is missing, damaged or incompatible. Reimport the source capture.');
    }
    return value;
  } finally { db.close(); }
}

async function saveRecords(records: readonly HistoricalSnapshotRecord[], primaryMode: HistoricalSnapshotMode): Promise<HistoricalSnapshotSaveResult> {
  if (!records.length || records.some(record => !isHistoricalSnapshotRecord(record))) {
    throw new Error('The historical snapshot failed local-storage validation.');
  }
  if (records.some(record => record.mode === 'editor') && records.length !== 2) {
    throw new Error('Editor snapshots must be saved with their separately redacted Realism projection.');
  }
  const editor = records.find(record => record.mode === 'editor');
  const realism = records.find(record => record.mode === 'realism');
  if (editor && realism && (editor.id !== realism.id || editor.sourceSha256 !== realism.sourceSha256 ||
      editor.fileName !== realism.fileName || editor.sourceSize !== realism.sourceSize || editor.importedAt !== realism.importedAt)) {
    throw new Error('Editor and Realism projections do not belong to the same source capture.');
  }

  const names = [
    HISTORICAL_EDITOR_SNAPSHOTS, HISTORICAL_EDITOR_SUMMARIES,
    HISTORICAL_REALISM_SNAPSHOTS, HISTORICAL_REALISM_SUMMARIES
  ];
  const db = await openDatabase();
  try {
    const tx = db.transaction(names, 'readwrite');
    const completed = transactionCompleted(tx);
    const duplicateSummaries: HistoricalSnapshotSummary[] = [];
    for (const record of records) {
      const store = tx.objectStore(storeNames(record.mode).summaries);
      const duplicate: unknown = await readRequest(store.index('bySourceSha256').get(record.sourceSha256));
      if (duplicate !== undefined) {
        if (!isHistoricalSnapshotSummary(duplicate)) {
          tx.abort();
          await completed.catch(() => undefined);
          throw new Error('Saved historical snapshot metadata is incompatible with this version.');
        }
        duplicateSummaries.push(duplicate);
      }
      const count = await readRequest<number>(store.count());
      if (count >= MAX_HISTORICAL_SNAPSHOTS) {
        tx.abort();
        await completed.catch(() => undefined);
        throw new Error('This browser already holds 10 historical snapshots in this mode. Delete one before importing another.');
      }
    }
    if (duplicateSummaries.length) {
      tx.abort();
      await completed.catch(() => undefined);
      const existing = duplicateSummaries.find(summary => summary.mode === primaryMode) ?? duplicateSummaries[0];
      if (!existing) throw new Error('A duplicate capture was found but its summary is unavailable.');
      return { status: 'duplicate', summary: existing };
    }
    for (const record of records) {
      const namesForMode = storeNames(record.mode);
      tx.objectStore(namesForMode.data).add(record);
      tx.objectStore(namesForMode.summaries).add(toHistoricalSnapshotSummary(record));
    }
    await completed;
    const primary = records.find(record => record.mode === primaryMode);
    if (!primary) throw new Error('The requested historical snapshot mode is missing.');
    return { status: 'saved', summary: toHistoricalSnapshotSummary(primary) };
  } catch (cause) {
    if (cause instanceof Error && /10 historical snapshots|incompatible with this version|failed local-storage validation|must be saved with|do not belong|requested historical snapshot mode|duplicate capture/.test(cause.message)) throw cause;
    if (cause instanceof DOMException && cause.name === 'QuotaExceededError') {
      throw new Error('Browser storage is full. Remove an older historical snapshot or free local storage space, then try again.');
    }
    throw new Error('Unable to save this historical snapshot locally. The source capture was not changed. Check browser storage permissions and available disk space.');
  } finally { db.close(); }
}

/** Realism imports persist only the redacted projection. */
export async function saveRealismHistoricalSnapshot(record: HistoricalSnapshotRecord): Promise<HistoricalSnapshotSaveResult> {
  if (record.mode !== 'realism') throw new Error('Only a Realism projection can be saved through this operation.');
  return saveRecords([record], 'realism');
}

/** Editor imports persist Editor and Realism projections atomically in separate object stores. */
export async function saveEditorHistoricalSnapshotPair(
  editor: HistoricalSnapshotRecord, realism: HistoricalSnapshotRecord
): Promise<HistoricalSnapshotSaveResult> {
  if (editor.mode !== 'editor' || realism.mode !== 'realism') {
    throw new Error('The paired historical snapshots must contain Editor and Realism projections.');
  }
  return saveRecords([editor, realism], 'editor');
}

export async function deleteHistoricalSnapshot(id: string): Promise<void> {
  if (!id) throw new Error('A historical snapshot ID is required.');
  const db = await openDatabase();
  try {
    const names = [
      HISTORICAL_EDITOR_SNAPSHOTS, HISTORICAL_EDITOR_SUMMARIES,
      HISTORICAL_REALISM_SNAPSHOTS, HISTORICAL_REALISM_SUMMARIES
    ];
    const tx = db.transaction(names, 'readwrite');
    const completed = transactionCompleted(tx);
    for (const name of names) tx.objectStore(name).delete(id);
    await completed;
  } catch {
    throw new Error('Unable to remove this historical snapshot from local storage.');
  } finally { db.close(); }
}

/** Explicit recovery action; clears only historical snapshot stores, never Player Lab or Save Library data. */
export async function clearHistoricalSnapshotLibrary(): Promise<void> {
  const db = await openDatabase();
  try {
    const names = [
      HISTORICAL_EDITOR_SNAPSHOTS, HISTORICAL_EDITOR_SUMMARIES,
      HISTORICAL_REALISM_SNAPSHOTS, HISTORICAL_REALISM_SUMMARIES
    ];
    const tx = db.transaction(names, 'readwrite');
    const completed = transactionCompleted(tx);
    for (const name of names) tx.objectStore(name).clear();
    await completed;
  } catch {
    throw new Error('Unable to clear the incompatible historical snapshot library.');
  } finally { db.close(); }
}
