import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SlotCoverage } from '@managerhub/domain';

interface CoverageDiagnosticsProps {
  readonly entries: readonly SlotCoverage[];
  readonly label: string;
}

export const CoverageDiagnostics = memo(function CoverageDiagnostics({
  entries, label
}: CoverageDiagnosticsProps) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;

  return <div className="squad-coverage-list" role="list" aria-label={t(label)}>
    {entries.map(item => <div role="listitem" key={item.slot.id}>
      <strong>{item.slot.label}</strong>
      <span>{t("{{scored}} of {{eligible}} eligible players", {
        scored: item.scoredCandidates,
        eligible: item.eligibleCandidates
      })}</span>
    </div>)}
  </div>;
});
