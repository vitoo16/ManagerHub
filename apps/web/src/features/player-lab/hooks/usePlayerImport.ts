import { useCallback, useState, type ChangeEvent } from 'react';
import { parsePlayerExport, parsePlayerHtml, type PlayerDataset } from '@managerhub/domain';
import { readableImportError } from '../../../i18n/player-import-copy';

const MAX_EXPORT_BYTES = 12 * 1024 * 1024;

export function usePlayerImport(onImport: (dataset: PlayerDataset) => void) {
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    try {
      if (!/\.(csv|tsv|txt|html|htm)$/i.test(file.name)) {
        throw new Error('Choose an HTML, CSV, TSV or TXT export with player columns.');
      }
      if (!file.size || file.size > MAX_EXPORT_BYTES) {
        throw new Error('Player export must be between 1 byte and 12 MB.');
      }

      const source = await file.text();
      const parsed = /\.(html|htm)$/i.test(file.name)
        ? parsePlayerHtml(source, file.name)
        : parsePlayerExport(source, file.name);
      onImport(parsed);
    } catch (cause) {
      setError(readableImportError(cause));
    }
  }, [onImport]);

  const clearError = useCallback(() => setError(null), []);
  return { error, onFile, clearError };
}
