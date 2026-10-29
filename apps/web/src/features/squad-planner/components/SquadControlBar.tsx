import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FORMATIONS, type FormationId, type PlayerDataset, type SquadSolution } from '@managerhub/domain';
import { Icon, Status } from '@managerhub/ui';

type Props = {
  formation: FormationId;
  dataset: PlayerDataset;
  solution: SquadSolution | null;
  onChangeFormation: (formation: FormationId) => void;
};

const FORMATION_OPTIONS = Object.keys(FORMATIONS) as FormationId[];

function SquadControlBar({ formation, dataset, solution, onChangeFormation }: Props) {
  const { t } = useTranslation();
  return <div className="squad-control-row">
    <label className="squad-formation-control">{t("Formation")}
      <select value={formation} onChange={event => onChangeFormation(event.target.value as FormationId)}>
        {FORMATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
    <div className="squad-source-label"><Icon name="shield" size={15}/>
      <span>{dataset.fileName} · {dataset.players.length} {t('players')} · {t('Imported data only')}</span>
    </div>
    <Status tone={solution?.complete ? 'positive' : 'warning'}>{t(solution?.complete ? 'Starting eleven ready' : 'Starting eleven incomplete')}</Status>
  </div>;
}

export default memo(SquadControlBar);
