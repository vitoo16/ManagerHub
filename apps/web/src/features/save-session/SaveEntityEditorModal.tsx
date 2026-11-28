import { memo, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildClubSquadPresetOverlay,
  buildEditedSaveFileName,
  buildMassEditPlayersOverlay,
  buildMassEditStaffOverlay,
  buildMassEditClubsOverlay,
  buildPlayerPresetPatch,
  FM2013_EXPERIMENTAL_WRITE_BUILD,
  summarizeDraftChanges,
  type ClubDraftPatch,
  type ClubSquadPresetKind,
  type DecodedSaveDatabase,
  type PlayerDraftPatch,
  type PlayerPresetKind,
  type SaveDraftOverlay,
  type StadiumDraftPatch,
  type StaffDraftPatch
} from '@managerhub/domain/fm2013-offline';
import { Button, Icon, Status } from '@managerhub/ui';
import { AdvancedMassEdit } from './AdvancedMassEdit';
import { ReportPagination, reportPage } from '../ReportPagination';
import { useDialogFocus } from '../../useDialogFocus';
import { PlayerEditorRecord } from './PlayerEditorRecord';
import { StaffEditorRecord } from './StaffEditorRecord';
import { ClubEditorRecord } from './ClubEditorRecord';
import { StadiumEditorRecord } from './StadiumEditorRecord';
import { EditorRecordNavigator } from './EditorRecordNavigator';
import { isRecordTarget, type EditorViewTarget, type EditorRecordState, type EditorRecordTarget } from './editor-records';
import { registerSaveDbI18n } from '../../i18n/register-save-db-i18n';
import './save-session.css';

registerSaveDbI18n();

export type { EditorModalTarget } from './editor-records';

export interface SaveEntityEditorModalProps {
  readonly target: EditorViewTarget;
  readonly embedded?: boolean;
  readonly recordState: EditorRecordState | null;
  readonly onOpenRecord: (record: EditorRecordTarget) => void;
  readonly onCloseRecord: (record: EditorRecordTarget) => void;
  readonly onOpenWorkspace?: () => void;
  readonly dirtyFieldCount: number;
  readonly baseDatabase: DecodedSaveDatabase;
  readonly workingDatabase: DecodedSaveDatabase;
  readonly overlay: SaveDraftOverlay;
  readonly managedClubUid: number | null;
  readonly hasRawSaveBytes: boolean;
  readonly writerKeyReady: boolean;
  readonly writingSave: boolean;
  readonly writeError: string | null;
  readonly onClose: () => void;
  readonly onCommitOverlay: (label: string, mutator: (cur: SaveDraftOverlay) => SaveDraftOverlay) => void;
  readonly onDiscardAll: () => void;
  readonly onAuthorizeFmExe: (file: File) => void;
  readonly onSaveAsFm: (outputFileName: string) => void;
}


