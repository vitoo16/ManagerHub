import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assessSquadContribution, FORMATIONS, ROLE_PROFILES, type FormationId, type PlayerDataset, type PlayerExport } from '@managerhub/domain';
import { Button, Icon, Status, Surface } from '@managerhub/ui';

type Props = { dataset: PlayerDataset; player: PlayerExport; onOpenSquad: () => void };

export const RecruitmentPreviewPanel = memo(function RecruitmentPreviewPanel({ dataset, player, onOpenSquad }: Props) {
  const { t } = useTranslation();
  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const assessment = useMemo(() => assessSquadContribution(dataset.players, player.id, formation), [dataset.players, player.id, formation]);
  const baselineGaps = assessment.baseline?.diagnostics.filter(item => item.scoredCandidates === 0 || item.scoredCandidates < item.eligibleCandidates) ?? [];
  const replacementGaps = assessment.withoutPlayer?.diagnostics.filter(item => item.scoredCandidates === 0 || item.scoredCandidates < item.eligibleCandidates) ?? [];
  const assignedRole = ROLE_PROFILES.find(role => role.id === assessment.assignment?.slot.roleId);

  return <Surface className="scout-panel">
    <div className="scout-panel__title">{t('Recruitment assessment')}</div>
    <div className="scouting-verdict">
      <h3>{t('Squad contribution preview')}</h3>
      <p>{t('Test whether this player helps complete the best-fit starting eleven using the same imported list as Squad Planner. This is a role-fit scenario, not a transfer recommendation or match prediction.')}</p>
      <label className="squad-editor-filter" htmlFor="recruitment-formation">{t('Formation to test')}
        <select id="recruitment-formation" value={formation} onChange={event => setFormation(event.target.value as FormationId)}>
          {Object.keys(FORMATIONS).map(id => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      {assessment.status === 'player-not-found' && <Status tone="warning">{t('This player is not part of the active export. Reopen the intended player list and try again.')}</Status>}
      {assessment.status === 'insufficient-data' && <>
        <Status tone="warning">{t('A complete starting eleven cannot be built from this list yet.')}</Status>
        <p>{t('The optimizer needs eleven distinct players with declared positions and enough exact role attributes. Unknown or masked values are not filled in.')}</p>
        <CoverageDiagnostics gaps={baselineGaps}/>
      </>}
      {assessment.status === 'not-selected' && <>
        <Status tone="neutral">{t('Not selected in the best-fit XI')}</Status>
        <p>{t('The optimizer did not select this player for the highest-scoring complete eleven in this formation. This is not a judgement of overall quality; it reflects only declared positions and observed attributes.')}</p>
      </>}
      {assessment.status === 'required-for-complete-xi' && assessment.assignment && <>
        <Status tone="info">{t('Needed to complete the starting eleven')}</Status>
        <p>{t('Without this player, the current export cannot fill all eleven positions under the selected formation and data rules.')}</p>
        <CoverageDiagnostics gaps={replacementGaps}/>
        <p><strong>{t('Selected position:')}</strong> {assessment.assignment.slot.label} · {assignedRole ? t(assignedRole.title) : assessment.assignment.slot.roleId} · {t('Role fit')} {assessment.assignment.roleScore}/100</p>
      </>}
      {assessment.status === 'comparison-ready' && assessment.assignment && assessment.baseline && assessment.withoutPlayer && <>
        <Status tone="positive">{t('Included in the best-fit XI')}</Status>
        <p><strong>{t('Selected position:')}</strong> {assessment.assignment.slot.label} · {assignedRole ? t(assignedRole.title) : assessment.assignment.slot.roleId} · {t('Role fit')} {assessment.assignment.roleScore}/100</p>
        <div className="scout-metrics">
          <div><span>{t('With this player')}</span><strong>{assessment.baseline.averageRoleScore}</strong><small>{t('Average role fit / 100')}</small></div>
          <div><span>{t('Without this player')}</span><strong>{assessment.withoutPlayer.averageRoleScore}</strong><small>{t('Best replacement XI')}</small></div>
          <div><span>{t('Role-fit difference')}</span><strong>{assessment.roleFitDelta !== null && assessment.roleFitDelta > 0 ? '+' : ''}{assessment.roleFitDelta}</strong><small>{t('Points across the full XI')}</small></div>
          <div><span>{t('Changed positions')}</span><strong>{assessment.changedSlots ?? '—'}</strong><small>{t('When this player is excluded')}</small></div>
        </div>
        <p>{t('The difference compares the best complete XI with and without this player. It reflects this export and this formation only; it is not expected match performance or transfer value.')}</p>
      </>}
      <p>{t("A transfer verdict still needs the club's verified squad need, fee, wages, contract terms, registration and availability. Those details are not established by this player export, so ManagerHub will not label a transfer Buy or Pass yet.")}</p>
      <Button variant="primary" onClick={onOpenSquad}>{t('Open this roster in Squad Planner')} <Icon name="arrow" size={15}/></Button>
    </div>
  </Surface>;
});

function CoverageDiagnostics({ gaps }: { gaps: readonly { slot: { id: string; label: string }; scoredCandidates: number; eligibleCandidates: number }[] }) {
  const { t } = useTranslation();
  if (!gaps.length) return null;
  return <div className="squad-coverage-list" role="list" aria-label={t('Position data coverage')}>
    {gaps.map(item => <div role="listitem" key={item.slot.id}><strong>{item.slot.label}</strong><span>{t('{{scored}} of {{eligible}} eligible players', { scored: item.scoredCandidates, eligible: item.eligibleCandidates })}</span></div>)}
  </div>;
}
