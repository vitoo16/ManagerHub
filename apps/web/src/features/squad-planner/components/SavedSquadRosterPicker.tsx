import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerDataset } from '@managerhub/domain';
import { Button, Icon, Surface } from '@managerhub/ui';
import { usePlayerLibrary } from '../../../usePlayerLibrary';

interface Props { readonly onDataset: (dataset: PlayerDataset) => void }

/** Reuse the same explicitly saved IndexedDB exports as Player Lab. */
function SavedSquadRosterPicker({ onDataset }: Props) {
  const { t } = useTranslation();
  const library = usePlayerLibrary();
  const [selectedId, setSelectedId] = useState('');
  const [opening, setOpening] = useState(false);
  const openSaved = useCallback(async () => {
    if (!selectedId || opening) return;
    setOpening(true);
    try {
      const dataset = await library.open(selectedId);
      if (dataset) onDataset(dataset);
    } finally { setOpening(false); }
  }, [selectedId, opening, library.open, onDataset]);

  if (library.loading) return <p className="squad-roster-picker__loading" role="status">{t('Checking saved player exports…')}</p>;
  if (!library.items.length && !library.error) return null;
  return <Surface className="squad-roster-picker">
    <div>
      <strong><Icon name="database" size={16}/>{t('Open a saved player list')}</strong>
      <p>{t('Pick a list you previously saved in Player Lab. Then restore its Plan A/B if available.')}</p>
    </div>
    {library.items.length > 0 && <div className="squad-roster-picker__actions">
      <label>{t('Saved player list')}
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)}
          aria-label={t('Saved player list')} disabled={opening}>
          <option value="">{t('Choose a saved player list…')}</option>
          {library.items.map(item => <option key={item.id} value={item.id}>
            {item.fileName} ({item.playerCount} {t('players')})
          </option>)}
        </select>
      </label>
      <Button variant="primary" disabled={!selectedId || opening} onClick={() => void openSaved()}>
        {t(opening ? 'Opening saved list…' : 'Open saved list')}
      </Button>
    </div>}
    {library.error && <p role="alert">{t('Could not open this saved player list. Check browser storage and try again.')}</p>}
  </Surface>;
}

export default memo(SavedSquadRosterPicker);
