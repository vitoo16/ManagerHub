import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerExport } from '@managerhub/domain';
import { AttributePropertyGroup, Surface } from '@managerhub/ui';
import { HIDDEN_KEYS, PERSONALITY_KEYS } from '../../player-attribute-fields';

function PlayerHiddenProfile({ player, isEditorMode }: { player: PlayerExport; isEditorMode: boolean }) {
  const { t } = useTranslation();
  return <Surface className="scout-panel">
    <div className="scout-panel__title">
      {t(isEditorMode ? 'Hidden attributes & personality (Editor mode)' : 'Hidden attributes & personality')}
      <span>{t(isEditorMode ? 'Editor mode' : 'Realism mode')}</span>
    </div>
    {isEditorMode ? <>
      <div className="insight-line">
        <span>{t('Home / Current / World Rep')}</span>
        <strong>{player.homeReputation ?? '—'} / {player.currentReputation ?? '—'} / {player.worldReputation ?? '—'}</strong>
      </div>
      <div className="player-hidden-groups">
        <AttributePropertyGroup title={t('Hidden Playing Traits (1–20)')}
          fields={HIDDEN_KEYS.map(({ key, label }) => ({ key, label: t(label), value: player.hiddenPlaying?.[key] }))}/>
        <AttributePropertyGroup title={t('Personality (1–20)')}
          fields={PERSONALITY_KEYS.map(({ key, label }) => ({ key, label: t(label), value: player.personality?.[key] }))}/>
      </div>
    </> : <p className="module-disclaimer">
      {t('Switch to Editor mode to view verified Actual CA, Actual PA, reputations, and hidden traits decoded from this save.')}
    </p>}
  </Surface>;
}
export default memo(PlayerHiddenProfile);
