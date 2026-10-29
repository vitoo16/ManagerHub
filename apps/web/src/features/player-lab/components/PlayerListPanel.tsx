import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerExport } from '@managerhub/domain';
import { Button, Icon, Surface } from '@managerhub/ui';

type Props = {
  visible: readonly PlayerExport[];
  selectedId: string | null;
  search: string;
  visibleLimit: number;
  isSearchPending: boolean;
  onSearchChange: (value: string) => void;
  onChoosePlayer: (id: string) => void;
  onShowMore: () => void;
};

function PlayerListPanel({
  visible, selectedId, search, visibleLimit, isSearchPending,
  onSearchChange, onChoosePlayer, onShowMore
}: Props) {
  const { t } = useTranslation();
  const shown = visible.slice(0, visibleLimit);
  return <Surface className="player-list-panel">
    <div className="player-list-panel__heading"><span>{t("Players")}</span><span>{visible.length} {t('shown')}</span></div>
    <label className="search-box player-search">
      <Icon name="search" size={16}/>
      <span className="visually-hidden">{t("Search imported players")}</span>
      <input placeholder={t("Search player, team, position…")} value={search} onChange={event => onSearchChange(event.target.value)}/>
    </label>
    <div className="player-list-scroll" role="list" aria-label={t("Imported players")} aria-busy={isSearchPending}>
      {shown.map(player => <div key={player.id} role="listitem">
        <button className={'player-list-entry ' + (selectedId === player.id ? 'player-list-entry--active' : '')}
          aria-current={selectedId === player.id ? 'true' : undefined}
          onClick={() => onChoosePlayer(player.id)}>
          <span className="player-list-avatar" aria-hidden="true">{player.name.slice(0, 1)}</span>
          <span className="player-list-entry__copy"><strong>{player.name}</strong><small>{player.position ?? t('Unknown position')} · {player.club ?? t('Unknown club')}</small></span>
          <Icon name="chevron" size={13}/>
        </button>
      </div>)}
    </div>
    {!visible.length && <div className="player-search-empty">{t("No players match this search.")}</div>}
    {visible.length > visibleLimit && <Button className="player-list-more" onClick={onShowMore}>
      {t('Show next 100')} · {visible.length - visibleLimit} {t('remaining')}
    </Button>}
  </Surface>;
}

export default memo(PlayerListPanel);
