import { useTranslation } from 'react-i18next';
import { inspectAbilityBudget, type RcaPlayerInput } from '@managerhub/domain';
import './player-development.css';

export function AbilityBudgetFields({ edition, build, ca, pa, playerContext = null, editor = false }: {
  readonly edition: string | null;
  readonly build: string | null;
  readonly ca: number | null | undefined;
  readonly pa: number | null | undefined;
  readonly playerContext?: Omit<RcaPlayerInput, 'actualCa' | 'potentialAbility'> | null;
  readonly editor?: boolean;
}) {
  const { t } = useTranslation();
  const budget = inspectAbilityBudget(edition, build, ca, pa, playerContext);
  const rca = budget.rcaDiagnostics;
  const signed = (v: number | null) => (v === null ? '—' : v > 0 ? `+${v}` : String(v));

  return <div className="ability-budget">
    {!editor && <>
      <div className="insight-line"><span>{t('Actual CA')}</span><strong>{ca ?? '—'}</strong></div>
      <div className="insight-line"><span>{t('Actual PA')}</span><strong>{pa ?? '—'}</strong></div>
    </>}
    <div className="insight-line"><span>{t('Recommended CA')}</span><strong>{t('Not verified')}</strong></div>
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
    <p className="module-disclaimer">{t('RCA is unavailable until the exact game build has a certified model. No automatic CA or PA adjustment is made.')}</p>
  </div>;
}
