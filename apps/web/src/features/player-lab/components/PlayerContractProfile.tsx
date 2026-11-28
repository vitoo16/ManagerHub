import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerExport } from '@managerhub/domain';
import { Surface } from '@managerhub/ui';
import { POSITION_KEYS } from '../../player-attribute-fields';

function formatCurrencyGbp(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `£${amount.toLocaleString()}`;
}

function PlayerContractProfile({ player }: { player: PlayerExport }) {
  const { t } = useTranslation();
  return <Surface className="scout-panel">
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
            const rating = player.positions?.[pos];
            const tier = rating == null ? 'unknown' : rating >= 15 ? 'natural' : rating >= 12 ? 'accomplished' : 'low';
            return (
              <div key={pos} className={`decoded-pos-pill decoded-pos-pill--${tier}`}>
                <span>{pos}</span>
                <strong>{rating ?? '—'}</strong>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </Surface>;
}
export default memo(PlayerContractProfile);
