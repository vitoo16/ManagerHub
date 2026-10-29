import { memo, useId, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset } from '@managerhub/domain';
import { Button, Icon, Status } from '@managerhub/ui';

type Activity = 'saving' | 'opening' | 'deleting' | null;
type Props = {
  dataset: PlayerDataset | null;
  savedCurrent: boolean;
  activity: Activity;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onClear: () => void;
};

function PlayerImportToolbar({ dataset, savedCurrent, activity, onFile, onSave, onClear }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  return <div className="player-lab-header">
    <div>
      <input id={fileInputId} ref={inputRef} type="file"
        accept=".csv,.tsv,.txt,.html,.htm,text/csv,text/tab-separated-values,text/html"
        className="visually-hidden" onChange={onFile}/>
      <Button variant="primary" onClick={() => inputRef.current?.click()}>
        <Icon name="plus" size={16}/>{t(dataset ? 'Replace player export' : 'Import player CSV / HTML')}
      </Button>
      {dataset && <Button disabled={savedCurrent || activity !== null} onClick={onSave}>
        <Icon name="download" size={16}/>{t(savedCurrent ? 'Saved to this browser' : activity === 'saving' ? 'Saving…' : 'Save on this browser')}
      </Button>}
      {dataset && <Button variant="quiet" onClick={onClear}>
        <Icon name="trash" size={16}/> {t("Clear session")}
      </Button>}
    </div>
    <Status tone="info">{t("No data uploaded")}</Status>
  </div>;
}

export default memo(PlayerImportToolbar);
