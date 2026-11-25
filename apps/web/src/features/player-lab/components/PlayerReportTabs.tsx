import { memo } from 'react';
import { useTranslation } from 'react-i18next';

export type PlayerReportTab = 'overview' | 'attributes' | 'profile' | 'hidden' | 'roles' | 'recruitment' | 'compare';
type Props = { active: PlayerReportTab; onChange: (tab: PlayerReportTab) => void; isDecoded: boolean };

const TABS: readonly PlayerReportTab[] = ['overview', 'attributes', 'profile', 'hidden', 'roles', 'compare', 'recruitment'];
const TAB_LABELS: Record<PlayerReportTab, string> = {
  overview: 'Overview',
  attributes: 'Attributes',
  profile: 'Contract & positions',
  hidden: 'Personality & hidden traits',
  roles: 'Role fit',
  compare: 'Compare',
  recruitment: 'Recruitment'
};

function PlayerReportTabs({ active, onChange, isDecoded }: Props) {
  const { t } = useTranslation();
  return <div className="scout-tabs" role="tablist" aria-label={t("Player report")}>
    {TABS.filter(tab => isDecoded || (tab !== 'profile' && tab !== 'hidden')).map(tab => <button key={tab} role="tab" aria-selected={active === tab}
      onClick={() => onChange(tab)}
      className={active === tab ? 'scout-tab scout-tab--active' : 'scout-tab'}>{t(TAB_LABELS[tab])}</button>)}
  </div>;
}

export default memo(PlayerReportTabs);
