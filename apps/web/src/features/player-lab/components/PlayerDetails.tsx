import { lazy, memo, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ATTRIBUTE_LABELS, attributeGroupSummary, attributeStrengthIndex,
  analyzeRoles, getAttributeInsights,
  type PlayerDataset, type PlayerExport, type AttributeKey, type ScoredRole
} from '@managerhub/domain';
import { Icon, Status, Surface } from '@managerhub/ui';

const RecruitmentPreviewPanel = lazy(() => import('./RecruitmentPreviewPanel'));

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
      {tab==='roles'&&<Surface className="scout-panel"><div className="scout-panel__title">{t("Tactical roles by observed attributes")}</div><MemoRoleResults roles={roles}/></Surface>}
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

export default MemoPlayerDetails;
