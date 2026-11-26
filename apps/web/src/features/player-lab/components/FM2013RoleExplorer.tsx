import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FM2013_ROLE_REFERENCES, getEditionRoles, getRoleDutyProfile, scoreRole, type PlayerExport } from '@managerhub/domain';
import { RoleEvidence } from './RoleEvidence';
import { DEFAULT_ROLE_TARGET, RoleTargetSelector } from '../../RoleTargetSelector';

const catalog = getEditionRoles('FM2013');

export function FM2013RoleExplorer({ player }: { readonly player: PlayerExport }) {
  const { t } = useTranslation();
  const [target, setTarget] = useState(DEFAULT_ROLE_TARGET);
  const { position, duty, roleId } = target;
  const role = catalog.find(item => item.id === roleId);
  const result = useMemo(() => {
    if (!role || !duty) return null;
    const profile = getRoleDutyProfile('FM2013', role.id, position, duty);
    return profile ? scoreRole(player, profile) : null;
  }, [player, role, position, duty]);
  const native = player.positions?.[position];
  const familiarity = typeof native === 'number' && Number.isInteger(native) && native >= 0 && native <= 20 ? native : null;
  return <div className="player-attribute-table">
    <p className="module-disclaimer">{t('FM2013 community reference. Exact build menu parity is not certified. Role importance is a ManagerHub estimate, not native ability cost.')}</p>
    <RoleTargetSelector target={target} onChange={setTarget}/>
    <div className="insight-line"><span>{t('Position familiarity')}</span><strong>{familiarity === null ? t('Unknown') : familiarity + '/20'}</strong></div>
    <div className="insight-line"><span>{t('Role fit')}</span><strong>{result?.score == null ? t('N/A') : result.score + '/100'}</strong></div>
    {result && <p className="module-disclaimer">{Math.round(result.coverage * 100)}% {t('attribute coverage')}</p>}
    {duty === 'automatic' ? <p className="module-disclaimer">{t('Automatic duty depends on the tactical strategy. Choose a concrete duty to evaluate attributes.')}</p> :
      result && <div className="role-result__evidence"><RoleEvidence role={result}/></div>}
    {role && <details><summary>{t('Role reference sources')}</summary><ul>
      {role.references.map(key => <li key={key}><a href={FM2013_ROLE_REFERENCES[key].url} target="_blank" rel="noreferrer">{FM2013_ROLE_REFERENCES[key].title}</a></li>)}
    </ul><p className="module-disclaimer">{t('Historical references describe role behavior; they do not certify numerical importance or exact build availability.')}</p></details>}
  </div>;
}
