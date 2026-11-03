import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { i18n } from '../../i18n';
import historicalVi from '../../i18n/historical-vi';
import {
  type EvidenceField, type HistoricalSnapshotMode, type HistoricalSnapshotRecord,
  type HistoricalSnapshotSummary, type LivePlayer, type MissingReason
} from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status } from '@managerhub/ui';
import { getHistoricalSnapshot } from '@managerhub/storage/historical-live-snapshots';
import { importHistoricalCapture, type HistoricalImportStage } from '../../import-historical-capture';
import { useHistoricalSnapshotLibrary } from '../../useHistoricalSnapshotLibrary';
import { HistoricalCaptureGuide } from './HistoricalCaptureGuide';
import './historical-workspace.css';

i18n.addResourceBundle('vi', 'translation', historicalVi, true, true);

const PAGE_SIZE = 80;
const MISSING_COPY: Record<MissingReason, string> = {
  not_present: 'Not present in this capture',
  not_decoded: 'Not decoded',
  not_verified: 'Not verified',
  incompatible_build: 'Incompatible build',
  redacted: 'Hidden in Realism mode',
  not_applicable: 'Not applicable'
};

function fieldText<T>(field: EvidenceField<T>, t: (key: string) => string, format: (value: T) => string = String): string {
  return field.value === null ? t(MISSING_COPY[field.missingReason ?? 'not_decoded']) : format(field.value);
}

function statusCopy(status: HistoricalSnapshotRecord['status'], t: (key: string) => string): string {
  if (status === 'ready') return t('Payload accepted · roster completeness unverified');
  if (status === 'partial') return t('Partial capture · some records or scan coverage are missing');
  return t('No accepted player records in this capture');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(value: string, language = 'en'): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language.startsWith('vi') ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(date) : value;
}

function progressCopy(stage: HistoricalImportStage, t: (key: string) => string): string {
  const labels: Record<HistoricalImportStage, string> = {
    reading: 'Reading the selected file…',
    hashing: 'Calculating the source SHA-256…',
    parsing: 'Validating the FM2013 capture and building projections…',
    validating: 'Checking snapshot provenance and privacy…'
  };
  return t(labels[stage] ?? 'Checking snapshot provenance and privacy…');
}

