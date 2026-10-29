import { parsePlayerExport, parsePlayerHtml, type PlayerDataset } from '@managerhub/domain';

type WorkerResponse =
  | { readonly ok: true; readonly dataset: PlayerDataset }
  | { readonly ok: false; readonly error: string };

/**
 * CSV/TSV tokenization and normalization can process up to 20,000 rows. Transfer
 * its bytes to a worker rather than blocking React's main thread. HTML stays on
 * the main thread because the trusted parser intentionally uses DOMParser.
 */
export async function parsePlayerFile(file: File): Promise<PlayerDataset> {
  const isHtml = /\.(html|htm)$/i.test(file.name);
  if (isHtml || typeof Worker === 'undefined') {
    const source = await file.text();
    return isHtml ? parsePlayerHtml(source, file.name) : parsePlayerExport(source, file.name);
  }

  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workers/player-import.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      cleanup();
      if (event.data.ok) resolve(event.data.dataset);
      else reject(new Error(event.data.error));
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('Background player import failed. Please try the export again.'));
    };
    try {
      worker.postMessage({ fileName: file.name, buffer }, [buffer]);
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error('Unable to start background player import.'));
    }
  });
}
