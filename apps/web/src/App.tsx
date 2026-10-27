import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  FEATURES, FEATURE_GROUPS, formatBytes, inspectSave, type SaveIdentity, type WorkspaceKey
} from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import { useReducedMotion, useWorkspaceTransition } from '@managerhub/motion';
import { PlayerWorkspace } from './PlayerWorkspace';
import { SquadWorkspace } from './SquadWorkspace';
import type { PlayerDataset } from '@managerhub/domain';
import './app.css';

const NAV: { key: WorkspaceKey; title: string; detail: string; icon: 'grid' | 'database' | 'layers' | 'shield' | 'compass' }[] = [
  { key: 'overview', title: 'Overview', detail: 'Command center', icon: 'grid' },
  { key: 'saves', title: 'Save Library', detail: 'Local inspection', icon: 'database' },
  { key: 'players', title: 'Player Lab', detail: 'Exported player scouting', icon: 'compass' },
  { key: 'squad', title: 'Squad Planner', detail: 'Verified position assignments', icon: 'layers' },
  { key: 'modules', title: 'Football Systems', detail: 'All 27 workstreams', icon: 'layers' },
  { key: 'architecture', title: 'Data & Trust', detail: 'How it works', icon: 'shield' }
];

const PHASES = [
  { name: 'Foundation & Interface', detail: 'Core architecture, design system, motion', count: 'Phase 01' },
  { name: 'Football Manager Data', detail: 'Save adapters, verified player records', count: 'Phase 02' },
  { name: 'Player Intelligence', detail: 'eCA, role intelligence, scouting charts', count: 'Phase 03' },
  { name: 'Tactics & Squad Planning', detail: 'Tactical Lab, optimized lineups', count: 'Phase 04' },
  { name: 'Sporting Department', detail: 'Transfers, contracts, youth, finance', count: 'Phase 05' },
  { name: 'Club Management & AI', detail: 'Matchday, boardroom, AI staff', count: 'Phase 06' },
  { name: 'Full Integration', detail: 'Set pieces, certified editor, release', count: 'Phase 07' }
] as const;

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

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo-row">
    <div className="logo-mark"><div className="logo-mark__inner"><span className="logo-orbit"/></div></div>
    {!compact && <div><strong>MANAGER<span>HUB</span></strong><small>FOOTBALL INTELLIGENCE</small></div>}
  </div>;
}

function Rail({ current, onNavigate, onClose }: {
  current: WorkspaceKey; onNavigate: (key: WorkspaceKey) => void; onClose: () => void
}) {
  return <div className="rail-shell">
    <div className="rail-top"><Logo/><button aria-label="Close menu" className="mobile-close icon-action" onClick={onClose}><Icon name="close"/></button></div>
    <div className="rail-caption">WORKSPACE</div>
    <nav className="rail-links" aria-label="Main navigation">
      {NAV.map(item =>
        <button key={item.key} aria-current={current === item.key ? 'page' : undefined}
          className={'rail-link ' + (current === item.key ? 'rail-link--active' : '')}
          onClick={() => { onNavigate(item.key); onClose(); }}>
          <span className="rail-link__icon"><Icon name={item.icon} size={18}/></span>
          <span className="rail-link__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          {current === item.key && <span aria-hidden="true" className="rail-link__active"/>}
        </button>
      )}
    </nav>
    <div className="rail-bottom">
      <div className="rail-project"><span className="rail-project__led"/><div><strong>Development workspace</strong><small>Phase 01 · Foundation</small></div></div>
      <a className="rail-documentation" href="https://github.com/vitoo16/ManagerHub/tree/main/docs" target="_blank" rel="noreferrer">
        <Icon name="book" size={16}/> Project documentation <Icon name="arrow" size={15}/>
      </a>
    </div>
  </div>;
}

