import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { analyzeRoles, attributeStrengthIndex } from '@managerhub/domain';

type RoleAssessment = ReturnType<typeof analyzeRoles>[number];
type StrengthSummary = ReturnType<typeof attributeStrengthIndex>;

function PlayerAbilitySummary({ strength, topRole }: { strength: StrengthSummary; topRole?: RoleAssessment }) {
  const { t } = useTranslation();
  return <>
    <div className="scout-metrics">
      <div><span>{t("Actual CA")}</span><strong>—</strong><small>{t("Not verified")}</small></div>
      <div><span>{t("Attribute summary")}</span><strong>{strength.index ?? '—'}{strength.index !== null && <small> / 100</small>}</strong><small>{t("Visible attributes only · Not CA")}</small></div>
      <div><span>{t("Best observed role")}</span><strong>{topRole?.score ?? '—'}{topRole?.score !== null && topRole?.score !== undefined && <small> / 100</small>}</strong><small>{topRole?.title ? t(topRole.title) : t('Insufficient data')}</small></div>
      <div><span>PA</span><strong>—</strong><small>{t("Not verified")}</small></div>
    </div>
    <details className="ca-guide">
      <summary>{t('What do CA, PA and role fit mean?')}</summary>
      <div className="ca-guide__content">
        <p><strong>CA — </strong>{t('CA explains a player’s current ability in FM. Attributes have different ability costs depending on position, so a simple average is not the game’s CA.')}</p>
        <p><strong>RCA — </strong>{t('Recommended CA is the ability needed to sustain a set of attributes in the editor. It is not automatically the player’s hidden CA.')}</p>
        <p><strong>PA — </strong>{t('PA is a potential ceiling assigned within the save. You cannot calculate its exact value from visible attributes.')}</p>
        <p><strong>{t('Role fit')} — </strong>{t('This score is ManagerHub’s guide to a tactical job, based on the attributes you imported. It is not a game-engine rating.')}</p>
        <p className="ca-guide__caution">{t('FM Scout studied CA weights for older versions. We will not call a result exact FM26 CA until its weights and formula are independently verified.')}</p>
        <a href="https://www.fmscout.com/a-guide-to-current-ability-in-football-manager.html" rel="noreferrer" target="_blank">{t('Read the CA research')}</a>
      </div>
    </details>
  </>;
}

export default memo(PlayerAbilitySummary);
