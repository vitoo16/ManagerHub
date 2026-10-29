import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset } from '@managerhub/domain';
import { Icon, Status } from '@managerhub/ui';
import { readableImportWarning } from '../../../i18n/player-import-copy';

function PlayerDatasetSummary({ dataset }: { dataset: PlayerDataset }) {
  const { t } = useTranslation();
  return <>
    <div className="dataset-banner">
      <div><strong>{dataset.players.length.toLocaleString()} {t('player records')}</strong><span>{dataset.fileName} · {dataset.attributeColumns.length} {t('recognized attributes')}</span></div>
      <Status tone="warning">{t("From your export (not game-verified)")}</Status>
    </div>
    {dataset.warnings.length > 0 && <div className="dataset-warnings" role="status">
      {dataset.warnings.map((warning, index) => <p key={index}><Icon name="warning" size={14}/>{t(readableImportWarning(warning))}</p>)}
    </div>}
  </>;
}

export default memo(PlayerDatasetSummary);
