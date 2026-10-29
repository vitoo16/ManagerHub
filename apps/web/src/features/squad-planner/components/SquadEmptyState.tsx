import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Surface } from '@managerhub/ui';

function SquadEmptyState({ onImport }: { onImport: () => void }) {
  const { t } = useTranslation();
  return <Surface className="squad-no-data">
    <Icon name="layers" size={34}/>
    <h2>{t("Your squad needs an actual player export.")}</h2>
    <p>{t("Import an FM HTML/CSV/TSV squad list first. Unknown positions and attributes will not be filled with invented numbers.")}</p>
    <Button variant="primary" onClick={onImport}>{t("Open Player Lab")} <Icon name="arrow" size={15}/></Button>
  </Surface>;
}

export default memo(SquadEmptyState);
