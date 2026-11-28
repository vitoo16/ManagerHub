import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_GROUPS, attributeGroupSummary, type PlayerExport } from '@managerhub/domain';

function PlayerAttributeSummary({ player }: { player: PlayerExport }) {
  const { t } = useTranslation();
  const groups = attributeGroupSummary(player);
  return <table className="player-attribute-summary" aria-label={t('Attribute group summary')}>
    <thead><tr><th scope="col">{t('Attribute group')}</th><th scope="col">{t('Native 1–20 mean')}</th><th scope="col">{t('Observed')}</th></tr></thead>
    <tbody>{groups.map(group => <tr key={group.name}>
      <th scope="row">{t(group.name)}</th>
      <td>{group.score?.toFixed(1) ?? '—'}</td>
      <td>{group.observed}/{ATTRIBUTE_GROUPS[group.name as keyof typeof ATTRIBUTE_GROUPS].length}</td>
    </tr>)}</tbody>
  </table>;
}
export default memo(PlayerAttributeSummary);
