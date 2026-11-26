import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Status } from '@managerhub/ui';
import { ReportPagination, reportPage } from '../ReportPagination';
import { planNumericMassEdit, type NumericMassField, type NumericMassRecord } from './numeric-mass-edit';

interface Props<R extends NumericMassRecord, P> {
  readonly records: readonly R[];
  readonly fields: readonly NumericMassField<R, P>[];
  readonly searchText: (record: R) => string;
  readonly name: (record: R) => string;
  readonly validate: (patch: P) => void;
  readonly onApply: (uids: readonly number[], patch: P) => void;
}

export function NumericMassEditPanel<R extends NumericMassRecord, P>({ records, fields, searchText, name, validate, onApply }: Props<R, P>) {
  const { t } = useTranslation();
  const [group, setGroup] = useState(fields[0]?.group ?? '');
  const [fieldId, setFieldId] = useState('');
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const [raw, setRaw] = useState('');
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const field = fields.find(item => item.id === fieldId && item.group === group);
  const groups = [...new Set(fields.map(item => item.group))];
  const plan = useMemo(() => planNumericMassEdit(records, field, { query: deferredQuery, all, raw }, searchText, validate),
    [records, field, deferredQuery, all, raw, searchText, validate]);
  const stale = !all && query !== deferredQuery;
  const range = reportPage(plan.changes.length, page, 8);
  const apply = () => {
    if (stale || !field || plan.patch === null || plan.value === null || !plan.changes.length) return;
    if (!window.confirm(t('Set {{field}} to {{value}} for {{count}} records in the draft? Unavailable and unchanged records are excluded. The original save is not modified.', {
      field: t(field.label), value: plan.value, count: plan.changes.length
    }))) return;
    onApply(plan.changes.map(change => change.record.uid), plan.patch);
  };
  return <div className="editor-section">
    <p className="module-disclaimer">{t('Choose one field and an explicit scope. Only records with an observed current value can change. Ability and potential are independent fields; no automatic adjustment is made.')}</p>
    <div className="editor-field-grid">
      <label className="editor-field"><span>{t('Field group')}</span>
        <select value={group} onChange={event => { setGroup(event.currentTarget.value); setFieldId(''); setRaw(''); setPage(0); }}>
          {groups.map(item => <option key={item} value={item}>{t(item)}</option>)}
        </select>
      </label>
      <label className="editor-field"><span>{t('Field to change')}</span>
        <select value={fieldId} onChange={event => { setFieldId(event.currentTarget.value); setRaw(''); setPage(0); }}>
          <option value="">{t('Choose a field')}</option>
          {fields.filter(item => item.group === group).map(item => <option key={item.id} value={item.id}>{t(item.label)}</option>)}
        </select>
      </label>
      <label className="editor-field"><span>{t('Filter records by name, club, nation or UID')}</span>
        <input type="search" disabled={all} value={query} onChange={event => { setQuery(event.currentTarget.value); setPage(0); }}/>
      </label>
      <label className="editor-field"><span>{t('New integer value')}</span>
        <input type="number" step={1} disabled={!field} value={raw} onChange={event => { setRaw(event.currentTarget.value); setPage(0); }}/>
      </label>
    </div>
    <label className="editor-mass-all"><input type="checkbox" checked={all} onChange={event => { setAll(event.currentTarget.checked); setPage(0); }}/>
      {t('Include all records of this type')}</label>
    {plan.invalid && <Status tone="warning">{t('Value is outside the supported integer range for this field.')}</Status>}
    {!plan.scoped && <p className="module-disclaimer">{t('Enter a filter or explicitly include all records.')}</p>}
    {stale ? <p role="status">{t('Updating preview…')}</p> : plan.patch !== null && plan.scoped && <>
      <p role="status">{t('{{matched}} matched · {{changed}} changes · {{unavailable}} unavailable · {{unchanged}} unchanged', {
        matched: plan.matched, changed: plan.changes.length, unavailable: plan.unavailable, unchanged: plan.unchanged
      })}</p>
      {plan.changes.length > 0 && <div className="editor-diff-wrap"><table className="save-db-table" aria-label={t('Mass edit change preview')}>
        <thead><tr><th scope="col">{t('Name')}</th><th scope="col">{t('Before')}</th><th scope="col">{t('After')}</th></tr></thead>
        <tbody>{plan.changes.slice(range.start, range.end).map(change => <tr key={change.record.uid}>
          <th scope="row">{name(change.record)} · #{change.record.uid}</th><td>{change.before}</td><td>{plan.value}</td>
        </tr>)}</tbody>
      </table></div>}
      <ReportPagination label={t('Mass edit preview page')} range={range} onChange={setPage}/>
    </>}
    <div><Button type="button" variant="primary" disabled={stale || !plan.patch || !plan.changes.length} onClick={apply}>
      {t('Apply mass edit to draft')}
    </Button></div>
  </div>;
}
