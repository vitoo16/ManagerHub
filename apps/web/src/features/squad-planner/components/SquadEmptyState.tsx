import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Surface } from '@managerhub/ui';

function SquadEmptyState({ onImport, onOpenSaves }: { onImport: () => void; onOpenSaves?: () => void }) {
  const { t } = useTranslation();
  return <Surface className="squad-no-data">
    <Icon name="layers" size={34}/>
    <h2>{t("Your squad needs an actual player export.")}</h2>
    <p>{t("Decode FM2013 players, clubs, finances, contracts and staff directly from one .fm file with zero CSV export.")}</p>
    <div className="squad-no-data__actions">
      {onOpenSaves && <Button variant="primary" onClick={onOpenSaves}><Icon name="database" size={15}/> {t("Load a .fm save")}</Button>}
      <Button variant={onOpenSaves ? 'default' : 'primary'} onClick={onImport}>{t("Open Player Lab")} <Icon name="arrow" size={15}/></Button>
    </div>
  </Surface>;
}

export default memo(SquadEmptyState);
