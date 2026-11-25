import { inspectSave } from '@managerhub/domain';
import {
  decodeFm2013Save,
  FM2013DecodeError,
  type DecodedSaveDatabase,
  type FM2013DecodeProgress
} from '@managerhub/domain/fm2013-offline';
import { isSaveInspectionResult, type SaveInspectionResult } from '@managerhub/domain/save-library';

interface DecodeRequest {
  readonly file: File;
}

type WorkerMessage =
  | { readonly kind: 'progress'; readonly progress: FM2013DecodeProgress }
  | {
      readonly kind: 'done';
      readonly ok: true;
      readonly inspection: SaveInspectionResult;
      readonly database: DecodedSaveDatabase | null;
      readonly decodeNotice: string | null;
    }
  | { readonly kind: 'done'; readonly ok: false; readonly error: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<DecodeRequest>) => void) | null;
  postMessage: (message: WorkerMessage) => void;
};

workerScope.onmessage = async event => {
  const file = event.data?.file;
  try {
    const inspection = await inspectSave(file);
    if (!isSaveInspectionResult(inspection)) {
      throw new Error('Background save inspection returned an invalid result.');
    }

    // Attempt full offline FM2013 decoding only when an AFE/FMF archive container is detected.
    if (inspection.detectedFamily === 'afe' || inspection.detectedFamily === 'fmf') {
      try {
        const database = await decodeFm2013Save(file, {
          onProgress: progress => workerScope.postMessage({ kind: 'progress', progress })
        });
        const decodedInspection: SaveInspectionResult = {
          ...inspection,
          id: database.source.saveId,
          sha256: database.source.sha256,
          edition: database.source.edition,
          build: database.source.build,
          support: 'decoded',
          warnings: [
            `Decoded offline from FM2013 (${database.source.build}, game_db ${database.source.gameDbVersionHex}) with exact EOF verification. Original .fm file was not modified.`,
            'Tactics, match events, and base lang_db.dat static names (unedited stadiums/competitions/cities) are not stored inside game_db.dat.'
          ]
        };
        if (!isSaveInspectionResult(decodedInspection)) {
          throw new Error('Decoded save metadata failed schema validation.');
        }
        workerScope.postMessage({
          kind: 'done',
          ok: true,
          inspection: decodedInspection,
          database,
          decodeNotice: null
        });
        return;
      } catch (decodeError) {
        // Keep header-only / truncated / unsupported-build inspection honest and non-destructive.
        const reason = decodeError instanceof FM2013DecodeError
          ? decodeError.message
          : 'This .fm save could not be decoded with the verified FM2013 offline adapter.';
        workerScope.postMessage({
          kind: 'done',
          ok: true,
          inspection,
          database: null,
          decodeNotice: reason
        });
        return;
      }
    }

    workerScope.postMessage({
      kind: 'done',
      ok: true,
      inspection,
      database: null,
      decodeNotice: null
    });
  } catch (error) {
    workerScope.postMessage({
      kind: 'done',
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to inspect this save file.'
    });
  }
};
