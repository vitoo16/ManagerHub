import { memo, useId, useMemo, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FM2013_EXPERIMENTAL_WRITE_BUILD, type DecodedSaveDatabase, type DecodedSaveMode } from '@managerhub/domain/fm2013-offline';
import { Button, Icon, Status, Surface } from '@managerhub/ui';
import { registerSaveDbI18n } from '../../i18n/register-save-db-i18n';
import './save-session.css';

registerSaveDbI18n();

export interface ActiveSaveToolbarProps {
  readonly database: DecodedSaveDatabase | null;
  readonly allDecodedSaves: readonly DecodedSaveDatabase[];
  readonly saveMode: DecodedSaveMode;
  readonly managedClubUid: number | null;
  readonly dirtyEntityCount: number;
  readonly dirtyFieldCount: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly hasRawSaveBytes: boolean;
  readonly writerKeyReady: boolean;
  readonly busy: boolean;
  readonly onOpenSaveFile: (file: File) => void;
  readonly onSwitchSave: (saveId: string) => void;
  readonly onSetSaveMode: (mode: DecodedSaveMode) => void;
  readonly onManagedClubChange: (clubUid: number | null) => void;
  readonly onAttachLangDb: (file: File) => void;
  readonly onAuthorizeFmExe: (file: File) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onOpenMassEditModal: () => void;
  readonly onOpenSaveAsModal: () => void;
}

