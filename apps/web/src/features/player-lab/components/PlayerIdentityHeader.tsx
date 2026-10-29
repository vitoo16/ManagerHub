import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerExport } from '@managerhub/domain';
import { Status } from '@managerhub/ui';

function PlayerIdentityHeader({ player }: { player: PlayerExport }) {
  const { t } = useTranslation();
  const metadata = [player.club, player.position, player.age !== null ? player.age + ' ' + t('years') : null, player.nationality]
    .filter(Boolean).join(' · ');
  return <div className="scout-identity">
    <div className="scout-avatar" aria-hidden="true">{player.name.slice(0, 1).toUpperCase()}</div>
    <div className="scout-identity__copy">
      <span className="mh-eyebrow">{t("PLAYER INTELLIGENCE / EXPORT VIEW")}</span>
      <h2>{player.name}</h2>
      <p>{metadata || t('Only identity data available')}</p>
    </div>
    <Status tone="info">{t("Game export")}</Status>
  </div>;
}

export default memo(PlayerIdentityHeader);
