import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset } from '@managerhub/domain';
import { Icon } from '@managerhub/ui';
import { usePlayerLibrary } from './usePlayerLibrary';
import PlayerDetails from './features/player-lab/components/PlayerDetails';
import PlayerDatasetSummary from './features/player-lab/components/PlayerDatasetSummary';
import PlayerImportIntro from './features/player-lab/components/PlayerImportIntro';
import PlayerImportToolbar from './features/player-lab/components/PlayerImportToolbar';
import PlayerListPanel from './features/player-lab/components/PlayerListPanel';
import SavedPlayerLibraryPanel from './features/player-lab/components/SavedPlayerLibraryPanel';
import { usePlayerImport } from './features/player-lab/hooks/usePlayerImport';
import './player-workspace.css';

type Props = {
  dataset: PlayerDataset | null;
  onDataset: (dataset: PlayerDataset | null) => void;
  onOpenSquad: () => void;
};

function PlayerWorkspaceView({ dataset, onDataset, onOpenSquad }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const library = usePlayerLibrary();

  const onImportParsed = useCallback((parsed: PlayerDataset) => {
    onDataset(parsed);
    setChosenId(parsed.players[0]?.id ?? null);
    setSearch('');
    setVisibleLimit(100);
    setPendingDelete(null);
  }, [onDataset]);
  const { error, onFile, clearError } = usePlayerImport(onImportParsed);

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

  return <div className="view-flow">
    <div className="page-title">
      <span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / PROVISIONAL EXPORTS")}</span>
      <h1>{t("Player Lab")}</h1>
      <p>{t("Import a player list from Football Manager to discover each player's strengths, suitable roles and comparisons with teammates.")}</p>
    </div>

    <PlayerImportToolbar
      dataset={dataset}
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
      <p><strong>{t("Data integrity:")}</strong> {t("CA, PA and hidden personality are not recovered from a CSV unless independently verified. Role profiles are authored ManagerHub heuristics, not Sports Interactive ratings. Player identities in different imports are not assumed to match.")}</p>
    </div>
  </div>;
}

export const PlayerWorkspace = memo(PlayerWorkspaceView);
