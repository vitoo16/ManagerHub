import { setAppLocale } from './i18n';
import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  createDefaultSquadPlans, type PlayerDataset, type SaveIdentity,
  type SquadPlanKey, type SquadPlans, type WorkspaceKey
} from '@managerhub/domain';
import { Icon, Status } from '@managerhub/ui';
import { useReducedMotion, useWorkspaceTransition } from '@managerhub/motion';
import { inspectSaveInWorker } from './inspect-save-in-worker';
import { readableSaveInspectionError } from './i18n/save-inspection-copy';
import { useSaveInspectionLibrary } from './useSaveInspectionLibrary';
import './app.css';

const Overview = lazy(() => import('./features/overview/Overview'));
const SaveInspector = lazy(() => import('./features/save-library/SaveInspector'));
const Systems = lazy(() => import('./features/systems/Systems'));
const Architecture = lazy(() => import('./features/architecture/Architecture'));
const PlayerWorkspace = lazy(() => import('./PlayerWorkspace').then(module => ({ default: module.PlayerWorkspace })));
const SquadWorkspace = lazy(() => import('./SquadWorkspace').then(module => ({ default: module.SquadWorkspace })));

const NAV: { key: WorkspaceKey; title: string; detail: string; icon: 'grid' | 'database' | 'layers' | 'shield' | 'compass' }[] = [
  { key: 'overview', title: 'Overview', detail: 'Command center', icon: 'grid' },
  { key: 'saves', title: 'Save Library', detail: 'Local inspection', icon: 'database' },
  { key: 'players', title: 'Player Lab', detail: 'Exported player scouting', icon: 'compass' },
  { key: 'squad', title: 'Squad Planner', detail: 'Verified position assignments', icon: 'layers' },
  { key: 'modules', title: 'Football Systems', detail: 'All 27 workstreams', icon: 'layers' },
  { key: 'architecture', title: 'Data & Trust', detail: 'How it works', icon: 'shield' }
];

type Theme = 'dark' | 'light';
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
      <div className="rail-project"><span className="rail-project__led"/><div><strong>{t("Development workspace")}</strong><small>{t("Phase 01 · Foundation")}</small></div></div>
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
  const [imports, setImports] = useState<SaveIdentity[]>([]);
  const [playerDataset, setPlayerDataset] = useState<PlayerDataset | null>(null);
  const [squadPlans, setSquadPlans] = useState<SquadPlans>(createDefaultSquadPlans);
  const [activeSquadPlan, setActiveSquadPlan] = useState<SquadPlanKey>('A');
  const onPlayerDatasetChange = useCallback((next: PlayerDataset | null) => {
    setPlayerDataset(next);
    setSquadPlans(createDefaultSquadPlans());
    setActiveSquadPlan('A');
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveMetadataHydrated = useRef(false);
  const saveLibrary = useSaveInspectionLibrary();
  const viewScope = useRef<HTMLElement>(null);
  const commandDialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (saveLibrary.loading || saveMetadataHydrated.current) return;
    saveMetadataHydrated.current = true;
    if (saveLibrary.items.length === 0) return;
    setImports(current => {
      const existingIds = new Set(current.map(item => item.id));
      return [...saveLibrary.items.filter(item => !existingIds.has(item.id)), ...current];
    });
    setSelectedId(current => current ?? saveLibrary.items[0]?.id ?? null);
  }, [saveLibrary.loading, saveLibrary.items]);

  useWorkspaceTransition(viewScope, view, reduced);
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
  const onInspect = useCallback(async (file: File) => {
    setBusy(true); setError(null);
    try {
      const result = await inspectSaveInWorker(file);
      setImports(previous => [result, ...previous.filter(item => item.id !== result.id)]);
      setSelectedId(result.id);
    } catch (exception) {
      setError(readableSaveInspectionError(exception));
    } finally { setBusy(false); }
  }, []);
  const remove = useCallback((id: string) => {
    setImports(prev => prev.filter(file => file.id !== id));
    setSelectedId(current => current === id ? null : current);
  }, []);
  const selected = imports.find(f => f.id === selectedId) ?? imports[0] ?? null;
  const activeItem = NAV.find(n => n.key === view) ?? NAV[0];

  return <div className="app-frame">
    {menuOpen && <button className="mobile-backdrop" aria-label={t("Close navigation menu")} onClick={() => setMenuOpen(false)}/>}
    <aside className={'sidebar mh-surface mh-surface--glass ' + (menuOpen ? 'sidebar--open' : '')} aria-label={t("Primary sidebar")}><Rail current={view} onNavigate={navigate} onClose={() => setMenuOpen(false)}/></aside>
    <div className="app-column">
      <header className="topbar mh-surface mh-surface--glass">
        <div className="topbar-left"><button aria-label={t("Open navigation menu")} className="icon-action mobile-menu" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button>
          <div className="topbar-breadcrumb"><span>{t("ManagerHub")}</span><Icon name="chevron" size={14}/><strong>{t(activeItem?.title ?? 'Overview')}</strong></div>
        </div>
        <div className="topbar-right">
          <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-label={t("Open navigation search")}><Icon name="search" size={15}/><span>{t("Quick navigate")}</span><kbd>⌘ K</kbd></button>
          <div className="language-switch" role="group" aria-label={t('Change language')}>
            <button type="button" lang="vi" aria-label={t('Switch language to Vietnamese')}
              aria-pressed={i18n.resolvedLanguage === 'vi'}
              onClick={() => void setAppLocale('vi')}>VI</button>
            <button type="button" lang="en" aria-label={t('Switch language to English')}
              aria-pressed={i18n.resolvedLanguage !== 'vi'}
              onClick={() => void setAppLocale('en')}>EN</button>
          </div>
          <button className="icon-action" aria-label={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/></button>
          <button className="icon-action" aria-label={t(glass === 'on' ? 'Disable glass effects' : 'Enable glass effects')} title={t(glass === 'on' ? 'Disable glass' : 'Enable glass')} onClick={() => setGlass(s => s === 'on' ? 'off' : 'on')}><Icon name="settings" size={18}/></button>
          <div className="topbar-divider"/>
          <Status tone="positive">{t("Local first")}</Status>
        </div>
      </header>
      <main ref={viewScope} className="main-area" id="main-content" tabIndex={-1}>
        <div data-animate="workspace" key={view}>
          <Suspense fallback={<WorkspaceLoading/>}>
            {view === 'overview' && <Overview imports={imports} go={navigate}/>}
            {view === 'players' && <PlayerWorkspace dataset={playerDataset} onDataset={onPlayerDatasetChange} onOpenSquad={openSquad}/>}
            {view === 'squad' && <SquadWorkspace dataset={playerDataset} onImport={openPlayers}
              plans={squadPlans} setPlans={setSquadPlans} active={activeSquadPlan} setActive={setActiveSquadPlan}/>}
            {view === 'saves' && <SaveInspector imports={imports} selected={selected} onInspect={onInspect} onRemove={remove} busy={busy} error={error} select={setSelectedId} saveLibrary={saveLibrary}/>}
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
