import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_HISTORICAL_SNAPSHOTS, type HistoricalSnapshotSummary } from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status } from '@managerhub/ui';
import { formatDate } from './historical-format';
import { ReportPagination, reportPage } from '../ReportPagination';

export const HistoricalSnapshotList = memo(function HistoricalSnapshotList({ items, loading, disabled, selectedId, pendingDelete, onOpen, onDelete, onCancelDelete }:
  { items: readonly HistoricalSnapshotSummary[]; loading: boolean; disabled: boolean; selectedId: string | null; pendingDelete: string | null;
    onOpen: (id: string) => void; onDelete: (id: string) => void; onCancelDelete: () => void }) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const range = reportPage(items.length, page, MAX_HISTORICAL_SNAPSHOTS);
  return <section className="historical-panel historical-library" aria-labelledby="historical-library-title">
    <SectionHeading id="historical-library-title" eyebrow={t('Local historical library')} title={t('Saved snapshots')}/>
    {loading ? <p className="historical-muted" role="status">{t('Loading saved snapshots…')}</p> :
      items.length === 0 ? <div className="historical-empty">
        <Icon name="database" size={22}/>
        <strong>{t('No historical snapshots saved')}</strong>
        <p>{t('Import a capture, review its coverage, then save it on this browser. The source JSON is never stored.')}</p>
      </div> :
      <ul className="historical-snapshot-list" aria-label={t('Saved historical snapshots')}>
        {items.slice(range.start, range.end).map(item => <li key={item.id} className={selectedId === item.id ? 'historical-snapshot-row historical-snapshot-row--active' : 'historical-snapshot-row'}>
          <button className="historical-snapshot-open" onClick={() => onOpen(item.id)} disabled={disabled}>
            <span className="historical-snapshot-name">{item.careerLabel}</span>
            <span className="historical-snapshot-file">{item.fileName}</span>
            <span className="historical-snapshot-meta">
              <span>{item.playerCount.toLocaleString()} {t('observed records')}</span>
              <span>{formatDate(item.capturedAt, i18n.language)}</span>
            </span>
            <span className="historical-snapshot-status">
              <Status tone={item.status === 'ready' ? 'info' : item.status === 'partial' ? 'warning' : 'neutral'}>{t(item.status)}</Status>
              <span>{item.mode === 'editor' ? t('Editor projection') : t('Realism projection')}</span>
            </span>
          </button>
          <div className="historical-snapshot-actions">
            <Button variant="quiet" onClick={() => onOpen(item.id)} disabled={disabled}>{t('Open')}</Button>
            <Button variant="quiet" onClick={() => onDelete(item.id)} disabled={disabled}>{pendingDelete === item.id ? t('Confirm delete') : t('Delete')}</Button>
            {pendingDelete === item.id && <Button variant="quiet" onClick={onCancelDelete} disabled={disabled}>{t('Cancel')}</Button>}
          </div>
          {pendingDelete === item.id && <p className="historical-destructive-warning" role="status">
            {t('Deleting removes this snapshot and any saved Editor or Realism projection. This cannot be undone; keep the source JSON to reimport.')}
          </p>}
        </li>)}
      </ul>}
    {!loading && <ReportPagination label={t('Saved snapshots page')} range={range} onChange={setPage}/>}
  </section>;
});
