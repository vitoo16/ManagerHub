import { Fragment, lazy, memo, Suspense, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createSaveCompatibilityReport, formatBytes,
  type SaveCompatibilityResolution, type SaveCoverageState, type SaveDataDomain, type SaveIdentity
} from '@managerhub/domain';
import type {
  DecodedSaveDatabase,
  DecodedSaveMode,
  FM2013DecodeProgress,
  FM2013DecodeStage
} from '@managerhub/domain/fm2013-offline';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import { useSaveInspectionLibrary } from '../../useSaveInspectionLibrary';
import { useDecodedSaveLibrary } from '../../useDecodedSaveLibrary';
import type { SaveInspectionResult } from '@managerhub/domain/save-library';
import { registerSaveDbI18n } from '../../i18n/register-save-db-i18n';
import './save-database-explorer.css';

registerSaveDbI18n();

const SaveDatabaseExplorer = lazy(() => import('./SaveDatabaseExplorer'));

const SAVE_DOMAIN_LABELS: Record<SaveDataDomain, string> = {
  player_identity: 'Player identity',
  attributes: 'Attributes',
  actual_ca: 'Actual CA',
  potential_ability: 'Potential ability',
  positions: 'Positions',
  club_links: 'Club links',
  contracts: 'Contracts',
  tactics: 'Tactics',
  matches: 'Matches',
  finance: 'Finance'
};

function compatibilityStatusLabel(status: SaveCompatibilityResolution['status']): string {
  switch (status) {
    case 'unknown_format': return 'Unknown format';
    case 'edition_build_unknown': return 'Edition/build not identified';
    case 'unsupported_build': return 'No exact-build compatibility profile';
    case 'ambiguous_profile': return 'Ambiguous compatibility profiles';
    case 'research_only': return 'Research-only; not product-supported';
    case 'verified': return 'Verified read profile';
  }
}

function coverageStateLabel(state: SaveCoverageState): string {
  switch (state) {
    case 'verified': return 'Verified';
    case 'experimental': return 'Experimental only';
    case 'not_decoded': return 'Not decoded';
    case 'unsupported': return 'Unsupported';
  }
}

function decodeStageLabel(stage: FM2013DecodeStage): string {
  switch (stage) {
    case 'hashing': return 'Calculating SHA-256 fingerprint…';
    case 'reading_container': return 'Reading save archive container…';
    case 'decrypting_database': return 'Decrypting and inflating game database…';
    case 'parsing_tables': return 'Parsing persisted football tables…';
    case 'indexing_database': return 'Indexing clubs, players, contracts and staff…';
  }
}

