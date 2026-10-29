import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SaveIdentity } from '@managerhub/domain';
import {
  clearSavedSaveInspectionMetadata, deleteSavedSaveInspectionMetadata,
  listSavedSaveInspections, saveSaveInspectionMetadata
} from '@managerhub/storage/save-inspections';

type Activity = 'saving' | 'deleting' | null;

/** Save metadata is persisted only after an explicit user action; the .fm bytes are never stored. */
export function useSaveInspectionLibrary() {
  const [items, setItems] = useState<SaveIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity>(null);
  const [error, setError] = useState<string | null>(null);
  const [canClearIncompatible, setCanClearIncompatible] = useState(false);

  const reload = useCallback(async () => {
    const records = await listSavedSaveInspections();
    setItems(records);
  }, []);

  useEffect(() => {
    let active = true;
    listSavedSaveInspections().then(records => {
      if (active) setItems(records);
    }).catch(cause => {
      if (active) {
        setError(toSaveLibraryError(cause));
        setCanClearIncompatible(isIncompatibleMetadataError(cause));
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (identity: SaveIdentity): Promise<boolean> => {
    setActivity('saving');
    setError(null);
    setCanClearIncompatible(false);
    try {
      await saveSaveInspectionMetadata(identity);
      await reload();
      return true;
    } catch (cause) {
      setError(toSaveLibraryError(cause));
      setCanClearIncompatible(isIncompatibleMetadataError(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setActivity('deleting');
    setError(null);
    setCanClearIncompatible(false);
    try {
      await deleteSavedSaveInspectionMetadata(id);
      await reload();
      return true;
    } catch (cause) {
      setError(toSaveLibraryError(cause));
      setCanClearIncompatible(isIncompatibleMetadataError(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const clearIncompatible = useCallback(async (): Promise<boolean> => {
    setActivity('deleting');
    setError(null);
    setCanClearIncompatible(false);
    try {
      await clearSavedSaveInspectionMetadata();
      await reload();
      return true;
    } catch (cause) {
      setError(toSaveLibraryError(cause));
      setCanClearIncompatible(isIncompatibleMetadataError(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const clearError = useCallback(() => {
    setError(null);
    setCanClearIncompatible(false);
  }, []);

  return useMemo(() => ({
    items, loading, activity, error, canClearIncompatible, clearIncompatible,
    clearError, save, remove
  }), [items, loading, activity, error, canClearIncompatible, clearIncompatible, clearError, save, remove]);
}

function isIncompatibleMetadataError(cause: unknown): boolean {
  return cause instanceof Error && /not compatible with this version/.test(cause.message);
}

function toSaveLibraryError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : '';
  if (/already holds 50 saved save inspections/.test(message)) {
    return 'This browser already holds 50 saved save inspections. Delete one first.';
  }
  if (/not compatible with this version/.test(message)) {
    return 'Saved save inspection metadata is incompatible with this version. Clear the incompatible save metadata to continue; player exports will be preserved.';
  }
  if (/Unable to clear saved inspection metadata/.test(message)) {
    return 'Unable to clear saved inspection metadata. Check browser storage permissions and try again.';
  }
  if (/Unable to remove saved inspection metadata/.test(message)) {
    return 'Unable to remove saved inspection metadata. Check browser storage permissions and try again.';
  }
  if (/Unable to save inspection metadata/.test(message)) {
    return 'Unable to save inspection metadata locally. Check browser storage permissions and available disk space.';
  }
  return 'Could not access saved save metadata. Your original save remains untouched.';
}
