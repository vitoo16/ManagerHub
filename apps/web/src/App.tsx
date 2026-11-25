import { setAppLocale } from './i18n';
import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createDefaultSquadPlans, type SquadPlanKey, type SquadPlans } from '@managerhub/domain/squad-scenarios';
import { defaultTacticalScenarios, tacticalScenarioForFormation } from '@managerhub/domain/tactical-state';
import type { TacticalScenarios } from '@managerhub/domain/tactical-scenarios';
import type { SaveIdentity, WorkspaceKey } from '@managerhub/domain/types';
import type { SaveInspectionResult } from '@managerhub/domain/save-library';
import type { PlayerDataset } from '@managerhub/domain';
import type {
  DecodedSaveDatabase,
  DecodedSaveMode,
  EditorTransactionState,
  FM2013DecodeProgress,
  Fm2013LangDbLookup,
  SaveDraftOverlay
} from '@managerhub/domain/fm2013-offline';
import { closeEditorRecord, createRecordState, openEditorRecord, type EditorModalTarget, type EditorRecordState, type EditorRecordTarget } from './features/save-session/editor-records';
import { Button, Icon, Status, Surface } from '@managerhub/ui';
import { useReducedMotion } from '@managerhub/motion/reduced';
import { readableSaveInspectionError } from './i18n/save-inspection-copy';
import { registerSaveDbI18n } from './i18n/register-save-db-i18n';
import { useDialogFocus } from './useDialogFocus';
import './app.css';

registerSaveDbI18n();

const Overview = lazy(() => import('./features/overview/Overview'));
const SaveInspector = lazy(() => import('./features/save-library/SaveInspector'));
const Systems = lazy(() => import('./features/systems/Systems'));
const Architecture = lazy(() => import('./features/architecture/Architecture'));
const PlayerWorkspace = lazy(() => import('./PlayerWorkspace').then(module => ({ default: module.PlayerWorkspace })));
const SquadWorkspace = lazy(() => import('./SquadWorkspace').then(module => ({ default: module.SquadWorkspace })));
const HistoricalWorkspace = lazy(() => import('./features/historical-snapshots/HistoricalWorkspace'));
const WorkspaceAnimator = lazy(() => import('./WorkspaceAnimator'));
const ActiveSaveToolbar = lazy(() => import('./features/save-session/ActiveSaveToolbar'));
const SaveEntityEditorModal = lazy(() => import('./features/save-session/SaveEntityEditorModal'));

const NAV: { key: WorkspaceKey; title: string; detail: string; icon: 'grid' | 'database' | 'layers' | 'shield' | 'compass' | 'history' }[] = [
  { key: 'overview', title: 'Overview', detail: 'Command center', icon: 'grid' },
  { key: 'saves', title: 'Save Library', detail: 'Local inspection', icon: 'database' },
  { key: 'editor', title: 'Classic Editor', detail: 'Edit decoded records', icon: 'layers' },
  { key: 'players', title: 'Player Lab', detail: 'Exported player scouting', icon: 'compass' },
  { key: 'history', title: 'Historical snapshots', detail: 'FM2013 research captures', icon: 'history' },
  { key: 'squad', title: 'Squad Planner', detail: 'Verified position assignments', icon: 'layers' },
  { key: 'modules', title: 'Football Systems', detail: 'All 27 workstreams', icon: 'layers' },
  { key: 'architecture', title: 'Data & Trust', detail: 'How it works', icon: 'shield' }
];

type Theme = 'dark' | 'light';
type OfflineDomainModule = typeof import('@managerhub/domain/fm2013-offline');

interface SaveSessionSource {
  readonly kind: 'save';
  readonly baseDatabase: DecodedSaveDatabase;
  readonly managedClubUid: number | null;
  readonly playerLabClubFilterUid: number | null;
  readonly editorState: EditorTransactionState;
  readonly tools: OfflineDomainModule;
}

type ActiveSource =
  | { readonly kind: 'export'; readonly dataset: PlayerDataset }
  | SaveSessionSource;

interface SaveSession {
  readonly mode: DecodedSaveMode;
  readonly source: ActiveSource | null;
}

function loadPreference<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const value = localStorage.getItem(key);
    if (value && allowed.includes(value as T)) return value as T;
  } catch { /* Storage may be disabled. */ }
  return fallback;
}

function routeFromHash(): WorkspaceKey {
  const hash = window.location.hash.slice(2);
  return NAV.some(n => n.key === hash) ? (hash as WorkspaceKey) : 'overview';
}

function defaultClubUidForSave(db: DecodedSaveDatabase): number | null {
  const humanManaged = db.humans.find(
    human => human.clubUid !== null && db.players.some(player => player.clubUid === human.clubUid)
  );
  return humanManaged?.clubUid ?? null;
}

function buildInspectionFromDecoded(db: DecodedSaveDatabase): SaveInspectionResult {
  return {
    id: db.source.saveId,
    name: db.source.fileName,
    size: db.source.fileSize,
    lastModified: db.source.lastModified,
    signature: db.source.signature,
    sha256: db.source.sha256,
    detectedFamily: db.source.family,
    edition: db.source.edition,
    build: db.source.build,
    support: 'decoded',
    importedAt: db.source.decodedAt,
    inspectionStatus: 'inspected',
    archiveIndex: null,
    warnings: []
  };
}

