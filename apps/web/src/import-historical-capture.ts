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
type WorkerResponse =
  | { readonly type: 'progress'; readonly stage: HistoricalImportStage }
  | { readonly type: 'success'; readonly record: unknown; readonly pairedRecord: unknown }
  | { readonly type: 'error'; readonly message: string };

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
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === 'progress') {
        onProgress(response.stage);
      } else if (response.type === 'error') {
        finish(new Error(response.message));
      } else {
        try {
          const record = parseHistoricalSnapshotRecord(response.record);
          if (record.mode !== mode) throw new Error('The worker returned a snapshot for a different visibility mode.');
          let pairedRecord: HistoricalSnapshotRecord | null = null;
          if (response.pairedRecord !== null) {
            pairedRecord = parseHistoricalSnapshotRecord(response.pairedRecord);
            if (mode !== 'editor' || pairedRecord.mode !== 'realism' || pairedRecord.id !== record.id ||
                pairedRecord.sourceSha256 !== record.sourceSha256) {
              throw new Error('The worker returned an invalid Editor/Realism projection pair.');
            }
          }
          if (mode === 'editor' && pairedRecord === null) {
            throw new Error('The separately redacted Realism projection is missing.');
          }
          if (mode === 'realism' && pairedRecord !== null) {
            throw new Error('A Realism-only import must not include an Editor projection.');
          }
          finish(undefined, { record, pairedRecord });
        } catch {
          finish(new Error('The historical capture worker returned a snapshot that failed schema or privacy validation.'));
        }
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
