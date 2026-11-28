import {
  validateDecodedSaveDatabase,
  type DecodedSaveDatabase,
  type FM2013DecodeProgress
} from '@managerhub/domain/fm2013-offline';
import { isSaveInspectionResult, type SaveInspectionResult } from '@managerhub/domain/save-library';

const DECODE_TIMEOUT_MS = 90_000;
const DECODE_STAGES = new Set<FM2013DecodeProgress['stage']>([
  'hashing', 'reading_container', 'decrypting_database', 'parsing_tables', 'indexing_database'
]);

export interface SaveDecodeWorkerResult {
  readonly inspection: SaveInspectionResult;
  readonly database: DecodedSaveDatabase | null;
  readonly decodeNotice: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function isDecodeProgress(value: unknown): value is FM2013DecodeProgress {
  return isRecord(value) &&
    (hasExactKeys(value, ['stage', 'percent']) || hasExactKeys(value, ['stage', 'percent', 'detail'])) &&
    typeof value.stage === 'string' && DECODE_STAGES.has(value.stage as FM2013DecodeProgress['stage']) &&
    typeof value.percent === 'number' && Number.isFinite(value.percent) && value.percent >= 0 && value.percent <= 100 &&
    (value.detail === undefined || (typeof value.detail === 'string' && value.detail.length <= 1024));
}

/** Run offline decoding and fallback inspection in a bounded, cancellable worker. */
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
      const invalidReply = () => finish(new Error('Background save inspection returned an invalid result.'));
      if (data.kind === 'progress') {
        if (!hasExactKeys(data, ['kind', 'progress']) || !isDecodeProgress(data.progress)) {
          invalidReply();
          return;
        }
        onProgress?.(data.progress);
        return;
      }
      if (data.kind !== 'done' || typeof data.ok !== 'boolean') {
        invalidReply();
        return;
      }
      if (data.ok === false) {
        if (!hasExactKeys(data, ['kind', 'ok', 'error']) ||
            typeof data.error !== 'string' || data.error.length === 0 || data.error.length > 1024) {
          invalidReply();
        } else {
          finish(new Error(data.error));
        }
        return;
      }
      const inspection = data.inspection;
      if (!hasExactKeys(data, ['kind', 'ok', 'inspection', 'database', 'decodeNotice']) ||
          !isSaveInspectionResult(inspection) ||
          inspection.name !== file.name || inspection.size !== file.size ||
          inspection.lastModified !== file.lastModified ||
          !(data.decodeNotice === null || (typeof data.decodeNotice === 'string' && data.decodeNotice.length <= 1024))) {
        invalidReply();
        return;
      }
      let database: DecodedSaveDatabase | null;
      if (data.database === null) {
        if (inspection.support === 'decoded') {
          invalidReply();
          return;
        }
        database = null;
      } else {
        try {
          if (inspection.support !== 'decoded' || inspection.sha256 === null || data.decodeNotice !== null) {
            invalidReply();
            return;
          }
          const validated = validateDecodedSaveDatabase(data.database, inspection.sha256);
          const source = validated.source;
          if (source.fileName !== inspection.name || source.fileSize !== inspection.size ||
              source.lastModified !== inspection.lastModified || source.signature !== inspection.signature ||
              source.family !== inspection.detectedFamily || source.edition !== inspection.edition ||
              source.build !== inspection.build) {
            invalidReply();
            return;
          }
          database = validated;
        } catch {
          invalidReply();
          return;
        }
      }
      finish(undefined, {
        inspection,
        database,
        decodeNotice: data.decodeNotice
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