function SaveEntityEditorModal({
  target: initialTarget,
  embedded = false,
  recordState,
  onOpenRecord,
  onCloseRecord,
  onOpenWorkspace,
  dirtyFieldCount,
  baseDatabase,
  workingDatabase,
  overlay,
  managedClubUid,
  hasRawSaveBytes,
  writerKeyReady,
  writingSave,
  writeError,
  onClose,
  onCommitOverlay,
  onDiscardAll,
  onAuthorizeFmExe,
  onSaveAsFm
}: SaveEntityEditorModalProps) {
  const { t } = useTranslation();
  const exeInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, !embedded, '.editor-record-tab__select[aria-pressed="true"]');
  const browsing = initialTarget.kind === 'browse' || isRecordTarget(initialTarget);
  const target = browsing ? recordState?.active ?? initialTarget : initialTarget;
  const writerBuildSupported = import.meta.env.DEV && baseDatabase.source.compatibilityStatus === 'verified' &&
    baseDatabase.source.build === FM2013_EXPERIMENTAL_WRITE_BUILD;
  const [diffPage, setDiffPage] = useState(0);
  const [outputName, setOutputName] = useState(() => buildEditedSaveFileName(baseDatabase.source.fileName));
  const [presetPreview, setPresetPreview] = useState<{
    readonly target: EditorViewTarget;
    readonly base: SaveDraftOverlay;
    readonly next: SaveDraftOverlay;
    readonly label: string;
    readonly changes: ReturnType<typeof summarizeDraftChanges>;
  } | null>(null);

  useEffect(() => {
    if (embedded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [embedded, onClose]);

  const player = target.kind === 'player'
    ? workingDatabase.players.find(p => p.uid === target.uid) ?? null
    : null;
  const staffMember = target.kind === 'staff'
    ? workingDatabase.staff.find(s => s.uid === target.uid) ?? null
    : null;
  const club = target.kind === 'club'
    ? workingDatabase.clubs.find(c => c.uid === target.uid) ?? null
    : null;
  const stadium = target.kind === 'stadium'
    ? workingDatabase.stadiums.find(st => st.uid === target.uid) ?? null
    : null;

  const saveAsEntries = useMemo(
    () => target.kind === 'save_as' ? summarizeDraftChanges(baseDatabase, overlay) : [],
    [baseDatabase, overlay, target.kind]
  );
  const preview = presetPreview?.base === overlay && presetPreview.target === target ? presetPreview : null;
  const diffEntries = preview?.changes ?? saveAsEntries;

  const diffRange = reportPage(diffEntries.length, diffPage, 50);

  const applyPlayerField = (label: string, patch: PlayerDraftPatch) => {
    if (!player) return;
    onCommitOverlay(label, cur => buildMassEditPlayersOverlay(cur, [player.uid], patch));
  };

  const applyPlayerPreset = (preset: PlayerPresetKind, label: string) => {
    if (!player) return;
    const patch = buildPlayerPresetPatch(player, preset, workingDatabase.source.gameDate);
    applyPlayerField(label, patch);
  };

  const applyStaffField = (label: string, patch: StaffDraftPatch) => {
    if (!staffMember) return;
    onCommitOverlay(label, cur => buildMassEditStaffOverlay(cur, [staffMember.uid], patch));
  };

  const applyClubField = (label: string, patch: ClubDraftPatch) => {
    if (!club) return;
    onCommitOverlay(label, cur => buildMassEditClubsOverlay(cur, [club.uid], patch));
  };

  const applyClubPreset = (targetClubUid: number, preset: ClubSquadPresetKind, label: string) => {
    const next = buildClubSquadPresetOverlay(baseDatabase, overlay, targetClubUid, preset);
    const changes = summarizeDraftChanges(workingDatabase, next).filter(change => change.before !== change.after);
    setDiffPage(0);
    setPresetPreview({ target, base: overlay, next, label, changes });
  };

  const applyStadiumField = (label: string, patch: StadiumDraftPatch) => {
    if (!stadium) return;
    onCommitOverlay(label, cur => ({
      ...cur,
      stadiums: {
        ...cur.stadiums,
        [stadium.uid]: {
          ...cur.stadiums[stadium.uid],
          ...patch
        }
      }
    }));
  };

  const handleExeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onAuthorizeFmExe(file);
    event.currentTarget.value = '';
  };

  const modalTitle =
    target.kind === 'player' ? `${t('Edit player')} · ${player?.displayName ?? ''}` :
    target.kind === 'staff' ? `${t('Edit staff')} · ${staffMember?.displayName ?? ''}` :
    target.kind === 'club' ? `${t('Edit club & finances')} · ${club?.fullName ?? ''}` :
    target.kind === 'stadium' ? `${t('Edit stadium')} · ${stadium?.customName ?? `#${target.uid}`}` :
    target.kind === 'browse' ? t('Find a record to edit') :
    target.kind === 'mass_edit' ? t('FMRTE13 Presets & Mass Edit') :
    t('Save As .fm (Experimental Offline Copy)');

  return (
    <div
      className={embedded ? "editor-workspace-shell" : "editor-modal-backdrop"}
      role="presentation"
      onMouseDown={event => {
        if (!embedded && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={embedded ? "editor-workspace-body" : browsing ? "editor-modal editor-modal--records" : "editor-modal"}
        role={embedded ? "region" : "dialog"}
        tabIndex={embedded ? undefined : -1}
        aria-modal={embedded ? undefined : true}
        aria-label={modalTitle}
      >
        <input
          ref={exeInputRef}
          type="file"
          accept=".exe"
          aria-label={t('Authorize FM2013 fm.exe for Save As signing')}
          className="visually-hidden"
          onChange={handleExeChange}
          tabIndex={-1}
        />

        <div className="editor-modal__head">
          <div>
            <span className="mh-eyebrow">{t('Offline Save Editor · Draft Transaction Layer')}</span>
            <h2>{modalTitle}</h2>
            <p>{t('Changes update all ManagerHub workspaces immediately and never touch your original .fm file.')}</p>
          </div>
          {!embedded && <div className="save-db-actions">
            {browsing && onOpenWorkspace && <Button type="button" onClick={onOpenWorkspace}>{t('Open in Classic Editor')}</Button>}
            <Button type="button" variant="quiet" onClick={onClose} aria-label={t('Close editor')}>
              <Icon name="close" size={16} />
            </Button>
          </div>}
        </div>

        {browsing && <EditorRecordNavigator database={workingDatabase} state={recordState} onOpen={onOpenRecord} onClose={onCloseRecord}/>}
        {target.kind === 'browse' && <p className="module-disclaimer">{t('Search players, staff, clubs or stadiums by name or UID. Open records stay available while you browse this save.')}</p>}
        {writeError && <div className="inline-alert" role="alert">{writeError}</div>}

        {target.kind === 'player' && player && <PlayerEditorRecord key={player.uid} player={player} source={workingDatabase.source} draft={overlay.players[player.uid]} applyPlayerField={applyPlayerField} applyPlayerPreset={applyPlayerPreset}/>}

        {target.kind === 'staff' && staffMember && <StaffEditorRecord key={staffMember.uid} staffMember={staffMember} applyStaffField={applyStaffField}/>}

        {target.kind === 'club' && club && <ClubEditorRecord key={club.uid} club={club} applyClubField={applyClubField} applyClubPreset={applyClubPreset}/>}

        {target.kind === 'stadium' && stadium && <StadiumEditorRecord key={stadium.uid} stadium={stadium} applyStadiumField={applyStadiumField}/>}

        {target.kind === 'mass_edit' && (
          <>
            {managedClubUid !== null && (
              <div className="editor-presets">
                <strong>{t('Managed club presets')}:</strong>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'inspire_team', 'Inspire Managed Squad')}>
                  {t('Inspire squad')}
                </Button>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'heal_fitness_morale_team', 'Heal Managed Squad')}>
                  {t('Heal & max fitness squad')}
                </Button>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'match_squad_ca_pa', 'Match Managed Squad CA-PA')}>
                  {t('Match squad CA to PA')}
                </Button>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'boost_finances_facilities', 'Boost Managed Club')}>
                  {t('Max facilities & £250M balance')}
                </Button>
              </div>
            )}

            <AdvancedMassEdit database={workingDatabase} managedClubUid={managedClubUid} onCommitOverlay={onCommitOverlay}/>
          </>
        )}

        {target.kind === 'save_as' && (
          <div className="editor-section">
            {!writerBuildSupported && <p role="status" className="inline-alert">{import.meta.env.DEV
              ? t('Experimental Save As requires the exact FM2013 build {{build}}.', { build: FM2013_EXPERIMENTAL_WRITE_BUILD })
              : t('Save As preview is available. Export requires a certified native writer.')}</p>}
            <div className="editor-presets">
              {writerBuildSupported && <Status tone={writerKeyReady ? 'positive' : 'warning'}>
                {t(writerKeyReady ? 'HMAC-SHA512 signing key ready' : 'Local fm.exe authorization required')}
              </Status>}
              <span>
                {t('Original SHA-256')}: <code className="mono">{baseDatabase.source.sha256.slice(0, 16)}…</code> ({t('never modified')})
              </span>
              {!writerKeyReady && hasRawSaveBytes && writerBuildSupported && (
                <Button type="button" variant="primary" onClick={() => exeInputRef.current?.click()}>
                  {t('Select FM2013 fm.exe (13.3.3f359652)')}
                </Button>
              )}
            </div>

            {writerBuildSupported && !hasRawSaveBytes && (
              <div className="inline-alert" role="alert">
                {t('This save was restored without its original .fm bytes. Close this dialog and select the original .fm in the active save toolbar. Matching content preserves all draft edits.')}
              </div>
            )}

            {writerBuildSupported && <label className="editor-field">
              <span>{t('New Save As .fm filename')}</span>
              <input
                type="text"
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
              />
            </label>}

          </div>
        )}

        {(target.kind === 'save_as' || preview) && (
          <div className="editor-section">
            <h3>{t(preview ? 'Preset change preview' : 'Pending field changes')} ({diffEntries.length})</h3>
            {diffEntries.length === 0 ? (
              <p className="save-db-mode-note">{t(preview ? 'No values would change.' : 'No draft changes yet.')}</p>
            ) : (
              <div className="editor-diff-wrap">
                <table className="save-db-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('Type')}</th>
                      <th scope="col">{t('Name')}</th>
                      <th scope="col">{t('Field')}</th>
                      <th scope="col">{t('Before')}</th>
                      <th scope="col">{t('After')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffEntries.slice(diffRange.start, diffRange.end).map((item, idx) => (
                      <tr key={`${item.entityKind}-${item.uid}-${item.field}-${idx}`}>
                        <td>{item.entityKind}</td>
                        <td><strong>{item.entityName}</strong></td>
                        <td className="mono">{item.field}</td>
                        <td className="save-db-num">{String(item.before ?? '—')}</td>
                        <td className="save-db-num"><strong>{String(item.after)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ReportPagination label={t('Pending field changes')} range={diffRange} onChange={setDiffPage}/>
            {preview && <div className="save-db-actions">
              <Button type="button" variant="quiet" onClick={() => setPresetPreview(null)}>{t('Cancel')}</Button>
              <Button type="button" variant="primary" disabled={diffEntries.length === 0} onClick={() => {
                onCommitOverlay(preview.label, current => current === preview.base ? preview.next : current);
                setPresetPreview(null);
              }}>{t('Apply preset to draft')}</Button>
            </div>}
          </div>
        )}

        <div className="editor-modal__foot">
          <div>
            {dirtyFieldCount > 0 && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (window.confirm(t('Discard all unsaved draft edits on this save?'))) {
                    onDiscardAll();
                  }
                }}
              >
                {t('Discard all edits')} ({dirtyFieldCount})
              </Button>
            )}
          </div>
          <div className="save-db-actions">
            {target.kind === 'save_as' && (
              <Button
                type="button"
                variant="primary"
                disabled={!writerBuildSupported || !hasRawSaveBytes || !writerKeyReady || writingSave}
                onClick={() => onSaveAsFm(outputName)}
              >
                <Icon name="download" size={15} />
                {t(writingSave ? 'Signing & verifying .fm copy…' : 'Download experimental Save As .fm')}
              </Button>
            )}
            {!embedded && <Button type="button" variant="default" onClick={onClose}>
              {t('Done')}
            </Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SaveEntityEditorModal);
