import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistoricalSnapshotRecord } from '@managerhub/domain';
import { SectionHeading, Status } from '@managerhub/ui';
import { formatBytes } from './historical-format';

export const HistoricalCoveragePanel = memo(function HistoricalCoveragePanel({ record }: { record: HistoricalSnapshotRecord }) {
  const { t } = useTranslation();
  return <section className="historical-panel" aria-labelledby="historical-coverage-title">
    <SectionHeading id="historical-coverage-title" eyebrow={t('Capture evidence')} title={t('Scan coverage')}/>
    <div className="historical-coverage-grid">
      {record.snapshot.captureCoverage.map(item => <div className="historical-coverage-item" key={item.nativeKind}>
        <div className="historical-coverage-heading">
          <strong>{item.nativeKind === 'player' ? t('Player records') : t('PlayerStaff records')}</strong>
          <Status tone="warning">{t('Provisional')}</Status>
        </div>
        <dl>
          <div><dt>{t('Observed records')}</dt><dd>{item.observedRecordCount.toLocaleString()}</dd></div>
          <div><dt>{t('Candidates matched')}</dt><dd>{item.matches.toLocaleString()}</dd></div>
          <div><dt>{t('Rejected / duplicate')}</dt><dd>{item.rejected.toLocaleString()} / {item.duplicates.toLocaleString()}</dd></div>
          <div><dt>{t('Read faults')}</dt><dd>{item.faultCount.toLocaleString()}</dd></div>
          <div><dt>{t('Bytes scanned')}</dt><dd>{formatBytes(item.bytesScanned)}</dd></div>
          <div><dt>{t('Elapsed')}</dt><dd>{item.elapsedMs.toLocaleString()} ms</dd></div>
          <div><dt>{t('Stop reason')}</dt><dd>{item.stopReason ? t(item.stopReason) : t('No stop limit reported')}</dd></div>
          <div><dt>{t('Selected mappings exhausted')}</dt><dd>{item.selectedMappingsExhausted ? t('Yes') : t('No')}</dd></div>
        </dl>
      </div>)}
      {record.snapshot.captureCoverage.length === 0 && <p className="historical-muted">{t('No native pass coverage was supplied.')}</p>}
    </div>
    <p className="historical-footnote">{t('Coverage is caller-declared research telemetry. It does not prove a complete roster, atomic game state or a currently loaded career.')}</p>
  </section>;
});
