import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ATTRIBUTE_LABELS, ROLE_PROFILES, scoreRole, type PlayerExport
} from '@managerhub/domain';
import { Button } from '@managerhub/ui';

type Props = {
  candidates: readonly PlayerExport[];
  onSelectPlayer: (id: string) => void;
};

/** Every candidate is evaluated against the same source-independent role demands. */
function ScoutRoleComparison({ candidates, onSelectPlayer }: Props) {
  const { t } = useTranslation();
  const [roleId, setRoleId] = useState('advanced-forward');
  const role = ROLE_PROFILES.find(profile => profile.id === roleId) ?? ROLE_PROFILES[0]!;
  const ranked = useMemo(() => candidates.map((player, sourceIndex) => ({
    player, sourceIndex, result: scoreRole(player, role)
  })).sort((a, b) => (b.result.score ?? -1) - (a.result.score ?? -1)
    || b.result.coverage - a.result.coverage || a.sourceIndex - b.sourceIndex), [candidates, role]);

  return <section className="scout-role-compare" aria-label={t('Shortlist role comparison')}>
    <div className="scout-role-compare__heading">
      <h3>{t('Shortlist role comparison')}</h3>
      <label htmlFor="shortlist-role">{t('Compare for role')}
        <select id="shortlist-role" value={role.id} onChange={event => setRoleId(event.target.value)}>
          {ROLE_PROFILES.map(profile => <option value={profile.id} key={profile.id}>{t(profile.title)} · {profile.slot}</option>)}
        </select>
      </label>
    </div>
    <p className="module-disclaimer">{t('Each candidate is scored against the same observed role attributes. Scores require at least 65% weighted attribute coverage. Declared positions are shown separately and do not establish positional familiarity. Scores are provisional ManagerHub role-fit estimates, not CA/PA, transfer value or a signing verdict.')}</p>
    <div className="scout-role-compare__scroll">
      <table aria-label={t('Candidate role-fit ranking')}>
        <thead><tr>
          <th scope="col">{t('Rank')}</th>
          <th scope="col">{t('Candidate')}</th>
          <th scope="col">{t('Declared position')}</th>
          <th scope="col">{t('Role fit')}</th>
          <th scope="col">{t('Attribute coverage')}</th>
          <th scope="col">{t('Evidence')}</th>
          <th scope="col">{t('Report')}</th>
        </tr></thead>
        <tbody>{ranked.map(({ player, result }, index) => <tr key={player.id}>
          <td>{result.score === null ? '—' : index + 1}</td>
          <th scope="row">{player.name}</th>
          <td>{player.position ?? t('Unknown position')}</td>
          <td>{result.score === null ? t('Insufficient data') : `${result.score}/100`}</td>
          <td>{Math.round(result.coverage * 100)}%</td>
          <td><details>
            <summary>{t('Inspect role inputs')}</summary>
            <p>{t('Observed:')} {result.evidence.map(item => `${t(ATTRIBUTE_LABELS[item.attribute])} ${item.value} (${t('Role importance')}: ${item.weight})`).join(', ') || t('None')}</p>
            <p>{t('Missing:')} {result.missing.map(attribute => t(ATTRIBUTE_LABELS[attribute])).join(', ') || t('None')}</p>
          </details></td>
          <td><Button variant="quiet" onClick={() => onSelectPlayer(player.id)}>{t('View scouting report')}</Button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export default memo(ScoutRoleComparison);
