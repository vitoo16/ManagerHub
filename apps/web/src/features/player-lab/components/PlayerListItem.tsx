import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerExport } from '@managerhub/domain';
import { Icon } from '@managerhub/ui';

interface PlayerListItemProps {
  readonly player: PlayerExport;
  readonly active: boolean;
  readonly onSelect: (playerId: string) => void;
}

export const PlayerListItem = memo(function PlayerListItem({
  player, active, onSelect
}: PlayerListItemProps) {
  const { t } = useTranslation();
  return <button
    type="button"
    className={'player-list-entry ' + (active ? 'player-list-entry--active' : '')}
    aria-current={active ? 'true' : undefined}
    onClick={() => onSelect(player.id)}
  >
    <span className="player-list-avatar" aria-hidden="true">{player.name.slice(0, 1)}</span>
    <span className="player-list-entry__copy">
      <strong>{player.name}</strong>
      <small>{player.position ?? t('Unknown position')} · {player.club ?? t('Unknown club')}</small>
    </span>
    <Icon name="chevron" size={13}/>
  </button>;
});
