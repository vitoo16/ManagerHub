import { memo, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS, type AttributeKey, type PlayerExport } from '@managerhub/domain';
import { AttributePropertyGroup, Button, getAttributeTier } from '@managerhub/ui';
import './player-attribute-table.css';

type Group = keyof typeof ATTRIBUTE_GROUPS | 'all';
const PAGE_SIZE = 14;

interface Props {
  readonly attributes: PlayerExport['attributes'];
  readonly onChange?: (key: AttributeKey, raw: string, previous: number) => void;
}

function PlayerAttributeTable({ attributes, onChange }: Props) {
  const { t } = useTranslation();
  const groupId = useId();
  const sortId = useId();
  const [group, setGroup] = useState<Group>('Technical');
  const [ranked, setRanked] = useState(false);
  const [page, setPage] = useState(0);
  const keys: AttributeKey[] = group === 'all' ? [...new Set(Object.values(ATTRIBUTE_GROUPS).flat())] : [...ATTRIBUTE_GROUPS[group]];
  const rankValue = (key: AttributeKey) => {
    const value = attributes[key];
    return getAttributeTier(value) ? value! : -1;
  };
  if (ranked) keys.sort((a, b) => rankValue(b) - rankValue(a));
  const fields = keys.map(key => ({ key, label: t(ATTRIBUTE_LABELS[key]), value: attributes[key] }));
  const pageCount = Math.max(1, Math.ceil(fields.length / PAGE_SIZE));
  const visibleFields = group === 'all' ? fields.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : fields;
  const observed = fields.filter(field => getAttributeTier(field.value) !== undefined).length;
  return <div className="player-attribute-table">
    <div className="player-attribute-controls">
      <div className="player-attribute-field">
        <label htmlFor={groupId}>{t('Attribute group')}</label>
        <select id={groupId} value={group} onChange={event => { setGroup(event.currentTarget.value as Group); setPage(0); }}>
          <option value="all">{t('All attributes')}</option>
          {Object.keys(ATTRIBUTE_GROUPS).map(key => <option key={key} value={key}>{t(key)}</option>)}
        </select>
      </div>
      <div className="player-attribute-sort">
        <input id={sortId} type="checkbox" checked={ranked} onChange={event => { setRanked(event.currentTarget.checked); setPage(0); }}/>
        <label htmlFor={sortId}>{t('Sort highest first')}</label>
      </div>
    </div>
    <p className="module-disclaimer">{t('{{observed}} of {{total}} attributes observed', { observed, total: fields.length })}</p>
    {observed === 0 && <p className="module-disclaimer">{t('No recognized, exact 1–20 attributes were included in the export.')}</p>}
    <AttributePropertyGroup title={t(group === 'all' ? 'All attributes' : group)} fields={visibleFields} onChange={onChange}/>
    {group === 'all' && <div className="save-db-actions" role="group" aria-label={t('Attribute page')}>
      <Button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('Previous attributes')}</Button>
      <span aria-live="polite">{page + 1} / {pageCount}</span>
      <Button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>{t('Next attributes')}</Button>
    </div>}
  </div>;
}
export default memo(PlayerAttributeTable);
