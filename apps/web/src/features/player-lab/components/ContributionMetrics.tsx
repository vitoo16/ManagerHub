import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface ContributionMetricsProps {
  readonly withPlayer: number | null;
  readonly withoutPlayer: number | null;
  readonly roleFitDelta: number | null;
  readonly changedSlots: number | null;
}

export const ContributionMetrics = memo(function ContributionMetrics({
  withPlayer, withoutPlayer, roleFitDelta, changedSlots
}: ContributionMetricsProps) {
  const { t } = useTranslation();
  return <div className="scout-metrics">
    <div><span>{t("With this player")}</span><strong>{withPlayer ?? '—'}</strong><small>{t("Average role fit / 100")}</small></div>
    <div><span>{t("Without this player")}</span><strong>{withoutPlayer ?? '—'}</strong><small>{t("Best replacement XI")}</small></div>
    <div><span>{t("Role-fit difference")}</span><strong>{roleFitDelta !== null && roleFitDelta > 0 ? '+' : ''}{roleFitDelta ?? '—'}</strong><small>{t("Points across the full XI")}</small></div>
    <div><span>{t("Changed positions")}</span><strong>{changedSlots ?? '—'}</strong><small>{t("When this player is excluded")}</small></div>
  </div>;
});
