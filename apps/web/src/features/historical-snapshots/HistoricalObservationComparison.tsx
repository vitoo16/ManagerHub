import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  compareHistoricalObservations, type HistoricalObservationDifference,
  type HistoricalSnapshotRecord, type HistoricalSnapshotSummary, type LivePlayer
} from '@managerhub/domain';
import { getHistoricalSnapshot } from '@managerhub/storage/historical-live-snapshots';
import { SectionHeading, Status } from '@managerhub/ui';

interface Props {
  readonly record: HistoricalSnapshotRecord;
  readonly player: LivePlayer;
  readonly items: readonly HistoricalSnapshotSummary[];
  readonly busy: boolean;
  readonly revision: number | null;
}

function ObservationTable({ title, rows }: { title: string; rows: readonly HistoricalObservationDifference[] }) {
  const { t } = useTranslation();
  const known = rows.filter(row => row.difference !== null).length;
  return <div className="historical-comparison-table-wrap">
    <table className="historical-comparison-table">
      <caption>{title} · {known} / {rows.length} {t('comparable observations')}</caption>
      <thead><tr>
        <th scope="col">{t('Field')}</th>
        <th scope="col">{t('First observation')}</th>
        <th scope="col">{t('Second observation')}</th>
        <th scope="col">{t('Observed difference')}</th>
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}>
        <th scope="row">{row.label}</th>
        <td>{row.first.value ?? t('Unknown / hidden')}</td>
        <td>{row.second?.value ?? t('Unknown / hidden')}</td>
        <td>{row.difference === null ? t('Unavailable') : row.difference > 0 ? `+${row.difference}` : row.difference}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function HistoricalObservationComparison({ record, player, items, busy, revision }: Props) {
  const { t } = useTranslation();
  const [comparisonId, setComparisonId] = useState('');
  const [otherRecord, setOtherRecord] = useState<HistoricalSnapshotRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [otherPlayerId, setOtherPlayerId] = useState('');
  const [confirmedPair, setConfirmedPair] = useState<string | null>(null);
  const choices = items.filter(item => item.id !== record.id && item.mode === record.mode);

  useEffect(() => {
    let cancelled = false;
    setOtherRecord(null);
    setOtherPlayerId('');
    setConfirmedPair(null);
    setError(null);
    if (!comparisonId) return () => { cancelled = true; };
    if (!choices.some(item => item.id === comparisonId)) {
      setError('The comparison snapshot is no longer available in this mode.');
      return () => { cancelled = true; };
    }
    setLoading(true);
    void getHistoricalSnapshot(comparisonId, record.mode).then(loaded => {
      if (!cancelled) setOtherRecord(loaded);
    }).catch(() => {
      if (!cancelled) setError('Could not open the comparison snapshot.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // Changes synchronized from another tab must revalidate the selected record.
  }, [comparisonId, record.mode, revision, items]);

  const currentOther = choices.some(item => item.id === comparisonId) &&
    otherRecord?.id === comparisonId && otherRecord.mode === record.mode ? otherRecord : null;
  const otherPlayers = currentOther?.snapshot.players ?? [];
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return otherPlayers.slice(0, 30);
    return otherPlayers.filter(candidate => candidate.name.value?.toLocaleLowerCase().includes(query) ||
      String(candidate.nativeId).includes(query)).slice(0, 30);
  }, [otherPlayers, search]);
  const otherPlayer = otherPlayers.find(candidate => candidate.id === otherPlayerId);
  const pairKey = JSON.stringify([record.id, player.id, currentOther?.id, otherPlayer?.id]);
  const accepted = confirmedPair === pairKey;
  const comparison = accepted && currentOther && otherPlayer
    ? compareHistoricalObservations(record, currentOther, player, otherPlayer) : null;

  return <section className="historical-panel historical-comparison" aria-labelledby="historical-comparison-title">
    <SectionHeading id="historical-comparison-title" eyebrow={t('MH-04 · Manual observation pairing')} title={t('Compare historical observations')}>
      <Status tone="warning">{t('Provisional')}</Status>
    </SectionHeading>
    <p className="historical-footnote">{t('Choose a second saved snapshot and a player record manually. Player identity, career lineage, capture order and game-time progression are unverified. Pairing is temporary and stays on this screen.')}</p>
    <div className="historical-comparison-facts">
      <div><span>{t('First observation')}</span><strong>{player.name.value ?? t('Unknown / hidden')} · #{player.nativeId}</strong><small>{record.snapshot.careerId.value} · {record.snapshot.capturedAt} · {t('caller-declared')}</small></div>
      <label>{t('Second saved snapshot')}
        <select value={comparisonId} disabled={busy || loading} onChange={event => {
          setComparisonId(event.target.value);
          setSearch('');
          setOtherRecord(null);
          setOtherPlayerId('');
          setConfirmedPair(null);
        }}>
          <option value="">{t('Choose a saved snapshot')}</option>
          {choices.map(item => <option key={item.id} value={item.id}>{item.careerLabel} · {item.capturedAt} · {item.fileName}</option>)}
        </select>
      </label>
    </div>
    {choices.length === 0 && <p className="historical-muted">{t('Save another distinct capture in this visibility mode to compare observations.')}</p>}
    {loading && <p role="status" className="historical-muted">{t('Loading comparison snapshot…')}</p>}
    {error && <p role="alert" className="historical-destructive-warning">{t(error)}</p>}
    {currentOther && <>
      {currentOther.snapshot.careerId.value !== record.snapshot.careerId.value &&
        <p className="historical-destructive-warning">{t('The declared career labels differ. Shared career lineage is unknown.')}</p>}
      <label className="historical-comparison-search">{t('Find a player in the second snapshot')}
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Search name or native ID…')}/>
      </label>
      <div className="historical-comparison-candidates" aria-label={t('Second snapshot players')}>
        {filteredPlayers.map(candidate => <button type="button" key={candidate.id}
          aria-pressed={otherPlayerId === candidate.id} onClick={() => { setOtherPlayerId(candidate.id); setConfirmedPair(null); }}>
          {candidate.name.value ?? t('Unknown / hidden')} <small>#{candidate.nativeId}</small>
        </button>)}
        {filteredPlayers.length === 0 && <p>{t('No players match this search.')}</p>}
      </div>
      {otherPlayers.length > 30 && <p className="historical-footnote">{t('Showing up to 30 results. Refine the search to find a specific record.')}</p>}
      {otherPlayer && <>
        <p className="historical-comparison-selected">{t('Second observation')} · {otherPlayer.name.value ?? t('Unknown / hidden')} · #{otherPlayer.nativeId} · {currentOther.snapshot.capturedAt} · {t('caller-declared')}</p>
        <label className="historical-comparison-confirm">
          <input type="checkbox" checked={accepted} onChange={event => setConfirmedPair(event.target.checked ? pairKey : null)}/>
          <span>{t('I explicitly selected this pair for side-by-side observation. I understand the player identity and career relationship are unverified.')}</span>
        </label>
      </>}
      {comparison && <>
        <p className="historical-footnote" role="status">{t('Observed difference = second minus first. These provisional observations are not certified player development or edit events. Unknown and redacted fields have no difference.')}</p>
        <ObservationTable title={t('Ordinary attributes')} rows={comparison.attributes}/>
        <ObservationTable title={t('Position familiarity')} rows={comparison.positions}/>
      </>}
      {accepted && !comparison && <p role="alert" className="historical-destructive-warning">{t('The selected snapshots or records are incompatible for comparison.')}</p>}
    </>}
  </section>;
}
