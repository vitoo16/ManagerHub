import { useTranslation } from 'react-i18next';
import {useId,useMemo,useRef,useState,type ChangeEvent} from 'react';
import {
  ATTRIBUTE_LABELS,attributeGroupSummary,attributeStrengthIndex,
  analyzeRoles,getAttributeInsights,parsePlayerExport,parsePlayerHtml,type PlayerDataset,
  type PlayerExport,type AttributeKey
} from '@managerhub/domain';
import {Button,Icon,SectionHeading,Status,Surface} from '@managerhub/ui';
import { usePlayerLibrary } from './usePlayerLibrary';
import './player-workspace.css';

const MAX_EXPORT_BYTES=12*1024*1024;

type Props={
  dataset:PlayerDataset|null;
  onDataset:(dataset:PlayerDataset|null)=>void;
};
function AttributeRadar({player}: {player:PlayerExport}){
  const { t } = useTranslation();
  const groups=attributeGroupSummary(player).filter(x=>x.name!=='Goalkeeping'||x.observed>0);
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
  const values=(Object.entries(player.attributes) as [AttributeKey,number][])
    .sort((a,b)=>b[1]-a[1]);
  if(!values.length)return <div className="player-empty-chart">{t("No recognized, exact 1–20 attributes were included in the export.")}</div>;
  return <div className="player-attributes" role="list" aria-label={t("Player attributes ordered strongest to weakest")}>
    {values.map(([key,value])=><div className="player-attribute" role="listitem" key={key}>
      <span>{t(ATTRIBUTE_LABELS[key])}</span>
      <div className="player-attribute__track" aria-hidden="true"><div style={{width:(value/20*100)+'%'}}/></div>
      <strong>{value}</strong>
    </div>)}
  </div>;
}
function RoleResults({player}:{player:PlayerExport}){
  const { t } = useTranslation();
  const roles=analyzeRoles(player);
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
        <p>{role.evidence.map(e=>t(ATTRIBUTE_LABELS[e.attribute])+' '+e.value+' (weight '+e.weight+')').join(' · ')||'Not enough observed attributes.'}</p>
        {role.missing.length>0&&<p className="role-missing">{t('Missing:')} {role.missing.map(k=>t(ATTRIBUTE_LABELS[k])).join(', ')}</p>}
      </div>}
    </div>)}
  </div>;
}

function PlayerCompare({primary,dataset}:{primary:PlayerExport;dataset:PlayerDataset}){
  const { t } = useTranslation();
  const [query,setQuery]=useState('');
  const [candidateId,setCandidateId]=useState<string>(()=>dataset.players.find(p=>p.id!==primary.id)?.id??'');
  const options=useMemo(()=>dataset.players.filter(p=>p.id!==primary.id&&
    [p.name,p.club,p.position].some(v=>v?.toLowerCase().includes(query.toLowerCase()))).slice(0,30),[dataset,primary.id,query]);
  const other=dataset.players.find(p=>p.id===candidateId)??null;
  const ownRoles=analyzeRoles(primary);
  const otherRoles=other?analyzeRoles(other):[];
  const seen=(Object.keys(primary.attributes) as AttributeKey[]).filter(k=>other?.attributes[k]!==undefined);
  const sorted=[...seen].sort((a,b)=>Math.abs((primary.attributes[b]??0)-(other?.attributes[b]??0))-
    Math.abs((primary.attributes[a]??0)-(other?.attributes[a]??0))).slice(0,12);
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

function PlayerDetails({player,dataset}:{player:PlayerExport;dataset:PlayerDataset}){
  const { t } = useTranslation();
  const [tab,setTab]=useState<'overview'|'attributes'|'roles'|'recruitment'|'compare'>('overview');
  const insights=getAttributeInsights(player);
  const strength=attributeStrengthIndex(player);
  const roles=analyzeRoles(player);
  const top=roles.find(x=>x.score!==null);
  return <section aria-label={t('Scouting report for')+' '+player.name}>
    <div className="scout-identity"><div className="scout-avatar" aria-hidden="true">{player.name.slice(0,1).toUpperCase()}</div>
      <div className="scout-identity__copy"><span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / EXPORT VIEW")}</span><h2>{player.name}</h2><p>{[player.club,player.position,player.age!==null?player.age+' years':null,player.nationality].filter(Boolean).join(' · ')||'Only identity data available'}</p></div>
      <Status tone="info">{t("Game export")}</Status></div>
    <div className="scout-metrics">
      <div><span>{t("Actual CA")}</span><strong>—</strong><small>{t("Not verified")}</small></div>
      <div><span>{t("Attribute summary")}</span><strong>{strength.index??'—'}{strength.index!==null&&<small> / 100</small>}</strong><small>{t("Visible attributes only · Not CA")}</small></div>
      <div><span>{t("Best observed role")}</span><strong>{top?.score??'—'}{top?.score!==null&&<small> / 100</small>}</strong><small>{top?.title ? t(top.title) : t('Insufficient data')}</small></div>
      <div><span>PA</span><strong>—</strong><small>{t("Not verified")}</small></div>
    </div>
    <div className="scout-tabs" role="tablist" aria-label={t("Player report")}>
      {(['overview','attributes','roles','compare','recruitment'] as const).map(label=><button key={label} role="tab" aria-selected={tab===label} onClick={()=>setTab(label)} className={tab===label?'scout-tab scout-tab--active':'scout-tab'}>{t(label==='overview'?'Overview':label==='attributes'?'Attributes':label==='roles'?'Role fit':label==='compare'?'Compare':'Recruitment')}</button>)}
    </div>
    <div className="scout-tab-content" role="tabpanel">
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
    }catch(ex){setError(ex instanceof Error?ex.message:'Unable to read player export.');}
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
    {error&&<div role="alert" className="inline-alert"><Icon name="warning" size={16}/>{error}</div>}
    <Surface className="saved-player-library">
      <div className="saved-player-library__heading">
        <div><strong>{t("Saved player exports")}</strong><small>{t("IndexedDB · This browser only · Explicit opt-in · Up to 20 exports")}</small></div>
        <Status tone={library.error?'warning':'neutral'}>{library.loading?t('Loading…'):library.items.length+' '+t('saved')}</Status>
      </div>
      {library.error&&<div role="alert" className="local-library-error"><Icon name="warning" size={16}/>{library.error}
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
      <div className="dataset-banner"><div><strong>{dataset.players.length.toLocaleString()} {t('player records')}</strong><span>{dataset.fileName} · {dataset.attributeColumns.length} {t('recognized attributes')}</span></div><Status tone="warning">{t("Provisional")}</Status></div>
      {dataset.warnings.length>0&&<div className="dataset-warnings" role="status">{dataset.warnings.map((warning,i)=><p key={i}><Icon name="warning" size={14}/>{warning}</p>)}</div>}
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
