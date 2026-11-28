import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@managerhub/ui';
import { diagnoseTacticalScenario, analyzeRoleInteractions, isRoleAdjustmentId,
  type TacticalDiagnosticId, type RoleInteractionFinding } from '@managerhub/domain';

interface SharedProps {
  readonly busy: boolean;
  readonly canUndo: boolean;
  readonly undoAdjustment: () => void;
}

interface ShapeProps extends SharedProps {
  readonly report: ReturnType<typeof diagnoseTacticalScenario>;
  readonly applyAdjustment: (id: TacticalDiagnosticId) => void;
}
interface RoleProps extends SharedProps {
  readonly roleInteractions: ReturnType<typeof analyzeRoleInteractions>;
  readonly applyRoleAdjustment: (finding: RoleInteractionFinding) => void;
}

export const TacticalShapeReport = memo(function TacticalShapeReport({ report, busy, canUndo, undoAdjustment, applyAdjustment }: ShapeProps) {
  const { t } = useTranslation();
  return <section className="tactical-lab__diagnostics" aria-label={t('Tactical diagnostics')}>
          <h3>{t('Tactical diagnostics')}</h3>
          <p className="tactical-lab__diagnostic-summary" role="status">
            {report.lineupEvidence === 'incomplete-xi'
              ? t('Complete XI needed for shape diagnostics')
              : report.diagnostics.length === 0
                ? t('No shape risks detected by these rules')
                : t('{{count}} tactical cautions', { count: report.diagnostics.length })}
          </p>
          {report.diagnostics.length > 0 && <ul className="tactical-lab__diagnostic-list">
            {report.diagnostics.map(item => <li key={item.id} className="tactical-lab__diagnostic">
              <strong>{t(item.title)}</strong>
              <p><b>{t('Why flagged')}</b> {t(item.trigger)}</p>
              <p><b>{t('Consider')}</b> {t(item.adjustment)}</p>
              <p><b>{t('Limit')}</b> {t(item.limitation)}</p>
              {item.id !== 'incomplete-xi' && <Button variant="quiet" disabled={busy}
                aria-label={t('Apply suggested adjustment to {{finding}}', { finding: t(item.title) })}
                onClick={() => applyAdjustment(item.id)}>{t('Apply suggested adjustment')}</Button>}
            </li>)}
          </ul>}
          {canUndo && <Button variant="quiet" disabled={busy}
            onClick={undoAdjustment}>{t('Undo last tactical adjustment')}</Button>}
          <p className="tactical-lab__diagnostic-provenance">{t('Rule set {{version}}. These checks use manager-authored positions and instructions, and cannot predict match outcomes.', { version: report.model })}</p>
        </section>;
});

export const TacticalRoleReport = memo(function TacticalRoleReport({ roleInteractions, busy, canUndo, undoAdjustment, applyRoleAdjustment }: RoleProps) {
  const { t } = useTranslation();
  return <section className="tactical-lab__diagnostics" aria-label={t('Role partnerships')}>
          <h3>{t('Role partnerships')}</h3>
          <p className="tactical-lab__diagnostic-summary" role="status">
            {roleInteractions.status === 'incomplete-xi'
              ? t('Complete XI needed for role partnership checks')
              : roleInteractions.findings.length === 0
                ? t('No role interaction findings under these bounded rules')
                : t('Role interaction findings: {{count}}', { count: roleInteractions.findings.length })}
          </p>
          {roleInteractions.findings.length > 0 && <ul className="tactical-lab__diagnostic-list">
              {roleInteractions.findings.map(finding => <li key={finding.id + '-' + finding.slotIds.join('-')} className="tactical-lab__diagnostic">
                <strong>{t(finding.title)}</strong>
                {finding.playerNames.length > 0 && <p>{t('Assigned players')}: {finding.playerNames.join(', ')}</p>}
                <p><b>{t('Why flagged')}</b> {t(finding.reason)}</p>
                <p><b>{t('Consider')}</b> {t(finding.suggestion)}</p>
                <p><b>{t('Limit')}</b> {t(finding.limitation)}</p>
                {isRoleAdjustmentId(finding.id) && (
                  <Button variant="quiet" disabled={busy}
                    aria-label={finding.id === 'uncovered-central-pivot'
                      ? t('Apply suggested adjustment to {{finding}}', { finding: t(finding.title) })
                      : t('Apply suggested adjustment to {{finding}} for {{players}}', {
                        finding: t(finding.title), players: finding.playerNames.join(', ')
                      })}
                    onClick={() => applyRoleAdjustment(finding)}>{t('Apply suggested adjustment')}</Button>
                )}
              </li>)}
            </ul>}
          {canUndo && <Button variant="quiet" disabled={busy}
            onClick={undoAdjustment}>{t('Undo last tactical adjustment')}</Button>}
          <p className="tactical-lab__diagnostic-provenance">{t('Role model {{version}} uses roles assigned by Squad Planner and manager-authored positions only, not native FM roles.', { version: roleInteractions.model })}</p>
        </section>;
});
