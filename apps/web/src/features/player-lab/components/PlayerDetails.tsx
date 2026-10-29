import { lazy, memo, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyzeRoles, attributeStrengthIndex, getAttributeInsights,
  type PlayerDataset, type PlayerExport
} from '@managerhub/domain';
import { Icon, Surface } from '@managerhub/ui';
import PlayerAbilitySummary from './PlayerAbilitySummary';
import PlayerIdentityHeader from './PlayerIdentityHeader';
import PlayerReportTabs, { type PlayerReportTab } from './PlayerReportTabs';

const AttributeRadar = lazy(() => import('./AttributeRadar'));
const RankedAttributes = lazy(() => import('./RankedAttributes'));
const RoleResults = lazy(() => import('./RoleResults'));
const PlayerCompare = lazy(() => import('./PlayerCompare'));
const RecruitmentPreviewPanel = lazy(() => import('./RecruitmentPreviewPanel'));

type Props = {
  player: PlayerExport;
  dataset: PlayerDataset;
  onOpenSquad: () => void;
};

function PlayerDetailsView({ player, dataset, onOpenSquad }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PlayerReportTab>('overview');

  const insights = useMemo(() => getAttributeInsights(player), [player]);
  const strength = useMemo(() => attributeStrengthIndex(player), [player]);
  const roles = useMemo(() => analyzeRoles(player), [player]);
  const topRole = roles.find(role => role.score !== null);

  return <section aria-label={t('Scouting report for') + ' ' + player.name}>
    <PlayerIdentityHeader player={player}/>
    <PlayerAbilitySummary strength={strength} topRole={topRole}/>
    <PlayerReportTabs active={tab} onChange={setTab}/>

    <div className="scout-tab-content" role="tabpanel">
      <Suspense fallback={<div className="player-empty-chart" role="status" aria-live="polite">{t("Loading…")}</div>}>
        {tab === 'overview' && <>
          <div className="scout-grid">
            <Surface className="scout-panel">
              <div className="scout-panel__title">{t("Attribute profile")} <span>{t("Native 1–20 mean")}</span></div>
              <AttributeRadar player={player}/>
            </Surface>
            <Surface className="scout-panel">
              <div className="scout-panel__title">{t("Strengths & development areas")}</div>
              {insights.strongest.length > 0
                ? <div className="insight-columns">
                    <div>
                      <h3>{t("Highest observed attributes")}</h3>
                      {insights.strongest.map(attribute => <div className="insight-line" key={attribute.key}>
                        <span>{t(attribute.label)}</span><strong>{attribute.value}</strong>
                      </div>)}
                    </div>
                    <div>
                      <h3>{t("Lowest observed attributes")}</h3>
                      {insights.weakest.map(attribute => <div className="insight-line" key={attribute.key}>
                        <span>{t(attribute.label)}</span><strong>{attribute.value}</strong>
                      </div>)}
                    </div>
                  </div>
                : <p className="module-disclaimer">{t("No exact attributes observed. Upload a view with technical, mental and physical columns.")}</p>}
              <div className="scout-note">{t("These are observed numerical extremes, not professional scouting verdicts. Role-specific demands and sample completeness matter.")}</div>
            </Surface>
          </div>
          <Surface className="scout-panel role-overview">
            <div className="scout-panel__title">{t("Role suitability ranking")} <span>{t("Heuristic · Explanation available under Role fit")}</span></div>
            <RoleResults player={player} roles={roles}/>
          </Surface>
        </>}
        {tab === 'attributes' && <Surface className="scout-panel">
          <div className="scout-panel__title">
            {t("Imported player attributes")} <span>{Object.keys(player.attributes).length} {t('values')} · {t('Source:')} {dataset.fileName}</span>
          </div>
          <RankedAttributes player={player}/>
        </Surface>}
        {tab === 'roles' && <Surface className="scout-panel">
          <div className="scout-panel__title">{t("Tactical roles by observed attributes")}</div>
          <RoleResults player={player} roles={roles}/>
        </Surface>}
        {tab === 'compare' && <PlayerCompare primary={player} dataset={dataset}/>}
        {tab === 'recruitment' && <RecruitmentPreviewPanel player={player} dataset={dataset} onOpenSquad={onOpenSquad}/>}
      </Suspense>
    </div>

    <div className="evidence-strip">
      <Icon name="shield" size={15}/>
      {t("This report uses your exported attributes. CA and PA remain unknown until verified.")}
    </div>
  </section>;
}

export default memo(PlayerDetailsView);