function SaveInspector({
  imports,
  selected,
  onInspect,
  onRemove,
  busy,
  error,
  select,
  onRestoreSaved,
  decodeProgress,
  onCancelDecode,
  decodeNotice,
  decodedSaves,
  activeDecodedSave,
  saveMode,
  onSetSaveMode,
  onOpenDecodedSave,
  onSwitchDecodedSave,
  onOpenPlayerFromSave,
  onLoadClubInSquad
}: {
  imports: readonly SaveInspectionResult[];
  selected: SaveInspectionResult | null;
  onInspect: (file: File) => Promise<void>;
  onRemove: (id: string) => void;
  busy: boolean;
  error: string | null;
  select: (id: string) => void;
  onRestoreSaved: (records: readonly SaveIdentity[]) => void;
  decodeProgress: FM2013DecodeProgress | null;
  onCancelDecode: () => void;
  decodeNotice: string | null;
  decodedSaves: Readonly<Record<string, DecodedSaveDatabase>>;
  activeDecodedSave: DecodedSaveDatabase | null;
  saveMode: DecodedSaveMode;
  onSetSaveMode: (mode: DecodedSaveMode) => void;
  onOpenDecodedSave: (saveId: string, read: (saveId: string) => Promise<DecodedSaveDatabase | null>) => Promise<void>;
  onSwitchDecodedSave: (saveId: string) => void;
  onOpenPlayerFromSave: (playerUid: number, clubUid: number | null) => void;
  onLoadClubInSquad: (clubUid: number | null) => void;
}) {
  const { t } = useTranslation();
  const saveLibrary = useSaveInspectionLibrary();
  const decodedLibrary = useDecodedSaveLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [memberPage, setMemberPage] = useState(0);
  const memberPageSize = 50;
  const fileId = useId();
  const totalMemberPages = Math.max(1, Math.ceil((selected?.archiveIndex?.memberCount ?? 0) / memberPageSize));
  const visibleMemberPage = Math.min(memberPage, totalMemberPages - 1);
  const [drag, setDrag] = useState(false);
  const isSelectedSaved = selected ? saveLibrary.items.some(item => item.id === selected.id) : false;
  const compatibility = selected ? createSaveCompatibilityReport(selected) : null;
  const allDecodedSaves = useMemo(() => Object.values(decodedSaves), [decodedSaves]);
  const isActiveDbSaved = activeDecodedSave
    ? decodedLibrary.items.some(item => item.saveId === activeDecodedSave.source.saveId)
    : false;

  useEffect(() => { setMemberPage(0); }, [selected?.id]);
  useEffect(() => {
    if (!saveLibrary.loading && saveLibrary.items.length > 0) onRestoreSaved(saveLibrary.items);
  }, [saveLibrary.loading, saveLibrary.items, onRestoreSaved]);

  const openPicker = () => { if (!busy) inputRef.current?.click(); };
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) void onInspect(file);
    event.currentTarget.value = '';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDrag(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void onInspect(file);
  };
  const confirmClearIncompatible = () => {
    const message = t('This will permanently clear all saved Save Library inspection metadata from this browser. Player exports and historical snapshots will remain untouched. Continue?');
    if (window.confirm(message)) void saveLibrary.clearIncompatible();
  };
  const confirmRemoveSavedMetadata = (id: string, name: string) => {
    const message = t('Remove saved inspection metadata for "{{fileName}}" from this browser? The original .fm file will remain untouched. This cannot be undone. Continue?', { fileName: name });
    if (window.confirm(message)) void saveLibrary.remove(id);
  };
  const onOpenPersistedDatabase = async (saveId: string) => {
    const existing = decodedSaves[saveId];
    if (existing) {
      onSwitchDecodedSave(saveId);
      return;
    }
    await onOpenDecodedSave(saveId, decodedLibrary.open);
  };
  const onRemovePersistedDatabase = (saveId: string, fileName: string) => {
    const message = t('Remove saved inspection metadata for "{{fileName}}" from this browser? The original .fm file will remain untouched. This cannot be undone. Continue?', { fileName });
    if (window.confirm(message)) void decodedLibrary.remove(saveId);
  };

  const isSelectedDecoded = selected?.support === 'decoded';

  return <div className="view-flow">
    <div className="page-title">
      <div className="mh-eyebrow">{t("GAME DATA / LOCAL FILES")}</div>
      <h1>{t("Save Library")}</h1>
      <p>{t("Load a Football Manager .fm save to decode the full football database offline, or inspect header metadata for unrecognized builds.")}</p>
    </div>

    <Surface className={'file-drop ' + (drag ? 'file-drop--drag' : '')} onDragOver={e => {e.preventDefault(); setDrag(true);}} onDragLeave={() => setDrag(false)} onDrop={handleDrop}>
      <label htmlFor={fileId} className="visually-hidden">{t('Choose a Football Manager save file')}</label>
      <input ref={inputRef} id={fileId} className="visually-hidden" type="file" accept=".fm" onChange={handleInput} tabIndex={-1}/>
      <div className="file-drop__icon"><Icon name="file" size={29}/></div>
      <h2>{t("Inspect a saved career")}</h2>
      <p>{t("Drag a")} <strong>.fm</strong> {t("file here, or choose one from your device.")}<br/>{t("The original file is never modified.")}</p>
      <Button variant="primary" disabled={busy} onClick={openPicker}><Icon name={busy ? 'monitor' : 'plus'} size={16}/>{t(busy ? 'Decoding .fm save offline…' : 'Choose .fm file')}</Button>
      <span className="file-drop__limit">{t("Browser inspection limit · 256 MB · No cloud upload")}</span>
    </Surface>

    {busy && (
      <Surface className="save-decode-progress" role="status" aria-live="polite">
        <div className="save-decode-progress__head">
          <strong>{t('Decoding .fm save offline…')}</strong>
          <span>{Math.round(decodeProgress?.percent ?? 10)}%</span>
        </div>
        <div className="save-decode-progress__track">
          <div
            className="save-decode-progress__bar"
            style={{ width: `${Math.max(5, Math.min(100, decodeProgress?.percent ?? 10))}%` }}
          />
        </div>
        <div className="save-decode-progress__foot">
          <span>{decodeProgress ? t(decodeStageLabel(decodeProgress.stage)) : t('Reading save archive container…')}</span>
          <Button type="button" variant="quiet" onClick={onCancelDecode}>
            <Icon name="close" size={14} /> {t('Cancel decode')}
          </Button>
        </div>
      </Surface>
    )}

    {error && <div role="alert" className="inline-alert"><Icon name="warning" size={18}/><span>{t(error)}</span><button aria-label={t("Choose another file")} onClick={openPicker}>{t("Choose another file")}</button></div>}
    {saveLibrary.error && <div role="alert" className="inline-alert"><Icon name="warning" size={18}/><span>{t(saveLibrary.error)}</span>
      {saveLibrary.canClearIncompatible
        ? <button disabled={saveLibrary.activity !== null} onClick={confirmClearIncompatible}>{t("Clear incompatible saved metadata")}</button>
        : <button aria-label={t("Dismiss saved metadata error")} onClick={saveLibrary.clearError}><Icon name="close" size={15}/></button>}
    </div>}
    {decodedLibrary.error && <div role="alert" className="inline-alert"><Icon name="warning" size={18}/><span>{decodedLibrary.error}</span>
      <button aria-label={t("Dismiss saved metadata error")} onClick={decodedLibrary.clearError}><Icon name="close" size={15}/></button>
    </div>}

    {decodedLibrary.items.length > 0 && (
      <Surface className="saved-decoded-library">
        <div className="saved-decoded-library__head">
          <div>
            <strong>{t('Saved offline saves')}</strong>
            <small>{t('Read-only · Original .fm unchanged')}</small>
          </div>
          <Status tone="positive">{decodedLibrary.items.length}</Status>
        </div>
        <ul className="saved-decoded-library__list" aria-label={t('Saved offline saves')}>
          {decodedLibrary.items.map(item => {
            const isActive = activeDecodedSave?.source.saveId === item.saveId;
            return (
              <li className="saved-decoded-library__item" key={item.saveId}>
                <div className="saved-decoded-library__meta">
                  <strong title={item.source.fileName}>{item.source.fileName}</strong>
                  <small>
                    {item.source.edition} {item.source.build}
                    {item.source.gameDate ? ` · ${item.source.gameDate}` : ''}
                    {' · '}{item.counts.players.toLocaleString()} {t('Players')} · {item.counts.clubs.toLocaleString()} {t('Clubs & Finances')}
                  </small>
                </div>
                <div className="saved-decoded-library__actions">
                  {isActive && <Status tone="positive">{t('Active')}</Status>}
                  <Button
                    type="button"
                    variant={isActive ? 'quiet' : 'primary'}
                    disabled={decodedLibrary.activity !== null || isActive}
                    onClick={() => void onOpenPersistedDatabase(item.saveId)}
                  >
                    {t('Open save')}
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    disabled={decodedLibrary.activity !== null}
                    onClick={() => onRemovePersistedDatabase(item.saveId, item.source.fileName)}
                  >
                    <Icon name="trash" size={14} /> {t('Remove saved database')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Surface>
    )}

    {activeDecodedSave && (
      <Suspense fallback={<div className="workspace-loading" role="status" aria-live="polite">{t('Loading…')}</div>}>
        <SaveDatabaseExplorer
          database={activeDecodedSave}
          allDecodedSaves={allDecodedSaves}
          saveMode={saveMode}
          isSavedInBrowser={isActiveDbSaved}
          saveActivity={decodedLibrary.activity}
          onSetSaveMode={onSetSaveMode}
          onSwitchDecodedSave={onSwitchDecodedSave}
          onPersistDatabase={db => void decodedLibrary.save(db)}
          onRemovePersistedDatabase={onRemovePersistedDatabase}
          onOpenPlayerInLab={onOpenPlayerFromSave}
          onLoadClubInSquad={onLoadClubInSquad}
        />
      </Suspense>
    )}

    <SectionHeading eyebrow={t("IMPORTED METADATA ONLY")} title={t('Inspected files')+' ('+imports.length+')'}>
      <Status tone={saveLibrary.loading ? 'neutral' : isSelectedSaved ? 'positive' : 'neutral'}>
        {t(saveLibrary.loading ? 'Loading saved inspection metadata…' : isSelectedSaved ? 'Saved metadata on this browser' : 'Session only')}
      </Status>
    </SectionHeading>
    {imports.length === 0
      ? <Surface className="empty-library"><Icon name="database" size={29}/><h3>{t("No files inspected yet")}</h3><p>{t("Once selected, file signatures and available inspection details will appear here. This is not a player database.")}</p></Surface>
      : <div className="library-grid">
        <Surface className="save-list" role="list" aria-label={t("Inspected save files")}>
          {imports.map(file => <div role="listitem" className="save-list__item" key={file.id}>
            <button className={'save-select ' + (file.id === selected?.id ? 'save-select--active' : '')} onClick={() => {
              select(file.id);
              if (decodedSaves[file.id]) onSwitchDecodedSave(file.id);
            }}>
              <span className="save-select__icon"><Icon name="file"/></span>
              <span className="save-select__copy">
                <strong title={file.name}>{file.name}</strong>
                <small>
                  {formatBytes(file.size)} · {file.detectedFamily?.toUpperCase() || t('Unknown')} · {file.support === 'decoded' ? t('Decoded offline · Read-only') : t('File type')}
                </small>
              </span>
            </button>
            <button className="delete-save" aria-label={t('Remove {{fileName}} from inspected list', { fileName: file.name })} onClick={() => onRemove(file.id)}><Icon name="trash" size={16}/></button>
          </div>)}
        </Surface>
        {selected && <Surface className="save-detail">
          <div className="panel-heading"><span>{t("FILE INSPECTION")}</span><Status tone={compatibility?.resolution.status === 'verified' ? 'positive' : selected.detectedFamily ? 'info' : 'warning'}>
            {t(compatibility?.resolution.status === 'verified' ? 'Verified reader' : selected.detectedFamily ? 'Family signature detected' : 'Unknown format')}
          </Status></div>
          <h3 title={selected.name}>{selected.name}</h3>
          <dl className="detail-grid">
            <dt>{t("Container family")}</dt><dd>{selected.detectedFamily?.toUpperCase() || t('Unknown')}</dd>
            <dt>{t("Edition / build")}</dt><dd>{selected.edition ? `${selected.edition}${selected.build ? ` ${selected.build}` : ''}` : t("Not verified")}</dd>
            <dt>{t("Reader compatibility")}</dt><dd>{t(compatibilityStatusLabel(compatibility!.resolution.status))}</dd>
            <dt>{t("Archive catalogue")}</dt><dd>{t(compatibility!.archiveCatalogue === 'experimental' ? 'Experimental only' : 'Not observed')}</dd>
            <dt>{t("Write capability")}</dt><dd>{t('Unsupported')}</dd>
            <dt>{t("Size")}</dt><dd>{formatBytes(selected.size)}</dd>
            <dt>{t("Header bytes")}</dt><dd className="mono">{selected.signature}</dd>
            <dt>{t("SHA-256")}</dt><dd className="mono digest">{selected.sha256 || t('Not calculated')}</dd>
            {!selected.sha256 && <><dt>{t('Identification')}</dt><dd>{t('Unique inspection record; file duplicates cannot be detected')}</dd></>}
            <dt>{t("Player / CA / PA")}</dt><dd>{isSelectedDecoded ? t(saveMode === 'editor' ? 'Decoded from save · Verified' : 'Hidden in Realism mode') : t("Not decoded")}</dd>
          </dl>
          <details className="inspection-technical save-coverage">
            <summary>{t('Data coverage')}</summary>
            <dl className="detail-grid">
              {compatibility!.coverage.map(item => <Fragment key={item.domain}>
                <dt>{t(SAVE_DOMAIN_LABELS[item.domain])}</dt><dd>{t(coverageStateLabel(item.state))}</dd>
              </Fragment>)}
            </dl>
          </details>
          {selected.archiveIndex && <div className="archive-preview">
            <div className="archive-preview__head"><div><strong>{t("Internal archive index")}</strong><small>{t("Experimental metadata discovery · Not decoded gameplay records")}</small></div><Status tone="warning">{selected.archiveIndex.memberCount} {t('entries')}</Status></div>
            {selected.archiveIndex.nestedGroups && selected.archiveIndex.nestedGroups.length > 0 && <p>
              {t('Additional indexed groups')}: {selected.archiveIndex.nestedGroups.map(group =>
                group.name + ' (' + group.memberCount + ')').join(', ')}
            </p>}
            <div className="archive-preview__list" role="list" aria-label={t("Internal save archive members")}>
              {selected.archiveIndex.members.slice(visibleMemberPage * memberPageSize, (visibleMemberPage + 1) * memberPageSize).map((entry, i) => <div className="archive-preview__row" role="listitem" key={entry.filename + i}>
                <span className="archive-preview__filename" title={entry.filename}>{entry.filename}</span><span>{formatBytes(entry.storedBytes)}</span>
              </div>)}
            </div>
            {selected.archiveIndex.memberCount > memberPageSize && <div className="archive-preview__expand">
              <button className="text-link" disabled={visibleMemberPage === 0}
                onClick={() => setMemberPage(page => Math.max(0, page - 1))}>{t('Previous page')}</button>
              <span>{t('Page {{current}} of {{total}}', { current: visibleMemberPage + 1, total: totalMemberPages })}</span>
              <button className="text-link" disabled={visibleMemberPage >= totalMemberPages - 1}
                onClick={() => setMemberPage(page => Math.min(totalMemberPages - 1, page + 1))}>{t('Next page')}</button>
            </div>}
            {selected.archiveIndex.gapObservations && selected.archiveIndex.gapObservations.length > 0 && <details className="inspection-technical">
              <summary>{t('Unindexed data gaps')} ({selected.archiveIndex.gapObservations.length})</summary>
              <p>{t('Experimental counts of repeated byte patterns only. Gaps are not decoded player records.')}</p>
              <div className="archive-preview__list" role="list" aria-label={t('Unindexed data gaps')}>
                {selected.archiveIndex.gapObservations.map((gap, i) => <div className="archive-preview__row" role="listitem" key={gap.afterMember + gap.beforeMember + i}>
                  <span className="archive-preview__filename">{gap.afterMember} → {gap.beforeMember}</span>
                  <span>{formatBytes(gap.sizeBytes)}</span>
                  <span>{gap.status === 'sampled' ? String(gap.markerMatches) : t('Not sampled')}</span>
                  <span>{gap.mostCommonMarkerDistance === null ? '—' : String(gap.mostCommonMarkerDistance) + ' B'}</span>
                </div>)}
              </div>
            </details>}
            {selected.archiveIndex.probes && selected.archiveIndex.probes.length > 0 && <details className="inspection-technical member-probe">
              <summary>{t('Member header diagnostics')} ({selected.archiveIndex.probes.length})</summary>
              <p>{t('Only the first 16 bytes of each bounded member are sampled. Signatures are checked both at the start and after the first 8 bytes as an experimental offset; matches are candidates, not confirmed codecs. No member contents are decoded.')}</p>
              <div className="archive-preview__list" role="list" aria-label={t('Member header diagnostics')}>
                {selected.archiveIndex.probes.slice(0, 32).map(probe => <div className="archive-preview__row" role="listitem" key={probe.filename}>
                  <span className="archive-preview__filename" title={probe.filename}>{probe.filename}</span>
                  <span className="mono">{probe.prefixKind}</span>
                  <span className="mono">{probe.prefixHex}</span>
                  <span className="mono">+8: {probe.afterFirstEightBytesKind}</span>
                  <span className="mono">{probe.afterFirstEightBytesHex || '—'}</span>
                </div>)}
              </div>
            </details>}
          </div>}
          <div className="save-metadata-actions">
            <Button variant={isSelectedSaved ? 'quiet' : 'primary'}
              disabled={saveLibrary.loading || saveLibrary.activity !== null}
              onClick={() => {
                if (isSelectedSaved) confirmRemoveSavedMetadata(selected.id, selected.name);
                else void saveLibrary.save(selected);
              }}>
              {t(isSelectedSaved ? 'Remove saved metadata' : 'Save inspection metadata on this browser')}
            </Button>
            <p>{t("Only inspection metadata is saved in this browser. The original .fm file bytes are never stored or uploaded.")}</p>
          </div>
          <div className="inspector-note"><Icon name={isSelectedDecoded ? 'check' : 'warning'} size={16}/>
            <div>
              <p>{isSelectedDecoded
                ? t('Read-only · Original .fm unchanged')
                : t(selected.detectedFamily
                  ? 'A container signature is recognized, but no exact-build verified reader is registered. Player data, CA and PA remain unavailable. Use Player Lab with an exported HTML/CSV squad list.'
                  : 'This save format is not recognized yet. Try another save, or import a player list in Player Lab.')}</p>
              {(selected.warnings.length > 0 || decodeNotice) && <details className="inspection-technical"><summary>{t('Technical details')}</summary>
                <p>{[...selected.warnings, ...(decodeNotice ? [decodeNotice] : [])].join(' ')}</p>
              </details>}
            </div>
          </div>
        </Surface>}
      </div>}
    <div className="coverage-note"><Icon name="shield" size={17}/><p><strong>{t("Important:")}</strong> {t("recognizing AFE or FMF headers does not establish compatibility, identify your Football Manager version or give access to player attributes. Those capabilities require validated version-specific adapters.")}</p></div>
  </div>;
}
export default memo(SaveInspector);