function WorkspaceLoading() {
  const { t } = useTranslation();
  return <div className="workspace-loading" role="status" aria-live="polite">
    <span className="workspace-loading__spinner" aria-hidden="true"/>
    <span>{t("Loading workspace…")}</span>
  </div>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return <div className="logo-row">
    <div className="logo-mark"><div className="logo-mark__inner"><span className="logo-orbit"/></div></div>
    {!compact && <div><strong>MANAGER<span>HUB</span></strong><small>{t("FOOTBALL INTELLIGENCE")}</small></div>}
  </div>;
}

function Rail({ current, onNavigate, onClose }: {
  current: WorkspaceKey; onNavigate: (key: WorkspaceKey) => void; onClose: () => void
}) {
  const { t } = useTranslation();
  return <div className="rail-shell">
    <div className="rail-top"><Logo/><button aria-label={t("Close menu")} className="mobile-close icon-action" onClick={onClose}><Icon name="close"/></button></div>
    <div className="rail-caption">{t("WORKSPACE")}</div>
    <nav className="rail-links" aria-label={t("Main navigation")}>
      {NAV.map(item =>
        <button key={item.key} aria-current={current === item.key ? 'page' : undefined}
          className={'rail-link ' + (current === item.key ? 'rail-link--active' : '')}
          onClick={() => { onNavigate(item.key); onClose(); }}>
          <span className="rail-link__icon"><Icon name={item.icon} size={18}/></span>
          <span className="rail-link__copy"><strong>{t(item.title)}</strong><small>{t(item.detail)}</small></span>
          {current === item.key && <span aria-hidden="true" className="rail-link__active"/>}
        </button>
      )}
    </nav>
    <div className="rail-bottom">
      <div className="rail-project"><span className="rail-project__led"/><div><strong>{t("Local player workspace")}</strong><small>{t("Player Lab · Squad Planner")}</small></div></div>
      <a className="rail-documentation" href="https://github.com/vitoo16/ManagerHub/tree/main/docs" target="_blank" rel="noreferrer">
        <Icon name="book" size={16}/> {t("Project documentation")} <Icon name="arrow" size={15}/>
      </a>
    </div>
  </div>;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<WorkspaceKey>(routeFromHash);
  const [visitedViews, setVisitedViews] = useState<ReadonlySet<WorkspaceKey>>(() => new Set([routeFromHash()]));
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => loadPreference('mh-theme', 'dark', ['dark', 'light']));
  const [glass, setGlass] = useState(() => loadPreference('mh-glass', 'on', ['on', 'off']));
  const [imports, setImports] = useState<SaveInspectionResult[]>([]);
  const [decodedSaves, setDecodedSaves] = useState<Record<string, DecodedSaveDatabase>>({});
  const [rawSaveFiles, setRawSaveFiles] = useState<Record<string, File>>({});
  const [langDbLookup, setLangDbLookup] = useState<Fm2013LangDbLookup | null>(null);
  const [runtimeSigningKey, setRuntimeSigningKey] = useState<Uint8Array | null>(null);
  const [session, setSession] = useState<SaveSession>({ mode: 'realism', source: null });
  const [editorModalTarget, setEditorModalTarget] = useState<EditorModalTarget | null>(null);
  const [editorRecords, setEditorRecords] = useState<EditorRecordState | null>(null);
  const [writingSave, setWritingSave] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [selectedPlayerIdForLab, setSelectedPlayerIdForLab] = useState<string | null>(null);
  const [scoutShortlistIds, setScoutShortlistIds] = useState<string[]>([]);
  const [squadPlans, setSquadPlans] = useState<SquadPlans>(createDefaultSquadPlans);
  const [tacticalScenarios, setTacticalScenarios] = useState<TacticalScenarios>(defaultTacticalScenarios);
  const [activeSquadPlan, setActiveSquadPlan] = useState<SquadPlanKey>('A');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState<FM2013DecodeProgress | null>(null);
  const [decodeNotice, setDecodeNotice] = useState<string | null>(null);
  const inspectionAbortRef = useRef<AbortController | null>(null);
  const inspectionRevisionRef = useRef(0);
  const openPendingRef = useRef(false);
  const writePendingRef = useRef(false);
  const langRequestRef = useRef(0);
  const authorizationRequestRef = useRef(0);
  const viewScope = useRef<HTMLElement>(null);
  const commandDialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const saveMode = session.mode;
  const saveSource = session.source?.kind === 'save' ? session.source : null;
  const baseDecodedSave = useMemo(() => {
    if (!saveSource) return null;
    return langDbLookup
      ? saveSource.tools.applyLangDbToSaveDatabase(saveSource.baseDatabase, langDbLookup)
      : saveSource.baseDatabase;
  }, [saveSource, langDbLookup]);

  const activeDecodedSave = useMemo(() => {
    if (!saveSource || !baseDecodedSave) return null;
    return saveSource.tools.applyDraftOverlayToDatabase(baseDecodedSave, saveSource.editorState.present);
  }, [saveSource, baseDecodedSave]);

  const activeSaveId = activeDecodedSave?.source.saveId ?? null;
  const managedClubUid = saveSource?.managedClubUid ?? null;
  const playerLabClubFilterUid = saveSource?.playerLabClubFilterUid ?? null;

  const dirtyEntityCount = useMemo(
    () => (saveSource ? saveSource.tools.countDirtyEntities(saveSource.editorState.present) : 0),
    [saveSource]
  );
  const dirtyFieldCount = useMemo(
    () => (saveSource ? saveSource.tools.countDirtyFields(saveSource.editorState.present) : 0),
    [saveSource]
  );

  // Squad Planner & Overview bind to `managedClubUid`; Player Lab binds independently to `playerLabClubFilterUid` (`AUD-03`).
  const squadDataset = useMemo(() => {
    const source = session.source;
    if (!source) return null;
    if (source.kind === 'export') return source.dataset;
    return activeDecodedSave
      ? source.tools.saveDatabaseToPlayerDataset(activeDecodedSave, session.mode, { clubUid: source.managedClubUid })
      : null;
  }, [session.source, session.mode, activeDecodedSave]);

  const playerLabDataset = useMemo(() => {
    const source = session.source;
    if (!source) return null;
    if (source.kind === 'export') return source.dataset;
    return activeDecodedSave
      ? source.tools.saveDatabaseToPlayerDataset(activeDecodedSave, session.mode, { clubUid: source.playerLabClubFilterUid })
      : null;
  }, [session.source, session.mode, activeDecodedSave]);

  const activeRawSaveFile = activeSaveId ? (rawSaveFiles[activeSaveId] ?? null) : null;
  const effectiveSigningKey = runtimeSigningKey;

  const allDecodedSaveList = useMemo(() => {
    return Object.values(decodedSaves).map(item =>
      activeDecodedSave && item.source.saveId === activeDecodedSave.source.saveId ? activeDecodedSave : item
    );
  }, [decodedSaves, activeDecodedSave]);

  useEffect(() => {
    setVisitedViews(prev => (prev.has(view) ? prev : new Set([...prev, view])));
  }, [view]);

  useEffect(() => {
    setTacticalScenarios(previous => {
      const A = tacticalScenarioForFormation(previous.A, squadPlans.A.formation);
      const B = tacticalScenarioForFormation(previous.B, squadPlans.B.formation);
      return A === previous.A && B === previous.B ? previous : { A, B };
    });
  }, [squadPlans.A.formation, squadPlans.B.formation]);

  const resetSquadSessionState = useCallback(() => {
    setSquadPlans(createDefaultSquadPlans());
    setTacticalScenarios(defaultTacticalScenarios());
    setActiveSquadPlan('A');
  }, []);

  const resetPlayerLabSessionState = useCallback(() => {
    setScoutShortlistIds([]);
    setSelectedPlayerIdForLab(null);
  }, []);

  const confirmDiscardIfDirty = useCallback((): boolean => {
    if (dirtyEntityCount === 0) return true;
    return window.confirm(
      t('You have unsaved draft edits on the active save. Discard pending changes and continue?')
    );
  }, [dirtyEntityCount, t]);

  const onCancelDecode = useCallback(() => {
    inspectionRevisionRef.current += 1;
    openPendingRef.current = false;
    inspectionAbortRef.current?.abort();
    inspectionAbortRef.current = null;
    setBusy(false);
    setDecodeProgress(null);
  }, []);

  const onPlayerDatasetChange = useCallback((next: PlayerDataset | null) => {
    if (writePendingRef.current || next?.source === 'decoded_save') return;
    if (!confirmDiscardIfDirty()) return;
    onCancelDecode();
    setEditorModalTarget(null);
    setEditorRecords(null);
    setSession(current => ({ ...current, source: next ? { kind: 'export', dataset: next } : null }));
    resetSquadSessionState();
    resetPlayerLabSessionState();
  }, [confirmDiscardIfDirty, onCancelDecode, resetSquadSessionState, resetPlayerLabSessionState]);

  const loadOfflineTools = useCallback(
    (): Promise<OfflineDomainModule> => import('@managerhub/domain/fm2013-offline'), []
  );

  const commitDecodedSave = useCallback((
    db: DecodedSaveDatabase,
    tools: OfflineDomainModule,
    inspection: SaveInspectionResult,
    rawFile?: File
  ) => {
    const initialClubUid = defaultClubUidForSave(db);
    langRequestRef.current += 1;
    authorizationRequestRef.current += 1;
    setLangDbLookup(null);
    setRuntimeSigningKey(null);
    setDecodedSaves(prev => ({ ...prev, [db.source.saveId]: db }));
    if (rawFile) {
      setRawSaveFiles(prev => ({ ...prev, [db.source.saveId]: rawFile }));
    }
    setImports(prev => [inspection, ...prev.filter(item => item.id !== inspection.id)]);
    setSelectedId(inspection.id);
    setEditorModalTarget(null);
    setEditorRecords(null);
    setWriteError(null);
    setSession(current => ({
      ...current,
      source: {
        kind: 'save',
        baseDatabase: db,
        managedClubUid: initialClubUid,
        playerLabClubFilterUid: initialClubUid,
        editorState: tools.createEmptyEditorState(db.source.saveId),
        tools
      }
    }));
    resetSquadSessionState();
    resetPlayerLabSessionState();
  }, [resetSquadSessionState, resetPlayerLabSessionState]);

  const openDecodedSave = useCallback(async (
    saveId: string, read: (saveId: string) => Promise<DecodedSaveDatabase | null>
  ) => {
    if (writePendingRef.current) return;
    if (saveId === activeSaveId) { onCancelDecode(); return; }
    if (!confirmDiscardIfDirty()) return;
    onCancelDecode();
    const revision = inspectionRevisionRef.current;
    openPendingRef.current = true;
    setBusy(true);
    setEditorModalTarget(null);
    setError(null);
    setDecodeNotice(null);
    try {
      const [db, tools] = await Promise.all([read(saveId), loadOfflineTools()]);
      if (!db || revision !== inspectionRevisionRef.current) return;
      tools.validateDecodedSaveDatabase(db, saveId);
      commitDecodedSave(db, tools, buildInspectionFromDecoded(db));
    } catch (exception) {
      if (revision === inspectionRevisionRef.current) setError(readableSaveInspectionError(exception));
    } finally {
      if (revision === inspectionRevisionRef.current) {
        openPendingRef.current = false;
        setBusy(false);
      }
    }
  }, [activeSaveId, confirmDiscardIfDirty, onCancelDecode, loadOfflineTools, commitDecodedSave]);

  const onSwitchDecodedSave = useCallback((saveId: string) => {
    const target = decodedSaves[saveId];
    if (!target) return;
    void openDecodedSave(saveId, () => Promise.resolve(target));
  }, [decodedSaves, openDecodedSave]);

  const onSetSaveMode = useCallback((nextMode: DecodedSaveMode) => {
    if (writePendingRef.current) return;
    if (nextMode === 'realism') {
      authorizationRequestRef.current += 1;
      setEditorModalTarget(null);
      setEditorRecords(null);
    }
    setSession(current => (current.mode === nextMode ? current : { ...current, mode: nextMode }));
  }, []);

  // Global Managed Club change updates Squad Planner / Tactical Lab ONLY, leaving Player Lab untouched (`AUD-03`).
  const onManagedClubChange = useCallback((nextClubUid: number | null) => {
    if (!saveSource || saveSource.managedClubUid === nextClubUid) return;
    const targetSaveId = saveSource.baseDatabase.source.saveId;
    setSession(current =>
      current.source?.kind === 'save' && current.source.baseDatabase.source.saveId === targetSaveId
        ? { ...current, source: { ...current.source, managedClubUid: nextClubUid } }
        : current
    );
    resetSquadSessionState();
  }, [saveSource, resetSquadSessionState]);

  // Local Player Lab club filter updates Player Lab ONLY, leaving Squad Planner / Tactical Lab untouched (`AUD-03`).
  const onPlayerLabClubFilterChange = useCallback((nextClubUid: number | null) => {
    if (!saveSource || saveSource.playerLabClubFilterUid === nextClubUid) return;
    const targetSaveId = saveSource.baseDatabase.source.saveId;
    setSession(current =>
      current.source?.kind === 'save' && current.source.baseDatabase.source.saveId === targetSaveId
        ? { ...current, source: { ...current.source, playerLabClubFilterUid: nextClubUid } }
        : current
    );
    setScoutShortlistIds([]);
  }, [saveSource]);

  const onCommitEditorOverlay = useCallback((
    label: string,
    mutator: (current: SaveDraftOverlay) => SaveDraftOverlay
  ) => {
    if (openPendingRef.current || writePendingRef.current) return;
    setWriteError(null);
    setSession(current => {
      if (current.source?.kind !== 'save' || !baseDecodedSave) return current;
      try {
        const nextEditorState = current.source.tools.commitEditorTransaction(
          current.source.editorState,
          baseDecodedSave,
          current.mode,
          label,
          mutator
        );
        return {
          ...current,
          source: {
            ...current.source,
            editorState: nextEditorState
          }
        };
      } catch (err) {
        setWriteError(err instanceof Error ? err.message : 'Unable to apply edit.');
        return current;
      }
    });
  }, [baseDecodedSave]);

  const onUndoEdit = useCallback(() => {
    if (openPendingRef.current || writePendingRef.current) return;
    setSession(current => {
      if (current.source?.kind !== 'save' || current.mode !== 'editor') return current;
      return {
        ...current,
        source: {
          ...current.source,
          editorState: current.source.tools.undoEditorTransaction(current.source.editorState)
        }
      };
    });
  }, []);

  const onRedoEdit = useCallback(() => {
    if (openPendingRef.current || writePendingRef.current) return;
    setSession(current => {
      if (current.source?.kind !== 'save' || current.mode !== 'editor') return current;
      return {
        ...current,
        source: {
          ...current.source,
          editorState: current.source.tools.redoEditorTransaction(current.source.editorState)
        }
      };
    });
  }, []);

  const onDiscardAllEdits = useCallback(() => {
    if (openPendingRef.current || writePendingRef.current) return;
    setSession(current => {
      if (current.source?.kind !== 'save' || current.mode !== 'editor') return current;
      return {
        ...current,
        source: {
          ...current.source,
          editorState: current.source.tools.discardEditorTransactions(current.source.editorState)
        }
      };
    });
  }, []);

  const onAttachLangDb = useCallback(async (file: File) => {
    if (!saveSource || openPendingRef.current || writePendingRef.current) return;
    const revision = inspectionRevisionRef.current;
    const request = ++langRequestRef.current;
    const isCurrent = () => revision === inspectionRevisionRef.current && request === langRequestRef.current;
    setError(null);
    try {
      const tools = saveSource?.tools ?? await loadOfflineTools();
      const parsed = await tools.parseFm2013LangDb(file);
      if (isCurrent()) setLangDbLookup(parsed);
    } catch (err) {
      if (isCurrent()) setError(err instanceof Error ? err.message : 'Could not parse lang_db.dat.');
    }
  }, [saveSource, loadOfflineTools]);

  const onAuthorizeFmExe = useCallback(async (file: File) => {
    if (!saveSource || !activeRawSaveFile || saveMode !== 'editor' ||
        openPendingRef.current || writePendingRef.current) return;
    const revision = inspectionRevisionRef.current;
    const request = ++authorizationRequestRef.current;
    setRuntimeSigningKey(null);
    const isCurrent = () => revision === inspectionRevisionRef.current && request === authorizationRequestRef.current;
    setWriteError(null);
    setError(null);
    try {
      const tools = saveSource?.tools ?? await loadOfflineTools();
      const key = await tools.deriveFm2013SigningKeyFromExecutable(file);
      const container = await tools.parseFm2013Container(activeRawSaveFile);
      const member = await tools.extractFm2013Member(activeRawSaveFile, container, 'game_db.dat');
      if (!member || !await tools.verifyGameDbHmacSha512(member, key)) {
        throw new Error('The selected executable does not authenticate the active save.');
      }
      if (isCurrent()) setRuntimeSigningKey(key);
    } catch (err) {
      if (!isCurrent()) return;
      const msg = err instanceof Error ? err.message : 'Could not authorize FM2013 executable.';
      setWriteError(msg);
      setError(msg);
    }
  }, [saveSource, activeRawSaveFile, saveMode, loadOfflineTools]);

  const onSaveAsFm = useCallback(async (outputFileName: string) => {
    if (saveMode !== 'editor' || openPendingRef.current || writePendingRef.current ||
        !saveSource || !baseDecodedSave || !activeRawSaveFile || !effectiveSigningKey) return;
    writePendingRef.current = true;
    const revision = inspectionRevisionRef.current;
    setWritingSave(true);
    setWriteError(null);
    let url: string | null = null;
    try {
      const result = await saveSource.tools.writePatchedFm2013Save(
        activeRawSaveFile,
        saveSource.editorState.present,
        {
          signingKey: effectiveSigningKey,
          outputFileName,
          expectedOriginalSha256: baseDecodedSave.source.sha256
        }
      );
      if (revision !== inspectionRevisionRef.current) return;
      const blob = new Blob([new Uint8Array(result.bytes)], { type: 'application/octet-stream' });
      url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.hidden = true;
      document.body.append(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
      }
      setEditorModalTarget(null);
    } catch (err) {
      if (revision === inspectionRevisionRef.current) {
        setWriteError(err instanceof Error ? err.message : 'Failed to write Save As .fm copy.');
      }
    } finally {
      writePendingRef.current = false;
      setWritingSave(false);
      if (url !== null) {
        const pending = url;
        window.setTimeout(() => URL.revokeObjectURL(pending), 30_000);
      }
    }
  }, [saveMode, saveSource, baseDecodedSave, activeRawSaveFile, effectiveSigningKey]);

  useEffect(() => () => {
    inspectionRevisionRef.current += 1;
    inspectionAbortRef.current?.abort();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mh-theme', theme); } catch { /* blocked storage */ }
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.glass = glass;
    try { localStorage.setItem('mh-glass', glass); } catch { /* blocked storage */ }
  }, [glass]);
  useEffect(() => {
    const onHash = () => setView(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!editorModalTarget) setCommandOpen(open => !open);
      }
      if (event.key === 'Escape') { setCommandOpen(false); setMenuOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editorModalTarget]);
  useDialogFocus(commandDialogRef, commandOpen, '.command-item');

  const navigate = useCallback((key: WorkspaceKey) => {
    setVisitedViews(prev => (prev.has(key) ? prev : new Set([...prev, key])));
    const next = '#/' + key;
    if (window.location.hash === next) setView(key);
    else window.location.hash = next;
    setCommandOpen(false); setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  const openSquad = useCallback(() => navigate('squad'), [navigate]);
  const openPlayers = useCallback(() => navigate('players'), [navigate]);
  const openSaves = useCallback(() => navigate('saves'), [navigate]);

  const onOpenEditorRecord = useCallback((record: EditorRecordTarget) => {
    if (saveMode !== 'editor' || !activeSaveId || openPendingRef.current || writePendingRef.current) return;
    setEditorRecords(current => current ? openEditorRecord(current, record) : createRecordState(record));
  }, [saveMode, activeSaveId]);
  const onCloseEditorRecord = useCallback((record: EditorRecordTarget) => {
    if (saveMode !== 'editor' || openPendingRef.current || writePendingRef.current) return;
    setEditorRecords(current => current ? closeEditorRecord(current, record) : null);
  }, [saveMode]);
  const onQuickEdit = useCallback((record: EditorRecordTarget) => {
    if (saveMode !== 'editor' || !activeSaveId || openPendingRef.current || writePendingRef.current) return;
    onOpenEditorRecord(record);
    setEditorModalTarget(record);
  }, [saveMode, activeSaveId, onOpenEditorRecord]);
  const onOpenClassicEditor = useCallback(() => {
    if (writePendingRef.current) return;
    setEditorModalTarget(null);
    navigate('editor');
  }, [navigate]);

  const onOpenPlayerFromSave = useCallback((playerUid: number, clubUid: number | null) => {
    if (!activeDecodedSave) return;
    const targetPlayerId = `${activeDecodedSave.source.saveId.slice(0, 12)}:${playerUid}`;
    if (playerLabClubFilterUid !== null && playerLabClubFilterUid !== clubUid) {
      onPlayerLabClubFilterChange(clubUid);
    }
    setSelectedPlayerIdForLab(targetPlayerId);
    navigate('players');
  }, [activeDecodedSave, playerLabClubFilterUid, onPlayerLabClubFilterChange, navigate]);

  const onLoadClubInSquad = useCallback((clubUid: number | null) => {
    onManagedClubChange(clubUid);
    navigate('squad');
  }, [onManagedClubChange, navigate]);

  const onRestoreSaved = useCallback((records: readonly SaveIdentity[]) => {
    setImports(current => {
      const existingIds = new Set(current.map(item => item.id));
      return [...records.filter(item => !existingIds.has(item.id)), ...current];
    });
    setSelectedId(current => current ?? records[0]?.id ?? null);
  }, []);

  const onInspect = useCallback(async (file: File) => {
    if (writePendingRef.current || !confirmDiscardIfDirty()) return;
    openPendingRef.current = true;
    setEditorModalTarget(null);
    const revision = ++inspectionRevisionRef.current;
    inspectionAbortRef.current?.abort();
    const controller = new AbortController();
    inspectionAbortRef.current = controller;
    setBusy(true);
    setError(null);
    setDecodeNotice(null);
    setDecodeProgress({ stage: 'reading_container', percent: 5 });
    try {
      const { decodeSaveInWorker } = await import('./decode-save-in-worker');
      const result = await decodeSaveInWorker(file, {
        signal: controller.signal,
        onProgress: progress => {
          if (!controller.signal.aborted && revision === inspectionRevisionRef.current) {
            setDecodeProgress(progress);
          }
        }
      });
      if (controller.signal.aborted || revision !== inspectionRevisionRef.current) return;
      if (result.database) {
        const tools = await loadOfflineTools();
        if (controller.signal.aborted || revision !== inspectionRevisionRef.current) return;
        commitDecodedSave(result.database, tools, result.inspection, file);
      } else {
        setImports(previous => [result.inspection, ...previous.filter(item => item.id !== result.inspection.id)]);
        setSelectedId(result.inspection.id);
      }
      setDecodeNotice(result.decodeNotice);
    } catch (exception) {
      if (!controller.signal.aborted && revision === inspectionRevisionRef.current) {
        setError(readableSaveInspectionError(exception));
      }
    } finally {
      if (revision === inspectionRevisionRef.current) {
        openPendingRef.current = false;
        inspectionAbortRef.current = null;
        setBusy(false);
        setDecodeProgress(null);
      }
    }
  }, [confirmDiscardIfDirty, loadOfflineTools, commitDecodedSave]);

  const remove = useCallback((id: string) => {
    if (writePendingRef.current) return;
    if (activeSaveId === id && !confirmDiscardIfDirty()) return;
    setImports(prev => prev.filter(file => file.id !== id));
    setSelectedId(current => current === id ? null : current);
    setDecodedSaves(prev => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setRawSaveFiles(prev => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeSaveId === id) {
      onCancelDecode();
      setEditorModalTarget(null);
      setEditorRecords(null);
      setSession(current =>
        current.source?.kind === 'save' && current.source.baseDatabase.source.saveId === id
          ? { ...current, source: null }
          : current
      );
      resetSquadSessionState();
      resetPlayerLabSessionState();
    }
  }, [activeSaveId, confirmDiscardIfDirty, onCancelDecode, resetSquadSessionState, resetPlayerLabSessionState]);

  const editorProps = baseDecodedSave && activeDecodedSave && saveSource ? {
    baseDatabase: baseDecodedSave,
    workingDatabase: activeDecodedSave,
    overlay: saveSource.editorState.present,
    managedClubUid,
    hasRawSaveBytes: activeRawSaveFile !== null,
    writerKeyReady: effectiveSigningKey !== null,
    writingSave,
    writeError,
    dirtyFieldCount,
    recordState: editorRecords,
    onOpenRecord: onOpenEditorRecord,
    onCloseRecord: onCloseEditorRecord,
    onClose: () => { if (!writePendingRef.current) setEditorModalTarget(null); },
    onCommitOverlay: onCommitEditorOverlay,
    onDiscardAll: onDiscardAllEdits,
    onAuthorizeFmExe: (file: File) => void onAuthorizeFmExe(file),
    onSaveAsFm: (fileName: string) => void onSaveAsFm(fileName)
  } : null;

  const selected = imports.find(f => f.id === selectedId) ?? imports[0] ?? null;
  const activeItem = NAV.find(n => n.key === view) ?? NAV[0];

  return <div className="app-frame">
    <a className="skip-link" href="#main-content">{t('Skip to main content')}</a>
    {menuOpen && <button className="mobile-backdrop" aria-label={t("Close navigation menu")} onClick={() => setMenuOpen(false)}/>}
    <aside className={'sidebar mh-surface mh-surface--glass ' + (menuOpen ? 'sidebar--open' : '')} aria-label={t("Primary sidebar")}><Rail current={view} onNavigate={navigate} onClose={() => setMenuOpen(false)}/></aside>
    <div className="app-column">
      <header className="topbar mh-surface mh-surface--glass">
        <div className="topbar-left"><button aria-label={t("Open navigation menu")} className="icon-action mobile-menu" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button>
          <div className="topbar-breadcrumb"><span>{t("ManagerHub")}</span><Icon name="chevron" size={14}/><strong>{t(activeItem?.title ?? 'Overview')}</strong></div>
        </div>
        <div className="topbar-right">
          <button className="command-trigger" onClick={() => setCommandOpen(true)}>
            <Icon name="search" size={15}/><span>{t("Quick navigate")}</span>
          </button>
          <div className="language-switch" role="group" aria-label={t('Change language')}>
            <button type="button" lang="vi" aria-pressed={i18n.resolvedLanguage === 'vi'}
              onClick={() => void setAppLocale('vi')}>VI<span className="visually-hidden"> {t('Switch language to Vietnamese')}</span></button>
            <button type="button" lang="en" aria-pressed={i18n.resolvedLanguage !== 'vi'}
              onClick={() => void setAppLocale('en')}>EN<span className="visually-hidden"> {t('Switch language to English')}</span></button>
          </div>
          <button className="icon-action" aria-label={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/></button>
          <button className="icon-action" aria-label={t(glass === 'on' ? 'Disable glass effects' : 'Enable glass effects')} title={t(glass === 'on' ? 'Disable glass' : 'Enable glass')} onClick={() => setGlass(s => s === 'on' ? 'off' : 'on')}><Icon name="settings" size={18}/></button>
          <div className="topbar-divider"/>
          <Status tone="positive">{t("Local first")}</Status>
        </div>
      </header>

      {activeDecodedSave && (
        <Suspense fallback={null}>
          <ActiveSaveToolbar
            database={activeDecodedSave}
            allDecodedSaves={allDecodedSaveList}
            saveMode={saveMode}
            managedClubUid={managedClubUid}
            dirtyEntityCount={dirtyEntityCount}
            dirtyFieldCount={dirtyFieldCount}
            canUndo={(saveSource?.editorState.past.length ?? 0) > 0}
            canRedo={(saveSource?.editorState.future.length ?? 0) > 0}
            hasRawSaveBytes={activeRawSaveFile !== null}
            writerKeyReady={effectiveSigningKey !== null}
            busy={busy || writingSave}
            onOpenSaveFile={file => void onInspect(file)}
            onSwitchSave={onSwitchDecodedSave}
            onSetSaveMode={onSetSaveMode}
            onManagedClubChange={onManagedClubChange}
            onAttachLangDb={file => void onAttachLangDb(file)}
            onAuthorizeFmExe={file => void onAuthorizeFmExe(file)}
            onUndo={onUndoEdit}
            onRedo={onRedoEdit}
            onOpenMassEditModal={() => setEditorModalTarget({ kind: 'mass_edit' })}
            onOpenSaveAsModal={() => setEditorModalTarget({ kind: 'save_as' })}
          />
        </Suspense>
      )}

      <main ref={viewScope} className="main-area" id="main-content" tabIndex={-1}>
        <Suspense fallback={null}><WorkspaceAnimator scope={viewScope} view={view} reduced={reduced}/></Suspense>
        {visitedViews.has('overview') && (
          <div hidden={view !== 'overview'} data-animate={view === 'overview' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <Overview
                imports={imports}
                current={squadDataset}
                activeDecodedSave={activeDecodedSave}
                onDataset={onPlayerDatasetChange}
                go={navigate}
              />
            </Suspense>
          </div>
        )}
        {visitedViews.has('players') && (
          <div hidden={view !== 'players'} data-animate={view === 'players' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <PlayerWorkspace
                dataset={playerLabDataset}
                shortlistIds={scoutShortlistIds}
                setShortlistIds={setScoutShortlistIds}
                onDataset={onPlayerDatasetChange}
                onOpenSquad={openSquad}
                activeDecodedSave={activeDecodedSave}
                saveMode={saveMode}
                onSetSaveMode={onSetSaveMode}
                clubFilterUid={playerLabClubFilterUid}
                onClubFilterChange={onPlayerLabClubFilterChange}
                initialPlayerId={selectedPlayerIdForLab}
                onEditPlayer={saveMode === 'editor' && !busy && !writingSave ? uid => onQuickEdit({ kind: 'player', uid }) : undefined}
              />
            </Suspense>
          </div>
        )}
        {visitedViews.has('history') && (
          <div hidden={view !== 'history'} data-animate={view === 'history' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <HistoricalWorkspace/>
            </Suspense>
          </div>
        )}
        {visitedViews.has('squad') && (
          <div hidden={view !== 'squad'} data-animate={view === 'squad' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <SquadWorkspace
                dataset={squadDataset}
                onImport={openPlayers}
                onOpenSaves={openSaves}
                onDataset={onPlayerDatasetChange}
                plans={squadPlans}
                setPlans={setSquadPlans}
                active={activeSquadPlan}
                setActive={setActiveSquadPlan}
                tacticalScenarios={tacticalScenarios}
                setTacticalScenarios={setTacticalScenarios}
                activeDecodedSave={activeDecodedSave}
                clubFilterUid={managedClubUid}
                onClubFilterChange={onManagedClubChange}
              />
            </Suspense>
          </div>
        )}
        {visitedViews.has('saves') && (
          <div hidden={view !== 'saves'} data-animate={view === 'saves' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <SaveInspector
                imports={imports}
                selected={selected}
                onInspect={onInspect}
                onRemove={remove}
                busy={busy}
                error={error}
                select={setSelectedId}
                onRestoreSaved={onRestoreSaved}
                decodeProgress={decodeProgress}
                onCancelDecode={onCancelDecode}
                decodeNotice={decodeNotice}
                decodedSaves={decodedSaves}
                activeDecodedSave={activeDecodedSave}
                saveMode={saveMode}
                onSetSaveMode={onSetSaveMode}
                onOpenDecodedSave={openDecodedSave}
                onSwitchDecodedSave={onSwitchDecodedSave}
                onOpenPlayerFromSave={onOpenPlayerFromSave}
                onLoadClubInSquad={onLoadClubInSquad}
                onEditEntity={saveMode === 'editor' && !busy && !writingSave ? onQuickEdit : undefined}
                onOpenSaveAsModal={saveMode === 'editor' && !busy && !writingSave ? () => setEditorModalTarget({ kind: 'save_as' }) : undefined}
              />
            </Suspense>
          </div>
        )}
        {view === 'editor' && <div className="view-flow" data-animate="workspace">
          <div className="page-title">
            <h1>{t('Classic Editor')}</h1>
            <p>{t('Edit records from the active save without leaving your other workspaces.')}</p>
          </div>
          {!editorProps ? <Surface className="editor-workspace-empty">
            <p>{t('Open a decoded FM2013 save in Save Library to use Classic Editor.')}</p>
            <Button onClick={openSaves}>{t('Save Library')}</Button>
          </Surface> : saveMode !== 'editor' ? <Surface className="editor-workspace-empty">
            <p>{t('Classic Editor is unavailable in Realism mode. Enable Editor mode to edit native records.')}</p>
            <Button disabled={busy || writingSave} onClick={() => onSetSaveMode('editor')}>{t('Enable Editor mode')}</Button>
          </Surface> : busy || writingSave ? <p role="status">{t('Loading workspace…')}</p> : !editorModalTarget && (
            <Suspense fallback={<WorkspaceLoading/>}>
              <SaveEntityEditorModal key={baseDecodedSave?.source.saveId} {...editorProps} target={{ kind: 'browse' }} embedded/>
            </Suspense>
          )}
        </div>}
        {visitedViews.has('modules') && (
          <div hidden={view !== 'modules'} data-animate={view === 'modules' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <Systems/>
            </Suspense>
          </div>
        )}
        {visitedViews.has('architecture') && (
          <div hidden={view !== 'architecture'} data-animate={view === 'architecture' ? 'workspace' : undefined}>
            <Suspense fallback={<WorkspaceLoading/>}>
              <Architecture/>
            </Suspense>
          </div>
        )}
        <footer className="app-footer"><span>{t("MANAGERHUB  /  DEVELOPMENT WORKSPACE")}</span><span>{t("Read-only browser inspection · No source save changes")}</span></footer>
      </main>
    </div>

    {editorModalTarget && !busy && saveMode === 'editor' && editorProps && (
      <Suspense fallback={null}>
        <SaveEntityEditorModal
          key={`${editorProps.baseDatabase.source.saveId}:${editorModalTarget.kind}:${'uid' in editorModalTarget ? editorModalTarget.uid : ''}`}
          target={editorModalTarget}
          {...editorProps}
          onOpenWorkspace={onOpenClassicEditor}
        />
      </Suspense>
    )}

    {commandOpen && <div className="command-overlay" role="presentation" onMouseDown={event => {if(event.target === event.currentTarget) setCommandOpen(false);}}>
      <div ref={commandDialogRef} className="command-dialog mh-surface mh-surface--glass" role="dialog" tabIndex={-1} aria-modal="true" aria-label={t("Quick navigation")}>
        <div className="command-top"><Icon name="search" size={19}/><span>{t("Jump to a workspace")}</span><button className="icon-action" onClick={() => setCommandOpen(false)} aria-label={t("Close quick navigation")}><Icon name="close" size={17}/></button></div>
        {NAV.map(item => <button key={item.key} className="command-item" onClick={() => navigate(item.key)}><Icon name={item.icon}/><span>{t(item.title)}</span><Icon name="arrow" size={15}/></button>)}
        <div className="command-footer">{t("Esc to close · Ctrl/⌘ K to open")}</div>
      </div>
    </div>}
  </div>;
}
