import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeRoles, type PlayerExport } from '@managerhub/domain';
import { Icon } from '@managerhub/ui';
import { RoleEvidence } from './RoleEvidence';
import { FM2013RoleExplorer } from './FM2013RoleExplorer';
import { ReportPagination, reportPage } from '../../ReportPagination';

function RoleResults({player, roles: suppliedRoles}:{player:PlayerExport;roles?:ReturnType<typeof analyzeRoles>}){
  const { t } = useTranslation();
  const roles=useMemo(()=>suppliedRoles??analyzeRoles(player),[suppliedRoles,player]);
  const [catalog, setCatalog] = useState(false);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [page, setPage] = useState(0);
  const range = reportPage(roles.length, page, 10);
  return <div className="role-results">
    <label className="player-attribute-sort"><input type="checkbox" checked={catalog} onChange={event => setCatalog(event.currentTarget.checked)}/>{t('Explore FM2013 role and duty reference')}</label>
    {catalog ? <FM2013RoleExplorer player={player}/> : <>
    <p className="module-disclaimer">{t("Role fit shows how well the visible attributes match a role. It isn't CA, star rating or a match prediction. We skip scoring when too many attributes are missing.")}</p>
    {roles.slice(range.start, range.end).map(role=><div key={role.id} className="role-result">
      <button className="role-result__button" aria-expanded={expanded===role.id} onClick={()=>setExpanded(x=>x===role.id?null:role.id)}>
        <span className="role-result__slot">{role.slot}</span><span className="role-result__title">{t(role.title)}<small>{Math.round(role.coverage*100)}% {t('attribute coverage')}</small></span>
        <strong>{role.score === null ? t('N/A') : role.score + '/100'}</strong><Icon name="chevron" size={14}/>
      </button>
      {expanded===role.id&&<div className="role-result__evidence">
        <RoleEvidence role={role}/>
      </div>}
    </div>)}
    <ReportPagination label={t('Role ranking page')} range={range} onChange={next => { setPage(next); setExpanded(null); }}/>
    </>}
  </div>;
}

export default memo(RoleResults);
