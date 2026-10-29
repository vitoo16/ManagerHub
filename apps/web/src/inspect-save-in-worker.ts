import { inspectSave } from '@managerhub/domain';
import type { SaveIdentity } from '@managerhub/domain';

type WorkerResponse =
  | { readonly ok: true; readonly result: SaveIdentity }
  | { readonly ok: false; readonly error: string };

/**
 * Hashing and archive-index inspection can read tens of megabytes. Run this
 * read-only work off the UI thread so navigation and controls stay responsive.
 */
export function inspectSaveInWorker(file: File): Promise<SaveIdentity> {
  if (typeof Worker === 'undefined') return inspectSave(file);

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workers/save-inspection.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      cleanup();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('Background save inspection failed. Please try the file again.'));
    };
    try {
      worker.postMessage({ file });
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error('Unable to start background save inspection.'));
    }
  });
}
