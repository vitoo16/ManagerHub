import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SquadSolution } from '@managerhub/domain';
import { Status, Surface } from '@managerhub/ui';
import { getRoleTitle } from './role-title';

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

export default memo(LineupResults);
