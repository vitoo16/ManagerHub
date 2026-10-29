import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  assessSquadContribution, FORMATIONS, ROLE_PROFILES,
  type FormationId, type PlayerDataset, type PlayerExport
} from '@managerhub/domain';
import { Button, Icon, Status, Surface } from '@managerhub/ui';
import { CoverageDiagnostics } from './CoverageDiagnostics';
import { ContributionMetrics } from './ContributionMetrics';

interface RecruitmentPreviewPanelProps {
  readonly player: PlayerExport;
  readonly dataset: PlayerDataset;
  readonly onOpenSquad: () => void;
}

/**
 * Lazy-loaded, same-export sensitivity analysis. It is deliberately isolated
 * from the general player report so the optimizer does not run until this tab
 * is opened.
 */
export const RecruitmentPreviewPanel = memo(function RecruitmentPreviewPanel({
  player, dataset, onOpenSquad
}: RecruitmentPreviewPanelProps) {
  const { t } = useTranslation();
  const [impactFormation, setImpactFormation] = useState<FormationId>('4-3-3');
  const squadImpact = useMemo(
    () => assessSquadContribution(dataset.players, player.id, impactFormation),
    [dataset.players, player.id, impactFormation]
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
  const assignedRole = ROLE_PROFILES.find(role => role.id === squadImpact.assignment?.slot.roleId);

  return <Surface className="scout-panel">
    <div className="scout-panel__title">{t("Recruitment assessment")}</div>
    <div className="scouting-verdict">
      <h3>{t("Squad contribution preview")}</h3>
      <p>{t("Test whether this player helps complete the best-fit starting eleven using the same imported list as Squad Planner. This is a role-fit scenario, not a transfer recommendation or match prediction.")}</p>
      <label className="squad-editor-filter" htmlFor="recruitment-formation">
        {t("Formation to test")}
        <select id="recruitment-formation" value={impactFormation}
          onChange={event => setImpactFormation(event.target.value as FormationId)}>
          {Object.keys(FORMATIONS).map(formation =>
            <option key={formation} value={formation}>{formation}</option>
          )}
        </select>
      </label>

      {squadImpact.status === 'player-not-found' && <Status tone="warning">
        {t("This player is not part of the active export. Reopen the intended player list and try again.")}
      </Status>}

      {squadImpact.status === 'insufficient-data' && <>
        <Status tone="warning">{t("A complete starting eleven cannot be built from this list yet.")}</Status>
        <p>{t("The optimizer needs eleven distinct players with declared positions and enough exact role attributes. Unknown or masked values are not filled in.")}</p>
        <CoverageDiagnostics entries={coverageGaps} label="Position data coverage"/>
      </>}

      {squadImpact.status === 'not-selected' && <>
        <Status tone="neutral">{t("Not selected in the best-fit XI")}</Status>
        <p>{t("The optimizer did not select this player for the highest-scoring complete eleven in this formation. This is not a judgement of overall quality; it reflects only declared positions and observed attributes.")}</p>
      </>}

      {squadImpact.status === 'required-for-complete-xi' && squadImpact.assignment && <>
        <Status tone="info">{t("Needed to complete the starting eleven")}</Status>
        <p>{t("Without this player, the current export cannot fill all eleven positions under the selected formation and data rules.")}</p>
        <CoverageDiagnostics entries={replacementGaps} label="Position data coverage"/>
        <p><strong>{t("Selected position:")}</strong> {squadImpact.assignment.slot.label} · {assignedRole ? t(assignedRole.title) : squadImpact.assignment.slot.roleId} · {t("Role fit")} {squadImpact.assignment.roleScore}/100</p>
      </>}

      {squadImpact.status === 'comparison-ready' && squadImpact.assignment && squadImpact.baseline && squadImpact.withoutPlayer && <>
        <Status tone="positive">{t("Included in the best-fit XI")}</Status>
        <p><strong>{t("Selected position:")}</strong> {squadImpact.assignment.slot.label} · {assignedRole ? t(assignedRole.title) : squadImpact.assignment.slot.roleId} · {t("Role fit")} {squadImpact.assignment.roleScore}/100</p>
        <ContributionMetrics
          withPlayer={squadImpact.baseline.averageRoleScore}
          withoutPlayer={squadImpact.withoutPlayer.averageRoleScore}
          roleFitDelta={squadImpact.roleFitDelta}
          changedSlots={squadImpact.changedSlots}
        />
        <p>{t("The difference compares the best complete XI with and without this player. It reflects this export and this formation only; it is not expected match performance or transfer value.")}</p>
      </>}

      <p>{t("A transfer verdict still needs the club's verified squad need, fee, wages, contract terms, registration and availability. Those details are not established by this player export, so ManagerHub will not label a transfer Buy or Pass yet.")}</p>
      <Button variant="primary" onClick={onOpenSquad}>
        {t("Open this roster in Squad Planner")} <Icon name="arrow" size={15}/>
      </Button>
    </div>
  </Surface>;
});

export default RecruitmentPreviewPanel;
