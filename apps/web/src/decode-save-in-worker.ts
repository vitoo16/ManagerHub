import type { DecodedSaveDatabase, FM2013DecodeProgress } from '@managerhub/domain/fm2013-offline';
import type { SaveInspectionResult } from '@managerhub/domain/save-library';

const DECODE_TIMEOUT_MS = 90_000;

export interface SaveDecodeWorkerResult {
  readonly inspection: SaveInspectionResult;
  readonly database: DecodedSaveDatabase | null;
  readonly decodeNotice: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Run complete offline FM2013 .fm save decoding and fallback inspection in a
 * bounded Web Worker. Cancellation immediately terminates the worker so stale
 * results can never overwrite active application state.
 */
export async function decodeSaveInWorker(
  file: File,
  options: {
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: FM2013DecodeProgress) => void;
  } = {}
): Promise<SaveDecodeWorkerResult> {
  const { signal, onProgress } = options;
  if (signal?.aborted) throw new DOMException('Save decoding cancelled.', 'AbortError');
  if (typeof Worker === 'undefined') {
    throw new Error('Background save inspection requires Web Workers.');
  }

  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./workers/save-decode.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      reject(new Error('Unable to start background save inspection.'));
      return;
    }

    let settled = false;
    const abort = () => finish(new DOMException('Save decoding cancelled.', 'AbortError'));
    const timer = setTimeout(
      () => finish(new Error('Background save inspection exceeded 90 seconds.')),
      DECODE_TIMEOUT_MS
    );

    const finish = (cause?: Error, result?: SaveDecodeWorkerResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      if (cause) reject(cause);
      else if (result) resolve(result);
      else reject(new Error('Background save inspection returned an invalid result.'));
    };

    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }

    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (settled) return;
      const data = event.data;
      if (!isRecord(data) || typeof data.kind !== 'string') {
        finish(new Error('Background save inspection returned an invalid result.'));
        return;
      }
      if (data.kind === 'progress') {
        if (isRecord(data.progress) && typeof data.progress.stage === 'string' && typeof data.progress.percent === 'number') {
          onProgress?.(data.progress as unknown as FM2013DecodeProgress);
        }
        return;
      }
      if (data.kind !== 'done' || typeof data.ok !== 'boolean') {
        finish(new Error('Background save inspection returned an invalid result.'));
        return;
      }
      if (data.ok === false) {
        const message = typeof data.error === 'string' && data.error.length > 0 && data.error.length <= 1024
          ? data.error
          : 'Background save inspection returned an invalid result.';
        finish(new Error(message));
        return;
      }
      const inspection = data.inspection;
      if (!isRecord(inspection) ||
          inspection.name !== file.name ||
          inspection.size !== file.size ||
          inspection.lastModified !== file.lastModified) {
        finish(new Error('Background save inspection returned an invalid result.'));
        return;
      }
      const database = data.database === null
        ? null
        : isRecord(data.database) && isRecord(data.database.source) && data.database.source.fileName === file.name
          ? (data.database as unknown as DecodedSaveDatabase)
          : undefined;
      if (database === undefined) {
        finish(new Error('Background save inspection returned an invalid result.'));
        return;
      }
      const decodeNotice = typeof data.decodeNotice === 'string' ? data.decodeNotice : null;
      finish(undefined, {
        inspection: inspection as unknown as SaveInspectionResult,
        database,
        decodeNotice
      });
    };

    worker.onerror = () => finish(new Error('Background save inspection failed. Please try the file again.'));
    worker.onmessageerror = () => finish(new Error('Background save inspection returned an invalid result.'));

    try {
      worker.postMessage({ file });
    } catch {
      finish(new Error('Unable to start background save inspection.'));
    }
  });
}
