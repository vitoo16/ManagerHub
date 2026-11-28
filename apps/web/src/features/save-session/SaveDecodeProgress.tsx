import { useTranslation } from 'react-i18next';
import { Button, Icon, Surface } from '@managerhub/ui';
import type { FM2013DecodeProgress, FM2013DecodeStage } from '@managerhub/domain/fm2013-offline';
import './save-decode-progress.css';

function decodeStageLabel(stage: FM2013DecodeStage): string {
  switch (stage) {
    case 'hashing': return 'Calculating SHA-256 fingerprint…';
    case 'reading_container': return 'Reading save archive container…';
    case 'decrypting_database': return 'Decrypting and inflating game database…';
    case 'parsing_tables': return 'Parsing persisted football tables…';
    case 'indexing_database': return 'Indexing clubs, players, contracts and staff…';
  }
}

export function SaveDecodeProgress({ progress, onCancel }: {
  readonly progress: FM2013DecodeProgress | null;
  readonly onCancel: () => void;
}) {
  const { t } = useTranslation();
  return <Surface className="save-decode-progress" role="status" aria-live="polite">
    <div className="save-decode-progress__head">
      <strong>{t('Decoding .fm save offline…')}</strong>
      <span>{progress ? Math.round(progress.percent) + '%' : t('Preparing…')}</span>
    </div>
    <progress className="save-decode-progress__track" max={100}
      aria-label={t('Save decoding progress')} value={progress?.percent}/>
    <div className="save-decode-progress__foot">
      <span>{progress ? t(decodeStageLabel(progress.stage)) : t('Reading save archive container…')}</span>
      <Button type="button" variant="quiet" onClick={onCancel}>
        <Icon name="close" size={14}/> {t('Cancel decode')}
      </Button>
    </div>
  </Surface>;
}
