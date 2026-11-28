import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, type ScoredRole } from '@managerhub/domain';
import { AttributeValue } from '@managerhub/ui';

export function RoleEvidence({ role }: { readonly role: ScoredRole }) {
  const { t } = useTranslation();
  return <>
        <strong>{t("Inputs used for this role")}</strong>
        {role.evidence.length > 0 ? <table className="role-evidence-table">
          <thead><tr><th scope="col">{t('Attributes')}</th><th scope="col">{t('Observed')}</th><th scope="col">{t('Role importance')}</th></tr></thead>
          <tbody>{role.evidence.map(item => <tr key={item.attribute}><th scope="row">{t(ATTRIBUTE_LABELS[item.attribute])}</th><td><AttributeValue value={item.value}/></td><td>{item.weight}</td></tr>)}</tbody>
        </table> : <p>{t('Not enough observed attributes.')}</p>}
        <p className="module-disclaimer">{t("These weights only explain ManagerHub's role-fit score. They are not Football Manager's CA costs.")}</p>
        {role.missing.length>0&&<p className="role-missing">{t('Missing:')} {role.missing.map(k=>t(ATTRIBUTE_LABELS[k])).join(', ')}</p>}
  </>;
}
