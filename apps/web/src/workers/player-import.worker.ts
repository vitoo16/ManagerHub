import { parsePlayerExport, type PlayerDataset } from '@managerhub/domain';

interface Request {
  readonly fileName: string;
  readonly buffer: ArrayBuffer;
}
type Response = { readonly ok: true; readonly dataset: PlayerDataset }
  | { readonly ok: false; readonly error: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: Response) => void;
};

workerScope.onmessage = event => {
  try {
    const source = new TextDecoder('utf-8').decode(event.data.buffer);
    const dataset = parsePlayerExport(source, event.data.fileName);
    workerScope.postMessage({ ok: true, dataset });
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to parse this player export.'
    });
  }
};
