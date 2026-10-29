import { useTranslation } from 'react-i18next';
import { readableImportError, readableImportWarning } from './i18n/player-import-copy';
import { lazy, Suspense, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  attributeStrengthIndex, analyzeRoles, getAttributeInsights, parsePlayerExport, parsePlayerHtml,
  type PlayerDataset, type PlayerExport
} from '@managerhub/domain';
import {Button,Icon,SectionHeading,Status,Surface} from '@managerhub/ui';
import './features/player-lab/player-lab-lazy.css';

const AttributeRadar = lazy(() => import('./features/player-lab/AttributeRadar').then(module => ({ default: module.AttributeRadar })));
const RankedAttributes = lazy(() => import('./features/player-lab/RankedAttributes').then(module => ({ default: module.RankedAttributes })));
const RoleResults = lazy(() => import('./features/player-lab/RoleResults').then(module => ({ default: module.RoleResults })));
const PlayerCompare = lazy(() => import('./features/player-lab/PlayerCompare').then(module => ({ default: module.PlayerCompare })));
import { usePlayerLibrary } from './usePlayerLibrary';
import './player-workspace.css';

const MAX_EXPORT_BYTES=12*1024*1024;

type Props={
  dataset:PlayerDataset|null;
  onDataset:(dataset:PlayerDataset|null)=>void;
};
function PlayerDetails({player,dataset}:{player:PlayerExport;dataset:PlayerDataset}){
  const { t } = useTranslation();
  const [tab,setTab]=useState<'overview'|'attributes'|'roles'|'recruitment'|'compare'>('overview');
  const insights=getAttributeInsights(player);
  const strength=attributeStrengthIndex(player);
  const roles=analyzeRoles(player);
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
      {(['overview','attributes','roles','compare','recruitment'] as const).map(label=><button key={label} role="tab" aria-selected={tab===label} onClick={()=>setTab(label)} className={tab===label?'scout-tab scout-tab--active':'scout-tab'}>{t(label==='overview'?'Overview':label==='attributes'?'Attributes':label==='roles'?'Role fit':label==='compare'?'Compare':'Recruitment')}</button>)}
    </div>
    <div className="scout-tab-content" role="tabpanel">
      <Suspense fallback={<div className="player-empty-chart" role="status">{t('Loading…')}</div>}>
      {tab==='overview'&&<>
        <div className="scout-grid">
          <Surface className="scout-panel"><div className="scout-panel__title">{t("Attribute profile")} <span>{t("Native 1–20 mean")}</span></div><AttributeRadar player={player}/></Surface>
          <Surface className="scout-panel"><div className="scout-panel__title">{t("Strengths & development areas")}</div>
            {insights.strongest.length?<div className="insight-columns">
              <div><h3>{t("Highest observed attributes")}</h3>{insights.strongest.map(a=><div className="insight-line" key={a.key}><span>{t(a.label)}</span><strong>{a.value}</strong></div>)}</div>
              <div><h3>{t("Lowest observed attributes")}</h3>{insights.weakest.map(a=><div className="insight-line" key={a.key}><span>{t(a.label)}</span><strong>{a.value}</strong></div>)}</div>
            </div>:<p className="module-disclaimer">{t("No exact attributes observed. Upload a view with technical, mental and physical columns.")}</p>}
            <div className="scout-note">{t("These are observed numerical extremes, not professional scouting verdicts. Role-specific demands and sample completeness matter.")}</div>
          </Surface>
        </div>
        <Surface className="scout-panel role-overview"><div className="scout-panel__title">{t("Role suitability ranking")} <span>{t("Heuristic · Explanation available under Role fit")}</span></div><RoleResults player={player}/></Surface>
      </>}
      {tab==='attributes'&&<Surface className="scout-panel"><div className="scout-panel__title">{t("Imported player attributes")} <span>{Object.keys(player.attributes).length} {t('values')} · {t('Source:')} {dataset.fileName}</span></div><RankedAttributes player={player}/></Surface>}
      {tab==='roles'&&<Surface className="scout-panel"><div className="scout-panel__title">{t("Tactical roles by observed attributes")}</div><RoleResults player={player}/></Surface>}
      {tab==='compare'&&<PlayerCompare primary={player} dataset={dataset}/>}
      {tab==='recruitment'&&<Surface className="scout-panel"><div className="scout-panel__title">{t("Recruitment assessment")}</div>
        <div className="scouting-verdict"><Status tone="warning">{t("Insufficient data")}</Status><h3>{t("Do not recommend a transfer yet")}</h3>
          <p>{t("This export does not establish your club's tactical gap, the player's asking price, wages, contract, eligibility or alternatives in your squad. A score based on attributes alone cannot answer whether signing makes sense.")}</p>
          <p>{t("When financial and squad inputs are available, ManagerHub will compare this player's marginal role value against your existing options and the transfer's total cost.")}</p>
          </Suspense>
    </div></Surface>}
    </div>
    <div className="evidence-strip"><Icon name="shield" size={15}/> {t("This report uses your exported attributes. CA and PA remain unknown until verified.")}</div>
  </section>;
}
export function PlayerWorkspace({dataset,onDataset}:Props){
  const { t } = useTranslation();
  const inputRef=useRef<HTMLInputElement>(null);
  const [error,setError]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [chosenId,setChosenId]=useState<string|null>(null);
  const [visibleLimit,setVisibleLimit]=useState(100);
  const [pendingDelete,setPendingDelete]=useState<string|null>(null);
  const library=usePlayerLibrary();
  const fileInputId=useId();
  const onFile=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    e.target.value='';
    if(!file)return;
    setError(null);
    try{
      if(!/\.(csv|tsv|txt|html|htm)$/i.test(file.name))throw new Error('Choose an HTML, CSV, TSV or TXT export with player columns.');
      if(!file.size||file.size>MAX_EXPORT_BYTES)throw new Error('Player export must be between 1 byte and 12 MB.');
      const source=await file.text();
      const parsed=/\.(html|htm)$/i.test(file.name)?parsePlayerHtml(source,file.name):parsePlayerExport(source,file.name);
      onDataset(parsed);
      setChosenId(parsed.players[0]?.id??null);
      setSearch('');
      setVisibleLimit(100);
    }catch(ex){setError(readableImportError(ex));}
  };
  const visible=useMemo(()=>dataset?.players.filter(p=>[p.name,p.club,p.position].some(v=>v?.toLowerCase().includes(search.toLowerCase())))??[],[dataset,search]);
  const selected=dataset?.players.find(p=>p.id===chosenId)??dataset?.players[0]??null;
  const savedCurrent=dataset!==null&&library.items.some(item=>item.importedAt===dataset.importedAt &&
    item.fileName===dataset.fileName&&item.playerCount===dataset.players.length);
  const openSaved=async (id:string)=>{
    const restored=await library.open(id);
    if(!restored)return;
    onDataset(restored);
    setChosenId(restored.players[0]?.id??null);
    setSearch('');setVisibleLimit(100);setPendingDelete(null);setError(null);
  };
  const deleteSaved=async (id:string)=>{
    if(pendingDelete!==id){setPendingDelete(id);return;}
    if(await library.remove(id))setPendingDelete(null);
  };
  return <div className="view-flow">
    <div className="page-title"><span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / PROVISIONAL EXPORTS")}</span><h1>{t("Player Lab")}</h1><p>{t("Import a player list from Football Manager to discover each player's strengths, suitable roles and comparisons with teammates.")}</p></div>
    <div className="player-lab-header">
      <div><input id={fileInputId} ref={inputRef} type="file" accept=".csv,.tsv,.txt,.html,.htm,text/csv,text/tab-separated-values,text/html" className="visually-hidden" onChange={onFile}/>
        <Button variant="primary" onClick={()=>inputRef.current?.click()}><Icon name="plus" size={16}/>{t(dataset?'Replace player export' :'Import player CSV / HTML')}</Button>
        {dataset&&<Button disabled={savedCurrent||library.activity!==null} onClick={()=>void library.save(dataset)}>
          <Icon name="download" size={16}/>{t(savedCurrent?'Saved to this browser':library.activity==='saving'?'Saving…':'Save on this browser')}
        </Button>}
        {dataset&&<Button variant="quiet" onClick={()=>{onDataset(null);setChosenId(null);setSearch('');setVisibleLimit(100);}}><Icon name="trash" size={16}/> {t("Clear session")}</Button>}
      </div>
      <Status tone="info">{t("No data uploaded")}</Status>
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
          <label className="search-box player-search"><Icon name="search" size={16}/><span className="visually-hidden">{t("Search imported players")}</span><input placeholder={t("Search player, team, position…")} value={search} onChange={e=>{setSearch(e.target.value);setVisibleLimit(100);}}/></label>
          <div className="player-list-scroll" role="list" aria-label={t("Imported players")}>{visible.slice(0,visibleLimit).map(p=><div key={p.id} role="listitem"><button className={'player-list-entry '+(selected?.id===p.id?'player-list-entry--active':'')} onClick={()=>setChosenId(p.id)}>
            <span className="player-list-avatar" aria-hidden="true">{p.name.slice(0,1)}</span><span className="player-list-entry__copy"><strong>{p.name}</strong><small>{p.position??t('Unknown position')} · {p.club??t('Unknown club')}</small></span><Icon name="chevron" size={13}/>
          </button></div>)}</div>
          {!visible.length&&<div className="player-search-empty">{t("No players match this search.")}</div>}
          {visible.length>visibleLimit&&<Button className="player-list-more" onClick={()=>setVisibleLimit(n=>n+100)}>
            {t('Show next 100')} · {visible.length-visibleLimit} {t('remaining')}
          </Button>}
        </Surface>
        <div className="player-detail-column">{selected?<PlayerDetails key={selected.id} player={selected} dataset={dataset}/>:<Surface className="empty-library">{t("Choose a player from the imported list.")}</Surface>}</div>
      </div>
    </>}
    <div className="coverage-note"><Icon name="shield" size={16}/><p><strong>{t("Data integrity:")}</strong> {t("CA, PA and hidden personality are not recovered from a CSV unless independently verified. Role profiles are authored ManagerHub heuristics, not Sports Interactive ratings. Player identities in different imports are not assumed to match.")}</p></div>
  </div>;
}