function Overview({ imports, go }: { imports: readonly SaveIdentity[]; go: (key: WorkspaceKey) => void }) {
  return <div className="view-flow">
    <div className="hero">
      <div className="hero-content">
        <div className="hero-kicker"><span className="hero-kicker__dot"/> THE NEXT ERA OF FOOTBALL MANAGEMENT</div>
        <h1>Every decision.<br/><em>Better informed.</em></h1>
        <p>A single command center for your career. Built around verified Football Manager data, transparent analysis and a system designed to grow with the club.</p>
        <div className="hero-actions">
          <Button variant="primary" onClick={() => go('saves')}><Icon name="plus" size={17}/> Inspect a save</Button>
          <Button onClick={() => go('players')}><Icon name="compass" size={17}/> Player Lab</Button>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="radar-rings"><i/><i/><i/><i/></div>
        <div className="hero-pitch"><span className="pitch-line pitch-line-a"/><span className="pitch-line pitch-line-b"/><span className="pitch-line pitch-line-c"/><span className="pitch-circle"/></div>
        <div className="hero-art-caption">PLAN  ·  ANALYZE  ·  EVOLVE</div>
      </div>
    </div>
    <div className="headline-stats" aria-label="Workspace information">
      <Surface className="stat-card"><span className="stat-label">Product scope</span><div className="stat-value">27<span>modules</span></div><span className="stat-sub">Six interconnected departments</span></Surface>
      <Surface className="stat-card"><span className="stat-label">Local files inspected</span><div className="stat-value">{imports.length.toString().padStart(2, '0')}<span>files</span></div><span className="stat-sub">No save files uploaded to a server</span></Surface>
      <Surface className="stat-card"><span className="stat-label">Current implementation</span><div className="stat-value stat-value--word">Foundation</div><span className="stat-sub">Read-only signatures · No decoded player data</span></Surface>
    </div>
    <SectionHeading eyebrow="BUILD PROGRESS" title="Your management ecosystem">
      <button className="text-link" onClick={() => go('modules')}>All 27 workstreams <Icon name="arrow" size={15}/></button>
    </SectionHeading>
    <div className="overview-panels">
      <Surface className="phase-card">
        <div className="panel-heading"><span>DEVELOPMENT ROADMAP</span><Status tone="info">7 integrated phases</Status></div>
        <div className="phase-list">
          {PHASES.slice(0, 5).map((phase, i) =>
            <div key={phase.name} className="phase-row">
              <div className={'phase-marker ' + (i === 0 ? 'phase-marker--active' : '')}>{String(i + 1).padStart(2, '0')}</div>
              <div className="phase-row__copy"><strong>{phase.name}</strong><small>{phase.detail}</small></div>
              <span className="phase-row__state">{i === 0 ? 'IN PROGRESS' : 'PLANNED'}</span>
            </div>
          )}
        </div>
        <div className="phase-card__footer"><button className="text-link" onClick={() => go('modules')}>Full feature directory <Icon name="chevron" size={14}/></button></div>
      </Surface>
      <Surface className="principles-card">
        <div className="panel-heading"><span>ENGINEERING PRINCIPLES</span><Icon name="shield" size={17}/></div>
        <div className="principle"><span className="principle__icon"><Icon name="check" size={18}/></span><div><strong>Evidence over estimates</strong><p>Actual CA, estimated ability and tactical suitability stay separate.</p></div></div>
        <div className="principle"><span className="principle__icon"><Icon name="check" size={18}/></span><div><strong>One consistent system</strong><p>Shared data contracts, role catalogs and reusable analytics components.</p></div></div>
        <div className="principle"><span className="principle__icon"><Icon name="check" size={18}/></span><div><strong>Your files, your control</strong><p>Browser inspection is local. Native save editing is not enabled.</p></div></div>
        <button onClick={() => go('architecture')} className="principles-link">Understand data integrity <Icon name="arrow" size={16}/></button>
      </Surface>
    </div>
  </div>;
}

