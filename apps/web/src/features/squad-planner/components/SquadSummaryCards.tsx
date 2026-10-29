import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SquadPlanConfig, SquadSolution } from '@managerhub/domain';
import { Surface } from '@managerhub/ui';

type Props = { solution: SquadSolution | null; plan: SquadPlanConfig; unknownPositions: number };

function SquadSummaryCards({ solution, plan, unknownPositions }: Props) {
  const { t } = useTranslation();
  const lockedCount = Object.keys(plan.lockedSlots).length;
  const excludedCount = plan.excludedPlayerIds.length;
  return <div className="squad-summary-row">
    <Surface className="squad-summary-card">
      <span>{t("Starting XI")}</span>
      <strong>{solution?.lineup.length ?? 0}<small> / 11</small></strong>
      <small>{t("One player per slot")}</small>
    </Surface>
    <Surface className="squad-summary-card">
      <span>{t("Average role fit")}</span>
      <strong>{solution?.averageRoleScore ?? '—'}{solution?.averageRoleScore !== null && solution?.averageRoleScore !== undefined && <small> / 100</small>}</strong>
      <small>{t("Derived attribute heuristic")}</small>
    </Surface>
    <Surface className="squad-summary-card">
      <span>{t("Active constraints")}</span>
      <strong>{lockedCount + excludedCount}</strong>
      <small>{lockedCount} {t('locked')} · {excludedCount} {t('excluded')} · {unknownPositions} {t('unknown positions')}</small>
    </Surface>
  </div>;
}

export default memo(SquadSummaryCards);
