import {
  MAX_HISTORICAL_CAPTURE_BYTES, createHistoricalSnapshotRecord, parseFm2013LiveCapture,
  type HistoricalSnapshotMode, type HistoricalSnapshotRecord, type LiveSnapshotContext
} from '@managerhub/domain';

interface ImportRequest {
  readonly file: File;
  readonly snapshotId: string;
  readonly careerId: string;
  readonly capturedAt: string;
  readonly mode: HistoricalSnapshotMode;
}
type ProgressStage = 'reading' | 'hashing' | 'parsing' | 'validating';
type WorkerResponse =
  | { readonly type: 'progress'; readonly stage: ProgressStage }
  | { readonly type: 'success'; readonly record: HistoricalSnapshotRecord; readonly pairedRecord: HistoricalSnapshotRecord | null }
  | { readonly type: 'error'; readonly message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ImportRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function errorMessage(error: unknown): string {
  if (error instanceof TypeError && /UTF-8/u.test(error.message)) return 'The selected file is not valid UTF-8 JSON.';
  if (error instanceof Error && /Historical snapshot source metadata|failed schema validation|record is inconsistent/u.test(error.message)) {
    return 'The capture metadata or normalized snapshot did not pass the historical schema checks.';
  }
  return error instanceof Error ? error.message : 'The selected capture could not be imported.';
}

workerScope.onmessage = async event => {
  try {
    const request = event.data;
    if (!(request.file instanceof File)) throw new TypeError('Choose a local JSON capture file.');
    if (!Number.isSafeInteger(request.file.size) || request.file.size < 1 || request.file.size > MAX_HISTORICAL_CAPTURE_BYTES) {
      throw new RangeError('The capture file must be between 1 byte and 48 MB.');
    }
    if (!request.snapshotId || !request.careerId || !request.capturedAt) {
      throw new TypeError('Enter a career label and the capture time declared by the source workflow.');
    }

    workerScope.postMessage({ type: 'progress', stage: 'reading' });
    const bytes = await request.file.arrayBuffer();
    if (bytes.byteLength !== request.file.size) throw new Error('The selected file changed while it was being read.');
    workerScope.postMessage({ type: 'progress', stage: 'hashing' });
    if (!globalThis.crypto?.subtle) throw new Error('Secure browser hashing is unavailable. Open ManagerHub in a secure browser context.');
    const sourceSha256 = hex(await crypto.subtle.digest('SHA-256', bytes));
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new TypeError('The selected file is not valid UTF-8 JSON.');
    }

    workerScope.postMessage({ type: 'progress', stage: 'parsing' });
    const importedAt = new Date().toISOString();
    const metadata = { fileName: request.file.name, sourceSize: request.file.size, sourceSha256, importedAt };
    const context: Omit<LiveSnapshotContext, 'mode'> = {
      snapshotId: request.snapshotId,
      careerId: request.careerId,
      capturedAt: request.capturedAt
    };
    const parsed = parseFm2013LiveCapture(text, { ...context, mode: request.mode });
    if (parsed.status === 'rejected') throw new Error(parsed.diagnostics.join(' '));
    const record = createHistoricalSnapshotRecord(parsed, metadata);

    let pairedRecord: HistoricalSnapshotRecord | null = null;
    if (request.mode === 'editor') {
      const redacted = parseFm2013LiveCapture(text, { ...context, mode: 'realism' });
      if (redacted.status === 'rejected') throw new Error('The separately redacted Realism projection could not be created.');
      pairedRecord = createHistoricalSnapshotRecord(redacted, metadata);
    }
    workerScope.postMessage({ type: 'progress', stage: 'validating' });
    workerScope.postMessage({ type: 'success', record, pairedRecord });
  } catch (error) {
    workerScope.postMessage({ type: 'error', message: errorMessage(error) });
  }
};
