import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FM2013_ROLE_POSITIONS, getEditionRoles, type DevelopmentRoleTarget, type RolePosition, type RoleDuty } from '@managerhub/domain';

const catalog = getEditionRoles('FM2013');
export const DEFAULT_ROLE_TARGET: DevelopmentRoleTarget = { position: 'MC', roleId: 'central-midfielder', duty: 'support' };
export const ROLE_DUTY_LABELS: Record<RoleDuty, string> = { defend: 'Defend duty', support: 'Support duty', attack: 'Attack duty',
  stopper: 'Stopper duty', cover: 'Cover duty', automatic: 'Automatic duty' };

export function RoleTargetSelector({ target, onChange, allowAutomatic = true }: {
  readonly target: DevelopmentRoleTarget;
  readonly onChange: (target: DevelopmentRoleTarget) => void;
  readonly allowAutomatic?: boolean;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const choices = catalog.filter(role => role.positions.includes(target.position));
  const role = choices.find(item => item.id === target.roleId);
  const duties = role?.duties.filter(duty => allowAutomatic || duty !== 'automatic') ?? [];
  const chooseRole = (position: RolePosition, id?: string) => {
    const next = catalog.find(item => item.positions.includes(position) && (!id || item.id === id));
    const duty = next?.duties.find(item => allowAutomatic || item !== 'automatic');
    if (next && duty) onChange({ position, roleId: next.id, duty });
  };
  return <div className="player-attribute-controls">
    <div className="player-attribute-field"><label htmlFor={baseId + '-pos'}>{t('Target position')}</label><select id={baseId + '-pos'} value={target.position}
      onChange={event => chooseRole(event.currentTarget.value as RolePosition)}>
      {FM2013_ROLE_POSITIONS.map(item => <option key={item}>{item}</option>)}
    </select></div>
    <div className="player-attribute-field"><label htmlFor={baseId + '-role'}>{t('Target role')}</label><select id={baseId + '-role'} value={target.roleId}
      onChange={event => chooseRole(target.position, event.currentTarget.value)}>
      {choices.map(item => <option key={item.id} value={item.id}>{t(item.nativeTitle)}</option>)}
    </select></div>
    <div className="player-attribute-field"><label htmlFor={baseId + '-duty'}>{t('Target duty')}</label><select id={baseId + '-duty'} value={target.duty}
      onChange={event => onChange({ ...target, duty: event.currentTarget.value as RoleDuty })}>
      {duties.map(item => <option key={item} value={item}>{t(ROLE_DUTY_LABELS[item])}</option>)}
    </select></div>
  </div>;
}