function SaveInspector({ imports, selected, onInspect, onRemove, busy, error, select }: {
  imports: readonly SaveIdentity[]; selected: SaveIdentity | null;
  onInspect: (file: File) => Promise<void>; onRemove: (id: string) => void;
  busy: boolean; error: string | null; select: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const fileId = useId();
  const [drag, setDrag] = useState(false);
  const openPicker = () => { if (!busy) inputRef.current?.click(); };
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) void onInspect(file);
    event.currentTarget.value = '';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDrag(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void onInspect(file);
  };
  return <div className="view-flow">
    <div className="page-title"><div className="mh-eyebrow">GAME DATA / LOCAL FILES</div><h1>Save Library</h1><p>Inspect a Football Manager save without uploading it. Only the binary container signature is identified at this stage — player data has not been decoded.</p></div>
    <Surface className={'file-drop ' + (drag ? 'file-drop--drag' : '')} onDragOver={e => {e.preventDefault(); setDrag(true);}} onDragLeave={() => setDrag(false)} onDrop={handleDrop}>
      <input ref={inputRef} id={fileId} className="visually-hidden" type="file" accept=".fm" onChange={handleInput} tabIndex={-1}/>
      <div className="file-drop__icon"><Icon name="file" size={29}/></div>
      <h2>Inspect a saved career</h2>
      <p>Drag a <strong>.fm</strong> file here, or choose one from your device.<br/>The original file is never modified.</p>
      <Button variant="primary" disabled={busy} onClick={openPicker}><Icon name={busy ? 'monitor' : 'plus'} size={16}/>{busy ? 'Inspecting file…' : 'Choose .fm file'}</Button>
      <span className="file-drop__limit">Browser inspection limit · 256 MB · No cloud upload</span>
    </Surface>
    {error && <div role="alert" className="inline-alert"><Icon name="warning" size={18}/><span>{error}</span><button aria-label="Dismiss error" onClick={openPicker}>Choose another file</button></div>}
    <SectionHeading eyebrow="IMPORTED METADATA ONLY" title={'Inspected files (' + imports.length + ')'}><Status>Local browser session</Status></SectionHeading>
    {imports.length === 0
      ? <Surface className="empty-library"><Icon name="database" size={29}/><h3>No files inspected yet</h3><p>Once selected, file signatures and available inspection details will appear here. This is not a player database.</p></Surface>
      : <div className="library-grid">
        <Surface className="save-list" role="list" aria-label="Inspected save files">
          {imports.map(file => <div role="listitem" className="save-list__item" key={file.id}>
            <button className={'save-select ' + (file.id === selected?.id ? 'save-select--active' : '')} onClick={() => select(file.id)}>
              <span className="save-select__icon"><Icon name="file"/></span><span className="save-select__copy"><strong title={file.name}>{file.name}</strong><small>{formatBytes(file.size)} · {file.detectedFamily?.toUpperCase() || 'Unknown'} signature</small></span>
            </button>
            <button className="delete-save" aria-label={'Remove ' + file.name + ' from inspected list'} onClick={() => onRemove(file.id)}><Icon name="trash" size={16}/></button>
          </div>)}
        </Surface>
        {selected && <Surface className="save-detail">
          <div className="panel-heading"><span>FILE INSPECTION</span><Status tone={selected.detectedFamily ? 'info' : 'warning'}>{selected.detectedFamily ? 'Signature recognized' : 'Unknown format'}</Status></div>
          <h3 title={selected.name}>{selected.name}</h3>
          <dl className="detail-grid">
            <dt>Container family</dt><dd>{selected.detectedFamily?.toUpperCase() || 'Unknown'}</dd>
            <dt>Edition / build</dt><dd>Not verified</dd>
            <dt>Size</dt><dd>{formatBytes(selected.size)}</dd>
            <dt>Header bytes</dt><dd className="mono">{selected.signature}</dd>
            <dt>SHA-256</dt><dd className="mono digest">{selected.sha256 || 'Not calculated'}</dd>
            <dt>Player / CA / PA</dt><dd>Not decoded</dd>
          </dl>
          {selected.archiveIndex && <div className="archive-preview">
            <div className="archive-preview__head"><div><strong>Internal archive index</strong><small>Experimental metadata discovery · Not decoded gameplay records</small></div><Status tone="warning">{selected.archiveIndex.memberCount} entries</Status></div>
            <div className="archive-preview__list" role="list" aria-label="Internal save archive members">
              {selected.archiveIndex.members.slice(0, showAllMembers ? undefined : 8).map((entry, i) => <div className="archive-preview__row" role="listitem" key={entry.filename + i}>
                <span className="archive-preview__filename" title={entry.filename}>{entry.filename}</span><span>{formatBytes(entry.storedBytes)}</span>
              </div>)}
            </div>
            {selected.archiveIndex.memberCount > 8 && <button className="text-link archive-preview__expand" onClick={() => setShowAllMembers(v => !v)}>{showAllMembers ? 'Show fewer' : 'Show all ' + selected.archiveIndex.memberCount + ' entries'} <Icon name="chevron" size={14}/></button>}
          </div>}
          <div className="inspector-note"><Icon name="warning" size={16}/><p>{selected.warnings.join(' ')}</p></div>
        </Surface>}
      </div>}
    <div className="coverage-note"><Icon name="shield" size={17}/><p><strong>Important:</strong> recognizing AFE or FMF headers does not establish compatibility, identify your Football Manager version or give access to player attributes. Those capabilities require validated version-specific adapters.</p></div>
  </div>;
}

