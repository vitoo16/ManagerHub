import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS, type AttributeKey, type PlayerExport } from '@managerhub/domain';
import { AttributePropertyGroup, getAttributeTier } from '@managerhub/ui';

type Group = keyof typeof ATTRIBUTE_GROUPS;

function PlayerAttributeTable({ player }: { player: PlayerExport }) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<Group>('Technical');
  const [ranked, setRanked] = useState(false);
  const keys: AttributeKey[] = [...ATTRIBUTE_GROUPS[group]];
  const rankValue = (key: AttributeKey) => {
    const value = player.attributes[key];
    return getAttributeTier(value) ? value! : -1;
  };
  if (ranked) keys.sort((a, b) => rankValue(b) - rankValue(a));
  const fields = keys.map(key => ({ key, label: t(ATTRIBUTE_LABELS[key]), value: player.attributes[key] }));
  const observed = fields.filter(field => getAttributeTier(field.value) !== undefined).length;
  return <div className="player-attribute-table">
    <div className="player-attribute-controls">
      <label>
        <span>{t('Attribute group')}</span>
        <select value={group} onChange={event => setGroup(event.currentTarget.value as Group)}>
          {Object.keys(ATTRIBUTE_GROUPS).map(key => <option key={key} value={key}>{t(key)}</option>)}
        </select>
      </label>
      <label className="player-attribute-sort">
        <input type="checkbox" checked={ranked} onChange={event => setRanked(event.currentTarget.checked)}/>
        <span>{t('Sort highest first')}</span>
      </label>
    </div>
    <p className="module-disclaimer">{t('{{observed}} of {{total}} attributes observed', { observed, total: fields.length })}</p>
    {observed === 0 && <p className="module-disclaimer">{t('No recognized, exact 1–20 attributes were included in the export.')}</p>}
    <AttributePropertyGroup title={t(group)} fields={fields}/>
  </div>;
}
export default memo(PlayerAttributeTable);
