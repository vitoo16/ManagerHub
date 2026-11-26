import { useTranslation } from 'react-i18next';
import { inspectAbilityBudget } from '@managerhub/domain';

export function AbilityBudgetFields({ edition, build, ca, pa, editor = false }: {
  readonly edition: string | null;
  readonly build: string | null;
  readonly ca: number | null | undefined;
  readonly pa: number | null | undefined;
  readonly editor?: boolean;
}) {
  const { t } = useTranslation();
  const budget = inspectAbilityBudget(edition, build, ca, pa);
  return <div className="ability-budget">
    {!editor && <>
      <div className="insight-line"><span>{t('Actual CA')}</span><strong>{ca ?? '—'}</strong></div>
      <div className="insight-line"><span>{t('Actual PA')}</span><strong>{pa ?? '—'}</strong></div>
    </>}
    <div className="insight-line"><span>{t('Recommended CA')}</span><strong>{t('Not verified')}</strong></div>
    <div className="insight-line"><span>{t('Remaining potential (PA − CA)')}</span><strong>{budget.remainingPotential ?? '—'}</strong></div>
    {!editor && <div className="insight-line"><span>{t('Remaining RCA budget')}</span><strong>—</strong></div>}
    {editor && <label className="player-attribute-sort"><input type="checkbox" checked={false} disabled readOnly/>{t('Auto match CA with RCA')}</label>}
    <p className="module-disclaimer">{t('RCA is unavailable until the exact game build has a certified model. No automatic CA or PA adjustment is made.')}</p>
  </div>;
}
