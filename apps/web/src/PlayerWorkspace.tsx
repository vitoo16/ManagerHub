import { useCallback, useId, useMemo, useRef, useState, type ChangeEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { readableImportError } from './i18n/player-import-copy';
import { parsePlayerExport, parsePlayerHtml, type PlayerDataset } from '@managerhub/domain';
import { Button, Icon, Status } from '@managerhub/ui';
import { usePlayerLibrary } from './usePlayerLibrary';
import PlayerDetails from './features/player-lab/components/PlayerDetails';
import PlayerDatasetSummary from './features/player-lab/components/PlayerDatasetSummary';
import PlayerImportIntro from './features/player-lab/components/PlayerImportIntro';
import PlayerListPanel from './features/player-lab/components/PlayerListPanel';
import SavedPlayerLibraryPanel from './features/player-lab/components/SavedPlayerLibraryPanel';
import './player-workspace.css';

const MAX_EXPORT_BYTES = 12 * 1024 * 1024;

type Props = {
  dataset: PlayerDataset | null;
  onDataset: (dataset: PlayerDataset | null) => void;
  onOpenSquad: () => void;
};

function PlayerWorkspaceView({ dataset, onDataset, onOpenSquad }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const library = usePlayerLibrary();
  const fileInputId = useId();

  const onFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      if (!/\\.(csv|tsv|txt|html|htm)$/i.test(file.name)) {
        throw new Error('Choose an HTML, CSV, TSV or TXT export with player columns.');
      }
      if (!file.size || file.size > MAX_EXPORT_BYTES) {
        throw new Error('Player export must be between 1 byte and 12 MB.');
      }
      const source = await file.text();
      const parsed = /\\.(html|htm)$/i.test(file.name)
        ? parsePlayerHtml(source, file.name)
        : parsePlayerExport(source, file.name);
      onDataset(parsed);
      setChosenId(parsed.players[0]?.id ?? null);
      setSearch('');
      setVisibleLimit(100);
    } catch (cause) {
      setError(readableImportError(cause));
    }
  }, [onDataset]);

  const normalizedSearch = search.trim().toLowerCase();
  const visible = useMemo(
    () => dataset?.players.filter(player =>
      [player.name, player.club, player.position].some(value => value?.toLowerCase().includes(normalizedSearch))
    ) ?? [],
    [dataset?.players, normalizedSearch]
  );
  const selected = dataset?.players.find(player => player.id === chosenId) ?? dataset?.players[0] ?? null;
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
    setError(null);
  }, [library.open, onDataset]);

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

  return <div className="view-flow">
    <div className="page-title">
      <span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / PROVISIONAL EXPORTS")}</span>
      <h1>{t("Player Lab")}</h1>
      <p>{t("Import a player list from Football Manager to discover each player's strengths, suitable roles and comparisons with teammates.")}</p>
    </div>

    <div className="player-lab-header">
      <div>
        <input id={fileInputId} ref={inputRef} type="file"
          accept=".csv,.tsv,.txt,.html,.htm,text/csv,text/tab-separated-values,text/html"
          className="visually-hidden" onChange={onFile}/>
        <Button variant="primary" onClick={() => inputRef.current?.click()}>
          <Icon name="plus" size={16}/>{t(dataset ? 'Replace player export' : 'Import player CSV / HTML')}
        </Button>
        {dataset && <Button disabled={savedCurrent || library.activity !== null} onClick={() => void library.save(dataset)}>
          <Icon name="download" size={16}/>{t(savedCurrent ? 'Saved to this browser' : library.activity === 'saving' ? 'Saving…' : 'Save on this browser')}
        </Button>}
        {dataset && <Button variant="quiet" onClick={onClearSession}>
          <Icon name="trash" size={16}/> {t("Clear session")}
        </Button>}
      </div>
      <Status tone="info">{t("No data uploaded")}</Status>
    </div>

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
