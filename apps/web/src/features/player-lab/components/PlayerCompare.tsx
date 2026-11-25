import { memo, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_LABELS, analyzeRoles, type AttributeKey, type PlayerDataset, type PlayerExport } from '@managerhub/domain';
import { AttributeValue, getAttributeTier, SectionTabs, Surface } from '@managerhub/ui';
import { ReportPagination, reportPage } from '../../ReportPagination';

const SECTIONS = [{ id: 'attributes', label: 'Attributes' }, { id: 'roles', label: 'Role fit' }] as const;
type CompareSection = typeof SECTIONS[number]['id'];

function PlayerCompare({ primary, dataset }: { primary: PlayerExport; dataset: PlayerDataset }) {
  const { t } = useTranslation();
  const id = useId();
  const [section, setSection] = useState<CompareSection>('attributes');
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [candidateId, setCandidateId] = useState(() => dataset.players.find(player => player.id !== primary.id)?.id ?? '');
  const deferredQuery = useDeferredValue(query);
  const searchIndex = useMemo(() => dataset.players.map(player => ({
    player, text: [player.name, player.club, player.position].map(value => value?.toLowerCase() ?? '').join(' ')
  })), [dataset.players]);
  const options = useMemo(() => {
    const matching: PlayerExport[] = [];
    const normalized = deferredQuery.trim().toLowerCase();
    for (const entry of searchIndex) {
      if (entry.player.id !== primary.id && entry.text.includes(normalized)) matching.push(entry.player);
      if (matching.length === 30) break;
    }
    return matching;
  }, [searchIndex, primary.id, deferredQuery]);
  const other = useMemo(() => dataset.players.find(player => player.id === candidateId && player.id !== primary.id) ?? null,
    [dataset.players, candidateId, primary.id]);
  const sorted = useMemo(() => {
    if (section !== 'attributes' || !other) return [];
    return (Object.keys(primary.attributes) as AttributeKey[]).filter(key =>
      getAttributeTier(primary.attributes[key]) !== undefined && getAttributeTier(other.attributes[key]) !== undefined
    ).sort((a, b) => Math.abs(primary.attributes[b]! - other.attributes[b]!) -
      Math.abs(primary.attributes[a]! - other.attributes[a]!));
  }, [primary.attributes, other, section]);
  const ownRoles = useMemo(() => section === 'roles' && other ? analyzeRoles(primary) : [], [section, primary, other]);
  const otherRoles = useMemo(() => section === 'roles' && other ? new Map(analyzeRoles(other).map(role => [role.id, role])) : new Map<string, ReturnType<typeof analyzeRoles>[number]>(), [section, other]);
  const range = reportPage(sorted.length, page, 12);

  useEffect(() => {
    if (!other) setCandidateId(dataset.players.find(player => player.id !== primary.id)?.id ?? '');
  }, [dataset.players, primary.id, other]);

  return <Surface className="scout-panel">
    <div className="scout-panel__title">{t('Head-to-head analysis')} <span>{t('Same import · Native attributes only')}</span></div>
    <p className="module-disclaimer">{t('Compare observed attributes and product-authored role-fit estimates. Game CA/PA, transfer value, actual positional familiarity and scouting certainty are not part of this comparison.')}</p>
    <div className="compare-selector">
      <label htmlFor={id + '-search'}>{t('Search comparison players')}</label>
      <input id={id + '-search'} placeholder={t('Type a player or club name…')} value={query} onChange={event => setQuery(event.currentTarget.value)}/>
      <label htmlFor={id + '-player'}>{t('Comparison player')}</label>
      <select id={id + '-player'} value={candidateId} disabled={query !== deferredQuery}
        onChange={event => { setCandidateId(event.currentTarget.value); setPage(0); }}>
        {other && !options.some(player => player.id === other.id) && <option value={other.id}>{other.name}</option>}
        {options.map(player => <option key={player.id} value={player.id}>{player.name}{player.club ? ' · ' + player.club : ''}</option>)}
      </select>
      <small>{t('Showing up to 30 matching players; identities exist only within this export.')}</small>
    </div>
    {other ? <div className="compare-results">
      <SectionTabs<CompareSection> id={id} label={t('Comparison sections')}
        items={SECTIONS.map(item => ({ ...item, label: t(item.label) }))}
        active={section} onChange={setSection}/>
      <div role="tabpanel" id={id + '-panel'} aria-labelledby={id + '-tab-' + section}>
        {section === 'attributes' ? <>
          <h3>{t('Largest observed attribute differences')}</h3>
          {sorted.length ? <>
            <table className="compare-table" aria-label={t('Observed player attribute comparisons')}>
              <thead><tr><th scope="col">{t('Attributes')}</th><th scope="col">{primary.name}</th><th scope="col">{other.name}</th></tr></thead>
              <tbody>{sorted.slice(range.start, range.end).map(key => <tr key={key}>
                <th scope="row">{t(ATTRIBUTE_LABELS[key])}</th>
                <td><AttributeValue value={primary.attributes[key]}/></td>
                <td><AttributeValue value={other.attributes[key]}/></td>
              </tr>)}</tbody>
            </table>
            <ReportPagination label={t('Attribute comparison page')} range={range} onChange={setPage}/>
          </> : <p className="module-disclaimer">{t('These two exports have no matching exact attributes. A numerical comparison would be misleading.')}</p>}
        </> : <>
          <h3>{t('Role score comparison')}</h3>
          <table className="compare-table" aria-label={t('Role fit comparisons')}>
            <thead><tr><th scope="col">{t('Role fit')}</th><th scope="col">{primary.name}</th><th scope="col">{other.name}</th></tr></thead>
            <tbody>{ownRoles.map(role => {
              const candidate = otherRoles.get(role.id);
              return <tr key={role.id}><th scope="row">{t(role.title)}</th>
                <td className={role.score !== null && typeof candidate?.score === 'number' && role.score > candidate.score ? 'compare-leading' : ''}>{role.score ?? '—'}</td>
                <td className={role.score !== null && typeof candidate?.score === 'number' && candidate.score > role.score ? 'compare-leading' : ''}>{candidate?.score ?? '—'}</td>
              </tr>;
            })}</tbody>
          </table>
        </>}
      </div>
    </div> : <p className="player-empty-chart">{t('Import at least two players to compare their attributes and role estimates.')}</p>}
  </Surface>;
}
export default memo(PlayerCompare);
