import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SquadPlanKey } from '@managerhub/domain';
import { Button, Icon } from '@managerhub/ui';

type Props = {
  active: SquadPlanKey;
  onSetActive: (key: SquadPlanKey) => void;
  onCopyPlanAtoB: () => void;
};

function SquadScenarioHeader({ active, onSetActive, onCopyPlanAtoB }: Props) {
  const { t } = useTranslation();
  return <div className="squad-scenario-header">
    <div className="squad-scenario-tabs" role="group" aria-label={t("Squad scenarios")}>
      {(['A', 'B'] as const).map(key => <button key={key} aria-pressed={active === key}
        className={active === key ? 'squad-scenario-tab squad-scenario-tab--active' : 'squad-scenario-tab'}
        onClick={() => onSetActive(key)}>{t('Plan {{plan}}', { plan: key })}</button>)}
    </div>
    <Button variant="quiet" onClick={onCopyPlanAtoB}>
      <Icon name="layers" size={15}/> {t("Copy Plan A to Plan B")}
    </Button>
  </div>;
}

export default memo(SquadScenarioHeader);
