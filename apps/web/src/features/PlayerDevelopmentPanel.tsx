import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, evaluateDevelopmentScenario, getEditionRoles, type AttributeKey,
  type DevelopmentScenario, type PlayerExport } from '@managerhub/domain';
import { AttributeInput, AttributeValue, Button, Surface } from '@managerhub/ui';
import { DEFAULT_ROLE_TARGET, ROLE_DUTY_LABELS, RoleTargetSelector } from './RoleTargetSelector';
import { AbilityBudgetFields } from './AbilityBudgetFields';
import { ReportPagination, reportPage } from './ReportPagination';
import { DevelopmentScenarioLibrary } from './DevelopmentScenarioLibrary';

const emptyScenario = (): DevelopmentScenario => ({ target: DEFAULT_ROLE_TARGET, benchmark: 16, overrides: {}, locked: [] });
type Props = { readonly player: PlayerExport; readonly edition: string | null; readonly build: string | null; readonly sourceId: string };

function DevelopmentWorkbench({ player, edition, build, sourceId }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState<'A' | 'B'>('A');
  const [scenarios, setScenarios] = useState(() => ({ A: emptyScenario(), B: emptyScenario() }));
  const [page, setPage] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const scenario = scenarios[active];
  const results = useMemo(() => ({
    A: evaluateDevelopmentScenario(player, edition, build, scenarios.A),
    B: evaluateDevelopmentScenario(player, edition, build, scenarios.B)
  }), [player, edition, build, scenarios]);
  const result = results[active];
  const range = reportPage(result?.rows.length ?? 0, page, 8);
  const update = (next: DevelopmentScenario) => setScenarios(current => ({ ...current, [active]: next }));
  const edit = (key: AttributeKey, raw: string, current: number) => {
    if (!/^\d+$/u.test(raw)) return;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < current || value > 20) return;
    const overrides = { ...scenario.overrides };
    if (value === current) delete overrides[key];
    else overrides[key] = value;
    update({ ...scenario, overrides });
  };
  const toggleLock = (key: AttributeKey) => {
    const locked = scenario.locked.includes(key);
    const overrides = { ...scenario.overrides };
    if (!locked) delete overrides[key];
    update({ ...scenario, overrides, locked: locked ? scenario.locked.filter(item => item !== key) : [...scenario.locked, key] });
  };
  const score = (value: number | null | undefined) => value == null ? '—' : value + '/100';
  return <Surface className="scout-panel development-panel">
    <h3>{t('Role-based development')}</h3>
    <p className="module-disclaimer">{t('Manual what-if profiles only. These are not predicted future attributes or profiles proven feasible at a target CA. They never modify your draft or save.')}</p>
    {edition !== null && edition !== 'FM2013' ? <p role="status">{t('This edition has no development role reference.')}</p> : <>
      <AbilityBudgetFields edition={edition} build={build} ca={player.actualCa} pa={player.potentialAbility}/>
      <div className="save-db-actions" role="group" aria-label={t('Development scenario')}>
        {(['A','B'] as const).map(id => <Button key={id} type="button" aria-pressed={active === id}
          variant={active === id ? 'primary' : 'default'} onClick={() => { setActive(id); setPage(0); }}>{t('Scenario')} {id}</Button>)}
        <Button type="button" onClick={() => { update(emptyScenario()); setPage(0); }}>{t('Reset scenario')}</Button>
      </div>
      <details className="development-library-details" onToggle={event => setLibraryOpen(event.currentTarget.open)}>
        <summary>{t('Saved development scenarios')}</summary>
        {libraryOpen && <DevelopmentScenarioLibrary player={player} edition={edition} build={build} sourceId={sourceId} scenario={scenario} active={active}
          onRestore={next => { update(next); setPage(0); }}/>}
      </details>
      <RoleTargetSelector target={scenario.target} allowAutomatic={false} onChange={target => {
        update({ ...scenario, target, overrides: {}, locked: [] }); setPage(0);
      }}/>
      <label className="player-attribute-sort"><span>{t('Reference attribute level')}</span>
        <select value={scenario.benchmark} onChange={event => { update({ ...scenario, benchmark: Number(event.currentTarget.value) }); setPage(0); }}>
          {Array.from({ length: 20 }, (_, index) => index + 1).map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <p className="module-disclaimer">{t('Priority is role importance × remaining gap to your reference level. Edit observed values explicitly or lock them; missing values remain unknown. Changing role resets that scenario’s attribute assumptions.')}</p>
      {result && <>
        <div className="insight-line"><span>{t('Position familiarity')}</span><strong>{result.familiarity == null ? '—' : result.familiarity + '/20'}</strong></div>
        <div className="insight-line"><span>{t('Role fit before / after')}</span><strong>{score(result.before.score)} → {score(result.after.score)}</strong></div>
        <div className="insight-line"><span>{t('Attribute coverage')}</span><strong>{Math.round(result.before.coverage * 100)}%</strong></div>
        <div className="editor-diff-wrap"><table className="compare-table development-table" aria-label={t('Development attribute assumptions')}>
          <thead><tr><th scope="col">{t('Attributes')}</th><th scope="col">{t('Current')}</th><th scope="col">{t('Proposed')}</th><th scope="col">{t('Change')}</th><th scope="col">{t('Priority')}</th><th scope="col">{t('Lock')}</th></tr></thead>
          <tbody>{result.rows.slice(range.start, range.end).map(row => <tr key={row.key}>
            <th scope="row">{t(ATTRIBUTE_LABELS[row.key])}</th><td><AttributeValue value={row.current}/></td>
            <td><AttributeInput aria-label={t('Proposed') + ' ' + t(ATTRIBUTE_LABELS[row.key])} min={row.current ?? 1} max={20}
              value={row.proposed} disabled={row.current === null || row.locked}
              onChange={event => { if (row.current !== null) edit(row.key, event.currentTarget.value, row.current); }}/></td>
            <td>{row.change == null ? '—' : row.change > 0 ? '+' + row.change : '0'}</td><td>{row.priority ?? '—'}</td>
            <td><input type="checkbox" aria-label={t('Lock') + ' ' + t(ATTRIBUTE_LABELS[row.key])} checked={row.locked}
              disabled={row.current === null} onChange={() => toggleLock(row.key)}/></td>
          </tr>)}</tbody>
        </table></div>
        <ReportPagination label={t('Development attributes page')} range={range} onChange={setPage}/>
      </>}
      <h3>{t('Compare development paths')}</h3>
      <table className="compare-table" aria-label={t('Development scenario comparison')}>
        <thead><tr><th scope="col">{t('Scenario')}</th><th scope="col">{t('Target role')}</th><th scope="col">{t('Role fit before / after')}</th><th scope="col">{t('Changed attributes')}</th></tr></thead>
        <tbody>{(['A','B'] as const).map(id => <tr key={id}>
          <th scope="row">{id}</th><td>{t(getEditionRoles('FM2013').find(role => role.id === scenarios[id].target.roleId)?.nativeTitle ?? '')} · {scenarios[id].target.position} · {t(ROLE_DUTY_LABELS[scenarios[id].target.duty])}</td>
          <td>{score(results[id]?.before.score)} → {score(results[id]?.after.score)}</td><td>{results[id]?.changes ?? '—'}</td>
        </tr>)}</tbody>
      </table>
      <p className="module-disclaimer">{t('The scenarios may use different roles and attribute assumptions. Their scores do not prove equal CA cost. Scenarios reset when the source player changes or you leave this panel.')}</p>
    </>}
  </Surface>;
}

function PlayerDevelopmentPanel(props: Props) {
  const { player, edition, build, sourceId } = props;
  // Exact relevant source values bound to the local scenario; never retain stale assumptions.
  const revision = JSON.stringify([sourceId, player.id, edition, build, player.actualCa, player.potentialAbility,
    player.age, player.attributes, player.positions, player.leftFoot, player.rightFoot]);
  return <DevelopmentWorkbench key={revision} {...props}/>;
}
export default memo(PlayerDevelopmentPanel);
