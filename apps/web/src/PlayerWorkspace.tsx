import { useTranslation } from 'react-i18next';
import { readableImportError, readableImportWarning } from './i18n/player-import-copy';
import { lazy, memo, Suspense, useCallback, useDeferredValue, useId, useMemo, useRef, useState, type ChangeEvent, type UIEvent } from 'react';
import {
  ATTRIBUTE_LABELS,attributeGroupSummary,attributeStrengthIndex,
  analyzeRoles,getAttributeInsights,
  type PlayerDataset,type PlayerExport,type AttributeKey,type ScoredRole
} from '@managerhub/domain';
import {Button,Icon,SectionHeading,Status,Surface} from '@managerhub/ui';
import { PlayerListItem } from './features/player-lab/components/PlayerListItem';
import { usePlayerLibrary } from './usePlayerLibrary';
import { parsePlayerFile } from './parse-player-file';
import './player-workspace.css';

const MAX_EXPORT_BYTES=12*1024*1024;
const PLAYER_ROW_HEIGHT = 56;
const PLAYER_LIST_OVERSCAN = 5;
const PLAYER_LIST_VIEWPORT_HEIGHT = 550;
const RecruitmentPreviewPanel = lazy(() => import('./features/player-lab/components/RecruitmentPreviewPanel'));

