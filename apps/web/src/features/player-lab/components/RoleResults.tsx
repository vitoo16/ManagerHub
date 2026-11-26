import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, analyzeRoles, type PlayerExport } from '@managerhub/domain';
import { AttributeValue, Icon } from '@managerhub/ui';
import { ReportPagination, reportPage } from '../../ReportPagination';

function RoleResults({player, roles: suppliedRoles}:{player:PlayerExport;roles?:ReturnType<typeof analyzeRoles>}){
  const { t } = useTranslation();
  const roles=useMemo(()=>suppliedRoles??analyzeRoles(player),[suppliedRoles,player]);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [page, setPage] = useState(0);
  const range = reportPage(roles.length, page, 10);
  return <div className="role-results">
    <p className="module-disclaimer">{t("Role fit shows how well the visible attributes match a role. It isn't CA, star rating or a match prediction. We skip scoring when too many attributes are missing.")}</p>
    {roles.slice(range.start, range.end).map(role=><div key={role.id} className="role-result">
      <button className="role-result__button" aria-expanded={expanded===role.id} onClick={()=>setExpanded(x=>x===role.id?null:role.id)}>
        <span className="role-result__slot">{role.slot}</span><span className="role-result__title">{t(role.title)}<small>{Math.round(role.coverage*100)}% {t('attribute coverage')}</small></span>
        <strong>{role.score === null ? t('N/A') : role.score + '/100'}</strong><Icon name="chevron" size={14}/>
      </button>
      {expanded===role.id&&<div className="role-result__evidence">
        <strong>{t("Inputs used for this role")}</strong>
        {role.evidence.length > 0 ? <table className="role-evidence-table">
          <thead><tr><th scope="col">{t('Attributes')}</th><th scope="col">{t('Observed')}</th><th scope="col">{t('Role importance')}</th></tr></thead>
          <tbody>{role.evidence.map(item => <tr key={item.attribute}><th scope="row">{t(ATTRIBUTE_LABELS[item.attribute])}</th><td><AttributeValue value={item.value}/></td><td>{item.weight}</td></tr>)}</tbody>
        </table> : <p>{t('Not enough observed attributes.')}</p>}
        <p className="module-disclaimer">{t("These weights only explain ManagerHub's role-fit score. They are not Football Manager's CA costs.")}</p>
        {role.missing.length>0&&<p className="role-missing">{t('Missing:')} {role.missing.map(k=>t(ATTRIBUTE_LABELS[k])).join(', ')}</p>}
      </div>}
    </div>)}
    <ReportPagination label={t('Role ranking page')} range={range} onChange={next => { setPage(next); setExpanded(null); }}/>
  </div>;
}

export default memo(RoleResults);
