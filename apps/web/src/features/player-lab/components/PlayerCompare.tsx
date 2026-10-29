import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, analyzeRoles, type AttributeKey, type PlayerDataset, type PlayerExport } from '@managerhub/domain';
import { Surface } from '@managerhub/ui';

function PlayerCompare({primary,dataset}:{primary:PlayerExport;dataset:PlayerDataset}){
  const { t } = useTranslation();
  const [query,setQuery]=useState('');
  const [candidateId,setCandidateId]=useState<string>(()=>dataset.players.find(p=>p.id!==primary.id)?.id??'');
  const normalizedQuery=query.trim().toLowerCase();
  const options=useMemo(()=>dataset.players.filter(p=>p.id!==primary.id&&
    [p.name,p.club,p.position].some(v=>v?.toLowerCase().includes(normalizedQuery))).slice(0,30),
    [dataset.players,primary.id,normalizedQuery]);
  const other=useMemo(()=>dataset.players.find(p=>p.id===candidateId&&p.id!==primary.id)??null,[dataset.players,candidateId,primary.id]);
  const ownRoles=useMemo(()=>analyzeRoles(primary),[primary]);
  const otherRoles=useMemo(()=>other?analyzeRoles(other):[],[other]);
  const sorted=useMemo(()=>{
    const seen=(Object.keys(primary.attributes) as AttributeKey[]).filter(key=>other?.attributes[key]!==undefined);
    return [...seen].sort((a,b)=>Math.abs((primary.attributes[b]??0)-(other?.attributes[b]??0))-
      Math.abs((primary.attributes[a]??0)-(other?.attributes[a]??0))).slice(0,12);
  },[primary.attributes,other?.attributes]);
  useEffect(()=>{
    const candidateStillAvailable=dataset.players.some(player=>player.id===candidateId&&player.id!==primary.id);
    if(!candidateStillAvailable)setCandidateId(dataset.players.find(player=>player.id!==primary.id)?.id??'');
  },[dataset.players,primary.id,candidateId]);
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

export default memo(PlayerCompare);
