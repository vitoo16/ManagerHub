import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, type AttributeKey, type PlayerExport } from '@managerhub/domain';

export const RankedAttributes = memo(function RankedAttributes({player}: {player:PlayerExport}){
  const { t } = useTranslation();
  const values=(Object.entries(player.attributes) as [AttributeKey,number][])
    .sort((a,b)=>b[1]-a[1]);
  if(!values.length)return <div className="player-empty-chart">{t("No recognized, exact 1–20 attributes were included in the export.")}</div>;
  return <div className="player-attributes" role="list" aria-label={t("Player attributes ordered strongest to weakest")}>
    {values.map(([key,value])=><div className="player-attribute" role="listitem" key={key}>
      <span>{t(ATTRIBUTE_LABELS[key])}</span>
      <div className="player-attribute__track" aria-hidden="true"><div style={{width:(value/20*100)+'%'}}/></div>
      <strong>{value}</strong>
    </div>)}
  </div>;
});
