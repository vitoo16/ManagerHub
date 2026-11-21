import { memo, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset, PlayerExport } from '@managerhub/domain';
import {
  createSavedScoutShortlist, createScoutShortlistCsv, MAX_SCOUT_SHORTLIST_PLAYERS,
  restoreSavedScoutShortlist, SCOUT_SHORTLIST_STORAGE_PREFIX,
  scoutShortlistFilename, scoutShortlistStorageKey
} from '@managerhub/domain';
import { Button, Icon, Surface } from '@managerhub/ui';
import ScoutRoleComparison from './ScoutRoleComparison';

type Props = {
  dataset: PlayerDataset;
  selected: PlayerExport | null;
  candidateIds: readonly string[];
  setCandidateIds: Dispatch<SetStateAction<string[]>>;
  onSelectPlayer: (id: string) => void;
};

/** All persistence is an explicit user action. Changing the imported roster remounts this panel. */
function ScoutShortlistPanel({ dataset, selected, candidateIds, setCandidateIds, onSelectPlayer }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const playerById = useMemo(
    () => new Map(dataset.players.map(player => [player.id, player] as const)),
    [dataset.players]
  );
  const candidates = useMemo(() => candidateIds.flatMap(id => {
    const candidate = playerById.get(id);
    return candidate ? [candidate] : [];
  }), [candidateIds, playerById]);
  const selectedAlready = selected !== null && candidateIds.includes(selected.id);

  const toggleCandidate = useCallback(() => {
    if (!selected || busy) return;
    setNotice(null);
    setConfirmForget(false);
    if (candidateIds.includes(selected.id)) {
      setCandidateIds(ids => ids.filter(id => id !== selected.id));
    } else if (candidateIds.length >= MAX_SCOUT_SHORTLIST_PLAYERS) {
      setNotice('The shortlist supports up to 50 players per export.');
    } else {
      setCandidateIds(ids => ids.includes(selected.id) || ids.length >= MAX_SCOUT_SHORTLIST_PLAYERS
        ? ids : [...ids, selected.id]);
    }
  }, [selected, candidateIds, busy, setCandidateIds]);

  const save = useCallback(async () => {
    setBusy(true); setNotice(null); setConfirmForget(false);
    try {
      const record = await createSavedScoutShortlist(dataset, candidateIds);
      localStorage.setItem(SCOUT_SHORTLIST_STORAGE_PREFIX + record.rosterSha256, JSON.stringify(record));
      if (mountedRef.current) setNotice('Shortlist saved on this browser for this exact player export.');
    } catch {
      if (mountedRef.current) setNotice('Could not save shortlist. Check browser storage permissions.');
    } finally { if (mountedRef.current) setBusy(false); }
  }, [dataset, candidateIds]);

  const restore = useCallback(async () => {
    setBusy(true); setNotice(null); setConfirmForget(false);
    try {
      const key = await scoutShortlistStorageKey(dataset);
      const raw = localStorage.getItem(key);
      if (raw === null) {
        if (mountedRef.current) setNotice('No saved shortlist exists for this player export.');
        return;
      }
      const saved = await restoreSavedScoutShortlist(raw, dataset);
      if (mountedRef.current) {
        setCandidateIds([...saved.playerIds]);
        setNotice('Saved shortlist restored.');
      }
    } catch {
      if (mountedRef.current) setNotice('Saved shortlist is invalid or unavailable. Current selections were not changed.');
    } finally { if (mountedRef.current) setBusy(false); }
  }, [dataset, setCandidateIds]);

  const forget = useCallback(async () => {
    setBusy(true); setNotice(null);
    try {
      localStorage.removeItem(await scoutShortlistStorageKey(dataset));
      if (mountedRef.current) setNotice('Saved shortlist removed. Current selections remain available in this session.');
    } catch {
      if (mountedRef.current) setNotice('Could not remove saved shortlist from browser storage.');
    } finally {
      if (mountedRef.current) {
        setBusy(false);
        setConfirmForget(false);
      }
    }
  }, [dataset]);

  const exportCsv = useCallback(() => {
    if (!candidateIds.length) return;
    setNotice(null);
    let url: string | null = null;
    try {
      const csv = createScoutShortlistCsv(dataset, candidateIds);
      url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = scoutShortlistFilename(dataset.fileName);
      anchor.hidden = true;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      setNotice('Shortlist CSV prepared. Scores are provisional role-fit heuristics, not CA/PA or transfer values.');
    } catch {
      setNotice('Could not export shortlist. Current selections are unchanged.');
    } finally {
      if (url !== null) {
        const pendingUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(pendingUrl), 30_000);
      }
    }
  }, [dataset, candidateIds]);

  return <Surface className="scout-shortlist" role="region" aria-label={t('Scouting shortlist')}>
    <div className="scout-shortlist__heading">
      <div>
        <h2>{t('Scouting shortlist')}</h2>
        <p>{t('Mark candidates from this export, compare them in Player Lab and export a provisional scouting list.')}</p>
      </div>
      <span className="scout-shortlist__count">{candidateIds.length} / {MAX_SCOUT_SHORTLIST_PLAYERS}</span>
    </div>
    <div className="scout-shortlist__actions">
      <Button disabled={!selected || busy} variant={selectedAlready ? 'quiet' : 'primary'} onClick={toggleCandidate}>
        <Icon name={selectedAlready ? 'trash' : 'plus'} size={14}/>
        {t(selectedAlready ? 'Remove selected player from shortlist' : 'Add selected player to shortlist')}
      </Button>
      <Button disabled={busy} onClick={() => void save()}>{t('Save shortlist locally')}</Button>
      <Button variant="quiet" disabled={busy} onClick={() => void restore()}>{t('Restore saved shortlist')}</Button>
      <Button variant="quiet" disabled={busy || !candidateIds.length} onClick={exportCsv}>
        <Icon name="download" size={14}/>{t('Export shortlist CSV')}
      </Button>
      {confirmForget ? <>
        <Button variant="danger" disabled={busy} onClick={() => void forget()}>{t('Confirm delete saved shortlist')}</Button>
        <Button variant="quiet" disabled={busy} onClick={() => setConfirmForget(false)}>{t('Cancel')}</Button>
      </> : <Button variant="quiet" disabled={busy} onClick={() => { setConfirmForget(true); setNotice(null); }}>
        {t('Forget saved shortlist')}
      </Button>}
    </div>
    {candidates.length ? <ul className="scout-shortlist__candidates">
      {candidates.map(candidate => <li key={candidate.id}>
        <div><strong>{candidate.name}</strong><small>{candidate.position ?? t('Unknown position')} · {candidate.club ?? t('Unknown club')}</small></div>
        <Button variant="quiet" onClick={() => onSelectPlayer(candidate.id)}>{t('View scouting report')}</Button>
      </li>)}
    </ul> : <p className="scout-shortlist__empty">{t('No candidates selected. Choose a player from the list, then add them here.')}</p>}
    {candidates.length > 0 && <ScoutRoleComparison candidates={candidates} onSelectPlayer={onSelectPlayer}/>}
    {notice && <p className="scout-shortlist__notice" role="status" aria-live="polite">{t(notice)}</p>}
    <p className="scout-shortlist__privacy"><Icon name="shield" size={14}/>{t('Only source-bound player IDs are saved locally. Player names, attributes and original files are not duplicated in shortlist storage.')}</p>
  </Surface>;
}

export default memo(ScoutShortlistPanel);
