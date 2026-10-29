import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedPlayerExportSummary } from '@managerhub/domain';
import { Button, Icon, Status, Surface } from '@managerhub/ui';

type Activity = 'saving' | 'opening' | 'deleting' | null;
type Props = {
  items: readonly SavedPlayerExportSummary[];
  loading: boolean;
  activity: Activity;
  error: string | null;
  pendingDelete: string | null;
  onOpenSaved: (id: string) => void;
  onDeleteSaved: (id: string) => void;
  onDismissError: () => void;
};

function SavedPlayerLibraryPanel({
  items, loading, activity, error, pendingDelete,
  onOpenSaved, onDeleteSaved, onDismissError
}: Props) {
  const { t } = useTranslation();
  return <Surface className="saved-player-library">
    <div className="saved-player-library__heading">
      <div><strong>{t("Saved player exports")}</strong><small>{t("IndexedDB · This browser only · Explicit opt-in · Up to 20 exports")}</small></div>
      <Status tone={error ? 'warning' : 'neutral'}>{loading ? t('Loading…') : items.length + ' ' + t('saved')}</Status>
    </div>
    {error && <div role="alert" className="local-library-error">
      <Icon name="warning" size={16}/>{t("Could not access your saved lists. Please check browser storage settings or try again.")}
      <button onClick={onDismissError} aria-label={t("Dismiss local library error")}><Icon name="close" size={15}/></button>
    </div>}
    {!loading && items.length === 0 && <p className="saved-player-library__empty">{t("No saved exports yet. Import an HTML/CSV/TSV player list, then select “Save on this browser” to keep it after reloading.")}</p>}
    {items.length > 0 && <div className="saved-player-library__items" role="list" aria-label={t("Saved exports")}>
      {items.map(item => <div className="saved-player-library__item" role="listitem" key={item.id}>
        <div className="saved-player-library__meta">
          <strong title={item.fileName}>{item.fileName}</strong>
          <small>{item.playerCount.toLocaleString()} {t('players')} · {item.attributeCount} {t('attributes')} · {t('Saved')} {new Date(item.savedAt).toLocaleDateString(t('locale'))}</small>
        </div>
        <Button disabled={activity !== null} onClick={() => onOpenSaved(item.id)}><Icon name="file" size={14}/> {t("Open")}</Button>
        <Button variant={pendingDelete === item.id ? 'danger' : 'quiet'} disabled={activity !== null}
          onClick={() => onDeleteSaved(item.id)}>{t(pendingDelete === item.id ? 'Confirm delete' : 'Delete')}</Button>
      </div>)}
    </div>}
  </Surface>;
}

export default memo(SavedPlayerLibraryPanel);
