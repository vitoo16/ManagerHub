import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset } from '@managerhub/domain';
import type { DecodedSaveDatabase, DecodedSaveMode } from '@managerhub/domain/fm2013-offline';
import { Icon, Status, Surface } from '@managerhub/ui';
import { usePlayerLibrary } from './usePlayerLibrary';
import PlayerDetails from './features/player-lab/components/PlayerDetails';
import PlayerDatasetSummary from './features/player-lab/components/PlayerDatasetSummary';
import PlayerImportIntro from './features/player-lab/components/PlayerImportIntro';
import PlayerImportToolbar from './features/player-lab/components/PlayerImportToolbar';
import PlayerListPanel from './features/player-lab/components/PlayerListPanel';
import SavedPlayerLibraryPanel from './features/player-lab/components/SavedPlayerLibraryPanel';
import ScoutShortlistPanel from './features/player-lab/components/ScoutShortlistPanel';
import { usePlayerImport } from './features/player-lab/hooks/usePlayerImport';
import { registerSaveDbI18n } from './i18n/register-save-db-i18n';
import './player-workspace.css';

registerSaveDbI18n();

type Props = {
  dataset: PlayerDataset | null;
  shortlistIds: readonly string[];
  setShortlistIds: Dispatch<SetStateAction<string[]>>;
  onDataset: (dataset: PlayerDataset | null) => void;
  onOpenSquad: () => void;
  activeDecodedSave?: DecodedSaveDatabase | null;
  saveMode?: DecodedSaveMode;
  onSetSaveMode?: (mode: DecodedSaveMode) => void;
  clubFilterUid?: number | null;
  onClubFilterChange?: (clubUid: number | null) => void;
  initialPlayerId?: string | null;
};

