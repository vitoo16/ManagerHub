import { useCallback, useEffect, useState } from 'react';
import type { DecodedSaveDatabase, DecodedSaveDatabaseSummary } from '@managerhub/domain/fm2013-offline';
import {
  deleteDecodedSaveDatabase,
  getDecodedSaveDatabase,
  listDecodedSaveSummaries,
  saveDecodedSaveDatabase
} from '@managerhub/storage/save-databases';

export type DecodedSaveLibraryActivity = 'saving' | 'opening' | 'deleting' | null;

export function useDecodedSaveLibrary() {
  const [items, setItems] = useState<DecodedSaveDatabaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<DecodedSaveLibraryActivity>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const summaries = await listDecodedSaveSummaries();
      setItems(summaries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read saved decoded databases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (database: DecodedSaveDatabase): Promise<DecodedSaveDatabaseSummary | null> => {
    setActivity('saving');
    setError(null);
    try {
      const summary = await saveDecodedSaveDatabase(database);
      setItems(prev => [summary, ...prev.filter(item => item.saveId !== summary.saveId)]);
      return summary;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this decoded database locally.');
      return null;
    } finally {
      setActivity(null);
    }
  }, []);

  const open = useCallback(async (saveId: string): Promise<DecodedSaveDatabase | null> => {
    setActivity('opening');
    setError(null);
    try {
      return await getDecodedSaveDatabase(saveId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open this saved decoded database.');
      return null;
    } finally {
      setActivity(null);
    }
  }, []);

  const remove = useCallback(async (saveId: string): Promise<boolean> => {
    setActivity('deleting');
    setError(null);
    try {
      await deleteDecodedSaveDatabase(saveId);
      setItems(prev => prev.filter(item => item.saveId !== saveId));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove this saved decoded database.');
      return false;
    } finally {
      setActivity(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { items, loading, activity, error, save, open, remove, clearError };
}
