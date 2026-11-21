import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  assessScoutClubScenario, FORMATIONS, ROLE_PROFILES,
  type FormationId, type PlayerExport, type SquadSolution
} from '@managerhub/domain';

type Props = {
  players: readonly PlayerExport[];
  candidates: readonly PlayerExport[];
};

const formationOptions = Object.keys(FORMATIONS) as FormationId[];

function ScoutClubScenario({ players, candidates }: Props) {
  const { t } = useTranslation();
  const [club, setClub] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const clubs = useMemo(() => [...new Set(players.flatMap(player => player.club ? [player.club] : []))]
    .sort((a, b) => a.localeCompare(b)), [players]);
  const validCandidateId = candidates.some(candidate => candidate.id === candidateId) ? candidateId : '';
  const scenario = useMemo(() => club && validCandidateId
    ? assessScoutClubScenario(players, club, validCandidateId, formation) : null,
    [players, club, validCandidateId, formation]);
  const role = ROLE_PROFILES.find(item => item.id === scenario?.candidateAssignment?.slot.roleId);

  return <section className="scout-club-scenario" aria-label={t('Club-group recruitment scenario')}>
    <h3>{t('Club-group recruitment scenario')}</h3>
    <p className="module-disclaimer">{t('Select an observed Club group and an outside candidate from this same export. ManagerHub recomputes a hypothetical best-fit XI using declared positions and observed attributes. The export may omit club players or transfers. Fitness, fees, wages and registration are unknown.')}</p>
    {clubs.length === 0 ? <p>{t('No Club values were observed in this export. A club-group comparison is unavailable.')}</p> : <>
      <div className="scout-club-scenario__selectors">
        <label htmlFor="scout-club">{t('Observed club group')}
          <select id="scout-club" value={clubs.includes(club) ? club : ''} onChange={event => setClub(event.target.value)}>
            <option value="">{t('Choose a club group')}</option>
            {clubs.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label htmlFor="scout-club-candidate">{t('Shortlisted candidate')}
          <select id="scout-club-candidate" value={validCandidateId} onChange={event => setCandidateId(event.target.value)}>
            <option value="">{t('Choose a candidate')}</option>
            {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.club ?? t('Unknown club')}</option>)}
          </select>
        </label>
        <label htmlFor="scout-club-formation">{t('Formation to test')}
          <select id="scout-club-formation" value={formation} onChange={event => setFormation(event.target.value as FormationId)}>
            {formationOptions.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {scenario && <div className="scout-club-scenario__results" role="status" aria-live="polite">
        <p>{t('{{count}} players observed for this club group', { count: scenario.clubPlayerCount })}</p>
        {scenario.status === 'already-in-club' && <p>{t('This candidate already belongs to the selected observed club group.')}</p>}
        {scenario.status === 'candidate-club-unknown' && <p>{t('The candidate has no observed Club value, so their group membership is unknown.')}</p>}
        {scenario.status === 'candidate-not-found' && <p>{t('This candidate is unavailable in the active export.')}</p>}
        {scenario.status === 'club-not-found' && <p>{t('The selected club group is unavailable in this export.')}</p>}
        {scenario.status === 'incomplete-xi' && <>
          <p>{t('The observed club group plus this candidate cannot form a complete eligible XI for this formation.')}</p>
          <SlotCoverage solution={scenario.after}/>
        </>}
        {scenario.status === 'fills-xi-gap' && <>
          <p>{t('Adding this candidate makes a complete best-fit XI possible from the observed group.')}</p>
          <Assignment assignment={scenario.candidateAssignment} roleTitle={role?.title}/>
          <p>{t('The original club-group XI was incomplete, so no average score difference is available.')}</p>
        </>}
        {scenario.status === 'not-selected' && <p>{t('The candidate does not enter the best-fit XI for this observed club group and formation.')}</p>}
        {scenario.status === 'changes-xi' && <>
          <p>{t('The candidate enters the hypothetical best-fit XI.')}</p>
          <Assignment assignment={scenario.candidateAssignment} roleTitle={role?.title}/>
          <p>{t('Previous player in this slot')}: {scenario.previousAssignment?.name ?? '—'}</p>
        </>}
        {scenario.before?.complete && scenario.after?.complete && <div className="scout-club-scenario__metrics">
          <span>{t('XI average before')}: <strong>{scenario.before.averageRoleScore}/100</strong></span>
          <span>{t('XI average after')}: <strong>{scenario.after.averageRoleScore}/100</strong></span>
          <span>{t('Role-fit difference')}: <strong>{scenario.roleFitDelta !== null && scenario.roleFitDelta > 0 ? '+' : ''}{scenario.roleFitDelta}</strong></span>
          <span>{t('Changed positions')}: <strong>{scenario.changedSlots}</strong></span>
        </div>}
      </div>}
    </>}
    <p className="module-disclaimer">{t('This is a source-bound hypothetical role-fit comparison, not confirmed club need, a transfer offer, a signing recommendation or match performance. No external player identity or native CA/PA is inferred.')}</p>
  </section>;
}

function Assignment({ assignment, roleTitle }: {
  assignment: NonNullable<ReturnType<typeof assessScoutClubScenario>['candidateAssignment']> | null;
  roleTitle?: string;
}) {
  const { t } = useTranslation();
  return assignment && <p>{t('Selected position:')} <strong>{assignment.slot.label}</strong> · {roleTitle ? t(roleTitle) : assignment.slot.roleId} · {t('Role fit')} {assignment.roleScore}/100</p>;
}

function SlotCoverage({ solution }: { solution: SquadSolution | null }) {
  const { t } = useTranslation();
  const gaps = solution?.diagnostics.filter(item => item.scoredCandidates === 0 || item.scoredCandidates < item.eligibleCandidates) ?? [];
  return gaps.length > 0 && <ul>{gaps.map(item => <li key={item.slot.id}>
    {item.slot.label} · {t('{{scored}} of {{eligible}} eligible players', { scored: item.scoredCandidates, eligible: item.eligibleCandidates })}
  </li>)}</ul>;
}

export default memo(ScoutClubScenario);
