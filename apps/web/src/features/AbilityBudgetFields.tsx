import { useTranslation } from 'react-i18next';
import { inspectAbilityBudget, type AbilityVisibility, type RcaPlayerInput, type RcaDiagnosticReport } from '@managerhub/domain';
import './player-development.css';

export function AbilityBudgetFields({ edition, build, ca, pa, playerContext = null, editor = false, visibility }: {
  readonly visibility: AbilityVisibility;
  readonly edition: string | null;
  readonly build: string | null;
  readonly ca: number | null | undefined;
  readonly pa: number | null | undefined;
  readonly playerContext?: Omit<RcaPlayerInput, 'actualCa' | 'potentialAbility'> | null;
  readonly editor?: boolean;
}) {
  const { t } = useTranslation();
  const budget = inspectAbilityBudget(edition, build, ca, pa, visibility, playerContext);
  const rca = budget.rcaDiagnostics;
  const signed = (v: number | null) => (v === null ? '—' : v > 0 ? `+${v}` : String(v));

  if (visibility !== 'editor') return null;
  return <div className="ability-budget">
    {!editor && <>
      <div className="insight-line"><span>{t('Actual CA')}</span><strong>{ca ?? '—'}</strong></div>
      <div className="insight-line"><span>{t('Actual PA')}</span><strong>{pa ?? '—'}</strong></div>
    </>}
    <div className="insight-line"><span>{t('Recommended CA')}</span><strong>{t('Not verified')}</strong></div>
    {rca && <RcaModelDisclosure report={rca}/>}
    {budget.advisoryRca !== null && <>
      <div className="insight-line">
        <span>{t('Advisory RCA (research profile)')}</span>
        <strong>
          {budget.advisoryRca}
          {rca?.selectedPosition ? ` (${rca.selectedPosition})` : ''}
        </strong>
      </div>
      {budget.caMinusAdvisoryRca !== null && (
        <div className="insight-line">
          <span>{t('CA − Advisory RCA')}</span>
          <strong>{signed(budget.caMinusAdvisoryRca)}</strong>
        </div>
      )}
    </>}
    <div className="insight-line"><span>{t('Remaining potential (PA − CA)')}</span><strong>{budget.remainingPotential ?? '—'}</strong></div>
    {!editor && <div className="insight-line"><span>{t('Remaining RCA budget')}</span><strong>—</strong></div>}
    {budget.exceedsPotentialAbility && (
      <p className="module-disclaimer" role="status">
        {t('Advisory RCA exceeds Potential Ability (PA). ManagerHub never raises PA automatically.')}
      </p>
    )}
    {rca?.foot && rca.foot.weakerFootRating !== null && (
      <div className="insight-line">
        <span>{t('Weaker foot RCA weight')}</span>
        <strong>{rca.foot.weakerFootRating}/20 · ×{rca.foot.weakerFootWeight}</strong>
      </div>
    )}
    {editor && <label className="player-attribute-sort"><input type="checkbox" checked={false} disabled readOnly/>{t('Auto match CA with RCA')}</label>}
    <p className="module-disclaimer">{t('Certified Recommended CA and Auto Match are unavailable. Advisory RCA is experimental; no automatic CA or PA adjustment is made.')}</p>
  </div>;
}

/** Shared model provenance and uncertainty, never rendered in restricted contexts. */
export function RcaModelDisclosure({ report, target = false }: { readonly report: RcaDiagnosticReport; readonly target?: boolean }) {
  const { t } = useTranslation();
  return <div className="rca-provenance">
    {!target && <div className="insight-line"><span>{t('Advisory model version')}</span><strong>{report.profile?.profileId ?? '—'}</strong></div>}
    <div className="insight-line"><span>{t(target ? 'Target RCA compatibility' : 'RCA compatibility')}</span><strong>{t(report.status)}</strong></div>
    <div className="insight-line"><span>{t(target ? 'Target RCA observed weight coverage' : 'RCA observed weight coverage')}</span><strong>{report.status === 'evaluated' || report.status === 'insufficient-attributes' ? Math.round(report.observedWeightCoverage * 100) + '%' : '—'}</strong></div>
    {report.status === 'evaluated' && <div className="insight-line"><span>{t('RCA position basis')}</span><strong>{t(report.positionSelectionBasis)}</strong></div>}
    {report.candidateScores[0]?.isFallbackMapping && <p className="module-disclaimer">{t('Sweeper uses an unverified central defender reference mapping.')}</p>}
    {!target && <p className="module-disclaimer">{t(report.profile?.edition === 'FM2013'
      ? 'FM2013 historical affine coefficients with FMRTE 26 reference weights (24.4.0.35). Accuracy and prediction intervals have not been independently reproduced.'
      : 'No validated edition-specific RCA calibration is available.')}</p>}
  </div>;
}
