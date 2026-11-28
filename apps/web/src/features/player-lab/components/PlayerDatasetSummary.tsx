import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset } from '@managerhub/domain';
import { Icon, Status } from '@managerhub/ui';
import { readableImportWarning } from '../../../i18n/player-import-copy';

function PlayerDatasetSummary({ dataset }: { dataset: PlayerDataset }) {
  const { t } = useTranslation();
  const isDecoded = dataset.source === 'decoded_save';
  const verified = isDecoded && dataset.saveVerification === 'verified';
  return <>
    <div className="dataset-banner">
      <div>
        <strong>{dataset.players.length.toLocaleString()} {t('player records')}</strong>
        <span>{dataset.fileName} · {dataset.attributeColumns.length} {t('recognized attributes')}</span>
      </div>
      <Status tone={verified ? 'positive' : 'warning'}>
        {t(isDecoded ? verified ? 'Decoded from save · Verified' : 'Research-only decode · Not independently verified' : 'From your export (not game-verified)')}
      </Status>
    </div>
    {dataset.warnings.length > 0 && <div className="dataset-warnings" role="status">
      {dataset.warnings.map((warning, index) => (
        <p key={index}>
          <Icon name={isDecoded ? 'shield' : 'warning'} size={14}/>
          {isDecoded
            ? t('Realism mode hides Actual CA, Actual PA, reputations, and hidden personality/playing traits.')
            : t(readableImportWarning(warning))}
        </p>
      ))}
    </div>}
  </>;
}

export default memo(PlayerDatasetSummary);
