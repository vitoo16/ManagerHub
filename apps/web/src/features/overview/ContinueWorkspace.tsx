import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset, WorkspaceKey } from '@managerhub/domain';
import { Button, Icon, SectionHeading, Status, Surface } from '@managerhub/ui';
import { usePlayerLibrary } from '../../usePlayerLibrary';

type Props = {
  readonly current: PlayerDataset | null;
  readonly onDataset: (dataset: PlayerDataset) => void;
  readonly go: (key: WorkspaceKey) => void;
};

/** An actionable entry point: saved exports are read only after an explicit selection. */
function ContinueWorkspace({ current, onDataset, go }: Props) {
  const { t } = useTranslation();
  const library = usePlayerLibrary();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<string | null>(null);
  const [openError, setOpenError] = useState(false);

  const openSaved = useCallback(async (id: string) => {
    if (openingId !== null) return;
    setOpeningId(id);
    setOpenError(false);
    try {
      const dataset = await library.open(id);
      if (!mountedRef.current) return;
      if (dataset) {
        onDataset(dataset);
        go('squad');
      } else {
        setOpenError(true);
      }
    } catch {
      if (mountedRef.current) setOpenError(true);
    } finally {
      if (mountedRef.current) {
        setOpeningId(null);
        setPendingReplacement(null);
      }
    }
  }, [openingId, library.open, onDataset, go]);

  const chooseSaved = useCallback((id: string) => {
    if (openingId !== null) return;
    setOpenError(false);
    if (current) {
      setPendingReplacement(id);
    } else {
      void openSaved(id);
    }
  }, [current, openSaved, openingId]);

  let savedListContent: ReactNode;
  if (library.loading) {
    savedListContent = <p role="status">{t('Checking saved player exports…')}</p>;
  } else if (library.error) {
    savedListContent = <p role="alert">{t('Saved player lists are unavailable. Check browser storage permissions.')}</p>;
  } else if (library.items.length === 0) {
    savedListContent = <p>{t('No saved lists yet. Import a list in Player Lab and choose Save on this browser.')}</p>;
  } else {
    savedListContent = <ul className="overview-resume__list">
      {library.items.slice(0, 3).map(item => <li key={item.id}>
        <div className="overview-resume__item">
          <span className="overview-resume__item-name" title={item.fileName}>{item.fileName}</span>
          <small>{item.playerCount.toLocaleString()} {t('players')}</small>
        </div>
        <Button disabled={openingId !== null} onClick={() => chooseSaved(item.id)}>
          {t(openingId === item.id ? 'Opening saved list…' : 'Open in Squad Planner')}
        </Button>
      </li>)}
    </ul>;
  }

  return <section className="overview-resume" aria-labelledby="overview-resume-title">
    <SectionHeading eyebrow={t('YOUR WORKSPACE')} title={t('Continue where you left off')} id="overview-resume-title">
      <button className="text-link" onClick={() => go('players')}>{t('Open Player Lab')} <Icon name="arrow" size={15}/></button>
    </SectionHeading>
    <div className="overview-resume__grid">
      <Surface className="overview-resume__current">
        <div className="overview-resume__head">
          <strong>{t('Current player list')}</strong>
          <Status tone={current ? 'positive' : 'neutral'}>{t(current ? 'Loaded in this session' : 'Nothing loaded')}</Status>
        </div>
        {current ? <>
          <strong className="overview-resume__name" title={current.fileName}>{current.fileName}</strong>
          <p>{current.players.length.toLocaleString()} {t('players')} · {current.attributeColumns.length} {t('exported attribute columns')}</p>
          <p className="overview-resume__note">{t(current.source === 'decoded_save'
            ? 'Decoded offline · Read-only'
            : 'Exported attributes only. Actual CA/PA and live game data are not verified.')}</p>
          <Button variant="primary" onClick={() => go('squad')}>
            {t('Continue in Squad Planner')} <Icon name="arrow" size={15}/>
          </Button>
        </> : <>
          <p>{t('Start by importing an HTML/CSV/TSV player list, or open one you previously saved in this browser.')}</p>
          <Button variant="primary" onClick={() => go('players')}>
            <Icon name="plus" size={15}/> {t('Import player list')}
          </Button>
        </>}
      </Surface>
      <Surface className="overview-resume__saved">
        <div className="overview-resume__head">
          <strong>{t('Saved player lists')}</strong>
          <Status tone="neutral">{library.loading ? t('Loading…') : library.items.length.toString()}</Status>
        </div>
        {savedListContent}
        {library.items.length > 3 && <button className="text-link" onClick={() => go('players')}>
          {t('See all saved player lists')} <Icon name="arrow" size={14}/>
        </button>}
        {openError && <p role="alert">{t('Could not open the saved player list. Your current roster was not changed.')}</p>}
        {pendingReplacement && <div className="overview-resume__confirm" role="group" aria-label={t('Replace current roster?')}>
          <p>{t('Opening this saved list replaces the current in-memory roster and resets unsaved Squad Planner changes. Your saved data is unchanged.')}</p>
          <div className="overview-resume__confirm-actions">
            <Button variant="danger" disabled={openingId !== null} onClick={() => void openSaved(pendingReplacement)}>{t('Replace and open')}</Button>
            <Button variant="quiet" disabled={openingId !== null} onClick={() => setPendingReplacement(null)}>{t('Cancel')}</Button>
          </div>
        </div>}
      </Surface>
    </div>
    <p className="overview-resume__privacy"><Icon name="shield" size={14}/> {t('Player lists and plans stay in this browser unless you explicitly export a CSV. No game save is modified.')}</p>
  </section>;
}

export default memo(ContinueWorkspace);