const SnapshotList = memo(function SnapshotList({ items, loading, selectedId, pendingDelete, onOpen, onDelete }:
  { items: readonly HistoricalSnapshotSummary[]; loading: boolean; selectedId: string | null; pendingDelete: string | null;
    onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  return <section className="historical-panel historical-library" aria-labelledby="historical-library-title">
    <SectionHeading id="historical-library-title" eyebrow={t('Local historical library')} title={t('Saved snapshots')}/>
    {loading ? <p className="historical-muted" role="status">{t('Loading saved snapshots…')}</p> :
      items.length === 0 ? <div className="historical-empty">
        <Icon name="database" size={22}/>
        <strong>{t('No historical snapshots saved')}</strong>
        <p>{t('Import a capture, review its coverage, then save it on this browser. The source JSON is never stored.')}</p>
      </div> :
      <ul className="historical-snapshot-list" aria-label={t('Saved historical snapshots')}>
        {items.map(item => <li key={item.id} className={selectedId === item.id ? 'historical-snapshot-row historical-snapshot-row--active' : 'historical-snapshot-row'}>
          <button className="historical-snapshot-open" onClick={() => onOpen(item.id)}>
            <span className="historical-snapshot-name">{item.careerLabel}</span>
            <span className="historical-snapshot-file">{item.fileName}</span>
            <span className="historical-snapshot-meta">
              <span>{item.playerCount.toLocaleString()} {t('observed records')}</span>
              <span>{formatDate(item.capturedAt, i18n.language)}</span>
            </span>
            <span className="historical-snapshot-status">
              <Status tone={item.status === 'ready' ? 'info' : item.status === 'partial' ? 'warning' : 'neutral'}>{t(item.status)}</Status>
              <span>{item.mode === 'editor' ? t('Editor projection') : t('Realism projection')}</span>
            </span>
          </button>
          <div className="historical-snapshot-actions">
            <Button variant="quiet" onClick={() => onOpen(item.id)}>{t('Open')}</Button>
            <Button variant="quiet" onClick={() => onDelete(item.id)}>{pendingDelete === item.id ? t('Confirm delete') : t('Delete')}</Button>
          </div>
        </li>)}
      </ul>}
  </section>;
});

const CoveragePanel = memo(function CoveragePanel({ record }: { record: HistoricalSnapshotRecord }) {
  const { t } = useTranslation();
  return <section className="historical-panel" aria-labelledby="historical-coverage-title">
    <SectionHeading id="historical-coverage-title" eyebrow={t('Capture evidence')} title={t('Scan coverage')}/>
    <div className="historical-coverage-grid">
      {record.snapshot.captureCoverage.map(item => <div className="historical-coverage-item" key={item.nativeKind}>
        <div className="historical-coverage-heading">
          <strong>{item.nativeKind === 'player' ? t('Player records') : t('PlayerStaff records')}</strong>
          <Status tone="warning">{t('Provisional')}</Status>
        </div>
        <dl>
          <div><dt>{t('Observed records')}</dt><dd>{item.observedRecordCount.toLocaleString()}</dd></div>
          <div><dt>{t('Candidates matched')}</dt><dd>{item.matches.toLocaleString()}</dd></div>
          <div><dt>{t('Rejected / duplicate')}</dt><dd>{item.rejected.toLocaleString()} / {item.duplicates.toLocaleString()}</dd></div>
          <div><dt>{t('Read faults')}</dt><dd>{item.faultCount.toLocaleString()}</dd></div>
          <div><dt>{t('Bytes scanned')}</dt><dd>{formatBytes(item.bytesScanned)}</dd></div>
          <div><dt>{t('Elapsed')}</dt><dd>{item.elapsedMs.toLocaleString()} ms</dd></div>
          <div><dt>{t('Stop reason')}</dt><dd>{item.stopReason ? t(item.stopReason) : t('No stop limit reported')}</dd></div>
          <div><dt>{t('Selected mappings exhausted')}</dt><dd>{item.selectedMappingsExhausted ? t('Yes') : t('No')}</dd></div>
        </dl>
      </div>)}
      {record.snapshot.captureCoverage.length === 0 && <p className="historical-muted">{t('No native pass coverage was supplied.')}</p>}
    </div>
    <p className="historical-footnote">{t('Coverage is caller-declared research telemetry. It does not prove a complete roster, atomic game state or a currently loaded career.')}</p>
  </section>;
});

const PlayerDetail = memo(function PlayerDetail({ player }: { player: LivePlayer }) {
  const { t } = useTranslation();
  const attributes = Object.entries(player.attributes);
  const positions = Object.entries(player.positions);
  const club = player.club.value;
  const nation = player.primaryNation.value;
  return <div className="historical-player-detail">
    <section className="historical-panel">
      <div className="historical-player-heading">
        <div>
          <span className="mh-eyebrow">{t('Snapshot-local player ID')} · {t(player.nativeKind)}</span>
          <h3>{fieldText(player.name, t)}</h3>
          <p>{t('Native ID')} {player.nativeId} · {t('This identity is scoped to this snapshot only.')}</p>
        </div>
        <Status tone="warning">{t('Provisional')}</Status>
      </div>
      <dl className="historical-facts">
        <div><dt>{t('First name')}</dt><dd>{fieldText(player.firstName, t)}</dd></div>
        <div><dt>{t('Last name')}</dt><dd>{fieldText(player.lastName, t)}</dd></div>
        <div><dt>{t('Date of birth')}</dt><dd>{fieldText(player.birthDate, t)}</dd></div>
        <div><dt>{t('Derived calendar age')}</dt><dd>{fieldText(player.calendarAge, t, value => value + ' ' + t('years'))}</dd></div>
        <div><dt>{t('Primary nation link')}</dt><dd>{nation ? nation.name + ' · ' + t('Observed person link; not citizenship') : fieldText(player.primaryNation, t)}</dd></div>
        <div><dt>{t('Club / team link')}</dt><dd>{club ? club.name + ' · ' + t(club.relation === 'player_team_pointer' ? 'Observed player-team pointer' : 'Observed primary-contract team') : fieldText(player.club, t)}</dd></div>
      </dl>
      <p className="historical-footnote">{t('A primary-nation link does not establish citizenship or eligibility. A club/team pointer does not establish current employment or loan status.')}</p>
    </section>

    <section className="historical-panel">
      <SectionHeading eyebrow={t('49 ordinary attributes')} title={t('Attribute evidence')}/>
      <div className="historical-value-grid">
        {attributes.map(([key, field]) => <div className="historical-value-row" key={key}>
          <span>{field.sourceName}</span>
          <strong className={field.value === null ? 'is-unknown' : ''}>{fieldText(field, t)}</strong>
        </div>)}
      </div>
      <p className="historical-footnote">{t('Values are provisional source observations, not Actual CA, PA or a calibrated player rating model. Zero and unknown are kept distinct.')}</p>
    </section>

    <section className="historical-panel">
      <SectionHeading eyebrow={t('15 position familiarity values')} title={t('Position evidence')}/>
      <div className="historical-value-grid historical-value-grid--positions">
        {positions.map(([key, field]) => <div className="historical-value-row" key={key}>
          <span>{field.nativeCode} · {t(key)}</span>
          <strong className={field.value === null ? 'is-unknown' : ''}>{fieldText(field, t)}</strong>
        </div>)}
      </div>
      <p className="historical-footnote">{t('Position familiarity is not certified eligibility and is not converted into tactical roles.')}</p>
    </section>

    <section className="historical-panel">
      <SectionHeading eyebrow={t('Unverified fields')} title={t('Ability and contract data')}/>
      <dl className="historical-facts historical-facts--compact">
        <div><dt>{t('Actual CA')}</dt><dd>{fieldText(player.actualCa, t)}</dd></div>
        <div><dt>{t('Potential ability')}</dt><dd>{fieldText(player.potentialAbility, t)}</dd></div>
        <div><dt>{t('Weekly wage')}</dt><dd>{fieldText(player.contract.weeklyWage, t)}</dd></div>
        <div><dt>{t('Wage frequency')}</dt><dd>{fieldText(player.contract.wageFrequency, t)}</dd></div>
        <div><dt>{t('Currency')}</dt><dd>{fieldText(player.contract.currency, t)}</dd></div>
        <div><dt>{t('Contract expiry')}</dt><dd>{fieldText(player.contract.expiresAt, t)}</dd></div>
      </dl>
    </section>
  </div>;
});

export default function HistoricalWorkspace() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<HistoricalSnapshotMode>('realism');
  const library = useHistoricalSnapshotLibrary(mode);
  const [file, setFile] = useState<File | null>(null);
  const [careerLabel, setCareerLabel] = useState('');
  const [capturedAtInput, setCapturedAtInput] = useState('');
  const [record, setRecord] = useState<HistoricalSnapshotRecord | null>(null);
  const [pairedRecord, setPairedRecord] = useState<HistoricalSnapshotRecord | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSaved, setActiveSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [stage, setStage] = useState<HistoricalImportStage>('reading');
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const appliedExternalRevision = useRef(0);

  useEffect(() => () => { const active = abortRef.current; abortRef.current = null; active?.abort(); }, []);

  // A different tab can remove a saved record while it is open here. Revalidate
  // only after that tab's change has been reread from IndexedDB in this mode.
  useEffect(() => {
    const revision = library.syncedExternalRevision;
    if (revision === null || revision === 0 || revision === appliedExternalRevision.current) return;
    appliedExternalRevision.current = revision;
    if (!activeSaved || !activeId || (!library.error && library.items.some(item => item.id === activeId))) return;
    setRecord(null);
    setPairedRecord(null);
    setActiveId(null);
    setActiveSaved(false);
    setSelectedPlayerId(null);
    setNotice(t('A saved snapshot changed or was removed in another tab. The open record was closed; reopen it from the refreshed library if available.'));
  }, [library.syncedExternalRevision, library.items, library.error, activeSaved, activeId, t]);

  const onImport = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportError(null);
    setNotice(null);
    if (!file) { setImportError(t('Choose an address-free FM2013 wire JSON file first.')); return; }
    if (!careerLabel.trim()) { setImportError(t('Enter a career label. This label is user-declared and is not verified.')); return; }
    if (!capturedAtInput) { setImportError(t('Enter the capture time declared by the local capture workflow.')); return; }
    if (!globalThis.crypto?.randomUUID) { setImportError(t('Secure browser context required to create a snapshot ID.')); return; }

    const capturedAt = new Date(capturedAtInput);
    if (!Number.isFinite(capturedAt.getTime())) { setImportError(t('Enter a valid capture timestamp.')); return; }
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setImporting(true);
    setStage('reading');
    try {
      const result = await importHistoricalCapture(file, {
        snapshotId: crypto.randomUUID(),
        careerId: careerLabel.trim(),
        capturedAt: capturedAt.toISOString()
      }, mode, setStage, controller.signal);
      setRecord(result.record);
      setPairedRecord(result.pairedRecord);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setActiveId(result.record.id);
      setActiveSaved(false);
      setSelectedPlayerId(result.record.snapshot.players[0]?.id ?? null);
      setSearch('');
      setVisibleLimit(PAGE_SIZE);
      setNotice(t('Capture parsed. Review its source, coverage and unknown fields before saving.'));
    } catch (cause) {
      if (abortRef.current === controller) {
        if (cause instanceof Error && cause.name === 'AbortError') {
          setNotice(t('Import cancelled. No source data was saved.'));
        } else {
          setImportError(cause instanceof Error ? cause.message : t('The selected capture could not be imported.'));
        }
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setImporting(false);
      }
    }
  }, [file, careerLabel, capturedAtInput, mode, t]);

  const onCancel = useCallback(() => abortRef.current?.abort(), []);

  const onSave = useCallback(async () => {
    if (!record) return;
    const result = await library.save(record, pairedRecord);
    if (!result) return;
    if (result.status === 'duplicate') {
      setNotice(t('This source capture is already saved in the local library for the {{mode}} projection.', {
        mode: result.summary.mode === 'editor' ? t('Editor') : t('Realism')
      }));
      if (result.summary.mode === mode) {
        const existing = await library.open(result.summary.id);
        if (existing) {
          setRecord(existing);
          setActiveId(existing.id);
          setActiveSaved(true);
          setPairedRecord(null);
        }
      }
      return;
    }
    // An Editor upgrade reuses the existing Realism snapshot ID and its original
    // caller-declared metadata. Reload that canonical record before marking it saved.
    if (result.status === 'upgraded') {
      const savedEditor = await library.open(result.summary.id);
      if (!savedEditor) return;
      setRecord(savedEditor);
      setActiveId(savedEditor.id);
      setSelectedPlayerId(savedEditor.snapshot.players[0]?.id ?? null);
      setNotice(t('Editor projection added to the existing Realism snapshot. Its original career label and capture time were preserved.'));
    } else {
      setNotice(t('Snapshot and its permitted projection were saved locally. The source JSON was not stored.'));
    }
    setActiveSaved(true);
    setPairedRecord(null);
  }, [record, pairedRecord, library.save, library.open, mode, t]);

  const onOpenSaved = useCallback(async (id: string) => {
    const opened = await library.open(id);
    if (!opened) return;
    setRecord(opened);
    setPairedRecord(null);
    setActiveId(id);
    setActiveSaved(true);
    setSelectedPlayerId(opened.snapshot.players[0]?.id ?? null);
    setSearch('');
    setVisibleLimit(PAGE_SIZE);
    setNotice(null);
    setImportError(null);
  }, [library.open]);

  const onDelete = useCallback(async (id: string) => {
    if (pendingDelete !== id) { setPendingDelete(id); return; }
    if (await library.remove(id)) {
      if (activeId === id) {
        setRecord(null);
        setPairedRecord(null);
        setActiveId(null);
        setActiveSaved(false);
      }
      setPendingDelete(null);
    }
  }, [pendingDelete, library.remove, activeId]);

  const onModeChange = useCallback(async (next: HistoricalSnapshotMode) => {
    if (next === mode || switchingMode) return;
    setSwitchingMode(true);
    try {
      const pendingImport = abortRef.current;
      abortRef.current = null;
      pendingImport?.abort();
      setImporting(false);
      setSearch('');
      setSelectedPlayerId(null);
      setNotice(null);
      setImportError(null);
      const current = record;
      const currentPair = pairedRecord;
      const currentId = activeId;
      const wasSaved = activeSaved;
      setMode(next);
      setRecord(null);
      setPairedRecord(null);
      setActiveSaved(false);

      if (!wasSaved && current?.mode === 'editor' && next === 'realism' && currentPair) {
        setRecord(currentPair);
        setActiveId(currentPair.id);
        setSelectedPlayerId(currentPair.snapshot.players[0]?.id ?? null);
        setNotice(t('Showing the separately redacted Realism projection. Save it to keep this mode after reload.'));
        return;
      }
      if (currentId && wasSaved) {
        try {
          const counterpart = await getHistoricalSnapshot(currentId, next);
          setRecord(counterpart);
          setActiveId(counterpart.id);
          setActiveSaved(true);
          setSelectedPlayerId(counterpart.snapshot.players[0]?.id ?? null);
          return;
        } catch {
          setActiveId(null);
          setNotice(t('No saved projection exists in this mode. Reimport the source capture in this mode, or save an Editor import to keep both projections.'));
          return;
        }
      }
      setActiveId(null);
      setNotice(t('The unsaved snapshot was cleared when the display mode changed. Reimport the source capture in the selected mode.'));
    } finally {
      setSwitchingMode(false);
    }
  }, [mode, switchingMode, record, pairedRecord, activeId, activeSaved, t]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const deferredSearch = useDeferredValue(normalizedSearch);
  const players = record?.snapshot.players ?? [];
  const filteredPlayers = useMemo(() => {
    if (!deferredSearch) return players;
    return players.filter(player => {
      const name = player.name.value?.toLocaleLowerCase() ?? '';
      const club = player.club.value?.name.toLocaleLowerCase() ?? '';
      return name.includes(deferredSearch) || club.includes(deferredSearch) || String(player.nativeId).includes(deferredSearch);
    });
  }, [players, deferredSearch]);
  const visiblePlayers = filteredPlayers.slice(0, visibleLimit);
  const selectedPlayer = useMemo(() =>
    filteredPlayers.find(player => player.id === selectedPlayerId) ?? filteredPlayers[0] ?? null,
  [filteredPlayers, selectedPlayerId]);

  return <div className="view-flow historical-workspace" aria-busy={importing || switchingMode || library.loading || library.activity !== null}>
    <div className="page-title">
      <span className="mh-eyebrow">{t('FM2013 · Historical capture · Read-only')}</span>
      <h1>{t('Historical snapshots')}</h1>
      <p>{t('Import an address-free FM2013 capture, inspect its evidence and keep a local historical record. This workspace does not connect to a running game or modify a save.')}</p>
    </div>

    <section className="historical-panel historical-import-panel" aria-labelledby="historical-import-title">
      <SectionHeading id="historical-import-title" eyebrow={t('Local capture import')} title={t('Import a historical capture')}>
        <Status tone="info">{t('Read-only')}</Status>
      </SectionHeading>
      <HistoricalCaptureGuide/>
      <form onSubmit={event => void onImport(event)} className="historical-import-form">
        <label className="historical-file-picker">
          <span>{t('Address-free wire JSON')}</span>
          <input ref={inputRef} type="file" accept=".json,application/json" onChange={event => setFile(event.currentTarget.files?.[0] ?? null)} disabled={importing}/>
          <small>{file ? file.name + ' · ' + formatBytes(file.size) : t('Choose an address-free fm2013-live-capture-v1 JSON capture.')}</small>
        </label>
        <label>
          <span>{t('Career label (user-declared)')}</span>
          <input type="text" maxLength={128} value={careerLabel} onChange={event => setCareerLabel(event.currentTarget.value)} placeholder={t('Example: My FM2013 career')} required disabled={importing}/>
        </label>
        <label>
          <span>{t('Capture time (declared by source workflow)')}</span>
          <input type="datetime-local" value={capturedAtInput} onChange={event => setCapturedAtInput(event.currentTarget.value)} required disabled={importing}/>
        </label>
        <fieldset className="historical-mode-fieldset">
          <legend>{t('Visibility mode')}</legend>
          <div className="historical-mode-switch">
            <button type="button" aria-pressed={mode === 'realism'} onClick={() => void onModeChange('realism')} disabled={importing || switchingMode || library.activity !== null}>{t('Realism')}</button>
            <button type="button" aria-pressed={mode === 'editor'} onClick={() => void onModeChange('editor')} disabled={importing || switchingMode || library.activity !== null}>{t('Editor')}</button>
          </div>
          <small>{mode === 'realism'
            ? t('Hidden ratings, birth date, primary-nation link and derived age stay redacted before display and persistence.')
            : t('Exact observed values remain provisional. Saving also creates a separately redacted Realism projection in another local store.')}</small>
        </fieldset>
        <div className="historical-import-actions">
          <Button variant="primary" type="submit" disabled={importing || !file}>{importing ? t('Importing…') : t('Validate and import')}</Button>
          {importing && <Button variant="quiet" type="button" onClick={onCancel}>{t('Cancel import')}</Button>}
        </div>
      </form>
      {importing && <p className="historical-progress" role="status" aria-live="polite">{progressCopy(stage, t)}</p>}
      {importError && <div className="inline-alert" role="alert"><Icon name="warning" size={16}/>{t(importError)}</div>}
      {library.error && <div className="inline-alert" role="alert"><Icon name="warning" size={16}/>{t(library.error)}
        {library.canClearIncompatible && <Button variant="quiet" onClick={() => void library.clearIncompatible()}>{t('Clear incompatible historical library')}</Button>}
        <Button variant="quiet" onClick={library.clearError}>{t('Dismiss')}</Button>
      </div>}
      {notice && <p className="historical-notice" role="status">{notice}</p>}
      <p className="historical-footnote">{t('Only valid address-free wire JSON for the supported FM2013 build is accepted. Optional biography and position fields may remain unknown. The source file is hashed and parsed in a Web Worker; raw wire data is never persisted. Unsupported builds, truncated transport and unrecognized fields are rejected.')}</p>
    </section>

    <div className="historical-library-layout">
      <SnapshotList items={library.items} loading={library.loading} selectedId={activeId}
        pendingDelete={pendingDelete} onOpen={id => void onOpenSaved(id)} onDelete={id => void onDelete(id)}/>
      <section className="historical-detail-column">
        {!record ? <div className="historical-panel historical-empty historical-detail-empty">
          <Icon name="history" size={24}/>
          <strong>{t('No snapshot selected')}</strong>
          <p>{t('Import a capture above or open a saved snapshot from this mode.')}</p>
        </div> : <>
          <section className="historical-panel historical-snapshot-overview">
            <div className="historical-overview-heading">
              <div>
                <span className="mh-eyebrow">{t('Historical snapshot')} · {record.snapshot.edition} {record.snapshot.build}</span>
                <h2>{record.snapshot.careerId.value}</h2>
                <p>{record.fileName} · {record.snapshot.players.length.toLocaleString()} {t('observed records')}</p>
              </div>
              <Status tone={record.status === 'ready' ? 'info' : record.status === 'partial' ? 'warning' : 'neutral'}>{t(record.status)}</Status>
            </div>
            <p className="historical-status-copy">{statusCopy(record.status, t)}</p>
            <dl className="historical-facts historical-facts--compact">
              <div><dt>{t('Source')}</dt><dd>{t('Live game capture · provisional')}</dd></div>
              <div><dt>{t('Capture time')}</dt><dd>{formatDate(record.snapshot.capturedAt, i18n.language)} · {t('caller-declared')}</dd></div>
              <div><dt>{t('Game date')}</dt><dd>{fieldText(record.snapshot.gameDate, t)}</dd></div>
              <div><dt>{t('Imported locally')}</dt><dd>{formatDate(record.importedAt, i18n.language)}</dd></div>
              <div><dt>{t('Source file size')}</dt><dd>{formatBytes(record.sourceSize)}</dd></div>
              <div><dt>{t('Source SHA-256')}</dt><dd className="historical-hash">{record.sourceSha256}</dd></div>
              <div><dt>{t('Career identity')}</dt><dd>{t('User-declared · not verified')}</dd></div>
              <div><dt>{t('Roster completeness')}</dt><dd>{t('Unverified')}</dd></div>
            </dl>
            <div className="historical-overview-actions">
              <Status tone="warning">{record.mode === 'editor' ? t('Editor projection') : t('Realism projection')}</Status>
              {activeSaved
                ? <Button variant="quiet" disabled>{t('Saved on this browser')}</Button>
                : <Button variant="primary" onClick={() => void onSave()} disabled={library.activity !== null}>{t('Save snapshot locally')}</Button>}
            </div>
            <p className="historical-footnote">{t('The capture is historical. PID, file hash, declared career label and timestamp do not prove a currently running process, loaded save lineage or authenticated runtime image bytes.')}</p>
          </section>

          <CoveragePanel record={record}/>

          <section className="historical-panel">
            <SectionHeading eyebrow={t('Player records')} title={t('Browse captured players')}>
              <span className="historical-count">{filteredPlayers.length.toLocaleString()} / {players.length.toLocaleString()}</span>
            </SectionHeading>
            <label className="historical-search">
              <Icon name="search" size={16}/>
              <input type="search" value={search} onChange={event => { setSearch(event.currentTarget.value); setVisibleLimit(PAGE_SIZE); }}
                placeholder={t('Search name, observed club or native ID…')} aria-label={t('Search captured players')}/>
            </label>
            <div className="historical-player-browser">
              <div className="historical-player-table-wrap">
                <table className="historical-player-table" aria-label={t("Historical player records")}>
                  <thead><tr><th>{t('Player')}</th><th>{t('Kind')}</th><th>{t('Observed club link')}</th><th>{t('Derived age')}</th></tr></thead>
                  <tbody>
                    {visiblePlayers.map(player => <tr key={player.id}>
                      <td><button className="historical-player-select" aria-current={selectedPlayer?.id === player.id ? 'true' : undefined}
                        onClick={() => setSelectedPlayerId(player.id)}>{fieldText(player.name, t)}<small>#{player.nativeId}</small></button></td>
                      <td>{t(player.nativeKind)}</td>
                      <td>{player.club.value?.name ?? fieldText(player.club, t)}</td>
                      <td>{fieldText(player.calendarAge, t, value => String(value))}</td>
                    </tr>)}
                    {visiblePlayers.length === 0 && <tr><td colSpan={4} className="historical-table-empty">{t('No players match this search.')}</td></tr>}
                  </tbody>
                </table>
              </div>
              {visiblePlayers.length < filteredPlayers.length && <Button variant="quiet" onClick={() => setVisibleLimit(limit => limit + PAGE_SIZE)}>{t('Show more players')}</Button>}
              <p className="historical-footnote">{t('Player IDs are snapshot-local. Search is limited to this capture; no automatic cross-career identity merge is performed.')}</p>
            </div>
          </section>

          {selectedPlayer && <PlayerDetail player={selectedPlayer}/>}
          <section className="historical-panel">
            <SectionHeading eyebrow={t('Source diagnostics')} title={t('What this capture does not prove')}/>
            <ul className="historical-diagnostics">
              {record.diagnostics.map((item, index) => <li key={index}>{t(item)}</li>)}
              <li>{t('CA and PA remain unknown; no contract values are decoded.')}</li>
              <li>{t('Observed position familiarity is not tactical eligibility.')}</li>
              <li>{t('No native save writer, live process watcher or desktop IPC is active.')}</li>
            </ul>
          </section>
        </>}
      </section>
    </div>
  </div>;
}
