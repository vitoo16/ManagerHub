import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  assessScoutClubScenario, ATTRIBUTE_LABELS, compareScoutCandidatesForSlot, FORMATIONS, ROLE_PROFILES,
  type FormationId, type PlayerExport, type ScoutSlotCandidateStatus, type SquadSolution
} from '@managerhub/domain';

type Props = {
  players: readonly PlayerExport[];
  candidates: readonly PlayerExport[];
};

const formationOptions = Object.keys(FORMATIONS) as FormationId[];
const slotStatusLabels: Record<ScoutSlotCandidateStatus, string> = {
  'candidate-not-found': 'This candidate is unavailable in the active export.',
  'club-not-found': 'The selected club group is unavailable in this export.',
  'candidate-club-unknown': 'The candidate has no observed Club value, so their group membership is unknown.',
  'already-in-club': 'This candidate already belongs to the selected observed club group.',
  'position-ineligible': 'Declared position is ineligible',
  'insufficient-attributes': 'Insufficient data',
  eligible: 'Role fit'
};

function ScoutClubScenario({ players, candidates }: Props) {
  const { t } = useTranslation();
  const [club, setClub] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const [slotId, setSlotId] = useState('st');
  const clubs = useMemo(() => [...new Set(players.flatMap(player => player.club ? [player.club] : []))]
    .sort((a, b) => a.localeCompare(b)), [players]);
  const validClub = clubs.includes(club) ? club : '';
  const validSlotId = FORMATIONS[formation].find(slot => slot.id === slotId)?.id ?? 'gk';
  const validCandidateId = candidates.some(candidate => candidate.id === candidateId) ? candidateId : '';
  const scenario = useMemo(() => validClub && validCandidateId
    ? assessScoutClubScenario(players, validClub, validCandidateId, formation) : null,
    [players, validClub, validCandidateId, formation]);
  const slotNeed = useMemo(() => validClub
    ? compareScoutCandidatesForSlot(players, validClub, formation, validSlotId,
      candidates.map(candidate => candidate.id), validCandidateId)
    : null, [players, validClub, formation, validSlotId, candidates, validCandidateId]);
  const role = ROLE_PROFILES.find(item => item.id === scenario?.candidateAssignment?.slot.roleId);

  return <section className="scout-club-scenario" aria-label={t('Club-group recruitment scenario')}>
    <h3>{t('Club-group recruitment scenario')}</h3>
    <p className="module-disclaimer">{t('Select an observed Club group and an outside candidate from this same export. ManagerHub recomputes a hypothetical best-fit XI using declared positions and observed attributes. The export may omit club players or transfers. Fitness, fees, wages and registration are unknown.')}</p>
    {clubs.length === 0 ? <p>{t('No Club values were observed in this export. A club-group comparison is unavailable.')}</p> : <>
      <div className="scout-club-scenario__selectors">
        <label htmlFor="scout-club">{t('Observed club group')}
          <select id="scout-club" value={validClub} onChange={event => setClub(event.target.value)}>
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
      {slotNeed && <section className="scout-slot-need" aria-label={t('Shortlist comparison by squad slot')}>
        <div className="scout-slot-need__heading">
          <h4>{t('Shortlist comparison by squad slot')}</h4>
          <label htmlFor="scout-need-slot">{t('Selected position:')}
            <select id="scout-need-slot" value={validSlotId} onChange={event => setSlotId(event.target.value)}>
              {FORMATIONS[formation].map(slot => <option key={slot.id} value={slot.id}>
                {slot.label} · {t(ROLE_PROFILES.find(role => role.id === slot.roleId)?.title ?? slot.roleId)}
              </option>)}
            </select>
          </label>
        </div>
        <p>{t('Observed incumbent')}: <strong>{slotNeed.incumbent
          ? `${slotNeed.incumbent.name} · ${slotNeed.incumbent.roleScore}/100`
          : t('No complete observed XI for this formation')}</strong></p>
        {slotNeed.internalDepth && <section className="scout-slot-depth" aria-label={t('Best replacement XI')}>
          <h5>{t('Best replacement XI')}</h5>
          <p>{t('When this player is excluded')}: <strong>{slotNeed.incumbent?.name}</strong></p>
          {slotNeed.internalDepth.withoutIncumbent.complete ? <>
            <p>{t('Selected position:')} <strong>
              {slotNeed.slot?.label} · {slotNeed.internalDepth.replacement?.name} · {slotNeed.internalDepth.replacement?.roleScore}/100
            </strong></p>
            <div className="scout-club-scenario__metrics">
              <span>{t('Role-fit difference')}: <strong>
                {slotNeed.internalDepth.averageRoleFitDelta !== null && slotNeed.internalDepth.averageRoleFitDelta > 0 ? '+' : ''}
                {slotNeed.internalDepth.averageRoleFitDelta}
              </strong></span>
              <span>{t('Changed positions')}: <strong>{slotNeed.internalDepth.changedSlots}</strong></span>
            </div>
          </> : <p>{t('Without this player, the current export cannot fill all eleven positions under the selected formation and data rules.')}</p>}
        </section>}
        {slotNeed.candidateDepthTrial && <section className="scout-slot-depth" aria-label={`${t('Try in XI')} · ${t('Without this player')}`}>
          <h5>{t('Try in XI')} · {t('Without this player')}</h5>
          <p>{t('When this player is excluded')}: <strong>{slotNeed.incumbent?.name}</strong></p>
          {slotNeed.candidateDepthTrial.withCandidate.complete ? <>
            {slotNeed.candidateDepthTrial.candidateAssignment ? <p>
              {t('The candidate enters the hypothetical best-fit XI.')} <strong>
                {slotNeed.candidateDepthTrial.candidateAssignment.name} · {slotNeed.candidateDepthTrial.candidateAssignment.slot.label}
              </strong>
            </p> : <p>{t('The candidate does not enter the best-fit XI for this observed club group and formation.')}</p>}
            {slotNeed.internalDepth?.withoutIncumbent.complete ? <div className="scout-club-scenario__metrics">
              <span>{t('Role-fit difference')}: <strong>
                {slotNeed.candidateDepthTrial.averageRoleFitDelta !== null && slotNeed.candidateDepthTrial.averageRoleFitDelta > 0 ? '+' : ''}
                {slotNeed.candidateDepthTrial.averageRoleFitDelta}
              </strong></span>
              <span>{t('Changed positions')}: <strong>{slotNeed.candidateDepthTrial.changedSlots}</strong></span>
            </div> : <p>{t('Adding this candidate makes a complete best-fit XI possible from the observed group.')}</p>}
          </> : <p>{t('Without this player, the current export cannot fill all eleven positions under the selected formation and data rules.')}</p>}
        </section>}
        {slotNeed.candidates.length === 0 ? <p>{t('No candidates selected. Choose a player from the list, then add them here.')}</p> :
          <div className="scout-slot-need__scroll"><table aria-label={t('Candidate role-fit ranking')}>
            <thead><tr>
              <th scope="col">{t('Candidate')}</th>
              <th scope="col">{t('Declared position')}</th>
              <th scope="col">{t('Role fit')}</th>
              <th scope="col">{t('Difference vs reference')}</th>
              <th scope="col">{t('Evidence')}</th>
              <th scope="col">{t('Try in XI')}</th>
            </tr></thead>
            <tbody>{slotNeed.candidates.map(candidate => <tr key={candidate.candidateId}>
              <th scope="row">{candidate.name}<small>{candidate.club ?? t('Unknown club')}</small></th>
              <td>{candidate.position ?? '—'}</td>
              <td>{candidate.roleFit === null ? <>{t(slotStatusLabels[candidate.status])}
                {candidate.coverage !== null && <small>{t('Attribute coverage')} {Math.round(candidate.coverage * 100)}%</small>}
              </> : <>
                {candidate.roleFit}/100 <small>{t('Attribute coverage')} {Math.round((candidate.coverage ?? 0) * 100)}%</small>
              </>}</td>
              <td>{candidate.differenceFromIncumbent === null ? '—'
                : `${candidate.differenceFromIncumbent > 0 ? '+' : ''}${candidate.differenceFromIncumbent} ${t('pts')}`}</td>
              <td>{candidate.coverage === null ? '—' : <details>
                <summary>{t('Inspect role inputs')}</summary>
                <p>{t('Observed:')} {candidate.evidence.map(item => `${t(ATTRIBUTE_LABELS[item.attribute])} ${item.value}/20 (×${item.weight})`).join(', ') || '—'}</p>
                <p>{t('Missing:')} {candidate.missing.map(item => t(ATTRIBUTE_LABELS[item])).join(', ') || '—'}</p>
              </details>}</td>
              <td><button type="button" className="mh-button" disabled={candidate.status !== 'eligible'}
                onClick={() => setCandidateId(candidate.candidateId)}>{t('Try in XI')}</button></td>
            </tr>)}</tbody>
          </table></div>}
      </section>}
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
