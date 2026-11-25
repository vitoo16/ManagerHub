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
  FM2013DecodeProgress
} from '@managerhub/domain/fm2013-offline';
import { Icon, Status } from '@managerhub/ui';
import { useReducedMotion } from '@managerhub/motion/reduced';
import { readableSaveInspectionError } from './i18n/save-inspection-copy';
import './app.css';

const Overview = lazy(() => import('./features/overview/Overview'));
const SaveInspector = lazy(() => import('./features/save-library/SaveInspector'));
const Systems = lazy(() => import('./features/systems/Systems'));
const Architecture = lazy(() => import('./features/architecture/Architecture'));
const PlayerWorkspace = lazy(() => import('./PlayerWorkspace').then(module => ({ default: module.PlayerWorkspace })));
const SquadWorkspace = lazy(() => import('./SquadWorkspace').then(module => ({ default: module.SquadWorkspace })));
const HistoricalWorkspace = lazy(() => import('./features/historical-snapshots/HistoricalWorkspace'));
const WorkspaceAnimator = lazy(() => import('./WorkspaceAnimator'));

const NAV: { key: WorkspaceKey; title: string; detail: string; icon: 'grid' | 'database' | 'layers' | 'shield' | 'compass' | 'history' }[] = [
  { key: 'overview', title: 'Overview', detail: 'Command center', icon: 'grid' },
  { key: 'saves', title: 'Save Library', detail: 'Local inspection', icon: 'database' },
  { key: 'players', title: 'Player Lab', detail: 'Exported player scouting', icon: 'compass' },
  { key: 'history', title: 'Historical snapshots', detail: 'FM2013 research captures', icon: 'history' },
  { key: 'squad', title: 'Squad Planner', detail: 'Verified position assignments', icon: 'layers' },
  { key: 'modules', title: 'Football Systems', detail: 'All 27 workstreams', icon: 'layers' },
  { key: 'architecture', title: 'Data & Trust', detail: 'How it works', icon: 'shield' }
];

type Theme = 'dark' | 'light';

// The decoded database and its projection inputs form one authoritative source.
// The projector is loaded only when a decoded source is explicitly opened.
type SaveProjector = typeof import('@managerhub/domain/fm2013-offline')['saveDatabaseToPlayerDataset'];
type ActiveSource =
  | { readonly kind: 'export'; readonly dataset: PlayerDataset }
  | { readonly kind: 'save'; readonly database: DecodedSaveDatabase; readonly clubUid: number | null; readonly project: SaveProjector };
