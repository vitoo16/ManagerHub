import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlayerDataset, SavedPlayerExportSummary } from '@managerhub/domain';
import {
  deleteSavedPlayerExport, getSavedPlayerExport,
  listSavedPlayerExports, savePlayerExport
} from '@managerhub/storage';

type Activity = 'saving' | 'opening' | 'deleting' | null;

/** IndexedDB is opt-in: importing a player file never persists anything automatically. */
export function usePlayerLibrary() {
  const [items, setItems] = useState<SavedPlayerExportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const results = await listSavedPlayerExports();
    setItems(results);
  }, []);

  useEffect(() => {
    let active = true;
    listSavedPlayerExports().then(results => {
      if (active) setItems(results);
    }).catch(cause => {
      if (active) setError(message(cause));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (dataset: PlayerDataset): Promise<boolean> => {
    setActivity('saving');
    setError(null);
    try {
      await savePlayerExport(dataset);
      await reload();
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const open = useCallback(async (id: string): Promise<PlayerDataset | null> => {
    setActivity('opening');
    setError(null);
    try {
      return (await getSavedPlayerExport(id)).dataset;
    } catch (cause) {
      setError(message(cause));
      return null;
    } finally {
      setActivity(null);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setActivity('deleting');
    setError(null);
    try {
      await deleteSavedPlayerExport(id);
      await reload();
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(() => ({
    items, loading, activity, error, clearError, save, open, remove
  }), [items, loading, activity, error, clearError, save, open, remove]);
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'The browser could not access its local library.';
}