function ActiveSaveToolbar({
  database,
  allDecodedSaves,
  saveMode,
  managedClubUid,
  dirtyEntityCount,
  dirtyFieldCount,
  canUndo,
  canRedo,
  hasRawSaveBytes,
  writerKeyReady,
  busy,
  onOpenSaveFile,
  onSwitchSave,
  onSetSaveMode,
  onManagedClubChange,
  onAttachLangDb,
  onAuthorizeFmExe,
  onUndo,
  onRedo,
  onOpenMassEditModal,
  onOpenSaveAsModal
}: ActiveSaveToolbarProps) {
  const { t } = useTranslation();
  const saveFileInputRef = useRef<HTMLInputElement>(null);
  const langDbInputRef = useRef<HTMLInputElement>(null);
  const exeInputRef = useRef<HTMLInputElement>(null);
  const clubSelectId = useId();
  const saveSwitchId = useId();
  const saveInputId = useId();
  const langInputId = useId();
  const exeInputId = useId();

  const clubsWithPlayers = useMemo(() => {
    if (!database) return [];
    return database.clubs
      .filter(c => c.playerCount > 0)
      .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName));
  }, [database?.clubs]);

  const handleSaveInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onOpenSaveFile(file);
    event.currentTarget.value = '';
  };

  const handleLangInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onAttachLangDb(file);
    event.currentTarget.value = '';
  };

  const handleExeInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onAuthorizeFmExe(file);
    event.currentTarget.value = '';
  };

  if (!database) return null;

  return (
    <Surface className="active-save-toolbar" role="region" aria-label={t('Active save session')}>
      <label htmlFor={saveInputId} className="visually-hidden">{t('Load another .fm save')}</label>
      <input
        ref={saveFileInputRef}
        id={saveInputId}
        type="file"
        accept=".fm"
        className="visually-hidden"
        onChange={handleSaveInput}
        tabIndex={-1}
      />
      <label htmlFor={langInputId} className="visually-hidden">{t('Attach FM2013 lang_db.dat')}</label>
      <input
        ref={langDbInputRef}
        id={langInputId}
        type="file"
        accept=".dat"
        className="visually-hidden"
        onChange={handleLangInput}
        tabIndex={-1}
      />
      <label htmlFor={exeInputId} className="visually-hidden">{t('Authorize FM2013 fm.exe for Save As signing')}</label>
      <input
        ref={exeInputRef}
        id={exeInputId}
        type="file"
        accept=".exe"
        className="visually-hidden"
        onChange={handleExeInput}
        tabIndex={-1}
      />

      <div className="active-save-toolbar__identity">
        <Status tone={dirtyEntityCount > 0 ? 'warning' : 'positive'}>
          {dirtyEntityCount > 0
            ? t('{{count}} unsaved edits', { count: dirtyFieldCount })
            : t('Decoded save active')}
        </Status>
        <div className="active-save-toolbar__title">
          <strong title={database.source.fileName}>{database.source.fileName}</strong>
          <small>
            {database.source.edition} {database.source.build}
            {database.source.gameDate ? ` · ${database.source.gameDate}` : ''}
            {' · '}{database.counts.players.toLocaleString()} {t('Players')}
            {database.source.langDbAttached ? ` · lang_db` : ''}
            {writerKeyReady ? ` · HMAC-SHA512` : ''}
          </small>
        </div>
      </div>

      <div className="active-save-toolbar__controls">
        {allDecodedSaves.length > 1 && (
          <label className="active-save-toolbar__field" htmlFor={saveSwitchId}>
            <span>{t('Active save')}</span>
            <select
              id={saveSwitchId}
              disabled={busy}
              value={database.source.saveId}
              onChange={event => onSwitchSave(event.currentTarget.value)}
            >
              {allDecodedSaves.map(item => (
                <option key={item.source.saveId} value={item.source.saveId}>
                  {item.source.fileName}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="active-save-toolbar__field" htmlFor={clubSelectId}>
          <span>{t('Managed club')}</span>
          <select
            id={clubSelectId}
            aria-label={t('Global managed club')}
            value={managedClubUid === null ? 'all' : String(managedClubUid)}
            onChange={event => {
              const val = event.currentTarget.value;
              onManagedClubChange(val === 'all' ? null : Number(val));
            }}
          >
            <option value="all">{t('All clubs')} ({database.counts.players.toLocaleString()})</option>
            {clubsWithPlayers.map(club => (
              <option key={club.uid} value={String(club.uid)}>
                {club.shortName || club.fullName} ({club.playerCount})
              </option>
            ))}
          </select>
        </label>

        <div className="active-save-toolbar__mode" role="group" aria-label={t('Global display mode')}>
          <button
            type="button"
            disabled={busy}
            aria-pressed={saveMode === 'realism'}
            onClick={() => onSetSaveMode('realism')}
          >
            {t('Realism mode')}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={saveMode === 'editor'}
            onClick={() => onSetSaveMode('editor')}
          >
            {t('Editor mode')}
          </button>
        </div>

        <div className="active-save-toolbar__actions">
          {saveMode === 'editor' && (
            <>
              <Button
                type="button"
                variant="quiet"
                disabled={busy || !canUndo}
                onClick={onUndo}
                aria-label={t('Undo last edit')}
              >
                {t('Undo')}
              </Button>
              <Button
                type="button"
                variant="quiet"
                disabled={busy || !canRedo}
                onClick={onRedo}
                aria-label={t('Redo edit')}
              >
                {t('Redo')}
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={busy}
                onClick={onOpenMassEditModal}
              >
                {t('Presets & Mass Edit')}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={onOpenSaveAsModal}
              >
                <Icon name="download" size={14} /> {t('Save As .fm')}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="quiet"
            disabled={busy}
            onClick={() => langDbInputRef.current?.click()}
          >
            {t(database.source.langDbAttached ? 'Update lang_db.dat' : 'Attach lang_db.dat')}
          </Button>
          {import.meta.env.DEV && saveMode === 'editor' && database.source.compatibilityStatus === 'verified' && database.source.build === FM2013_EXPERIMENTAL_WRITE_BUILD && hasRawSaveBytes && !writerKeyReady && (
            <Button
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={() => exeInputRef.current?.click()}
            >
              {t('Authorize fm.exe')}
            </Button>
          )}
          <Button
            type="button"
            variant="quiet"
            disabled={busy}
            onClick={() => saveFileInputRef.current?.click()}
          >
            {t(hasRawSaveBytes ? 'Switch .fm' : 'Select original or another .fm')}
          </Button>
        </div>
      </div>
    </Surface>
  );
}

export default memo(ActiveSaveToolbar);
