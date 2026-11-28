import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionTabs } from '@managerhub/ui';

export type PlayerReportTab = 'overview' | 'attributes' | 'profile' | 'hidden' | 'roles' | 'recruitment' | 'compare' | 'development';
type Props = { active: PlayerReportTab; onChange: (tab: PlayerReportTab) => void; isDecoded: boolean; id: string };

const TABS: readonly PlayerReportTab[] = ['overview', 'attributes', 'profile', 'hidden', 'roles', 'compare', 'development', 'recruitment'];
const TAB_LABELS: Record<PlayerReportTab, string> = {
  overview: 'Overview',
  attributes: 'Attributes',
  profile: 'Contract & positions',
  hidden: 'Personality & hidden traits',
  roles: 'Role fit',
  compare: 'Compare',
  development: 'Development',
  recruitment: 'Recruitment'
};

function PlayerReportTabs({ active, onChange, isDecoded, id }: Props) {
  const { t } = useTranslation();
  return <SectionTabs id={id} label={t('Player report')} active={active} onChange={onChange}
    items={TABS.filter(tab => isDecoded || (tab !== 'profile' && tab !== 'hidden')).map(tab => ({ id: tab, label: t(TAB_LABELS[tab]) }))}/>;
}

export default memo(PlayerReportTabs);
