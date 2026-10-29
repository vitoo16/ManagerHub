import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, analyzeRoles, type PlayerExport } from '@managerhub/domain';
import { Icon } from '@managerhub/ui';

export const RoleResults = memo(function RoleResults({player}:{player:PlayerExport}){
  const { t } = useTranslation();
  const roles=analyzeRoles(player);
  const [expanded,setExpanded]=useState<string|null>(null);
  return <div className="role-results">
    <p className="module-disclaimer">{t("Role fit shows how well the visible attributes match a role. It isn't CA, star rating or a match prediction. We skip scoring when too many attributes are missing.")}</p>
    {roles.map(role=><div key={role.id} className="role-result">
      <button className="role-result__button" aria-expanded={expanded===role.id} onClick={()=>setExpanded(x=>x===role.id?null:role.id)}>
        <span className="role-result__slot">{role.slot}</span><span className="role-result__title">{t(role.title)}<small>{Math.round(role.coverage*100)}% {t('attribute coverage')}</small></span>
        <div className="role-result__bar" aria-hidden="true"><div style={{width:(role.score??0)+'%'}}/></div>
        <strong>{role.score??t('N/A')}</strong><Icon name="chevron" size={14}/>
      </button>
      {expanded===role.id&&<div className="role-result__evidence">
        <strong>{t("Inputs used for this role")}</strong>
        <p>{role.evidence.map(e=>`${t(ATTRIBUTE_LABELS[e.attribute])}: ${e.value} (${t('Role importance')}: ${e.weight})`).join(' · ')||t('Not enough observed attributes.')}</p>
        <p className="module-disclaimer">{t("These weights only explain ManagerHub's role-fit score. They are not Football Manager's CA costs.")}</p>
        {role.missing.length>0&&<p className="role-missing">{t('Missing:')} {role.missing.map(k=>t(ATTRIBUTE_LABELS[k])).join(', ')}</p>}
      </div>}
    </div>)}
  </div>;
});
