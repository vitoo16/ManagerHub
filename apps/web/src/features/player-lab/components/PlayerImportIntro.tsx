import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Surface } from '@managerhub/ui';

function PlayerImportIntro() {
  const { t } = useTranslation();
  return <Surface className="player-intro">
    <div className="player-intro__symbol"><Icon name="sparkles" size={26}/></div>
    <h2>{t("Turn attributes into football insights.")}</h2>
    <p>{t("In Football Manager, create a player-list view with Name, Position, and as many technical, mental and physical attributes as possible. Export the view as HTML (native Print Screen) or CSV/TSV and import it here. The file is analyzed entirely in your browser.")}</p>
    <div className="player-intro__checks"><span>{t("Attribute distribution")}</span><span>{t("Position / role profile")}</span><span>{t("Explainable scores")}</span><span>{t("Missing data visibility")}</span></div>
    <p className="module-disclaimer">{t("FM26's native Print Screen can produce HTML. ManagerHub reads a local exported HTML table or CSV/TSV; a .fm save itself is not yet a validated player-data source.")}</p>
  </Surface>;
}

export default memo(PlayerImportIntro);
