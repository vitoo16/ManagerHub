import { inspectSave } from '@managerhub/domain';
import { isSaveInspectionResult } from '@managerhub/domain/save-library';
import type { SaveIdentity } from '@managerhub/domain';

interface Request { readonly file: File; }
type Response = { readonly ok: true; readonly result: SaveIdentity }
  | { readonly ok: false; readonly error: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: Response) => void;
};

workerScope.onmessage = async event => {
  try {
    const result = await inspectSave(event.data.file);
    if (!isSaveInspectionResult(result)) {
      throw new Error('Background save inspection returned an invalid result.');
    }
    workerScope.postMessage({ ok: true, result });
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to inspect this save file.'
    });
  }
};
