import { useTranslation } from 'react-i18next';
import { LIVE_ATTRIBUTE_CATEGORIES, liveAttributeCategory } from '@managerhub/domain';

const labels = {
  technical: 'Technical', mental: 'Mental', physical: 'Physical', goalkeeping: 'Goalkeeping',
  other: 'Other observed attributes', positions: 'Position evidence', ability: 'Ability and contract data'
} as const;

export type HistoricalEvidenceGroup = keyof typeof labels;

export function HistoricalEvidenceSelector({ value, onChange, includeAbility = false, keys }: {
  readonly value: HistoricalEvidenceGroup;
  readonly onChange: (group: HistoricalEvidenceGroup) => void;
  readonly includeAbility?: boolean;
  readonly keys: readonly string[];
}) {
  const { t } = useTranslation();
  const groups: HistoricalEvidenceGroup[] = [...LIVE_ATTRIBUTE_CATEGORIES];
  if (keys.some(key => liveAttributeCategory(key) === 'other')) groups.push('other');
  groups.push('positions');
  if (includeAbility) groups.push('ability');
  return <label className="historical-evidence-selector">
    <span>{t('Evidence group')}</span>
    <select value={value} onChange={event => onChange(event.currentTarget.value as HistoricalEvidenceGroup)}>
      {groups.map(group => <option key={group} value={group}>{t(labels[group])}</option>)}
    </select>
  </label>;
}
