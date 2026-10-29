import { memo, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FORMATIONS, declaredPositions, optimizeSquad,
  type FormationId, type PlayerDataset, type SquadPlanConfig, type SquadPlanKey, type SquadPlans
} from '@managerhub/domain';
import { Icon, SectionHeading } from '@managerhub/ui';
import TacticalPitch from './features/squad-planner/components/TacticalPitch';
import LineupResults from './features/squad-planner/components/LineupResults';
import PinEditor from './features/squad-planner/components/PinEditor';
import ScenarioComparison from './features/squad-planner/components/ScenarioComparison';
import SquadScenarioHeader from './features/squad-planner/components/SquadScenarioHeader';
import SquadControlBar from './features/squad-planner/components/SquadControlBar';
import SquadSummaryCards from './features/squad-planner/components/SquadSummaryCards';
import PositionCoverageTable from './features/squad-planner/components/PositionCoverageTable';
import SquadEmptyState from './features/squad-planner/components/SquadEmptyState';
import './squad-workspace.css';

function SquadWorkspaceView({dataset,onImport,plans,setPlans,active,setActive}:{
  dataset: PlayerDataset | null;
  onImport: () => void;
  plans: SquadPlans;
  setPlans: Dispatch<SetStateAction<SquadPlans>>;
  active: SquadPlanKey;
  setActive: Dispatch<SetStateAction<SquadPlanKey>>;
}){
  const { t } = useTranslation();
  const plan=plans[active];
  const solutionA=useMemo(
    ()=>dataset?optimizeSquad(dataset.players,plans.A.formation,plans.A):null,
    [dataset?.players,plans.A]
  );
  const solutionB=useMemo(
    ()=>dataset?optimizeSquad(dataset.players,plans.B.formation,plans.B):null,
    [dataset?.players,plans.B]
  );
  const solutions=useMemo(
    ()=>solutionA&&solutionB?{A:solutionA,B:solutionB}:null,
    [solutionA,solutionB]
  );
  const solution=active==='A'?solutionA:solutionB;
  const unknownPositions=useMemo(
    ()=>dataset?.players.filter(player=>declaredPositions(player.position).size===0).length??0,
    [dataset?.players]
  );
  const update=useCallback((change:(current:SquadPlanConfig)=>SquadPlanConfig)=>{
    setPlans(previous=>({...previous,[active]:change(previous[active])}));
  },[active,setPlans]);
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
  const copyPlanAtoB=useCallback(()=>{
    copyAtoB();
    setActive('B');
  },[copyAtoB,setActive]);

  return <div className="view-flow">
    <div className="page-title">
      <span className="mh-eyebrow">{t("SQUAD MANAGEMENT / CONSTRAINT-BASED ANALYSIS")}</span>
      <h1>{t("Squad Planner")}</h1>
      <p>{t("Pick a formation, keep your favorite players in position, exclude others and compare two possible starting elevens.")}</p>
    </div>
    {!dataset ? <SquadEmptyState onImport={onImport}/> : <>
      <SquadScenarioHeader active={active} onSetActive={setActive} onCopyPlanAtoB={copyPlanAtoB}/>
      <SquadControlBar formation={plan.formation} dataset={dataset} solution={solution} onChangeFormation={changeFormation}/>
      <SquadSummaryCards solution={solution} plan={plan} unknownPositions={unknownPositions}/>

      {solution && <div className="squad-workspace-grid">
        <TacticalPitch solution={solution}/>
        <LineupResults solution={solution}/>
      </div>}
      {solutions && <ScenarioComparison left={solutions.A} right={solutions.B}/>}

      <SectionHeading eyebrow={t("WHAT-IF PLANNING")} title={t('Adjust Plan') + ' ' + active}/>
      <PinEditor key={active + plan.formation} slots={FORMATIONS[plan.formation]} dataset={dataset}
        locks={plan.lockedSlots} excluded={plan.excludedPlayerIds}
        onPin={onPin} onExclude={onExclude} onClear={reset}/>

      <PositionCoverageTable solution={solution}/>

      <div className="coverage-note"><Icon name="shield" size={17}/>
        <p><strong>{t("Interpretation:")}</strong> {t("Plans A and B stay available while you browse this session. Role-fit estimates don't include match fitness, chemistry or hidden CA and PA.")}</p>
      </div>
    </>}
  </div>;
}


export const SquadWorkspace = memo(SquadWorkspaceView);
