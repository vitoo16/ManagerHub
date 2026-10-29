import { useTranslation } from 'react-i18next';
import { memo, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  FORMATIONS, ROLE_PROFILES, declaredPositions, eligibleSlotCandidates, optimizeSquad, compareSquadScenarios,
  type FormationId, type PlayerDataset, type SquadSolution, type SlotAssignment, type LineupSlot,
  type SquadPlanConfig, type SquadPlanKey, type SquadPlans
} from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import './squad-workspace.css';

const getRoleTitle = (id: string): string => ROLE_PROFILES.find(role=>role.id===id)?.title ?? id;

function SquadIssue({reason}: {reason:string|null}) {
  const {t}=useTranslation();
  if(!reason)return null;
  const issue=reason.includes('pinned twice')?'You have assigned the same player to more than one position':
    reason.includes('both excluded and pinned')?'You cannot exclude a player while keeping them in the starting lineup':
    reason.includes('does not exist')?'This position is no longer available in the selected formation':
    reason.includes('not eligible')?'This player is not listed as eligible for that position in your export':
    reason.includes('not present')?'This player is not in the currently imported squad':
    reason.includes('No complete')?'There are not enough eligible players to fill all eleven positions':
    'These choices conflict, so the starting eleven cannot be completed';
  return <p>{t(issue)}</p>;
}

function TacticalPitch({ solution }: { solution: SquadSolution }) {
  const { t } = useTranslation();
  const positions=new Map<string,SlotAssignment>(solution.lineup.map(item=>[item.slot.id,item]));
  const formation=solution.formation;
  return <Surface className="squad-pitch-card">
    <div className="squad-card-heading"><span>{t("Tactical selection")}</span><span>{t("Your draft lineup · Doesn't change your FM save")}</span></div>
    <div className="squad-pitch" role="img" aria-label={solution.complete ? t('Pitch layout with eleven players') : t('Pitch has missing positions')}>
      <div className="squad-pitch__border"/><div className="squad-pitch__half"/>
      <div className="squad-pitch__circle"/><div className="squad-pitch__area squad-pitch__area--top"/>
      <div className="squad-pitch__area squad-pitch__area--bottom"/>
      {solution.complete && FORMATIONS[formation].map(slot=>{
        const assignment=positions.get(slot.id);
        if(!assignment)return null;
        const top=slot.row===-1?'12%':slot.row===0?(formation==='4-2-3-1'?'34%':'23%'):
          slot.row===1?'52%':slot.row===2?'73%':'90%';
        const left=(11+slot.column*19.5)+'%';
        return <div key={slot.id} className="squad-position-marker" style={{left,top}}>
          <span className="squad-position-marker__number">{slot.label}</span>
          <span className="squad-position-marker__name" title={assignment.name}>{assignment.name}</span>
          <span className="squad-position-marker__fit">{assignment.roleScore} / 100</span>
        </div>;
      })}
      {!solution.complete && <div className="squad-pitch__incomplete">
        <Icon name="warning" size={25}/><strong>{t("Some positions are still empty.")}</strong>
        <span>{t("Check the highlighted positions or choose different players.")}</span>
      </div>}
    </div>
    <div className="squad-pitch-note">
      {t("This pitch is a planning aid, not a replay of player movement. ManagerHub does not simulate team chemistry or win probability.")}
    </div>
  </Surface>;
}

function LineupResults({solution}:{solution:SquadSolution}){
  const { t } = useTranslation();
  return <Surface className="squad-lineup-card">
    <div className="squad-card-heading"><span>{t("Slot assignments")}</span><span>{solution.formation}</span></div>
    {solution.complete ? <ol className="squad-roster" aria-label={t("Assigned starting eleven")}>
      {solution.lineup.map(item=><li key={item.slot.id}>
        <span className="squad-roster__slot">{item.slot.label}</span>
        <div className="squad-roster__name"><strong>{item.name}</strong>
          <small>{t(getRoleTitle(item.slot.roleId))} · {Math.round(item.coverage*100)}% {t('attribute coverage')}</small>
        </div>
        <span className="squad-roster__score">{item.roleScore}</span>
      </li>)}
    </ol> : <div className="squad-feasibility" role="status">
      <Status tone="warning">{t("This player list cannot fill all eleven positions yet.")}</Status>
      <SquadIssue reason={solution.reason}/>
      <p>{t("To complete the lineup, choose a different player for a locked position, remove a player from the exclusion list, or export more attributes.")}</p>
    </div>}
  </Surface>;
}

