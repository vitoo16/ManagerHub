import {
  MAX_HISTORICAL_SNAPSHOTS, alignEditorToSavedRealism, isHistoricalSnapshotRecord, isHistoricalSnapshotSummary, parseHistoricalSnapshotRecord,
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
  | { readonly status: 'duplicate'; readonly summary: HistoricalSnapshotSummary }
  | { readonly status: 'upgraded'; readonly summary: HistoricalSnapshotSummary };

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
    const validRows = rows.filter(isHistoricalSnapshotSummary);
    if (validRows.length !== rows.length || validRows.some(row => row.mode !== mode)) {
      throw new Error('Saved historical snapshot metadata is incompatible with this version.');
    }
    return validRows.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  } finally { db.close(); }
}

export async function getHistoricalSnapshot(id: string, mode: HistoricalSnapshotMode): Promise<HistoricalSnapshotRecord> {
  if (!id) throw new Error('A historical snapshot ID is required.');
  const names = storeNames(mode);
  const db = await openDatabase();
  try {
    const tx = db.transaction(names.data, 'readonly');
    const value: unknown = await readRequest(tx.objectStore(names.data).get(id));
    const record = parseHistoricalSnapshotRecord(value);
    if (record.mode !== mode || record.id !== id) {
      throw new Error('This historical snapshot is missing, damaged or incompatible. Reimport the source capture.');
    }
    return record;
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
    const abort = async () => { tx.abort(); await completed.catch(() => undefined); };
    const duplicates = new Map<HistoricalSnapshotMode, HistoricalSnapshotSummary>();
    for (const record of records) {
      const summaryStore = tx.objectStore(storeNames(record.mode).summaries);
      const found: unknown = await readRequest(summaryStore.index('bySourceSha256').get(record.sourceSha256));
      if (found === undefined) continue;
      if (!isHistoricalSnapshotSummary(found) || found.mode !== record.mode || found.sourceSha256 !== record.sourceSha256) {
        await abort();
        throw new Error('Saved historical snapshot metadata is incompatible with this version.');
      }
      duplicates.set(record.mode, found);
    }

    // Duplicate in the requested visibility mode: do not allocate, overwrite or change metadata.
    const primaryDuplicate = duplicates.get(primaryMode);
    if (primaryDuplicate) {
      await abort();
      return { status: 'duplicate', summary: primaryDuplicate };
    }

    let toWrite = records;
    let upgraded = false;
    const existingRealismSummary = duplicates.get('realism');
    if (editor && existingRealismSummary) {
      // Reimporting Editor for a previously saved Realism-only source adds the missing
      // projection under the existing snapshot ID. The stored Realism bytes are untouched.
      const existingValue: unknown = await readRequest(
        tx.objectStore(HISTORICAL_REALISM_SNAPSHOTS).get(existingRealismSummary.id)
      );
      if (!isHistoricalSnapshotRecord(existingValue) || existingValue.mode !== 'realism') {
        await abort();
        throw new Error('Saved historical snapshot metadata is incompatible with this version.');
      }
      const stored = parseHistoricalSnapshotRecord(existingValue);
      const summary = toHistoricalSnapshotSummary(stored);
      if (summary.id !== existingRealismSummary.id || summary.sourceSha256 !== existingRealismSummary.sourceSha256 ||
          summary.fileName !== existingRealismSummary.fileName || summary.sourceSize !== existingRealismSummary.sourceSize ||
          summary.importedAt !== existingRealismSummary.importedAt ||
          summary.capturedAt !== existingRealismSummary.capturedAt ||
          summary.careerLabel !== existingRealismSummary.careerLabel ||
          summary.status !== existingRealismSummary.status || summary.playerCount !== existingRealismSummary.playerCount ||
          summary.coverageCount !== existingRealismSummary.coverageCount) {
        await abort();
        throw new Error('Saved historical snapshot metadata is incompatible with this version.');
      }
      toWrite = [alignEditorToSavedRealism(editor, stored)];
      upgraded = true;
    }

    // Capacity applies only to new projections, never to the already present Realism copy.
    for (const record of toWrite) {
      const count = await readRequest<number>(tx.objectStore(storeNames(record.mode).summaries).count());
      if (count >= MAX_HISTORICAL_SNAPSHOTS) {
        await abort();
        throw new Error('This browser already holds 10 historical snapshots in this mode. Delete one before importing another.');
      }
    }
    for (const record of toWrite) {
      const namesForMode = storeNames(record.mode);
      tx.objectStore(namesForMode.data).add(record);
      tx.objectStore(namesForMode.summaries).add(toHistoricalSnapshotSummary(record));
    }
    await completed;
    const primary = toWrite.find(record => record.mode === primaryMode);
    if (!primary) throw new Error('The requested historical snapshot mode is missing.');
    return { status: upgraded ? 'upgraded' : 'saved', summary: toHistoricalSnapshotSummary(primary) };
  } catch (cause) {
    if (cause instanceof Error && /10 historical snapshots|incompatible with this version|failed local-storage validation|must be saved with|do not belong|requested historical snapshot mode|Existing Realism capture is incompatible/.test(cause.message)) throw cause;
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
