import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FM2013_ROLE_POSITIONS, getEditionRoles, getRoleDutyProfile, scoreRole,
  type PlayerExport, type RolePosition, type RoleDuty } from '@managerhub/domain';
import { RoleEvidence } from './RoleEvidence';

const catalog = getEditionRoles('FM2013');
const dutyLabels: Record<RoleDuty, string> = { defend: 'Defend duty', support: 'Support duty', attack: 'Attack duty',
  stopper: 'Stopper duty', cover: 'Cover duty', automatic: 'Automatic duty' };

export function FM2013RoleExplorer({ player }: { readonly player: PlayerExport }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState<RolePosition>('MC');
  const [roleId, setRoleId] = useState('');
  const [dutyId, setDutyId] = useState<RoleDuty | ''>('');
  const choices = catalog.filter(role => role.positions.includes(position));
  const role = choices.find(item => item.id === roleId) ?? choices[0];
  const duty = role?.duties.find(item => item === dutyId) ?? role?.duties[0];
  const result = useMemo(() => {
    if (!role || !duty) return null;
    const profile = getRoleDutyProfile('FM2013', role.id, position, duty);
    return profile ? scoreRole(player, profile) : null;
  }, [player, role, position, duty]);
  const native = player.positions?.[position];
  const familiarity = typeof native === 'number' && Number.isInteger(native) && native >= 0 && native <= 20 ? native : null;
  return <div className="player-attribute-table">
    <p className="module-disclaimer">{t('FM2013 community reference. Exact build menu parity is not certified. Role importance is a ManagerHub estimate, not native ability cost.')}</p>
    <div className="player-attribute-controls">
      <label><span>{t('Target position')}</span><select value={position} onChange={event => {
        setPosition(event.currentTarget.value as RolePosition); setRoleId(''); setDutyId('');
      }}>{FM2013_ROLE_POSITIONS.map(item => <option key={item}>{item}</option>)}</select></label>
      <label><span>{t('Target role')}</span><select value={role?.id ?? ''} onChange={event => { setRoleId(event.currentTarget.value); setDutyId(''); }}>
        {choices.map(item => <option key={item.id} value={item.id}>{t(item.nativeTitle)}</option>)}
      </select></label>
      <label><span>{t('Target duty')}</span><select value={duty ?? ''} onChange={event => setDutyId(event.currentTarget.value as RoleDuty)}>
        {role?.duties.map(item => <option key={item} value={item}>{t(dutyLabels[item])}</option>)}
      </select></label>
    </div>
    <div className="insight-line"><span>{t('Position familiarity')}</span><strong>{familiarity === null ? t('Unknown') : familiarity + '/20'}</strong></div>
    <div className="insight-line"><span>{t('Role fit')}</span><strong>{result?.score == null ? t('N/A') : result.score + '/100'}</strong></div>
    {result && <p className="module-disclaimer">{Math.round(result.coverage * 100)}% {t('attribute coverage')}</p>}
    {duty === 'automatic' ? <p className="module-disclaimer">{t('Automatic duty depends on the tactical strategy. Choose a concrete duty to evaluate attributes.')}</p> :
      result && <div className="role-result__evidence"><RoleEvidence role={result}/></div>}
  </div>;
}