interface PinEditorProps {
  readonly slots: readonly LineupSlot[];
  readonly dataset: PlayerDataset;
  readonly locks: Readonly<Record<string,string>>;
  readonly excluded: readonly string[];
  readonly onPin: (slotId:string,playerId:string|null)=>void;
  readonly onExclude: (playerId:string,excluded:boolean)=>void;
  readonly onClear: ()=>void;
}
function PinEditor({slots,dataset,locks,excluded,onPin,onExclude,onClear}:PinEditorProps){
  const { t } = useTranslation();
  const [pinSearch,setPinSearch]=useState('');
  const [excludeSearch,setExcludeSearch]=useState('');
  const pinnedOptions=useMemo(()=>{
    return new Map(slots.map(slot=>[slot.id,eligibleSlotCandidates(dataset.players,slot,pinSearch,50)]));
  },[slots,dataset,pinSearch]);
  const searched=useMemo(()=>{
    const query=excludeSearch.trim().toLocaleLowerCase();
    return dataset.players.filter(p=>!query || [p.name,p.position,p.club]
      .some(value=>value?.toLocaleLowerCase().includes(query))).slice(0,60);
  },[dataset,excludeSearch]);
  return <Surface className="squad-edit-card">
    <div className="squad-card-heading"><span>{t("Manager constraints")}</span>
      <Button variant="quiet" onClick={onClear}>{t("Clear all constraints")}</Button>
    </div>
    <p className="module-disclaimer">{t("Pin an observed, eligible player to a position or exclude a player from selection. Every edit recalculates the entire XI.")}</p>
    <label className="squad-editor-filter">{t("Find players to pin")}
      <input type="search" placeholder={t("Search name, club or exported position…")} value={pinSearch}
        onChange={event=>setPinSearch(event.target.value)}/>
    </label>
    <div className="squad-lock-list" role="group" aria-label={t("Lock player positions")}>
      {slots.map(slot=>{
        const value=locks[slot.id]??'';
        const candidates=pinnedOptions.get(slot.id)??[];
        const selected=candidates.find(x=>x.playerId===value);
        const pinnedName=dataset.players.find(p=>p.id===value)?.name??value;
        return <label className="squad-lock-row" key={slot.id}>
          <span><strong>{slot.label}</strong><small>{t(getRoleTitle(slot.roleId))}</small></span>
          <select aria-label={t('Lock')+' '+slot.label} value={value}
            onChange={event=>onPin(slot.id,event.target.value||null)}>
            <option value="">{t("Automatic selection")}</option>
            {value && !selected && <option value={value}>{pinnedName} · {t('current lock')}</option>}
            {candidates.map(candidate=><option key={candidate.playerId} value={candidate.playerId}>
              {candidate.name} · {t('Fit')} {candidate.score}{excluded.includes(candidate.playerId)?' · '+t('EXCLUDED'):''}
            </option>)}
          </select>
        </label>;
      })}
    </div>
    <div className="squad-exclusion-heading"><strong>{t("Exclude players")}</strong><small>{excluded.length} {t('unavailable for selection')}</small></div>
    <label className="squad-editor-filter">{t("Search roster to exclude")}
      <input type="search" placeholder={t("Search exported players…")} value={excludeSearch}
        onChange={event=>setExcludeSearch(event.target.value)}/>
    </label>
    <div className="squad-exclusion-list" role="group" aria-label={t("Exclude players")}>
      {searched.map(player=><label key={player.id} className="squad-exclusion-player">
        <input type="checkbox" checked={excluded.includes(player.id)}
          onChange={event=>onExclude(player.id,event.target.checked)}/>
        <span>{player.name}</span><small>{player.position??t('Position unknown')}</small>
      </label>)}
      {searched.length===0 && <p className="module-disclaimer">{t("No players match your search.")}</p>}
    </div>
    {dataset.players.length>60&&<p className="module-disclaimer">{t("Showing the first 60 matching players. Search by name to find others.")}</p>}
  </Surface>;
}

