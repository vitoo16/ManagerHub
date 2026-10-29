import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SquadSolution } from '@managerhub/domain';
import { SectionHeading, Surface } from '@managerhub/ui';

function PositionCoverageTable({ solution }: { solution: SquadSolution | null }) {
  const { t } = useTranslation();
  return <>
    <SectionHeading eyebrow={t("DATA SUFFICIENCY")} title={t("Position coverage and blockers")}/>
    <Surface className="squad-coverage-card">
      <div className="squad-coverage-columns">
        <strong>{t("Slot")}</strong><strong>{t("Known-position candidates")}</strong><strong>{t("Enough observed attributes")}</strong>
      </div>
      {solution?.diagnostics.map(entry => <div key={entry.slot.id} className="squad-coverage-row">
        <span>{entry.slot.label}</span><span>{entry.eligibleCandidates} {t('players')}</span>
        <span className={entry.scoredCandidates === 0 ? 'squad-coverage-row--missing' : ''}>
          {entry.scoredCandidates === 0 ? t('Not enough data') : entry.scoredCandidates + ' ' + t('ready')}
        </span>
      </div>)}
    </Surface>
  </>;
}

export default memo(PositionCoverageTable);
