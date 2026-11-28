import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase, PlayerDraftPatch } from '@managerhub/domain/fm2013-offline';
import { Button, Status } from '@managerhub/ui';
import { planMassEdit } from './mass-edit-plan';
import { ReportPagination, reportPage } from '../ReportPagination';

interface Props {
  readonly database: DecodedSaveDatabase;
  readonly managedClubUid: number | null;
  readonly onApply: (uids: readonly number[], patch: PlayerDraftPatch) => void;
}

export function MassEditPlayerPanel({ database, managedClubUid, onApply }: Props) {
  const { t } = useTranslation();
  const baseId = useId();
  const [club, setClub] = useState(managedClubUid === null ? '' : String(managedClubUid));
  const [maximumAge, setMaximumAge] = useState('');
  const [morale, setMorale] = useState('');
  const [actualCa, setActualCa] = useState('');
  const [page, setPage] = useState(0);
  const clubs = useMemo(() => database.clubs.filter(item => item.playerCount > 0)
    .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName)), [database.clubs]);
  const plan = useMemo(() => planMassEdit(database.players, { club, maximumAge, morale, actualCa }),
    [database.players, club, maximumAge, morale, actualCa]);
  const range = reportPage(plan.changes.length, page, 8);
  const apply = () => {
    if (!plan.patch || !plan.changes.length) return;
    const fields = [
      ...(plan.patch.morale === undefined ? [] : [t('Morale') + ': ' + plan.patch.morale]),
      ...(plan.patch.actualCa === undefined ? [] : [t('Actual CA') + ': ' + plan.patch.actualCa])
    ].join(', ');
    if (!window.confirm(t('Apply {{fields}} to {{count}} eligible players in the draft? Unavailable and unchanged records are excluded. This does not modify PA or the original save.', {
      fields, count: plan.changes.length
    }))) return;
    onApply(plan.changes.map(player => player.uid), plan.patch);
  };
  return <div className="editor-section">
    <h3>{t('Mass Edit Players')} ({plan.matches.length.toLocaleString()} {t('matched')})</h3>
    <p className="module-disclaimer">{t('Leave fields blank to keep existing values. An age filter excludes records with unknown ages. PA is never changed by this tool.')}</p>
    <div className="editor-field-grid">
      <div className="editor-field"><label htmlFor={baseId + '-club'}>{t('Filter by club')}</label>
        <select id={baseId + '-club'} value={club} onChange={event => { setClub(event.currentTarget.value); setPage(0); }}>
          <option value="">{t('Choose club scope')}</option>
          <option value="all">{t('All clubs')}</option>
          {clubs.map(item => <option key={item.uid} value={String(item.uid)}>{item.shortName || item.fullName} ({item.playerCount})</option>)}
        </select>
      </div>
      <div className="editor-field"><label htmlFor={baseId + '-age'}>{t('Maximum age')}</label>
        <input id={baseId + '-age'} type="number" min={14} max={99} placeholder="—" value={maximumAge}
          onChange={event => { setMaximumAge(event.currentTarget.value); setPage(0); }}/>
      </div>
      <div className="editor-field"><label htmlFor={baseId + '-morale'}>{t('Set morale')} (1–20)</label>
        <input id={baseId + '-morale'} type="number" min={1} max={20} placeholder="—" value={morale} onChange={event => { setMorale(event.currentTarget.value); setPage(0); }}/>
      </div>
      <div className="editor-field"><label htmlFor={baseId + '-ca'}>{t('Optional Actual CA')} (1–200)</label>
        <input id={baseId + '-ca'} type="number" min={1} max={200} placeholder="—" value={actualCa} onChange={event => { setActualCa(event.currentTarget.value); setPage(0); }}/>
      </div>
    </div>
    {!club ? <p className="module-disclaimer">{t('Choose club scope')}</p> :
      !plan.valid && <Status tone="warning">{t('Enter whole numbers within the displayed ranges.')}</Status>}
    {plan.valid && plan.patch && <>
      <p role="status">{t('{{matched}} matched · {{changed}} changes · {{unavailable}} unavailable · {{unchanged}} unchanged', {
        matched: plan.matches.length, changed: plan.changes.length, unavailable: plan.unavailable, unchanged: plan.unchanged
      })}</p>
      {plan.changes.length > 0 && <div className="editor-diff-wrap"><table className="save-db-table" aria-label={t('Mass edit change preview')}>
        <thead><tr><th scope="col">{t('Name')}</th><th scope="col">{t('Age')}</th><th scope="col">{t('Actual CA')}</th><th scope="col">{t('Morale')}</th></tr></thead>
        <tbody>{plan.changes.slice(range.start, range.end).map(player => <tr key={player.uid}>
          <th scope="row">{player.displayName} · #{player.uid}</th><td>{player.calendarAge ?? '—'}</td>
          <td>{player.actualCa}{plan.patch?.actualCa !== undefined && player.actualCa !== plan.patch.actualCa ? ' → ' + plan.patch.actualCa : ''}</td>
          <td>{player.morale ?? '—'}{plan.patch?.morale !== undefined && player.morale !== plan.patch.morale ? ' → ' + plan.patch.morale : ''}</td>
        </tr>)}</tbody>
      </table></div>}
      <ReportPagination label={t('Mass edit preview page')} range={range} onChange={setPage}/>
    </>}
    <div><Button type="button" variant="primary" disabled={!plan.patch || plan.changes.length === 0} onClick={apply}>
      {t('Apply mass edit to draft')}
    </Button></div>
  </div>;
}