function ScenarioComparison({left,right}: {left:SquadSolution;right:SquadSolution}){
  const { t } = useTranslation();
  const comparison=compareSquadScenarios(left,right);
  return <Surface className="squad-compare-card">
    <div className="squad-card-heading"><span>{t("Plan comparison")}</span><span>{t("Based on the attributes you imported")}</span></div>
    <div className="squad-compare-summary">
      <div><small>{t("PLAN A")}</small><strong>{left.complete?left.averageRoleScore:'—'}</strong>
        <span>{left.formation} · {t(left.complete?'Starting eleven ready':'Starting eleven incomplete')}</span></div>
      <div className="squad-compare-separator" aria-hidden="true">{t("VS")}</div>
      <div><small>{t("PLAN B")}</small><strong>{right.complete?right.averageRoleScore:'—'}</strong>
        <span>{right.formation} · {t(right.complete?'Starting eleven ready':'Starting eleven incomplete')}</span></div>
    </div>
    {comparison.comparable
      ? <div className="squad-compare-metrics" aria-label={t("Comparison of feasible squads")}>
        <div><strong>{comparison.changedSlots}</strong><span>{t("Position assignments changed")}</span></div>
        <div><strong>{comparison.changedPlayers}</strong><span>{t("New players in B")}</span></div>
        <div><strong>{comparison.roleFitDelta!==null&&comparison.roleFitDelta>0?'+':''}{comparison.roleFitDelta}</strong>
          <span>{t("Role-fit point difference")}</span></div>
      </div>
      : <Status tone="warning">{t("Not directly comparable")}</Status>}
    <p className="module-disclaimer">{t(comparison.explanation)}</p>
  </Surface>;
}

