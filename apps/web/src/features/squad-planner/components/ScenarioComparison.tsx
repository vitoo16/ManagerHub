import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { compareSquadScenarios, type SquadSolution } from '@managerhub/domain';
import { Status, Surface } from '@managerhub/ui';

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

export default memo(ScenarioComparison);
