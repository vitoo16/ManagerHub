import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FORMATIONS, type SquadSolution, type SlotAssignment } from '@managerhub/domain';
import { Icon, Surface } from '@managerhub/ui';

function TacticalPitch({ solution }: { solution: SquadSolution }) {
  const { t } = useTranslation();
  const positions=useMemo(()=>new Map(solution.lineup.map(item=>[item.slot.id,item] as const)),[solution.lineup]);
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

export default memo(TacticalPitch);