export const SquadWorkspace = memo(function SquadWorkspace({dataset,onImport,plans,setPlans,active,setActive}:{
  dataset: PlayerDataset | null;
  onImport: () => void;
  plans: SquadPlans;
  setPlans: Dispatch<SetStateAction<SquadPlans>>;
  active: SquadPlanKey;
  setActive: Dispatch<SetStateAction<SquadPlanKey>>;
}){
  const { t } = useTranslation();
  const plan=plans[active];
  const solutions=useMemo(()=>dataset?{
    A:optimizeSquad(dataset.players,plans.A.formation,plans.A),
    B:optimizeSquad(dataset.players,plans.B.formation,plans.B)
  }:null,[dataset,plans]);
  const solution=solutions?.[active]??null;
  const unknownPositions=useMemo(()=>dataset?dataset.players
    .filter(player=>declaredPositions(player.position).size===0).length:0,[dataset]);
  const update=(change:(current:SquadPlanConfig)=>SquadPlanConfig)=>{
    setPlans(previous=>({...previous,[active]:change(previous[active])}));
  };
  const changeFormation=(next:FormationId)=>update(current=>{
    const valid=new Set(FORMATIONS[next].map(slot=>slot.id));
    const kept=Object.fromEntries(Object.entries(current.lockedSlots).filter(([slot])=>valid.has(slot)));
    return {...current,formation:next,lockedSlots:kept};
  });
  const onPin=(slotId:string,playerId:string|null)=>update(current=>{
    const lockedSlots={...current.lockedSlots};
    if(playerId)lockedSlots[slotId]=playerId;
    else delete lockedSlots[slotId];
    return {...current,lockedSlots};
  });
  const onExclude=(playerId:string,excluded:boolean)=>update(current=>({
    ...current,excludedPlayerIds:excluded
      ? [...new Set([...current.excludedPlayerIds,playerId])]
      : current.excludedPlayerIds.filter(id=>id!==playerId)
  }));
  const reset=()=>update(current=>({...current,lockedSlots:{},excludedPlayerIds:[]}));
  const copyAtoB=()=>setPlans(prev=>({...prev,B:{
    formation:prev.A.formation,lockedSlots:{...prev.A.lockedSlots},
    excludedPlayerIds:[...prev.A.excludedPlayerIds]
  }}));

  return <div className="view-flow">
    <div className="page-title">
      <span className="mh-eyebrow">{t("SQUAD MANAGEMENT / CONSTRAINT-BASED ANALYSIS")}</span>
      <h1>{t("Squad Planner")}</h1>
      <p>{t("Pick a formation, keep your favorite players in position, exclude others and compare two possible starting elevens.")}</p>
    </div>
    {!dataset?<Surface className="squad-no-data"><Icon name="layers" size={34}/>
      <h2>{t("Your squad needs an actual player export.")}</h2>
      <p>{t("Import an FM HTML/CSV/TSV squad list first. Unknown positions and attributes will not be filled with invented numbers.")}</p>
      <Button variant="primary" onClick={onImport}>{t("Open Player Lab")} <Icon name="arrow" size={15}/></Button>
    </Surface>:<>
      <div className="squad-scenario-header">
        <div className="squad-scenario-tabs" role="group" aria-label={t("Squad scenarios")}>
          {(['A','B'] as const).map(key=><button key={key} aria-pressed={active===key}
            className={active===key?'squad-scenario-tab squad-scenario-tab--active':'squad-scenario-tab'}
            onClick={()=>setActive(key)}>{t('Plan {{plan}}',{plan:key})}</button>)}
        </div>
        <Button variant="quiet" onClick={()=>{copyAtoB();setActive('B');}}>
          <Icon name="layers" size={15}/> {t("Copy Plan A to Plan B")}
        </Button>
      </div>
      <div className="squad-control-row">
        <label className="squad-formation-control">{t("Formation")}
          <select value={plan.formation} onChange={event=>changeFormation(event.target.value as FormationId)}>
            {Object.keys(FORMATIONS).map(key=><option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <div className="squad-source-label"><Icon name="shield" size={15}/>
          <span>{dataset.fileName} · {dataset.players.length} {t('players')} · {t('Imported data only')}</span>
        </div>
        <Status tone={solution?.complete?'positive':'warning'}>{t(solution?.complete?'Starting eleven ready':'Starting eleven incomplete')}</Status>
      </div>
      <div className="squad-summary-row">
        <Surface className="squad-summary-card"><span>{t("Starting XI")}</span>
          <strong>{solution?.lineup.length??0}<small> / 11</small></strong><small>{t("One player per slot")}</small></Surface>
        <Surface className="squad-summary-card"><span>{t("Average role fit")}</span>
          <strong>{solution?.averageRoleScore??'—'}{solution?.averageRoleScore!==null&&<small> / 100</small>}</strong>
          <small>{t("Derived attribute heuristic")}</small></Surface>
        <Surface className="squad-summary-card"><span>{t("Active constraints")}</span>
          <strong>{Object.keys(plan.lockedSlots).length+plan.excludedPlayerIds.length}</strong>
          <small>{Object.keys(plan.lockedSlots).length} {t('locked')} · {plan.excludedPlayerIds.length} {t('excluded')} · {unknownPositions} {t('unknown positions')}</small>
        </Surface>
      </div>
      {solution && <div className="squad-workspace-grid">
        <TacticalPitch solution={solution}/>
        <LineupResults solution={solution}/>
      </div>}
      {solutions&&<ScenarioComparison left={solutions.A} right={solutions.B}/>}
      <SectionHeading eyebrow={t("WHAT-IF PLANNING")} title={t('Adjust Plan')+' '+active}/>
      <PinEditor key={active+plan.formation} slots={FORMATIONS[plan.formation]} dataset={dataset}
        locks={plan.lockedSlots} excluded={plan.excludedPlayerIds}
        onPin={onPin} onExclude={onExclude} onClear={reset}/>
      <SectionHeading eyebrow={t("DATA SUFFICIENCY")} title={t("Position coverage and blockers")}/>
      <Surface className="squad-coverage-card">
        <div className="squad-coverage-columns"><strong>{t("Slot")}</strong><strong>{t("Known-position candidates")}</strong><strong>{t("Enough observed attributes")}</strong></div>
        {solution?.diagnostics.map(entry=><div key={entry.slot.id} className="squad-coverage-row">
          <span>{entry.slot.label}</span><span>{entry.eligibleCandidates} {t('players')}</span>
          <span className={entry.scoredCandidates===0?'squad-coverage-row--missing':''}>
            {entry.scoredCandidates===0?t('Not enough data'):entry.scoredCandidates+' '+t('ready')}
          </span>
        </div>)}
      </Surface>
      <div className="coverage-note"><Icon name="shield" size={17}/>
        <p><strong>{t("Interpretation:")}</strong> {t("Plans A and B stay available while you browse this session. Role-fit estimates don't include match fitness, chemistry or hidden CA and PA.")}</p>
      </div>
    </>}
  </div>;
}
