import { memo } from 'react';
import { useTranslation } from 'react-i18next';

export type PlayerReportTab = 'overview' | 'attributes' | 'roles' | 'recruitment' | 'compare';
type Props = { active: PlayerReportTab; onChange: (tab: PlayerReportTab) => void };

const TABS: readonly PlayerReportTab[] = ['overview', 'attributes', 'roles', 'compare', 'recruitment'];

function PlayerReportTabs({ active, onChange }: Props) {
  const { t } = useTranslation();
  const labels: Record<PlayerReportTab, string> = {
    overview: 'Overview',
    attributes: 'Attributes',
    roles: 'Role fit',
    compare: 'Compare',
    recruitment: 'Recruitment'
  };
  return <div className="scout-tabs" role="tablist" aria-label={t("Player report")}>
    {TABS.map(tab => <button key={tab} role="tab" aria-selected={active === tab}
      onClick={() => onChange(tab)}
      className={active === tab ? 'scout-tab scout-tab--active' : 'scout-tab'}>{t(labels[tab])}</button>)}
  </div>;
}

export default memo(PlayerReportTabs);
