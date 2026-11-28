import { lazy, memo, Suspense, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyzeRoles, attributeStrengthIndex, getAttributeInsights,
  type PlayerDataset, type PlayerExport
} from '@managerhub/domain';
import { AttributeValue, Button, Icon, Surface } from '@managerhub/ui';
import PlayerAbilitySummary from './PlayerAbilitySummary';
import PlayerIdentityHeader from './PlayerIdentityHeader';
import PlayerReportTabs, { type PlayerReportTab } from './PlayerReportTabs';

const PlayerAttributeSummary = lazy(() => import('./PlayerAttributeSummary'));
const PlayerAttributeTable = lazy(() => import('../../PlayerAttributeTable'));
const PlayerContractProfile = lazy(() => import('./PlayerContractProfile'));
const PlayerHiddenProfile = lazy(() => import('./PlayerHiddenProfile'));
const RoleResults = lazy(() => import('./RoleResults'));
const PlayerCompare = lazy(() => import('./PlayerCompare'));
const PlayerDevelopmentPanel = lazy(() => import('../../PlayerDevelopmentPanel'));
const RecruitmentPreviewPanel = lazy(() => import('./RecruitmentPreviewPanel'));

type Props = {
  player: PlayerExport;
  dataset: PlayerDataset;
  onOpenSquad: () => void;
  onEditPlayer?: (playerUid: number) => void;
};

function PlayerDetailsView({ player, dataset, onOpenSquad, onEditPlayer }: Props) {
  const { t } = useTranslation();
  const sectionId = useId();
  const [tab, setTab] = useState<PlayerReportTab>('overview');

  const insights = useMemo(() => getAttributeInsights(player), [player]);
  const strength = useMemo(() => attributeStrengthIndex(player), [player]);
  const roles = useMemo(() => analyzeRoles(player), [player]);
  const topRole = roles.find(role => role.score !== null);
  const isDecoded = dataset.source === 'decoded_save';
  const isEditorMode = isDecoded && dataset.saveMode === 'editor';
  const activeTab = !isDecoded && (tab === 'profile' || tab === 'hidden') ? 'overview' : tab;

  return <section aria-label={t('Scouting report for') + ' ' + player.name}>
    <PlayerIdentityHeader player={player}/>
    {isEditorMode && player.nativeId !== undefined && onEditPlayer && (
      <div className="save-db-actions" style={{ marginBottom: 12 }}>
        <Button type="button" variant="primary" onClick={() => onEditPlayer(player.nativeId!)}>
          {t('Edit player')}
        </Button>
      </div>
    )}
    <PlayerAbilitySummary strength={strength} topRole={topRole} player={player} dataset={dataset}/>
    <PlayerReportTabs id={sectionId} active={activeTab} onChange={setTab} isDecoded={isDecoded}/>

    <div className="scout-tab-content" role="tabpanel" id={sectionId + '-panel'} aria-labelledby={sectionId + '-tab-' + activeTab}>
      <Suspense key={activeTab} fallback={<div className="player-empty-chart" role="status" aria-live="polite">{t("Loading…")}</div>}>
        {activeTab === 'overview' && <>
          <div className="scout-grid">
            <Surface className="scout-panel">
              <div className="scout-panel__title">{t("Attribute profile")} <span>{t("Native 1–20 mean")}</span></div>
              <PlayerAttributeSummary player={player}/>
            </Surface>
            <Surface className="scout-panel">
              <div className="scout-panel__title">{t("Strengths & development areas")}</div>
              {insights.strongest.length > 0
                ? <div className="insight-columns">
                    <div>
                      <h3>{t("Highest observed attributes")}</h3>
                      {insights.strongest.map(attribute => <div className="insight-line" key={attribute.key}>
                        <span>{t(attribute.label)}</span><strong><AttributeValue value={attribute.value}/></strong>
                      </div>)}
                    </div>
                    <div>
                      <h3>{t("Lowest observed attributes")}</h3>
                      {insights.weakest.map(attribute => <div className="insight-line" key={attribute.key}>
                        <span>{t(attribute.label)}</span><strong><AttributeValue value={attribute.value}/></strong>
                      </div>)}
                    </div>
                  </div>
                : <p className="module-disclaimer">{t("No exact attributes observed. Upload a view with technical, mental and physical columns.")}</p>}
              <div className="scout-note">{t("These are observed numerical extremes, not professional scouting verdicts. Role-specific demands and sample completeness matter.")}</div>
            </Surface>
          </div>

        </>}
        {activeTab === 'profile' && isDecoded && <PlayerContractProfile player={player}/>}
        {activeTab === 'hidden' && isDecoded && <PlayerHiddenProfile player={player} isEditorMode={isEditorMode}/>}

        {activeTab === 'attributes' && <Surface className="scout-panel">
          <div className="scout-panel__title">
            {t("Imported player attributes")} <span>{Object.keys(player.attributes).length} {t('values')} · {t('Source:')} {dataset.fileName}</span>
          </div>
          <PlayerAttributeTable attributes={player.attributes}/>
        </Surface>}
        {activeTab === 'roles' && <Surface className="scout-panel">
          <div className="scout-panel__title">{t("Tactical roles by observed attributes")}</div>
          <RoleResults player={player} roles={roles}/>
        </Surface>}
        {activeTab === 'compare' && <PlayerCompare primary={player} dataset={dataset}/>}
        {activeTab === 'development' && <PlayerDevelopmentPanel visibility={isEditorMode ? 'editor' : isDecoded ? 'realism' : 'export'} key="report-development" player={player} edition={dataset.saveEdition ?? null}
          build={dataset.saveBuild ?? null} sourceId={dataset.saveId ?? dataset.importedAt + ':' + dataset.fileName}/>}
        {activeTab === 'recruitment' && <RecruitmentPreviewPanel player={player} dataset={dataset} onOpenSquad={onOpenSquad}/>}
      </Suspense>
    </div>

    <div className="evidence-strip">
      <Icon name="shield" size={15}/>
      {t(isDecoded
        ? dataset?.saveVerification === 'verified'
          ? 'This report uses verified attributes decoded offline from your .fm save. Original save bytes remain untouched.'
          : 'This report uses provisional attributes decoded offline. This build or container is not independently verified.'
        : 'This report uses your exported attributes. CA and PA remain unknown until verified.')}
    </div>
  </section>;
}

export default memo(PlayerDetailsView);
