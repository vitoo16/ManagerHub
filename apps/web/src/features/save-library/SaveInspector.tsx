import { memo, useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes, type SaveIdentity } from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import { useSaveInspectionLibrary } from '../../useSaveInspectionLibrary';

function SaveInspector({ imports, selected, onInspect, onRemove, busy, error, select, onRestoreSaved }: {
  imports: readonly SaveIdentity[]; selected: SaveIdentity | null;
  onInspect: (file: File) => Promise<void>; onRemove: (id: string) => void;
  busy: boolean; error: string | null; select: (id: string) => void;
  onRestoreSaved: (records: readonly SaveIdentity[]) => void;
}) {
  const { t } = useTranslation();
  const saveLibrary = useSaveInspectionLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [memberPage, setMemberPage] = useState(0);
  const memberPageSize = 50;
  const fileId = useId();
  const totalMemberPages = Math.max(1, Math.ceil((selected?.archiveIndex?.memberCount ?? 0) / memberPageSize));
  const visibleMemberPage = Math.min(memberPage, totalMemberPages - 1);
  const [drag, setDrag] = useState(false);
  const isSelectedSaved = selected ? saveLibrary.items.some(item => item.id === selected.id) : false;
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
  return <div className="view-flow">
    <div className="page-title"><div className="mh-eyebrow">{t("GAME DATA / LOCAL FILES")}</div><h1>{t("Save Library")}</h1><p>{t("Choose a .fm save to check its file type. To analyze players today, export a squad list as HTML or CSV and open Player Lab.")}</p></div>
    <Surface className={'file-drop ' + (drag ? 'file-drop--drag' : '')} onDragOver={e => {e.preventDefault(); setDrag(true);}} onDragLeave={() => setDrag(false)} onDrop={handleDrop}>
      <input ref={inputRef} id={fileId} className="visually-hidden" type="file" accept=".fm" onChange={handleInput} tabIndex={-1}/>
      <div className="file-drop__icon"><Icon name="file" size={29}/></div>
      <h2>{t("Inspect a saved career")}</h2>
      <p>{t("Drag a")} <strong>.fm</strong> {t("file here, or choose one from your device.")}<br/>{t("The original file is never modified.")}</p>
      <Button variant="primary" disabled={busy} onClick={openPicker}><Icon name={busy ? 'monitor' : 'plus'} size={16}/>{t(busy ? 'Inspecting file…' : 'Choose .fm file')}</Button>
      <span className="file-drop__limit">{t("Browser inspection limit · 256 MB · No cloud upload")}</span>
    </Surface>
    {error && <div role="alert" className="inline-alert"><Icon name="warning" size={18}/><span>{t(error)}</span><button aria-label={t("Choose another file")} onClick={openPicker}>{t("Choose another file")}</button></div>}
    {saveLibrary.error && <div role="alert" className="inline-alert"><Icon name="warning" size={18}/><span>{t(saveLibrary.error)}</span>
      {saveLibrary.canClearIncompatible
        ? <button disabled={saveLibrary.activity !== null} onClick={() => { void saveLibrary.clearIncompatible(); }}>{t("Clear incompatible saved metadata")}</button>
        : <button aria-label={t("Dismiss saved metadata error")} onClick={saveLibrary.clearError}><Icon name="close" size={15}/></button>}
    </div>}
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
            <button className={'save-select ' + (file.id === selected?.id ? 'save-select--active' : '')} onClick={() => select(file.id)}>
              <span className="save-select__icon"><Icon name="file"/></span><span className="save-select__copy"><strong title={file.name}>{file.name}</strong><small>{formatBytes(file.size)} · {file.detectedFamily?.toUpperCase() || t('Unknown')} · {t('File type')}</small></span>
            </button>
            <button className="delete-save" aria-label={t('Remove {{fileName}} from inspected list', { fileName: file.name })} onClick={() => onRemove(file.id)}><Icon name="trash" size={16}/></button>
          </div>)}
        </Surface>
        {selected && <Surface className="save-detail">
          <div className="panel-heading"><span>{t("FILE INSPECTION")}</span><Status tone={selected.detectedFamily ? 'info' : 'warning'}>{t(selected.detectedFamily ? 'Signature recognized' : 'Unknown format')}</Status></div>
          <h3 title={selected.name}>{selected.name}</h3>
          <dl className="detail-grid">
            <dt>{t("Container family")}</dt><dd>{selected.detectedFamily?.toUpperCase() || t('Unknown')}</dd>
            <dt>{t("Edition / build")}</dt><dd>{t("Not verified")}</dd>
            <dt>{t("Size")}</dt><dd>{formatBytes(selected.size)}</dd>
            <dt>{t("Header bytes")}</dt><dd className="mono">{selected.signature}</dd>
            <dt>{t("SHA-256")}</dt><dd className="mono digest">{selected.sha256 || t('Not calculated')}</dd>
            <dt>{t("Player / CA / PA")}</dt><dd>{t("Not decoded")}</dd>
          </dl>
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
              onClick={() => { void (isSelectedSaved ? saveLibrary.remove(selected.id) : saveLibrary.save(selected)); }}>
              {t(isSelectedSaved ? 'Remove saved metadata' : 'Save inspection metadata on this browser')}
            </Button>
            <p>{t("Only inspection metadata is saved in this browser. The original .fm file bytes are never stored or uploaded.")}</p>
          </div>
          <div className="inspector-note"><Icon name="warning" size={16}/>
            <div>
              <p>{t(selected.detectedFamily
                ? 'We can check this save’s format, but player data is not available yet. Use Player Lab with an exported HTML/CSV squad list.'
                : 'This save format is not recognized yet. Try another save, or import a player list in Player Lab.')}</p>
              <details className="inspection-technical"><summary>{t('Technical details')}</summary>
                <p>{selected.warnings.join(' ')}</p>
              </details>
            </div>
          </div>
        </Surface>}
      </div>}
    <div className="coverage-note"><Icon name="shield" size={17}/><p><strong>{t("Important:")}</strong> {t("recognizing AFE or FMF headers does not establish compatibility, identify your Football Manager version or give access to player attributes. Those capabilities require validated version-specific adapters.")}</p></div>
  </div>;
}
export default memo(SaveInspector);
