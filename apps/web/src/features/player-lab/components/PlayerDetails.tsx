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

const POSITION_KEYS = ['GK', 'SW', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'] as const;

function formatCurrencyGbp(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `£${amount.toLocaleString()}`;
}

function PlayerDetailsView({ player, dataset, onOpenSquad }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PlayerReportTab>('overview');

  const insights = useMemo(() => getAttributeInsights(player), [player]);
  const strength = useMemo(() => attributeStrengthIndex(player), [player]);
  const roles = useMemo(() => analyzeRoles(player), [player]);
  const topRole = roles.find(role => role.score !== null);
  const isDecoded = dataset.source === 'decoded_save';
  const isEditorMode = isDecoded && dataset.saveMode === 'editor';

  return <section aria-label={t('Scouting report for') + ' ' + player.name}>
    <PlayerIdentityHeader player={player}/>
    <PlayerAbilitySummary strength={strength} topRole={topRole} player={player} dataset={dataset}/>
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

          {isDecoded && (
            <div className="scout-grid">
              <Surface className="scout-panel">
                <div className="scout-panel__title">
                  {t('Contract & physical profile')}
                  <span>{t('Decoded from save')}</span>
                </div>
                <dl className="decoded-profile-grid">
                  <dt>{t('Market value')}</dt><dd>{formatCurrencyGbp(player.marketValueGbp)}</dd>
                  <dt>{t('Weekly wage')}</dt><dd>{formatCurrencyGbp(player.weeklyWageGbp)}</dd>
                  <dt>{t('Contract expiry')}</dt><dd>{player.contractExpiresAt ?? '—'}</dd>
                  <dt>{t('Height / Weight')}</dt>
                  <dd>
                    {player.heightCm != null ? `${player.heightCm} cm` : '—'} / {player.weightKg != null ? `${player.weightKg} kg` : '—'}
                  </dd>
                  <dt>{t('Preferred feet')}</dt>
                  <dd>
                    {t('Left / Right')}: {player.leftFoot ?? '—'} / {player.rightFoot ?? '—'}
                  </dd>
                  <dt>{t('Squad number')}</dt><dd>{player.squadNumber != null ? `#${player.squadNumber}` : '—'}</dd>
                  <dt>{t('Loan status')}</dt>
                  <dd>{player.isLoanedIn ? `${t('On loan from')}: ${player.parentClubName ?? '—'}` : t('Permanent')}</dd>
                </dl>
                {player.positions && (
                  <div className="decoded-pos-section">
                    <h3>{t('Positional familiarity (1–20)')}</h3>
                    <div className="decoded-pos-grid">
                      {POSITION_KEYS.map(pos => {
                        const rating = player.positions?.[pos] ?? 0;
                        const tier = rating >= 15 ? 'natural' : rating >= 12 ? 'accomplished' : 'low';
                        return (
                          <div key={pos} className={`decoded-pos-pill decoded-pos-pill--${tier}`}>
                            <span>{pos}</span>
                            <strong>{rating}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Surface>

              <Surface className="scout-panel">
                <div className="scout-panel__title">
                  {t(isEditorMode ? 'Hidden attributes & personality (Editor mode)' : 'Hidden attributes & personality')}
                  <span>{t(isEditorMode ? 'Editor mode' : 'Realism mode')}</span>
                </div>
                {isEditorMode && player.hiddenPlaying ? (
                  <div className="decoded-hidden-wrap">
                    <div className="insight-line">
                      <span>{t('Home / Current / World Rep')}</span>
                      <strong>
                        {player.homeReputation ?? '—'} / {player.currentReputation ?? '—'} / {player.worldReputation ?? '—'}
                      </strong>
                    </div>
                    <div className="insight-columns">
                      <div>
                        <div className="insight-line"><span>{t('Consistency')}</span><strong>{player.hiddenPlaying.consistency}</strong></div>
                        <div className="insight-line"><span>{t('Important Matches')}</span><strong>{player.hiddenPlaying.importantMatches}</strong></div>
                        <div className="insight-line"><span>{t('Injury Proneness')}</span><strong>{player.hiddenPlaying.injuryProneness}</strong></div>
                        <div className="insight-line"><span>{t('Dirtiness')}</span><strong>{player.hiddenPlaying.dirtiness}</strong></div>
                        <div className="insight-line"><span>{t('Versatility')}</span><strong>{player.hiddenPlaying.versatility}</strong></div>
                      </div>
                      {player.personality && (
                        <div>
                          <div className="insight-line"><span>{t('Adaptability')}</span><strong>{player.personality.adaptability}</strong></div>
                          <div className="insight-line"><span>{t('Ambition')}</span><strong>{player.personality.ambition}</strong></div>
                          <div className="insight-line"><span>{t('Loyalty')}</span><strong>{player.personality.loyalty}</strong></div>
                          <div className="insight-line"><span>{t('Pressure')}</span><strong>{player.personality.pressure}</strong></div>
                          <div className="insight-line"><span>{t('Professionalism')}</span><strong>{player.personality.professionalism}</strong></div>
                          <div className="insight-line"><span>{t('Sportsmanship')}</span><strong>{player.personality.sportsmanship}</strong></div>
                          <div className="insight-line"><span>{t('Temperament')}</span><strong>{player.personality.temperament}</strong></div>
                          <div className="insight-line"><span>{t('Controversy')}</span><strong>{player.personality.controversy}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="module-disclaimer">
                    {t('Switch to Editor mode to view verified Actual CA, Actual PA, reputations, and hidden traits decoded from this save.')}
                  </p>
                )}
              </Surface>
            </div>
          )}

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
      {t(isDecoded
        ? 'This report uses verified attributes decoded offline from your .fm save. Original save bytes remain untouched.'
        : 'This report uses your exported attributes. CA and PA remain unknown until verified.')}
    </div>
  </section>;
}

export default memo(PlayerDetailsView);
