import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FEATURES, FEATURE_GROUPS } from '@managerhub/domain';
import { Icon, Status, Surface } from '@managerhub/ui';

function Systems() {
  const { t } = useTranslation();
  const [group, setGroup] = useState('All departments');
  const [query, setQuery] = useState('');
  const visible = FEATURES.filter(feature =>
    (group === 'All departments' || feature.group === group) &&
    [feature.title, feature.id, feature.group].some(value => value.toLowerCase().includes(query.toLowerCase())));
  return <div className="view-flow">
    <div className="page-title"><div className="mh-eyebrow">{t("THE FULL PRODUCT / 27 MODULES")}</div><h1>{t("Football Systems")}</h1><p>{t("Explore the features we're building. Some tools are ready to try, while others are still on the way.")}</p></div>
    <div className="module-toolbar"><label className="search-box"><Icon name="search" size={17}/><span className="visually-hidden">{t("Search modules")}</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search modules or ID…"/></label>
      <label className="select-label"><span className="visually-hidden">{t("Department filter")}</span><select value={group} onChange={e => setGroup(e.target.value)}><option value="All departments">{t("All departments")}</option>{FEATURE_GROUPS.map(s => <option value={s} key={s}>{t(s)}</option>)}</select></label>
    </div>
    <div className="module-count">{visible.length} / 27 {t('modules')}</div>
    <div className="module-grid">{visible.map(item => <Surface className="module-card" key={item.id}>
      <div className="module-card__top"><span className="module-id">{item.id}</span><span className="module-phase">{t('Phase')} {String(item.phase).padStart(2, '0')}</span></div>
      <h2>{t(item.title)}</h2><div className="module-card__bottom"><span>{t(item.group)}</span><Status tone={['MH-01','MH-02','MH-05','MH-06'].includes(item.id) ? 'info' : 'neutral'}>{t(['MH-01','MH-02','MH-05','MH-06'].includes(item.id) ? 'In development' : 'Planned')}</Status></div>
    </Surface>)}</div>
    {visible.length === 0 && <Surface className="empty-library"><h3>{t("No matching modules")}</h3><p>{t("Adjust the department filter or search term.")}</p></Surface>}
    <div className="reference-link"><Icon name="book" size={18}/><span>{t("Full specification and acceptance criteria:")}</span><a target="_blank" rel="noreferrer" href="https://github.com/vitoo16/ManagerHub/blob/main/docs/product/01-full-feature-catalog.md">{t("Feature Catalogue")} <Icon name="arrow" size={14}/></a></div>
  </div>;
}
export default memo(Systems);