type Props={
  dataset:PlayerDataset|null;
  onDataset:(dataset:PlayerDataset|null)=>void;
  onOpenSquad:()=>void;
};
function AttributeRadar({player}: {player:PlayerExport}){
  const { t } = useTranslation();
  const groups=useMemo(()=>attributeGroupSummary(player).filter(x=>x.name!=='Goalkeeping'||x.observed>0),[player]);
  const usable=groups.filter(x=>x.score!==null);
  if(usable.length<3)return <div className="player-empty-chart">{t("At least three attribute groups are needed for a meaningful profile radar.")}</div>;
  const center=125,radius=92;
  const point=(index:number,score:number)=>{
    const angle=-Math.PI/2+(2*Math.PI*index)/groups.length;
    const scale=(score-1)/19;
    return [center+Math.cos(angle)*radius*scale,center+Math.sin(angle)*radius*scale];
  };
  const coordinates=groups.map((group,i)=>point(i,group.score??1));
  const points=coordinates.map(([x,y])=>x?.toFixed(2)+','+y?.toFixed(2)).join(' ');
  const ring=(value:number)=>groups.map((_,i)=>point(i,value).map(v=>v.toFixed(2)).join(',')).join(' ');
  return <div className="player-radar">
    <svg viewBox="0 0 250 250" role="img" aria-label={t('Radar showing average native 1 to 20 attributes for')+' '+player.name}>
      {[5,10,15,20].map(n=><polygon key={n} points={ring(n)} fill="none" stroke="var(--line)" strokeWidth="1"/>)}
      {groups.map((g,i)=>{const [x,y]=point(i,20);return <line key={g.name} x1={center} y1={center} x2={x} y2={y} stroke="var(--line)" strokeWidth="1"/>;})}
      <polygon points={points} fill="color-mix(in srgb, var(--accent-strong) 22%, transparent)" stroke="var(--accent-strong)" strokeWidth="2.2" strokeLinejoin="round"/>
      {coordinates.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.1" fill="var(--accent-strong)"/>)}
    </svg>
    <div className="radar-legend" role="list" aria-label={t("Exact radar values")}>
      {groups.map(g=><div key={g.name} role="listitem"><span>{t(g.name)}</span><strong>{g.score?.toFixed(1)??'—'}<small> / 20</small></strong></div>)}
    </div>
  </div>;
}

function RankedAttributes({player}: {player:PlayerExport}){
  const { t } = useTranslation();
  const values=useMemo(()=>(Object.entries(player.attributes) as [AttributeKey,number][])
    .sort((a,b)=>b[1]-a[1]),[player.attributes]);
  if(!values.length)return <div className="player-empty-chart">{t("No recognized, exact 1–20 attributes were included in the export.")}</div>;
  return <div className="player-attributes" role="list" aria-label={t("Player attributes ordered strongest to weakest")}>
    {values.map(([key,value])=><div className="player-attribute" role="listitem" key={key}>
      <span>{t(ATTRIBUTE_LABELS[key])}</span>
      <div className="player-attribute__track" aria-hidden="true"><div style={{width:(value/20*100)+'%'}}/></div>
      <strong>{value}</strong>
    </div>)}
  </div>;
}
function RoleResults({roles}:{roles:readonly ScoredRole[]}){
  const { t } = useTranslation();
  const [expanded,setExpanded]=useState<string|null>(null);
  return <div className="role-results">
    <p className="module-disclaimer">{t("Role fit shows how well the visible attributes match a role. It isn't CA, star rating or a match prediction. We skip scoring when too many attributes are missing.")}</p>
    {roles.map(role=><div key={role.id} className="role-result">
      <button className="role-result__button" aria-expanded={expanded===role.id} onClick={()=>setExpanded(x=>x===role.id?null:role.id)}>
        <span className="role-result__slot">{role.slot}</span><span className="role-result__title">{t(role.title)}<small>{Math.round(role.coverage*100)}% {t('attribute coverage')}</small></span>
        <div className="role-result__bar" aria-hidden="true"><div style={{width:(role.score??0)+'%'}}/></div>
        <strong>{role.score??t('N/A')}</strong><Icon name="chevron" size={14}/>
      </button>
      {expanded===role.id&&<div className="role-result__evidence">
        <strong>{t("Inputs used for this role")}</strong>
        <p>{role.evidence.map(e=>`${t(ATTRIBUTE_LABELS[e.attribute])}: ${e.value} (${t('Role importance')}: ${e.weight})`).join(' · ')||t('Not enough observed attributes.')}</p>
        <p className="module-disclaimer">{t("These weights only explain ManagerHub's role-fit score. They are not Football Manager's CA costs.")}</p>
        {role.missing.length>0&&<p className="role-missing">{t('Missing:')} {role.missing.map(k=>t(ATTRIBUTE_LABELS[k])).join(', ')}</p>}
      </div>}
    </div>)}
  </div>;
}

function PlayerCompare({primary,dataset}:{primary:PlayerExport;dataset:PlayerDataset}){
  const { t } = useTranslation();
  const [query,setQuery]=useState('');
  const deferredQuery=useDeferredValue(query.trim().toLocaleLowerCase());
  const [candidateId,setCandidateId]=useState<string>(()=>dataset.players.find(p=>p.id!==primary.id)?.id??'');
  const comparisonSearchIndex=useMemo(()=>dataset.players.map(player=>({
    player,
    searchText:[player.name,player.club,player.position].filter(Boolean).join(' ').toLocaleLowerCase()
  })),[dataset.players]);
  const options=useMemo(()=>comparisonSearchIndex
    .filter(entry=>entry.player.id!==primary.id&&entry.searchText.includes(deferredQuery))
    .slice(0,30).map(entry=>entry.player),[comparisonSearchIndex,primary.id,deferredQuery]);
  const playersById=useMemo(()=>new Map(dataset.players.map(player=>[player.id,player])),[dataset.players]);
  const other=playersById.get(candidateId)??null;
  const ownRoles=useMemo(()=>analyzeRoles(primary),[primary]);
  const otherRoles=useMemo(()=>other?analyzeRoles(other):[],[other]);
  const sorted=useMemo(()=>{
    const seen=(Object.keys(primary.attributes) as AttributeKey[]).filter(k=>other?.attributes[k]!==undefined);
    return seen.sort((a,b)=>Math.abs((primary.attributes[b]??0)-(other?.attributes[b]??0))-
      Math.abs((primary.attributes[a]??0)-(other?.attributes[a]??0))).slice(0,12);
  },[primary.attributes,other]);
  return <Surface className="scout-panel">
    <div className="scout-panel__title">{t("Head-to-head analysis")} <span>{t("Same import · Native attributes only")}</span></div>
    <p className="module-disclaimer">{t("Compare observed attributes and product-authored role-fit estimates. Game CA/PA, transfer value, actual positional familiarity and scouting certainty are not part of this comparison.")}</p>
    <div className="compare-selector">
      <label htmlFor="compare-search">{t("Search comparison players")}</label>
      <input id="compare-search" placeholder={t("Type a player or club name…")} value={query} onChange={e=>setQuery(e.target.value)}/>
      <label htmlFor="compare-player">{t("Comparison player")}</label>
      <select id="compare-player" value={candidateId} onChange={e=>setCandidateId(e.target.value)}>
        {other&&!options.some(p=>p.id===other.id)&&<option value={other.id}>{other.name}</option>}
        {options.map(p=><option key={p.id} value={p.id}>{p.name}{p.club?' · '+p.club:''}</option>)}
      </select>
      <small>{t("Showing up to 30 matching players; identities exist only within this export.")}</small>
    </div>
    {other?<div className="compare-results">
      <div className="compare-head"><strong>{primary.name}</strong><span>{t("VS")}</span><strong>{other.name}</strong></div>
      <h3>{t("Largest observed attribute differences")}</h3>
      {sorted.length ? <div className="compare-grid" role="table" aria-label={t("Observed player attribute comparisons")}>
        {sorted.map(key=><div className="compare-attribute" role="row" key={key}>
          <span role="cell" className={(primary.attributes[key]??0)>(other.attributes[key]??0)?'compare-leading':''}>{primary.attributes[key]}</span>
          <span role="cell">{t(ATTRIBUTE_LABELS[key])}</span>
          <span role="cell" className={(other.attributes[key]??0)>(primary.attributes[key]??0)?'compare-leading':''}>{other.attributes[key]}</span>
        </div>)}
      </div> : <p className="module-disclaimer">{t("These two exports have no matching exact attributes. A numerical comparison would be misleading.")}</p>}
      <h3>{t("Role score comparison")}</h3>
      <div className="compare-grid" role="table" aria-label={t("Role fit comparisons")}>
        {ownRoles.map(a=>{const b=otherRoles.find(r=>r.id===a.id);
          return <div className="compare-attribute" role="row" key={a.id}>
            <span role="cell" className={a.score!==null&&typeof b?.score==='number'&&a.score>b.score?'compare-leading':''}>{a.score??'—'}</span>
            <span role="cell">{t(a.title)}</span>
            <span role="cell" className={b?.score!==null&&b?.score!==undefined&&a.score!==null&&b.score>a.score?'compare-leading':''}>{b?.score??'—'}</span>
          </div>;
        })}
      </div>
    </div>:<p className="player-empty-chart">{t("Import at least two players to compare their attributes and role estimates.")}</p>}
  </Surface>;
}

function PlayerDetails({player,dataset,onOpenSquad}:{player:PlayerExport;dataset:PlayerDataset;onOpenSquad:()=>void}){
  const { t } = useTranslation();
  const [tab,setTab]=useState<'overview'|'attributes'|'roles'|'recruitment'|'compare'>('overview');
  const [recruitmentVisited,setRecruitmentVisited]=useState(false);
  const insights=useMemo(()=>getAttributeInsights(player),[player]);
  const strength=useMemo(()=>attributeStrengthIndex(player),[player]);
  const roles=useMemo(()=>analyzeRoles(player),[player]);
  const top=roles.find(x=>x.score!==null);
  return <section aria-label={t('Scouting report for')+' '+player.name}>
    <div className="scout-identity"><div className="scout-avatar" aria-hidden="true">{player.name.slice(0,1).toUpperCase()}</div>
      <div className="scout-identity__copy"><span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / EXPORT VIEW")}</span><h2>{player.name}</h2><p>{[player.club,player.position,player.age!==null?player.age+' '+t('years'):null,player.nationality].filter(Boolean).join(' · ')||t('Only identity data available')}</p></div>
      <Status tone="info">{t("Game export")}</Status></div>
    <div className="scout-metrics">
      <div><span>{t("Actual CA")}</span><strong>—</strong><small>{t("Not verified")}</small></div>
      <div><span>{t("Attribute summary")}</span><strong>{strength.index??'—'}{strength.index!==null&&<small> / 100</small>}</strong><small>{t("Visible attributes only · Not CA")}</small></div>
      <div><span>{t("Best observed role")}</span><strong>{top?.score??'—'}{top?.score!==null&&<small> / 100</small>}</strong><small>{top?.title ? t(top.title) : t('Insufficient data')}</small></div>
      <div><span>PA</span><strong>—</strong><small>{t("Not verified")}</small></div>
    </div>
    <details className="ca-guide">
      <summary>{t('What do CA, PA and role fit mean?')}</summary>
      <div className="ca-guide__content">
        <p><strong>CA — </strong>{t('CA explains a player’s current ability in FM. Attributes have different ability costs depending on position, so a simple average is not the game’s CA.')}</p>
        <p><strong>RCA — </strong>{t('Recommended CA is the ability needed to sustain a set of attributes in the editor. It is not automatically the player’s hidden CA.')}</p>
        <p><strong>PA — </strong>{t('PA is a potential ceiling assigned within the save. You cannot calculate its exact value from visible attributes.')}</p>
        <p><strong>{t('Role fit')} — </strong>{t('This score is ManagerHub’s guide to a tactical job, based on the attributes you imported. It is not a game-engine rating.')}</p>
        <p className="ca-guide__caution">{t('FM Scout studied CA weights for older versions. We will not call a result exact FM26 CA until its weights and formula are independently verified.')}</p>
        <a href="https://www.fmscout.com/a-guide-to-current-ability-in-football-manager.html" rel="noreferrer" target="_blank">{t('Read the CA research')}</a>
      </div>
    </details>
    <div className="scout-tabs" role="tablist" aria-label={t("Player report")}>
      {(['overview','attributes','roles','compare','recruitment'] as const).map(label=><button key={label} role="tab" aria-selected={tab===label} onClick={()=>{setTab(label);if(label==='recruitment')setRecruitmentVisited(true);}} className={tab===label?'scout-tab scout-tab--active':'scout-tab'}>{t(label==='overview'?'Overview':label==='attributes'?'Attributes':label==='roles'?'Role fit':label==='compare'?'Compare':'Recruitment')}</button>)}
    </div>
    <div className="scout-tab-content" role="tabpanel">
      {tab==='overview'&&<>
        <div className="scout-grid">
          <Surface className="scout-panel"><div className="scout-panel__title">{t("Attribute profile")} <span>{t("Native 1–20 mean")}</span></div><MemoAttributeRadar player={player}/></Surface>
          <Surface className="scout-panel"><div className="scout-panel__title">{t("Strengths & development areas")}</div>
            {insights.strongest.length?<div className="insight-columns">
              <div><h3>{t("Highest observed attributes")}</h3>{insights.strongest.map(a=><div className="insight-line" key={a.key}><span>{t(a.label)}</span><strong>{a.value}</strong></div>)}</div>
              <div><h3>{t("Lowest observed attributes")}</h3>{insights.weakest.map(a=><div className="insight-line" key={a.key}><span>{t(a.label)}</span><strong>{a.value}</strong></div>)}</div>
            </div>:<p className="module-disclaimer">{t("No exact attributes observed. Upload a view with technical, mental and physical columns.")}</p>}
            <div className="scout-note">{t("These are observed numerical extremes, not professional scouting verdicts. Role-specific demands and sample completeness matter.")}</div>
          </Surface>
        </div>
        <Surface className="scout-panel role-overview"><div className="scout-panel__title">{t("Role suitability ranking")} <span>{t("Heuristic · Explanation available under Role fit")}</span></div><MemoRoleResults roles={roles}/></Surface>
      </>}
      {tab==='attributes'&&<Surface className="scout-panel"><div className="scout-panel__title">{t("Imported player attributes")} <span>{Object.keys(player.attributes).length} {t('values')} · {t('Source:')} {dataset.fileName}</span></div><MemoRankedAttributes player={player}/></Surface>}
      {tab==='roles'&&<Surface className="scout-panel"><div className="scout-panel__title">{t("Tactical roles by observed attributes")}</div><RoleResults player={player}/></Surface>}
      {tab==='compare'&&<MemoPlayerCompare primary={player} dataset={dataset}/>}
      {recruitmentVisited&&<div hidden={tab!=='recruitment'}>
        <Suspense fallback={<p role="status" className="player-empty-chart">{t("Loading workspace…")}</p>}>
          <RecruitmentPreviewPanel player={player} dataset={dataset} onOpenSquad={onOpenSquad}/>
        </Suspense>
      </div>}
    </div>
    <div className="evidence-strip"><Icon name="shield" size={15}/> {t("This report uses your exported attributes. CA and PA remain unknown until verified.")}</div>
  </section>;
}
const MemoAttributeRadar = memo(AttributeRadar);
const MemoRankedAttributes = memo(RankedAttributes);
const MemoRoleResults = memo(RoleResults);
const MemoPlayerCompare = memo(PlayerCompare);
const MemoPlayerDetails = memo(PlayerDetails);

export function PlayerWorkspace({dataset,onDataset,onOpenSquad}:Props){
  const { t } = useTranslation();
  const inputRef=useRef<HTMLInputElement>(null);
  const [error,setError]=useState<string|null>(null);
  const [importing,setImporting]=useState(false);
  const [search,setSearch]=useState('');
  const deferredSearch=useDeferredValue(search.trim().toLocaleLowerCase());
  const [chosenId,setChosenId]=useState<string|null>(null);
  const [visibleLimit,setVisibleLimit]=useState(100);
  const [listScrollTop,setListScrollTop]=useState(0);
  const listViewportRef=useRef<HTMLDivElement>(null);
  const [pendingDelete,setPendingDelete]=useState<string|null>(null);
  const library=usePlayerLibrary();
  const fileInputId=useId();
  const onFile=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    e.target.value='';
    if(!file)return;
    setError(null);
    setImporting(true);
    try{
      if(!/\.(csv|tsv|txt|html|htm)$/i.test(file.name))throw new Error('Choose an HTML, CSV, TSV or TXT export with player columns.');
      if(!file.size||file.size>MAX_EXPORT_BYTES)throw new Error('Player export must be between 1 byte and 12 MB.');
      const parsed=await parsePlayerFile(file);
      onDataset(parsed);
      setChosenId(parsed.players[0]?.id??null);
      setSearch('');
      setVisibleLimit(100);
      setListScrollTop(0);
      if(listViewportRef.current)listViewportRef.current.scrollTop=0;
    }catch(ex){setError(readableImportError(ex));}
    finally{setImporting(false);}
  };
  const playerSearchIndex=useMemo(()=>dataset?.players.map(player=>({
    player,
    searchText:[player.name,player.club,player.position].filter(Boolean).join(' ').toLocaleLowerCase()
  }))??[],[dataset?.players]);
  const visible=useMemo(()=>playerSearchIndex
    .filter(entry=>!deferredSearch||entry.searchText.includes(deferredSearch))
    .map(entry=>entry.player),[playerSearchIndex,deferredSearch]);
  const playerById=useMemo(()=>new Map(dataset?.players.map(player=>[player.id,player])??[]),[dataset?.players]);
  const selected=(chosenId?playerById.get(chosenId):undefined)??dataset?.players[0]??null;
  const loadedPlayers=useMemo(()=>visible.slice(0,visibleLimit),[visible,visibleLimit]);
  const virtualStart=Math.max(0,Math.floor(listScrollTop/PLAYER_ROW_HEIGHT)-PLAYER_LIST_OVERSCAN);
  const virtualEnd=Math.min(loadedPlayers.length,Math.ceil((listScrollTop+PLAYER_LIST_VIEWPORT_HEIGHT)/PLAYER_ROW_HEIGHT)+PLAYER_LIST_OVERSCAN);
  const windowedPlayers=loadedPlayers.slice(virtualStart,virtualEnd);
  const selectPlayer=useCallback((playerId:string)=>setChosenId(playerId),[]);
  const onListScroll=useCallback((event:UIEvent<HTMLDivElement>)=>setListScrollTop(event.currentTarget.scrollTop),[]);
  const onSearchChange=useCallback((value:string)=>{
    setSearch(value);
    setVisibleLimit(100);
    setListScrollTop(0);
    if(listViewportRef.current)listViewportRef.current.scrollTop=0;
  },[]);
  const savedCurrent=dataset!==null&&library.items.some(item=>item.importedAt===dataset.importedAt &&
    item.fileName===dataset.fileName&&item.playerCount===dataset.players.length);
  const openSaved=async (id:string)=>{
    const restored=await library.open(id);
    if(!restored)return;
    onDataset(restored);
    setChosenId(restored.players[0]?.id??null);
    setSearch('');setVisibleLimit(100);setListScrollTop(0);if(listViewportRef.current)listViewportRef.current.scrollTop=0;setPendingDelete(null);setError(null);
  };
  const deleteSaved=async (id:string)=>{
    if(pendingDelete!==id){setPendingDelete(id);return;}
    if(await library.remove(id))setPendingDelete(null);
  };
  return <div className="view-flow" aria-busy={importing}>
    <div className="page-title"><span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / PROVISIONAL EXPORTS")}</span><h1>{t("Player Lab")}</h1><p>{t("Import a player list from Football Manager to discover each player's strengths, suitable roles and comparisons with teammates.")}</p></div>
    <div className="player-lab-header">
      <div><input id={fileInputId} ref={inputRef} type="file" accept=".csv,.tsv,.txt,.html,.htm,text/csv,text/tab-separated-values,text/html" className="visually-hidden" onChange={onFile}/>
        <Button variant="primary" disabled={importing} onClick={()=>inputRef.current?.click()}><Icon name="plus" size={16}/>{t(importing?'Importing player data…':dataset?'Replace player export':'Import player CSV / HTML')}</Button>
        {dataset&&<Button disabled={savedCurrent||library.activity!==null} onClick={()=>void library.save(dataset)}>
          <Icon name="download" size={16}/>{t(savedCurrent?'Saved to this browser':library.activity==='saving'?'Saving…':'Save on this browser')}
        </Button>}
        {dataset&&<Button variant="quiet" onClick={()=>{onDataset(null);setChosenId(null);setSearch('');setVisibleLimit(100);setListScrollTop(0);if(listViewportRef.current)listViewportRef.current.scrollTop=0;}}><Icon name="trash" size={16}/> {t("Clear session")}</Button>}
      </div>
      <Status tone={importing?"warning":"info"}>{t(importing?"Analyzing export in the background…":dataset?"Export loaded in this session":"No data uploaded")}</Status>
    </div>
    {error&&<div role="alert" className="inline-alert"><Icon name="warning" size={16}/>{t(error)}</div>}
    <Surface className="saved-player-library">
      <div className="saved-player-library__heading">
        <div><strong>{t("Saved player exports")}</strong><small>{t("IndexedDB · This browser only · Explicit opt-in · Up to 20 exports")}</small></div>
        <Status tone={library.error?'warning':'neutral'}>{library.loading?t('Loading…'):library.items.length+' '+t('saved')}</Status>
      </div>
      {library.error&&<div role="alert" className="local-library-error"><Icon name="warning" size={16}/>{t("Could not access your saved lists. Please check browser storage settings or try again.")}
        <button onClick={library.clearError} aria-label={t("Dismiss local library error")}><Icon name="close" size={15}/></button></div>}
      {!library.loading&&library.items.length===0&&<p className="saved-player-library__empty">{t("No saved exports yet. Import an HTML/CSV/TSV player list, then select “Save on this browser” to keep it after reloading.")}</p>}
      {library.items.length>0&&<div className="saved-player-library__items" role="list" aria-label={t("Saved exports")}>
        {library.items.map(item=><div className="saved-player-library__item" role="listitem" key={item.id}>
          <div className="saved-player-library__meta"><strong title={item.fileName}>{item.fileName}</strong><small>{item.playerCount.toLocaleString()} {t('players')} · {item.attributeCount} {t('attributes')} · {t('Saved')} {new Date(item.savedAt).toLocaleDateString(t('locale'))}</small></div>
          <Button disabled={library.activity!==null} onClick={()=>void openSaved(item.id)}><Icon name="file" size={14}/> {t("Open")}</Button>
          <Button variant={pendingDelete===item.id?'danger':'quiet'} disabled={library.activity!==null}
            onClick={()=>void deleteSaved(item.id)}>{t(pendingDelete===item.id?'Confirm delete':'Delete')}</Button>
        </div>)}
      </div>}
    </Surface>
    {!dataset?<Surface className="player-intro">
      <div className="player-intro__symbol"><Icon name="sparkles" size={26}/></div>
      <h2>{t("Turn attributes into football insights.")}</h2>
      <p>{t("In Football Manager, create a player-list view with Name, Position, and as many technical, mental and physical attributes as possible. Export the view as HTML (native Print Screen) or CSV/TSV and import it here. The file is analyzed entirely in your browser.")}</p>
      <div className="player-intro__checks"><span>{t("Attribute distribution")}</span><span>{t("Position / role profile")}</span><span>{t("Explainable scores")}</span><span>{t("Missing data visibility")}</span></div>
      <p className="module-disclaimer">{t("FM26's native Print Screen can produce HTML. ManagerHub reads a local exported HTML table or CSV/TSV; a .fm save itself is not yet a validated player-data source.")}</p>
    </Surface>:<>
      <div className="dataset-banner"><div><strong>{dataset.players.length.toLocaleString()} {t('player records')}</strong><span>{dataset.fileName} · {dataset.attributeColumns.length} {t('recognized attributes')}</span></div><Status tone="warning">{t("From your export (not game-verified)")}</Status></div>
      {dataset.warnings.length>0&&<div className="dataset-warnings" role="status">{dataset.warnings.map((warning,i)=><p key={i}><Icon name="warning" size={14}/>{t(readableImportWarning(warning))}</p>)}</div>}
      <div className="player-lab-layout">
        <Surface className="player-list-panel"><div className="player-list-panel__heading"><span>{t("Players")}</span><span>{visible.length} {t('shown')}</span></div>
          <label className="search-box player-search"><Icon name="search" size={16}/><span className="visually-hidden">{t("Search imported players")}</span><input placeholder={t("Search player, team, position…")} value={search} onChange={e=>onSearchChange(e.target.value)}/></label>
          <div ref={listViewportRef} className="player-list-scroll" role="list" aria-label={t("Imported players")} onScroll={onListScroll}>
            <div className="player-list-window" style={{height:loadedPlayers.length*PLAYER_ROW_HEIGHT}}>
              {windowedPlayers.map((player,index)=><div className="player-list-window__item" key={player.id} role="listitem" aria-posinset={virtualStart+index+1} aria-setsize={loadedPlayers.length}
                style={{top:(virtualStart+index)*PLAYER_ROW_HEIGHT,height:PLAYER_ROW_HEIGHT}}>
                <PlayerListItem player={player} active={selected?.id===player.id} onSelect={selectPlayer}/>
              </div>)}
            </div>
          </div>
          {!visible.length&&<div className="player-search-empty">{t("No players match this search.")}</div>}
          {visible.length>visibleLimit&&<Button className="player-list-more" onClick={()=>setVisibleLimit(n=>Math.min(visible.length,n+100))}>
            {t('Show next 100')} · {visible.length-visibleLimit} {t('remaining')}
          </Button>}
        </Surface>
        <div className="player-detail-column">{selected?<MemoPlayerDetails key={selected.id} player={selected} dataset={dataset} onOpenSquad={onOpenSquad}/>:<Surface className="empty-library">{t("Choose a player from the imported list.")}</Surface>}</div>
      </div>
    </>}
    <div className="coverage-note"><Icon name="shield" size={16}/><p><strong>{t("Data integrity:")}</strong> {t("CA, PA and hidden personality are not recovered from a CSV unless independently verified. Role profiles are authored ManagerHub heuristics, not Sports Interactive ratings. Player identities in different imports are not assumed to match.")}</p></div>
  </div>;
}
