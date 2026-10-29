import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SaveIdentity } from '@managerhub/domain';
import {
  deleteSavedSaveInspectionMetadata, listSavedSaveInspections, saveSaveInspectionMetadata
} from '@managerhub/storage/save-inspections';

type Activity = 'saving' | 'deleting' | null;

/** Save metadata is persisted only after an explicit user action; the .fm bytes are never stored. */
export function useSaveInspectionLibrary() {
  const [items, setItems] = useState<SaveIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const records = await listSavedSaveInspections();
    setItems(records);
  }, []);

  useEffect(() => {
    let active = true;
    listSavedSaveInspections().then(records => {
      if (active) setItems(records);
    }).catch(cause => {
      if (active) setError(toSaveLibraryError(cause));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (identity: SaveIdentity): Promise<boolean> => {
    setActivity('saving');
    setError(null);
    try {
      await saveSaveInspectionMetadata(identity);
      await reload();
      return true;
    } catch (cause) {
      setError(toSaveLibraryError(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setActivity('deleting');
    setError(null);
    try {
      await deleteSavedSaveInspectionMetadata(id);
      await reload();
      return true;
    } catch (cause) {
      setError(toSaveLibraryError(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(() => ({
    items, loading, activity, error, clearError, save, remove
  }), [items, loading, activity, error, clearError, save, remove]);
}

function toSaveLibraryError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : '';
  if (/already holds 50 saved save inspections/.test(message)) {
    return 'This browser already holds 50 saved save inspections. Delete one first.';
  }
  if (/not compatible with this version/.test(message)) {
    return 'Saved save inspection metadata is incompatible with this version. Remove the incompatible local data before trying again.';
  }
  if (/Unable to remove saved inspection metadata/.test(message)) {
    return 'Unable to remove saved inspection metadata. Check browser storage permissions and try again.';
  }
  if (/Unable to save inspection metadata/.test(message)) {
    return 'Unable to save inspection metadata locally. Check browser storage permissions and available disk space.';
  }
  return 'Could not access saved save metadata. Your original save remains untouched.';
}