function Systems() {
  const [group, setGroup] = useState('All departments');
  const [query, setQuery] = useState('');
  const visible = FEATURES.filter(feature =>
    (group === 'All departments' || feature.group === group) &&
    [feature.title, feature.id, feature.group].some(value => value.toLowerCase().includes(query.toLowerCase())));
  return <div className="view-flow">
    <div className="page-title"><div className="mh-eyebrow">THE FULL PRODUCT / 27 MODULES</div><h1>Football Systems</h1><p>Every department, one connected operating model. This is the development scope, not a catalogue of features already implemented.</p></div>
    <div className="module-toolbar"><label className="search-box"><Icon name="search" size={17}/><span className="visually-hidden">Search modules</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search modules or ID…"/></label>
      <label className="select-label"><span className="visually-hidden">Department filter</span><select value={group} onChange={e => setGroup(e.target.value)}><option>All departments</option>{FEATURE_GROUPS.map(s => <option key={s}>{s}</option>)}</select></label>
    </div>
    <div className="module-count">{visible.length} of 27 modules</div>
    <div className="module-grid">{visible.map(item => <Surface className="module-card" key={item.id}>
      <div className="module-card__top"><span className="module-id">{item.id}</span><span className="module-phase">PHASE {String(item.phase).padStart(2, '0')}</span></div>
      <h2>{item.title}</h2><div className="module-card__bottom"><span>{item.group}</span><Status tone={['MH-01','MH-02','MH-05','MH-06'].includes(item.id) ? 'info' : 'neutral'}>{['MH-01','MH-02','MH-05','MH-06'].includes(item.id) ? 'In development' : 'Planned'}</Status></div>
    </Surface>)}</div>
    {visible.length === 0 && <Surface className="empty-library"><h3>No matching modules</h3><p>Adjust the department filter or search term.</p></Surface>}
    <div className="reference-link"><Icon name="book" size={18}/><span>Full specification and acceptance criteria:</span><a target="_blank" rel="noreferrer" href="https://github.com/vitoo16/ManagerHub/blob/main/docs/product/01-full-feature-catalog.md">Feature Catalogue <Icon name="arrow" size={14}/></a></div>
  </div>;
}

function Architecture() {
  return <div className="view-flow">
    <div className="page-title"><div className="mh-eyebrow">TRANSPARENT BY DESIGN</div><h1>Data & Trust</h1><p>A dependable football analysis platform starts by separating what the game actually stores from what our models calculate.</p></div>
    <div className="trust-banner"><Icon name="shield" size={24}/><div><strong>Read-only by default</strong><p>Your original save remains untouched. A future editor will require independently verified compatibility, backups and full round-trip validation.</p></div><Status tone="positive">Design policy</Status></div>
    <SectionHeading eyebrow="ARCHITECTURE" title="Evidence flows in one direction"/>
    <div className="architecture-path">{[
      { n: '01', title: 'Original save', detail: 'Selected locally, no automatic upload' },
      { n: '02', title: 'Versioned adapter', detail: 'Format identification and validated decoding' },
      { n: '03', title: 'Verified fields', detail: 'Source, edition, build and coverage preserved' },
      { n: '04', title: 'Football intelligence', detail: 'Explainable models with calibrated uncertainty' }
    ].map(item => <Surface key={item.n} className="architecture-node"><span>{item.n}</span><h3>{item.title}</h3><p>{item.detail}</p></Surface>)}</div>
    <SectionHeading eyebrow="METRIC INTEGRITY" title="Different numbers. Different meanings."/>
    <div className="trust-metrics">
      {[
        { code: 'CA', title: 'Actual Current Ability', detail: 'A real game value only when decoded and independently verified.' },
        { code: 'eCA', title: 'Estimated Ability', detail: 'An explicitly labeled model estimate, not Sports Interactive’s algorithm.' },
        { code: 'RF', title: 'Role Fit', detail: 'A transparent product score assessing suitability for a tactical job.' },
        { code: 'PA', title: 'Potential Ability', detail: 'Only displayed when a compatible source verifies the real game value.' }
      ].map(item => <Surface className="metric-explainer" key={item.code}><span>{item.code}</span><div><h3>{item.title}</h3><p>{item.detail}</p></div></Surface>)}
    </div>
  </div>;
}