type SaveSession = { readonly mode: DecodedSaveMode; readonly source: ActiveSource | null };
function loadPreference<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const value = localStorage.getItem(key);
    if (value && allowed.includes(value as T)) return value as T;
  } catch { /* Storage may be disabled. */ }
  return fallback;
}
function routeFromHash(): WorkspaceKey {
  const hash = window.location.hash.slice(2);
  return NAV.some(n => n.key === hash) ? hash as WorkspaceKey : 'overview';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => loadPreference('mh-theme', 'dark', ['dark', 'light']));
  const [glass, setGlass] = useState(() => loadPreference('mh-glass', 'on', ['on', 'off']));
  const [imports, setImports] = useState<SaveInspectionResult[]>([]);
  const [decodedSaves, setDecodedSaves] = useState<Record<string, DecodedSaveDatabase>>({});
  const [session, setSession] = useState<SaveSession>({ mode: 'realism', source: null });
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
  const viewScope = useRef<HTMLElement>(null);
  const commandDialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const saveMode = session.mode;
  const activeDecodedSave = session.source?.kind === 'save' ? session.source.database : null;
  const activeSaveId = activeDecodedSave?.source.saveId ?? null;
  const activeClubFilterUid = session.source?.kind === 'save' ? session.source.clubUid : null;
  const playerDataset = useMemo(() => {
    const source = session.source;
    if (!source) return null;
    return source.kind === 'export' ? source.dataset : source.project(source.database, session.mode, { clubUid: source.clubUid });
  }, [session]);

  useEffect(() => {
    setTacticalScenarios(previous => {
      const A = tacticalScenarioForFormation(previous.A, squadPlans.A.formation);
      const B = tacticalScenarioForFormation(previous.B, squadPlans.B.formation);
      return A === previous.A && B === previous.B ? previous : { A, B };
    });
  }, [squadPlans.A.formation, squadPlans.B.formation]);

  const resetDerivedWorkspaceState = useCallback(() => {
    setScoutShortlistIds([]);
    setSquadPlans(createDefaultSquadPlans());
    setTacticalScenarios(defaultTacticalScenarios());
    setActiveSquadPlan('A');
    setSelectedPlayerIdForLab(null);
  }, []);

  // Every explicit source choice invalidates older pending opens, including
  // IndexedDB restores, worker decodes and optional export selection.
  const onCancelDecode = useCallback(() => {
    inspectionRevisionRef.current += 1;
    inspectionAbortRef.current?.abort();
    inspectionAbortRef.current = null;
    setBusy(false);
    setDecodeProgress(null);
  }, []);

  const onPlayerDatasetChange = useCallback((next: PlayerDataset | null) => {
    if (next?.source === 'decoded_save') return;
    onCancelDecode();
    setSession(current => ({ ...current, source: next ? { kind: 'export', dataset: next } : null }));
    resetDerivedWorkspaceState();
  }, [onCancelDecode, resetDerivedWorkspaceState]);

  const commitDecodedSave = useCallback((
    db: DecodedSaveDatabase, project: SaveProjector, inspection: SaveInspectionResult
  ) => {
    const clubUid = defaultClubUidForSave(db);
    setDecodedSaves(prev => ({ ...prev, [db.source.saveId]: db }));
    setImports(prev => [inspection, ...prev.filter(item => item.id !== inspection.id)]);
    setSelectedId(inspection.id);
    setSession(current => ({ ...current, source: { kind: 'save', database: db, clubUid, project } }));
    resetDerivedWorkspaceState();
  }, [resetDerivedWorkspaceState]);

  const openDecodedSave = useCallback(async (
    saveId: string, read: (saveId: string) => Promise<DecodedSaveDatabase | null>
  ) => {
    onCancelDecode();
    const revision = inspectionRevisionRef.current;
    if (saveId === activeSaveId) return;
    setError(null);
    setDecodeNotice(null);
    try {
      const db = await read(saveId);
      if (!db || revision !== inspectionRevisionRef.current) return;
      if (db.source.saveId !== saveId) throw new Error('Save identity mismatch');
      const { saveDatabaseToPlayerDataset } = await import('@managerhub/domain/fm2013-offline');
      if (revision !== inspectionRevisionRef.current) return;
      commitDecodedSave(db, saveDatabaseToPlayerDataset, buildInspectionFromDecoded(db));
    } catch (exception) {
      if (revision === inspectionRevisionRef.current) setError(readableSaveInspectionError(exception));
    }
  }, [activeSaveId, onCancelDecode, commitDecodedSave]);

  const onSwitchDecodedSave = useCallback((saveId: string) => {
    const target = decodedSaves[saveId];
    if (!target) return;
    void openDecodedSave(saveId, () => Promise.resolve(target));
  }, [decodedSaves, openDecodedSave]);

  const onSetSaveMode = useCallback((nextMode: DecodedSaveMode) => {
    setSession(current => current.mode === nextMode ? current : { ...current, mode: nextMode });
  }, []);

  const onClubFilterChange = useCallback((nextClubUid: number | null) => {
    if (!activeDecodedSave || activeClubFilterUid === nextClubUid) return;
    const saveId = activeDecodedSave.source.saveId;
    setSession(current => current.source?.kind === 'save' && current.source.database.source.saveId === saveId
      ? { ...current, source: { ...current.source, clubUid: nextClubUid } }
      : current);
    resetDerivedWorkspaceState();
  }, [activeDecodedSave, activeClubFilterUid, resetDerivedWorkspaceState]);

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
        event.preventDefault(); setCommandOpen(open => !open);
      }
      if (event.key === 'Escape') { setCommandOpen(false); setMenuOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!commandOpen) return;
    const restore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = commandDialogRef.current?.querySelector<HTMLButtonElement>('.command-item');
    first?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons = Array.from(commandDialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
      if (!buttons.length) return;
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === firstButton) { event.preventDefault(); lastButton?.focus(); }
      else if (!event.shiftKey && document.activeElement === lastButton) { event.preventDefault(); firstButton?.focus(); }
    };
    window.addEventListener('keydown', trap);
    return () => { window.removeEventListener('keydown', trap); restore?.focus(); };
  }, [commandOpen]);

  const navigate = useCallback((key: WorkspaceKey) => {
    const next = '#/' + key;
    if (window.location.hash === next) setView(key);
    else window.location.hash = next;
    setCommandOpen(false); setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  const openSquad = useCallback(() => navigate('squad'), [navigate]);
  const openPlayers = useCallback(() => navigate('players'), [navigate]);
  const openSaves = useCallback(() => navigate('saves'), [navigate]);

  const onOpenPlayerFromSave = useCallback((playerUid: number, clubUid: number | null) => {
    if (!activeDecodedSave) return;
    const targetPlayerId = `${activeDecodedSave.source.saveId.slice(0, 12)}:${playerUid}`;
    if (activeClubFilterUid !== null && activeClubFilterUid !== clubUid) {
      onClubFilterChange(clubUid);
    }
    setSelectedPlayerIdForLab(targetPlayerId);
    navigate('players');
  }, [activeDecodedSave, activeClubFilterUid, onClubFilterChange, navigate]);

  const onLoadClubInSquad = useCallback((clubUid: number | null) => {
    onClubFilterChange(clubUid);
    navigate('squad');
  }, [onClubFilterChange, navigate]);

  const onRestoreSaved = useCallback((records: readonly SaveIdentity[]) => {
    setImports(current => {
      const existingIds = new Set(current.map(item => item.id));
      return [...records.filter(item => !existingIds.has(item.id)), ...current];
    });
    setSelectedId(current => current ?? records[0]?.id ?? null);
  }, []);

  const onInspect = useCallback(async (file: File) => {
    // Only a result belonging to the most recent user-selected file may
    // update the Save Library; terminate the superseded worker immediately.
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
        const { saveDatabaseToPlayerDataset } = await import('@managerhub/domain/fm2013-offline');
        if (controller.signal.aborted || revision !== inspectionRevisionRef.current) return;
        commitDecodedSave(result.database, saveDatabaseToPlayerDataset, result.inspection);
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
        inspectionAbortRef.current = null;
        setBusy(false);
        setDecodeProgress(null);
      }
    }
  }, [commitDecodedSave]);

  const remove = useCallback((id: string) => {
    setImports(prev => prev.filter(file => file.id !== id));
    setSelectedId(current => current === id ? null : current);
    setDecodedSaves(prev => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeSaveId === id) {
      onCancelDecode();
      setSession(current => current.source?.kind === 'save' && current.source.database.source.saveId === id
        ? { ...current, source: null } : current);
      resetDerivedWorkspaceState();
    }
  }, [activeSaveId, onCancelDecode, resetDerivedWorkspaceState]);

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
          <button className="icon-action" aria-label={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/></button>
          <button className="icon-action" aria-label={t(glass === 'on' ? 'Disable glass effects' : 'Enable glass effects')} title={t(glass === 'on' ? 'Disable glass' : 'Enable glass')} onClick={() => setGlass(s => s === 'on' ? 'off' : 'on')}><Icon name="settings" size={18}/></button>
          <div className="topbar-divider"/>
          <Status tone="positive">{t("Local first")}</Status>
        </div>
      </header>
      <main ref={viewScope} className="main-area" id="main-content" tabIndex={-1}>
        <Suspense fallback={null}><WorkspaceAnimator scope={viewScope} view={view} reduced={reduced}/></Suspense>
        <div data-animate="workspace" key={view}>
          <Suspense fallback={<WorkspaceLoading/>}>
            {view === 'overview' && <Overview
              imports={imports}
              current={playerDataset}
              activeDecodedSave={activeDecodedSave}
              onDataset={onPlayerDatasetChange}
              go={navigate}
            />}
            {view === 'players' && <PlayerWorkspace
              dataset={playerDataset}
              shortlistIds={scoutShortlistIds}
              setShortlistIds={setScoutShortlistIds}
              onDataset={onPlayerDatasetChange}
              onOpenSquad={openSquad}
              activeDecodedSave={activeDecodedSave}
              saveMode={saveMode}
              onSetSaveMode={onSetSaveMode}
              clubFilterUid={activeClubFilterUid}
              onClubFilterChange={onClubFilterChange}
              initialPlayerId={selectedPlayerIdForLab}
            />}
            {view === 'history' && <HistoricalWorkspace/>}
            {view === 'squad' && <SquadWorkspace
              dataset={playerDataset}
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
              clubFilterUid={activeClubFilterUid}
              onClubFilterChange={onClubFilterChange}
            />}
            {view === 'saves' && <SaveInspector
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
            />}
            {view === 'modules' && <Systems/>}
            {view === 'architecture' && <Architecture/>}
          </Suspense>
        </div>
        <footer className="app-footer"><span>{t("MANAGERHUB  /  DEVELOPMENT WORKSPACE")}</span><span>{t("Read-only browser inspection · No source save changes")}</span></footer>
      </main>
    </div>
    {commandOpen && <div className="command-overlay" role="presentation" onMouseDown={event => {if(event.target === event.currentTarget) setCommandOpen(false);}}>
      <div ref={commandDialogRef} className="command-dialog mh-surface mh-surface--glass" role="dialog" aria-modal="true" aria-label={t("Quick navigation")}>
        <div className="command-top"><Icon name="search" size={19}/><span>{t("Jump to a workspace")}</span><button className="icon-action" onClick={() => setCommandOpen(false)} aria-label={t("Close quick navigation")}><Icon name="close" size={17}/></button></div>
        {NAV.map(item => <button key={item.key} className="command-item" onClick={() => navigate(item.key)}><Icon name={item.icon}/><span>{t(item.title)}</span><Icon name="arrow" size={15}/></button>)}
        <div className="command-footer">{t("Esc to close · Ctrl/⌘ K to open")}</div>
      </div>
    </div>}
  </div>;
}
