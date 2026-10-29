import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  FORMATIONS, declaredPositions, optimizeSquad,
  type FormationId, type PlayerDataset, type SquadPlanConfig, type SquadPlanKey, type SquadPlans
} from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import TacticalPitch from './features/squad-planner/components/TacticalPitch';
import LineupResults from './features/squad-planner/components/LineupResults';
import PinEditor from './features/squad-planner/components/PinEditor';
import ScenarioComparison from './features/squad-planner/components/ScenarioComparison';
import './squad-workspace.css';

export function SquadWorkspace({dataset,onImport,plans,setPlans,active,setActive}:{
  dataset: PlayerDataset | null;
  onImport: () => void;
  plans: SquadPlans;
  setPlans: Dispatch<SetStateAction<SquadPlans>>;
  active: SquadPlanKey;
  setActive: Dispatch<SetStateAction<SquadPlanKey>>;
}){
  const { t } = useTranslation();
  const plan=plans[active];
  const players=dataset?.players;
  // Each scenario is independent: editing Plan A must not rerun Plan B's optimizer.
  const solutionA=useMemo(()=>players?optimizeSquad(players,plans.A.formation,plans.A):null,[players,plans.A]);
  const solutionB=useMemo(()=>players?optimizeSquad(players,plans.B.formation,plans.B):null,[players,plans.B]);
  const solutions=useMemo(()=>solutionA&&solutionB?{A:solutionA,B:solutionB}:null,[solutionA,solutionB]);
  const solution=active==='A'?solutionA:solutionB;
  const unknownPositions=useMemo(()=>players
    ?players.filter(player=>declaredPositions(player.position).size===0).length:0,[players]);
  const update=useCallback((change:(current:SquadPlanConfig)=>SquadPlanConfig)=>{
    setPlans(previous=>({...previous,[active]:change(previous[active])}));
  },[setPlans,active]);
  const changeFormation=useCallback((next:FormationId)=>update(current=>{
    const valid=new Set(FORMATIONS[next].map(slot=>slot.id));
    const kept=Object.fromEntries(Object.entries(current.lockedSlots).filter(([slot])=>valid.has(slot)));
    return {...current,formation:next,lockedSlots:kept};
  }),[update]);
  const onPin=useCallback((slotId:string,playerId:string|null)=>update(current=>{
    const lockedSlots={...current.lockedSlots};
    if(playerId)lockedSlots[slotId]=playerId;
    else delete lockedSlots[slotId];
    return {...current,lockedSlots};
  }),[update]);
  const onExclude=useCallback((playerId:string,excluded:boolean)=>update(current=>({
    ...current,excludedPlayerIds:excluded
      ? [...new Set([...current.excludedPlayerIds,playerId])]
      : current.excludedPlayerIds.filter(id=>id!==playerId)
  })),[update]);
  const reset=useCallback(()=>update(current=>({...current,lockedSlots:{},excludedPlayerIds:[]})),[update]);
  const copyAtoB=useCallback(()=>setPlans(prev=>({...prev,B:{
    formation:prev.A.formation,lockedSlots:{...prev.A.lockedSlots},
    excludedPlayerIds:[...prev.A.excludedPlayerIds]
  }})),[setPlans]);

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