export default function App() {
  const [view, setView] = useState<WorkspaceKey>(routeFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => loadPreference('mh-theme', 'dark', ['dark', 'light']));
  const [glass, setGlass] = useState(() => loadPreference('mh-glass', 'on', ['on', 'off']));
  const [imports, setImports] = useState<SaveIdentity[]>([]);
  const [playerDataset, setPlayerDataset] = useState<PlayerDataset | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const viewScope = useRef<HTMLElement>(null);
  const commandDialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

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
  const onInspect = async (file: File) => {
    setBusy(true); setError(null);
    try {
      const result = await inspectSave(file);
      setImports(previous => [result, ...previous.filter(item => item.id !== result.id)]);
      setSelectedId(result.id);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Unable to inspect file.');
    } finally { setBusy(false); }
  };
  const remove = (id: string) => {
    setImports(prev => prev.filter(file => file.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const selected = imports.find(f => f.id === selectedId) ?? imports[0] ?? null;
  const activeItem = NAV.find(n => n.key === view) ?? NAV[0];

  return <div className="app-frame">
    {menuOpen && <button className="mobile-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)}/>}
    <aside className={'sidebar mh-surface mh-surface--glass ' + (menuOpen ? 'sidebar--open' : '')} aria-label="Primary sidebar"><Rail current={view} onNavigate={navigate} onClose={() => setMenuOpen(false)}/></aside>
    <div className="app-column">
      <header className="topbar mh-surface mh-surface--glass">
        <div className="topbar-left"><button aria-label="Open navigation menu" className="icon-action mobile-menu" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button>
          <div className="topbar-breadcrumb"><span>ManagerHub</span><Icon name="chevron" size={14}/><strong>{activeItem?.title}</strong></div>
        </div>
        <div className="topbar-right">
          <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-label="Open navigation search"><Icon name="search" size={15}/><span>Quick navigate</span><kbd>⌘ K</kbd></button>
          <button className="icon-action" aria-label={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/></button>
          <button className="icon-action" aria-label={glass === 'on' ? 'Disable glass effects' : 'Enable glass effects'} title={glass === 'on' ? 'Disable glass' : 'Enable glass'} onClick={() => setGlass(s => s === 'on' ? 'off' : 'on')}><Icon name="settings" size={18}/></button>
          <div className="topbar-divider"/>
          <Status tone="positive">Local first</Status>
        </div>
      </header>
      <main ref={viewScope} className="main-area" id="main-content" tabIndex={-1}>
        <div data-animate="workspace" key={view}>
          {view === 'overview' && <Overview imports={imports} go={navigate}/>}
          {view === 'players' && <PlayerWorkspace dataset={playerDataset} onDataset={setPlayerDataset}/>}
          {view === 'squad' && <SquadWorkspace dataset={playerDataset} onImport={() => navigate('players')}/>}
          {view === 'saves' && <SaveInspector imports={imports} selected={selected} onInspect={onInspect} onRemove={remove} busy={busy} error={error} select={setSelectedId}/>}
          {view === 'modules' && <Systems/>}
          {view === 'architecture' && <Architecture/>}
        </div>
        <footer className="app-footer"><span>MANAGERHUB  /  DEVELOPMENT WORKSPACE</span><span>Read-only browser inspection · No source save changes</span></footer>
      </main>
    </div>
    {commandOpen && <div className="command-overlay" role="presentation" onMouseDown={event => {if(event.target === event.currentTarget) setCommandOpen(false);}}>
      <div ref={commandDialogRef} className="command-dialog mh-surface mh-surface--glass" role="dialog" aria-modal="true" aria-label="Quick navigation">
        <div className="command-top"><Icon name="search" size={19}/><span>Jump to a workspace</span><button className="icon-action" onClick={() => setCommandOpen(false)} aria-label="Close quick navigation"><Icon name="close" size={17}/></button></div>
        {NAV.map(item => <button key={item.key} className="command-item" onClick={() => navigate(item.key)}><Icon name={item.icon}/><span>{item.title}</span><Icon name="arrow" size={15}/></button>)}
        <div className="command-footer">Esc to close · Ctrl/⌘ K to open</div>
      </div>
    </div>}
  </div>;
}
