import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, SectionHeading, Status, Surface } from '@managerhub/ui';

function Architecture() {
  const { t } = useTranslation();
  return <div className="view-flow">
    <div className="page-title"><div className="mh-eyebrow">{t("TRANSPARENT BY DESIGN")}</div><h1>{t("Data & Trust")}</h1><p>{t("Here's how to tell the difference between numbers from Football Manager and scores calculated by ManagerHub.")}</p></div>
    <div className="trust-banner"><Icon name="shield" size={24}/><div><strong>{t("Read-only by default")}</strong><p>{t("Your original save remains untouched. A future editor will require independently verified compatibility, backups and full round-trip validation.")}</p></div><Status tone="positive">{t("Design policy")}</Status></div>
    <SectionHeading eyebrow={t("ARCHITECTURE")} title={t("Evidence flows in one direction")}/>
    <div className="architecture-path">{[
      { n: '01', title: 'Original save', detail: 'Selected locally, no automatic upload' },
      { n: '02', title: 'Versioned adapter', detail: 'Format identification and validated decoding' },
      { n: '03', title: 'Verified fields', detail: 'Source, edition, build and coverage preserved' },
      { n: '04', title: 'Football intelligence', detail: 'Explainable models with calibrated uncertainty' }
    ].map(item => <Surface key={item.n} className="architecture-node"><span>{item.n}</span><h3>{t(item.title)}</h3><p>{t(item.detail)}</p></Surface>)}</div>
    <SectionHeading eyebrow={t("METRIC INTEGRITY")} title={t("Different numbers. Different meanings.")}/>
    <div className="trust-metrics">
      {[
        { code: 'CA', title: 'Actual Current Ability', detail: 'A real game value only when decoded and independently verified.' },
        { code: 'eCA', title: 'Estimated Ability', detail: 'An explicitly labeled model estimate, not Sports Interactive’s algorithm.' },
        { code: 'RF', title: 'Role Fit', detail: 'A transparent product score assessing suitability for a tactical job.' },
        { code: 'PA', title: 'Potential Ability', detail: 'Only displayed when a compatible source verifies the real game value.' }
      ].map(item => <Surface className="metric-explainer" key={item.code}><span>{item.code}</span><div><h3>{t(item.title)}</h3><p>{t(item.detail)}</p></div></Surface>)}
    </div>
  </div>;
}
export default memo(Architecture);
