import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  assessSquadContribution, FORMATIONS, ROLE_PROFILES,
  type FormationId, type PlayerDataset, type PlayerExport
} from '@managerhub/domain';
import { Button, Icon, Status, Surface } from '@managerhub/ui';

type Props = { player: PlayerExport; dataset: PlayerDataset; onOpenSquad: () => void };
const FORMATION_OPTIONS = Object.keys(FORMATIONS) as FormationId[];

function RecruitmentPreviewPanel({ player, dataset, onOpenSquad }: Props) {
  const { t } = useTranslation();
  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const squadImpact = useMemo(
    () => assessSquadContribution(dataset.players, player.id, formation),
    [dataset.players, player.id, formation]
  );
  const coverageGaps = useMemo(
    () => squadImpact.baseline?.diagnostics.filter(item =>
      item.scoredCandidates === 0 || item.scoredCandidates < item.eligibleCandidates
    ) ?? [],
    [squadImpact.baseline]
  );
  const replacementGaps = useMemo(
    () => squadImpact.withoutPlayer?.diagnostics.filter(item =>
      item.scoredCandidates === 0 || item.scoredCandidates < item.eligibleCandidates
    ) ?? [],
    [squadImpact.withoutPlayer]
  );
  const assignedRole = useMemo(
    () => ROLE_PROFILES.find(role => role.id === squadImpact.assignment?.slot.roleId),
    [squadImpact.assignment?.slot.roleId]
  );

  return <Surface className="scout-panel">
    <div className="scout-panel__title">{t("Recruitment assessment")}</div>
    <div className="scouting-verdict">
      <h3>{t("Squad contribution preview")}</h3>
      <p>{t("Test whether this player helps complete the best-fit starting eleven using the same imported list as Squad Planner. This is a role-fit scenario, not a transfer recommendation or match prediction.")}</p>
      <label className="squad-editor-filter" htmlFor="recruitment-formation">{t("Formation to test")}
        <select id="recruitment-formation" value={formation} onChange={event => setFormation(event.target.value as FormationId)}>
          {FORMATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      {squadImpact.status === 'player-not-found' && <Status tone="warning">{t("This player is not part of the active export. Reopen the intended player list and try again.")}</Status>}
      {squadImpact.status === 'insufficient-data' && <>
        <Status tone="warning">{t("A complete starting eleven cannot be built from this list yet.")}</Status>
        <p>{t("The optimizer needs eleven distinct players with declared positions and enough exact role attributes. Unknown or masked values are not filled in.")}</p>
        {coverageGaps.length > 0 && <CoverageDiagnostics gaps={coverageGaps}/>}
      </>}
      {squadImpact.status === 'not-selected' && <>
        <Status tone="neutral">{t("Not selected in the best-fit XI")}</Status>
        <p>{t("The optimizer did not select this player for the highest-scoring complete eleven in this formation. This is not a judgement of overall quality; it reflects only declared positions and observed attributes.")}</p>
      </>}
      {squadImpact.status === 'required-for-complete-xi' && squadImpact.assignment && <>
        <Status tone="info">{t("Needed to complete the starting eleven")}</Status>
        <p>{t("Without this player, the current export cannot fill all eleven positions under the selected formation and data rules.")}</p>
        {replacementGaps.length > 0 && <CoverageDiagnostics gaps={replacementGaps}/>}
        <SelectedPosition assignment={squadImpact.assignment} roleTitle={assignedRole?.title}/>
      </>}
      {squadImpact.status === 'comparison-ready' && squadImpact.assignment && squadImpact.baseline && squadImpact.withoutPlayer && <>
        <Status tone="positive">{t("Included in the best-fit XI")}</Status>
        <SelectedPosition assignment={squadImpact.assignment} roleTitle={assignedRole?.title}/>
        <ContributionMetrics
          withPlayer={squadImpact.baseline.averageRoleScore}
          withoutPlayer={squadImpact.withoutPlayer.averageRoleScore}
          delta={squadImpact.roleFitDelta}
          changedSlots={squadImpact.changedSlots}
        />
        <p>{t("The difference compares the best complete XI with and without this player. It reflects this export and this formation only; it is not expected match performance or transfer value.")}</p>
      </>}
      <p>{t("A transfer verdict still needs the club's verified squad need, fee, wages, contract terms, registration and availability. Those details are not established by this player export, so ManagerHub will not label a transfer Buy or Pass yet.")}</p>
      <Button variant="primary" onClick={onOpenSquad}>{t("Open this roster in Squad Planner")} <Icon name="arrow" size={15}/></Button>
    </div>
  </Surface>;
}

type CoverageGap = { slot: { id: string; label: string }; scoredCandidates: number; eligibleCandidates: number };
const CoverageDiagnostics = memo(function CoverageDiagnostics({ gaps }: { gaps: readonly CoverageGap[] }) {
  const { t } = useTranslation();
  return <div className="squad-coverage-list" role="list" aria-label={t("Position data coverage")}>
    {gaps.map(item => <div role="listitem" key={item.slot.id}>
      <strong>{item.slot.label}</strong>
      <span>{t("{{scored}} of {{eligible}} eligible players", { scored: item.scoredCandidates, eligible: item.eligibleCandidates })}</span>
    </div>)}
  </div>;
});const SelectedPosition = memo(function SelectedPosition({ assignment, roleTitle }: {
  assignment: { slot: { label: string; roleId: string }; roleScore: number };
  roleTitle?: string;
}) {
  const { t } = useTranslation();
  return <p><strong>{t("Selected position:")}</strong> {assignment.slot.label} · {roleTitle ? t(roleTitle) : assignment.slot.roleId} · {t("Role fit")} {assignment.roleScore}/100</p>;
});const ContributionMetrics = memo(function ContributionMetrics({ withPlayer, withoutPlayer, delta, changedSlots }: {
  withPlayer: number | null;
  withoutPlayer: number | null;
  delta: number | null;
  changedSlots: number | null;
}) {
  const { t } = useTranslation();
  return <div className="scout-metrics">
    <div><span>{t("With this player")}</span><strong>{withPlayer ?? '—'}</strong><small>{t("Average role fit / 100")}</small></div>
    <div><span>{t("Without this player")}</span><strong>{withoutPlayer ?? '—'}</strong><small>{t("Best replacement XI")}</small></div>
    <div><span>{t("Role-fit difference")}</span><strong>{delta !== null && delta > 0 ? '+' : ''}{delta ?? '—'}</strong><small>{t("Points across the full XI")}</small></div>
    <div><span>{t("Changed positions")}</span><strong>{changedSlots ?? '—'}</strong><small>{t("When this player is excluded")}</small></div>
  </div>;
});export default memo(RecruitmentPreviewPanel);
