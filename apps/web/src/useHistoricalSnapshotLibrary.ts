import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  HistoricalSnapshotMode, HistoricalSnapshotRecord, HistoricalSnapshotSummary
} from '@managerhub/domain';
import { announceHistoricalLibraryCommit, onHistoricalLibraryCommit } from './historical-library-sync';
import {
  clearHistoricalSnapshotLibrary, deleteHistoricalSnapshot, getHistoricalSnapshot,
  listHistoricalSnapshotSummaries, saveEditorHistoricalSnapshotPair, saveRealismHistoricalSnapshot,
  type HistoricalSnapshotSaveResult
} from '@managerhub/storage/historical-live-snapshots';

type Activity = 'opening' | 'saving' | 'deleting' | 'clearing' | null;

export function useHistoricalSnapshotLibrary(mode: HistoricalSnapshotMode) {
  const [items, setItems] = useState<HistoricalSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedMode, setLoadedMode] = useState<HistoricalSnapshotMode | null>(null);
  const [activity, setActivity] = useState<Activity>(null);
  const [error, setError] = useState<string | null>(null);
  const [canClearIncompatible, setCanClearIncompatible] = useState(false);
  const [externalRevision, setExternalRevision] = useState(0);
  const [syncedExternalRevision, setSyncedExternalRevision] = useState(0);

  useEffect(() => onHistoricalLibraryCommit(() => setExternalRevision(value => value + 1)), []);

  const reload = useCallback(async () => {
    const rows = await listHistoricalSnapshotSummaries(mode);
    setItems(rows);
    setLoadedMode(mode);
  }, [mode]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadedMode(null);
    setError(null);
    setCanClearIncompatible(false);
    listHistoricalSnapshotSummaries(mode).then(rows => {
      if (active) {
        setItems(rows);
        setLoadedMode(mode);
        setSyncedExternalRevision(externalRevision);
      }
    }).catch(cause => {
      if (active) {
        setError(message(cause));
        setCanClearIncompatible(cause instanceof Error && /incompatible|schema validation|damaged/u.test(cause.message));
        setLoadedMode(mode);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [mode, externalRevision]);

  const save = useCallback(async (
    record: HistoricalSnapshotRecord, pairedRecord: HistoricalSnapshotRecord | null
  ): Promise<HistoricalSnapshotSaveResult | null> => {
    setActivity('saving');
    setError(null);
    setCanClearIncompatible(false);
    try {
      const result = record.mode === 'editor'
        ? pairedRecord
          ? await saveEditorHistoricalSnapshotPair(record, pairedRecord)
          : (() => { throw new Error('The separately redacted Realism projection is missing. Reimport this capture before saving.'); })()
        : await saveRealismHistoricalSnapshot(record);
      if (result.status !== 'duplicate') announceHistoricalLibraryCommit();
      try { await reload(); } catch (cause) { setError(message(cause)); }
      return result;
    } catch (cause) {
      setError(message(cause));
      setCanClearIncompatible(cause instanceof Error && /incompatible with this version/u.test(cause.message));
      return null;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const open = useCallback(async (id: string): Promise<HistoricalSnapshotRecord | null> => {
    setActivity('opening');
    setError(null);
    try {
      return await getHistoricalSnapshot(id, mode);
    } catch (cause) {
      setError(message(cause));
      setCanClearIncompatible(cause instanceof Error && /incompatible with this version/u.test(cause.message));
      return null;
    } finally {
      setActivity(null);
    }
  }, [mode]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setActivity('deleting');
    setError(null);
    try {
      await deleteHistoricalSnapshot(id);
      announceHistoricalLibraryCommit();
      try { await reload(); } catch (cause) { setError(message(cause)); }
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    } finally {
      setActivity(null);
    }
  }, [reload]);

  const clearIncompatible = useCallback(async (): Promise<boolean> => {
    setActivity('clearing');
    setError(null);
    setCanClearIncompatible(false);
    try {
      await clearHistoricalSnapshotLibrary();
      announceHistoricalLibraryCommit();
      await reload();
      return true;
    } catch (cause) {
      setError(message(cause));
      setCanClearIncompatible(true);
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
    items: loadedMode === mode ? items : [],
    loading: loading || loadedMode !== mode,
    activity,
    error: loadedMode === mode ? error : null,
    canClearIncompatible: loadedMode === mode && canClearIncompatible,
    syncedExternalRevision: loadedMode === mode && !loading ? syncedExternalRevision : null,
    reload, save, open, remove, clearIncompatible, clearError
  }), [items, loading, loadedMode, mode, activity, error, canClearIncompatible, syncedExternalRevision, reload, save, open, remove, clearIncompatible, clearError]);
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'The browser could not access the historical snapshot library.';
}
