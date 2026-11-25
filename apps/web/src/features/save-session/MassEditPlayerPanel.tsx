import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecodedSaveDatabase, PlayerDraftPatch } from '@managerhub/domain/fm2013-offline';
import { Button, Status } from '@managerhub/ui';
import { planMassEdit } from './mass-edit-plan';

interface Props {
  readonly database: DecodedSaveDatabase;
  readonly managedClubUid: number | null;
  readonly onApply: (uids: readonly number[], patch: PlayerDraftPatch) => void;
}

export function MassEditPlayerPanel({ database, managedClubUid, onApply }: Props) {
  const { t } = useTranslation();
  const [club, setClub] = useState(managedClubUid === null ? 'all' : String(managedClubUid));
  const [maximumAge, setMaximumAge] = useState('');
  const [morale, setMorale] = useState('');
  const [actualCa, setActualCa] = useState('');
  const clubs = useMemo(() => database.clubs.filter(item => item.playerCount > 0)
    .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName)), [database.clubs]);
  const plan = useMemo(() => planMassEdit(database.players, { club, maximumAge, morale, actualCa }),
    [database.players, club, maximumAge, morale, actualCa]);
  const apply = () => {
    if (!plan.patch || !plan.matches.length) return;
    const fields = [
      ...(plan.patch.morale === undefined ? [] : [t('Morale') + ': ' + plan.patch.morale]),
      ...(plan.patch.actualCa === undefined ? [] : [t('Actual CA') + ': ' + plan.patch.actualCa])
    ].join(', ');
    if (!window.confirm(t('Apply {{fields}} to {{count}} matched players in the draft? This does not modify PA or the original save.', {
      fields, count: plan.matches.length
    }))) return;
    onApply(plan.matches.map(player => player.uid), plan.patch);
  };
  return <div className="editor-section">
    <h3>{t('Mass Edit Players')} ({plan.matches.length.toLocaleString()} {t('matched')})</h3>
    <p className="module-disclaimer">{t('Leave fields blank to keep existing values. An age filter excludes records with unknown ages. PA is never changed by this tool.')}</p>
    <div className="editor-field-grid">
      <label className="editor-field"><span>{t('Filter by club')}</span>
        <select value={club} onChange={event => setClub(event.currentTarget.value)}>
          <option value="all">{t('All clubs')}</option>
          {clubs.map(item => <option key={item.uid} value={String(item.uid)}>{item.shortName || item.fullName} ({item.playerCount})</option>)}
        </select>
      </label>
      <label className="editor-field"><span>{t('Maximum age')}</span>
        <input type="number" min={14} max={99} placeholder="—" value={maximumAge}
          onChange={event => setMaximumAge(event.currentTarget.value)}/>
      </label>
      <label className="editor-field"><span>{t('Set morale')} (1–20)</span>
        <input type="number" min={1} max={20} placeholder="—" value={morale} onChange={event => setMorale(event.currentTarget.value)}/>
      </label>
      <label className="editor-field"><span>{t('Optional Actual CA')} (1–200)</span>
        <input type="number" min={1} max={200} placeholder="—" value={actualCa} onChange={event => setActualCa(event.currentTarget.value)}/>
      </label>
    </div>
    {!plan.valid && <Status tone="warning">{t('Enter whole numbers within the displayed ranges.')}</Status>}
    {plan.valid && plan.matches.length > 0 && <details>
      <summary>{t('Preview matched records (first 8)')}</summary>
      <div className="editor-diff-wrap"><table className="save-db-table">
        <thead><tr><th scope="col">{t('Name')}</th><th scope="col">{t('Age')}</th><th scope="col">{t('Actual CA')}</th><th scope="col">{t('Morale')}</th></tr></thead>
        <tbody>{plan.matches.slice(0, 8).map(player => <tr key={player.uid}>
          <td>{player.displayName}</td><td>{player.calendarAge ?? '—'}</td><td>{player.actualCa}</td><td>{player.morale ?? '—'}</td>
        </tr>)}</tbody>
      </table></div>
    </details>}
    <div><Button type="button" variant="primary" disabled={!plan.patch || plan.matches.length === 0} onClick={apply}>
      {t('Apply mass edit to draft')}
    </Button></div>
  </div>;
}
