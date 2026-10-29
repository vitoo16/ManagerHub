import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { attributeGroupSummary, type PlayerExport } from '@managerhub/domain';

export const AttributeRadar = memo(function AttributeRadar({player}: {player:PlayerExport}){
  const { t } = useTranslation();
  const groups=attributeGroupSummary(player).filter(x=>x.name!=='Goalkeeping'||x.observed>0);
  const usable=groups.filter(x=>x.score!==null);
  if(usable.length<3)return <div className="player-empty-chart">{t("At least three attribute groups are needed for a meaningful profile radar.")}</div>;
  const center=125,radius=92;
  const point=(index:number,score:number)=>{
    const angle=-Math.PI/2+(2*Math.PI*index)/groups.length;
    const scale=(score-1)/19;
    return [center+Math.cos(angle)*radius*scale,center+Math.sin(angle)*radius*scale];
  };
  const coordinates=groups.map((group,i)=>point(i,group.score??1));
  const points=coordinates.map(([x,y])=>x?.toFixed(2)+','+y?.toFixed(2)).join(' ');
  const ring=(value:number)=>groups.map((_,i)=>point(i,value).map(v=>v.toFixed(2)).join(',')).join(' ');
  return <div className="player-radar">
    <svg viewBox="0 0 250 250" role="img" aria-label={t('Radar showing average native 1 to 20 attributes for')+' '+player.name}>
      {[5,10,15,20].map(n=><polygon key={n} points={ring(n)} fill="none" stroke="var(--line)" strokeWidth="1"/>)}
      {groups.map((g,i)=>{const [x,y]=point(i,20);return <line key={g.name} x1={center} y1={center} x2={x} y2={y} stroke="var(--line)" strokeWidth="1"/>;})}
      <polygon points={points} fill="color-mix(in srgb, var(--accent-strong) 22%, transparent)" stroke="var(--accent-strong)" strokeWidth="2.2" strokeLinejoin="round"/>
      {coordinates.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.1" fill="var(--accent-strong)"/>)}
    </svg>
    <div className="radar-legend" role="list" aria-label={t("Exact radar values")}>
      {groups.map(g=><div key={g.name} role="listitem"><span>{t(g.name)}</span><strong>{g.score?.toFixed(1)??'—'}<small> / 20</small></strong></div>)}
    </div>
  </div>;
});
