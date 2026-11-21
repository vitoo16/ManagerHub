import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createSquadPlansCsv, squadReportFilename,
  type PlayerDataset, type SquadPlanKey, type SquadSolution
} from '@managerhub/domain';
import { Button, Icon } from '@managerhub/ui';

interface Props {
  readonly dataset: PlayerDataset;
  readonly solutions: Readonly<Record<SquadPlanKey, SquadSolution>>;
}

/** Deliberate user download: no server, original save or hidden CA/PA exposed. */
function SquadReportActions({ dataset, solutions }: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const exportCsv = useCallback(() => {
    setError(false);
    let url: string | null = null;
    try {
      const contents = createSquadPlansCsv(dataset, solutions);
      const file = new Blob([contents], { type: 'text/csv;charset=utf-8' });
      url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = squadReportFilename(dataset.fileName);
      anchor.hidden = true;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
    } catch {
      setError(true);
    } finally {
      if (url !== null) {
        const cleanupUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(cleanupUrl), 30_000);
      }
    }
  }, [dataset, solutions]);

  return <div className="squad-report-actions">
    <div>
      <strong>{t('Download your lineup report')}</strong>
      <p>{t('Includes both plans, provisional role-fit scores and missing positions; never actual CA/PA or edited game data.')}</p>
    </div>
    <Button variant="quiet" onClick={exportCsv}><Icon name="download" size={15}/>{t('Export both plans as CSV')}</Button>
    {error && <p role="alert">{t('Could not create this report. Your squad plans are unchanged.')}</p>}
  </div>;
}

export default memo(SquadReportActions);
