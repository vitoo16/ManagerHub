import { parseHistoricalSnapshotRecord, type HistoricalSnapshotMode, type HistoricalSnapshotRecord } from '@managerhub/domain';

export type HistoricalImportStage = 'reading' | 'hashing' | 'parsing' | 'validating';
export interface HistoricalImportContext {
  readonly snapshotId: string;
  readonly careerId: string;
  readonly capturedAt: string;
}
interface WorkerRequest extends HistoricalImportContext {
  readonly file: File;
  readonly mode: HistoricalSnapshotMode;
}
export interface HistoricalImportResult {
  readonly record: HistoricalSnapshotRecord;
  /** Present only for an Editor import; contains the separately redacted Realism projection. */
  readonly pairedRecord: HistoricalSnapshotRecord | null;
}

const IMPORT_TIMEOUT_MS = 45_000;

export function importHistoricalCapture(
  file: File,
  context: HistoricalImportContext,
  mode: HistoricalSnapshotMode,
  onProgress: (stage: HistoricalImportStage) => void,
  signal: AbortSignal
): Promise<HistoricalImportResult> {
  if (typeof Worker === 'undefined') {
    return Promise.reject(new Error('Background workers are unavailable in this browser. The capture was not parsed on the main thread.'));
  }
  if (signal.aborted) return Promise.reject(new DOMException('Import cancelled.', 'AbortError'));

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workers/historical-snapshot.worker.ts', import.meta.url), { type: 'module' });
    let settled = false;
    const timeout = window.setTimeout(() => finish(new Error('Historical capture import exceeded 45 seconds. Try a smaller file.')), IMPORT_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();
    };
    const finish = (error?: Error, result?: HistoricalImportResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new Error('The background importer returned no result.'));
    };
    const abort = () => finish(new DOMException('Import cancelled.', 'AbortError'));

    signal.addEventListener('abort', abort, { once: true });
    // Abort can occur between our initial check and registering the listener.
    if (signal.aborted) { abort(); return; }
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (settled) return;
      const raw = event.data;
      const invalid = () => finish(new Error('The historical capture worker returned a snapshot that failed schema or privacy validation.'));
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) { invalid(); return; }
      const response = raw as Record<string, unknown>;
      const keys = Object.keys(response);
      if (response.type === 'progress' && keys.length === 2 && keys.includes('stage') &&
          (response.stage === 'reading' || response.stage === 'hashing' ||
            response.stage === 'parsing' || response.stage === 'validating')) {
        try { onProgress(response.stage); } catch { invalid(); }
        return;
      }
      if (response.type === 'error' && keys.length === 2 && keys.includes('message') &&
          typeof response.message === 'string' && response.message.length > 0 && response.message.length <= 2000) {
        finish(new Error(response.message));
        return;
      }
      if (response.type !== 'success' || keys.length !== 3 ||
          !keys.includes('record') || !keys.includes('pairedRecord')) {
        invalid();
        return;
      }
      try {
        const record = parseHistoricalSnapshotRecord(response.record);
        if (record.mode !== mode || record.id !== context.snapshotId ||
            record.snapshot.careerId.value !== context.careerId ||
            record.snapshot.capturedAt !== context.capturedAt) {
          throw new Error('The worker returned a snapshot for another import request.');
        }
        let pairedRecord: HistoricalSnapshotRecord | null = null;
        if (response.pairedRecord !== null) {
          pairedRecord = parseHistoricalSnapshotRecord(response.pairedRecord);
          if (mode !== 'editor' || pairedRecord.mode !== 'realism' || pairedRecord.id !== record.id ||
              pairedRecord.sourceSha256 !== record.sourceSha256 ||
              pairedRecord.sourceSize !== record.sourceSize || pairedRecord.fileName !== record.fileName ||
              pairedRecord.importedAt !== record.importedAt ||
              pairedRecord.snapshot.capturedAt !== record.snapshot.capturedAt ||
              pairedRecord.snapshot.careerId.value !== record.snapshot.careerId.value) {
            throw new Error('The worker returned an invalid Editor/Realism projection pair.');
          }
        }
        if ((mode === 'editor' && pairedRecord === null) ||
            (mode === 'realism' && pairedRecord !== null)) {
          throw new Error('The historical capture worker returned the wrong projection scope.');
        }
        finish(undefined, { record, pairedRecord });
      } catch {
        invalid();
      }
    };
    worker.onerror = () => finish(new Error('The historical capture worker failed. The source file was not changed.'));
    worker.onmessageerror = () => finish(new Error('The historical capture worker returned an unreadable response.'));
    try {
      const request: WorkerRequest = { file, ...context, mode };
      worker.postMessage(request);
    } catch {
      finish(new Error('Unable to start the historical capture worker.'));
    }
  });
}
