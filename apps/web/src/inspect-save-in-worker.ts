import type { SaveIdentity } from '@managerhub/domain';
import { isSaveInspectionResult } from '@managerhub/domain/save-library';

const INSPECTION_TIMEOUT_MS = 45_000;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Untrusted .fm inspections stay in a bounded Web Worker. A stalled, aborted or
 * malformed result never becomes application state, even after a later import.
 */
export async function inspectSaveInWorker(file: File, signal?: AbortSignal): Promise<SaveIdentity> {
  if (signal?.aborted) throw new DOMException('Save inspection cancelled.', 'AbortError');
  if (typeof Worker === 'undefined') {
    throw new Error('Background save inspection requires Web Workers.');
  }

  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./workers/save-inspection.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      reject(new Error('Unable to start background save inspection.'));
      return;
    }
    let settled = false;
    const abort = () => finish(new DOMException('Save inspection cancelled.', 'AbortError'));
    const timer = setTimeout(
      () => finish(new Error('Background save inspection exceeded 45 seconds.')),
      INSPECTION_TIMEOUT_MS
    );
    const finish = (cause?: Error, result?: SaveIdentity) => {
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
      if (!record(data) || Object.keys(data).length !== 2 ||
          typeof data.ok !== 'boolean') {
        finish(new Error('Background save inspection returned an invalid result.'));
        return;
      }
      if (data.ok === false) {
        if (typeof data.error !== 'string' || data.error.length === 0 ||
            data.error.length > 1024 || !Object.prototype.hasOwnProperty.call(data, 'error')) {
          finish(new Error('Background save inspection returned an invalid result.'));
        } else {
          finish(new Error(data.error));
        }
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(data, 'result') ||
          !isSaveInspectionResult(data.result) ||
          data.result.name !== file.name || data.result.size !== file.size ||
          data.result.lastModified !== file.lastModified) {
        finish(new Error('Background save inspection returned an invalid result.'));
        return;
      }
      finish(undefined, data.result);
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
