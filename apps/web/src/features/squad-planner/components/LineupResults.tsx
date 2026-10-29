import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SquadSolution } from '@managerhub/domain';
import { Status, Surface } from '@managerhub/ui';
import SquadIssue from './SquadIssue';
import { getRoleTitle } from '../getRoleTitle';

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