function PlayerWorkspaceView({
  dataset,
  shortlistIds,
  setShortlistIds,
  onDataset,
  onOpenSquad,
  activeDecodedSave = null,
  saveMode = 'realism',
  onSetSaveMode,
  clubFilterUid = null,
  onClubFilterChange,
  initialPlayerId = null
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(initialPlayerId);
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const clubSelectId = useId();
  const library = usePlayerLibrary();

  useEffect(() => {
    if (initialPlayerId) {
      setChosenId(initialPlayerId);
    }
  }, [initialPlayerId]);

  const onImportParsed = useCallback((parsed: PlayerDataset) => {
    onDataset(parsed);
    setChosenId(parsed.players[0]?.id ?? null);
    setSearch('');
    setVisibleLimit(100);
    setPendingDelete(null);
  }, [onDataset]);
  const { error, importing, onFile, clearError } = usePlayerImport(onImportParsed);

  const clubsWithPlayers = useMemo(() => {
    if (!activeDecodedSave) return [];
    return activeDecodedSave.clubs
      .filter(club => club.playerCount > 0)
      .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName));
  }, [activeDecodedSave]);

  const normalizedSearch = search.trim().toLowerCase();
  const deferredSearch = useDeferredValue(normalizedSearch);
  const playerSearchIndex = useMemo(
    () => dataset?.players.map(player => ({
      player,
      normalizedText: [player.name, player.club, player.position].map(value => value?.toLowerCase() ?? '').join(' ')
    })) ?? [],
    [dataset?.players]
  );
  const visible = useMemo(
    () => playerSearchIndex.filter(entry => entry.normalizedText.includes(deferredSearch)).map(entry => entry.player),
    [playerSearchIndex, deferredSearch]
  );
  const selected = useMemo(
    () => dataset?.players.find(player => player.id === chosenId) ?? dataset?.players[0] ?? null,
    [dataset?.players, chosenId]
  );
  const savedCurrent = useMemo(
    () => dataset !== null && library.items.some(item =>
      item.importedAt === dataset.importedAt &&
      item.fileName === dataset.fileName &&
      item.playerCount === dataset.players.length
    ),
    [dataset, library.items]
  );

  const onOpenSaved = useCallback(async (id: string) => {
    const restored = await library.open(id);
    if (!restored) return;
    onDataset(restored);
    setChosenId(restored.players[0]?.id ?? null);
    setSearch('');
    setVisibleLimit(100);
    setPendingDelete(null);
    clearError();
  }, [library.open, onDataset, clearError]);

  const onDeleteSaved = useCallback(async (id: string) => {
    if (pendingDelete !== id) {
      setPendingDelete(id);
      return;
    }
    if (await library.remove(id)) setPendingDelete(null);
  }, [library.remove, pendingDelete]);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setVisibleLimit(100);
  }, []);
  const onChoosePlayer = useCallback((id: string) => setChosenId(id), []);
  const onShowMore = useCallback(() => setVisibleLimit(limit => limit + 100), []);
  const onClearSession = useCallback(() => {
    onDataset(null);
    setChosenId(null);
    setSearch('');
    setVisibleLimit(100);
  }, [onDataset]);
  const onSaveDataset = useCallback(() => {
    if (dataset) void library.save(dataset);
  }, [dataset, library.save]);

  const isDecodedSource = dataset?.source === 'decoded_save' && activeDecodedSave !== null;

  return <div className="view-flow" aria-busy={importing}>
    <div className="page-title">
      <span className="mh-eyebrow">{t(isDecodedSource ? 'Decoded offline from FM2013' : 'PLAYER INTELLIGENCE / PROVISIONAL EXPORTS')}</span>
      <h1>{t("Player Lab")}</h1>
      <p>{t(isDecodedSource
        ? 'Decode FM2013 players, clubs, finances, contracts and staff directly from one .fm file with zero CSV export.'
        : "Import a player list from Football Manager to discover each player's strengths, suitable roles and comparisons with teammates.")}</p>
    </div>

    {isDecodedSource && activeDecodedSave && (
      <Surface className="decoded-save-bar">
        <div className="decoded-save-bar__info">
          <Status tone="positive">{t('Decoded save active')}</Status>
          <strong>{activeDecodedSave.source.fileName}</strong>
          <span>
            {activeDecodedSave.source.edition} {activeDecodedSave.source.build}
            {activeDecodedSave.source.gameDate ? ` · ${activeDecodedSave.source.gameDate}` : ''}
          </span>
        </div>
        <div className="decoded-save-bar__controls">
          {onClubFilterChange && (
            <label className="decoded-save-bar__select" htmlFor={clubSelectId}>
              <span>{t('Filter by club')}</span>
              <select
                id={clubSelectId}
                value={clubFilterUid === null ? 'all' : String(clubFilterUid)}
                onChange={event => {
                  const val = event.currentTarget.value;
                  onClubFilterChange(val === 'all' ? null : Number(val));
                  setSearch('');
                  setVisibleLimit(100);
                }}
              >
                <option value="all">{t('All players in save')} ({activeDecodedSave.counts.players.toLocaleString()})</option>
                {clubsWithPlayers.map(club => (
                  <option key={club.uid} value={String(club.uid)}>
                    {club.shortName || club.fullName} ({club.playerCount})
                  </option>
                ))}
              </select>
            </label>
          )}
          {onSetSaveMode && (
            <div className="decoded-save-mode-switch" role="group" aria-label={t('Display mode')}>
              <button
                type="button"
                aria-pressed={saveMode === 'realism'}
                onClick={() => onSetSaveMode('realism')}
              >
                {t('Realism mode')}
              </button>
              <button
                type="button"
                aria-pressed={saveMode === 'editor'}
                onClick={() => onSetSaveMode('editor')}
              >
                {t('Editor mode')}
              </button>
            </div>
          )}
        </div>
      </Surface>
    )}

    <PlayerImportToolbar
      dataset={dataset}
      importing={importing}
      savedCurrent={savedCurrent}
      activity={library.activity}
      onFile={onFile}
      onSave={onSaveDataset}
      onClear={onClearSession}
    />

    {error && <div role="alert" className="inline-alert"><Icon name="warning" size={16}/>{t(error)}</div>}

    <SavedPlayerLibraryPanel
      items={library.items}
      loading={library.loading}
      activity={library.activity}
      error={library.error}
      pendingDelete={pendingDelete}
      onOpenSaved={onOpenSaved}
      onDeleteSaved={onDeleteSaved}
      onDismissError={library.clearError}
    />

    {!dataset ? <PlayerImportIntro/> : <>
      <PlayerDatasetSummary dataset={dataset}/>
      <ScoutShortlistPanel key={dataset.importedAt + ':' + dataset.fileName}
        dataset={dataset} selected={selected} candidateIds={shortlistIds}
        setCandidateIds={setShortlistIds} onSelectPlayer={onChoosePlayer}/>
      <div className="player-lab-layout">
        <PlayerListPanel
          visible={visible}
          selectedId={selected?.id ?? null}
          search={search}
          visibleLimit={visibleLimit}
          isSearchPending={normalizedSearch !== deferredSearch}
          onSearchChange={onSearchChange}
          onChoosePlayer={onChoosePlayer}
          onShowMore={onShowMore}
        />
        <div className="player-detail-column">
          {selected
            ? <PlayerDetails key={selected.id} player={selected} dataset={dataset} onOpenSquad={onOpenSquad}/>
            : <div className="empty-library">{t("Choose a player from the imported list.")}</div>}
        </div>
      </div>
    </>}

    <div className="coverage-note">
      <Icon name="shield" size={16}/>
      <p><strong>{t("Data integrity:")}</strong> {t(isDecodedSource
        ? 'This report uses verified attributes decoded offline from your .fm save. Original save bytes remain untouched.'
        : 'CA, PA and hidden personality are not recovered from a CSV unless independently verified. Role profiles are authored ManagerHub heuristics, not Sports Interactive ratings. Player identities in different imports are not assumed to match.')}</p>
    </div>
  </div>;
}

export const PlayerWorkspace = memo(PlayerWorkspaceView);
