import { memo, useEffect, useRef, useState } from 'react';
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

const ROW_HEIGHT = 56;
const OVERSCAN = 5;
const VIEWPORT_HEIGHT = 550;

function PlayerListPanel({
  visible, selectedId, search, visibleLimit, isSearchPending,
  onSearchChange, onChoosePlayer, onShowMore
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(VIEWPORT_HEIGHT);
  const shownLength = Math.min(visible.length, visibleLimit);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => {
      const next = element.clientHeight || VIEWPORT_HEIGHT;
      setViewportHeight(current => current === next ? current : next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setScrollTop(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [search, visible]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(shownLength, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const windowed = visible.slice(start, end);

  return <Surface className="player-list-panel">
    <div className="player-list-panel__heading"><span>{t("Players")}</span><span>{visible.length} {t('shown')}</span></div>
    <label className="search-box player-search">
      <Icon name="search" size={16}/>
      <span className="visually-hidden">{t("Search imported players")}</span>
      <input placeholder={t("Search player, team, position…")} value={search} onChange={event => onSearchChange(event.target.value)}/>
    </label>
    <div ref={scrollRef} className="player-list-scroll" role="list" aria-label={t("Imported players")} aria-busy={isSearchPending}
      onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <div className="player-list-window" style={{ height: shownLength * ROW_HEIGHT }}>
        {windowed.map((player, index) => <div className="player-list-window__item" key={player.id} role="listitem"
          aria-posinset={start + index + 1} aria-setsize={shownLength}
          style={{ top: (start + index) * ROW_HEIGHT, height: ROW_HEIGHT }}>
          <button className={'player-list-entry ' + (selectedId === player.id ? 'player-list-entry--active' : '')}
            aria-current={selectedId === player.id ? 'true' : undefined}
            onClick={() => onChoosePlayer(player.id)}>
            <span className="player-list-avatar" aria-hidden="true">{player.name.slice(0, 1)}</span>
            <span className="player-list-entry__copy"><strong>{player.name}</strong><small>{player.position ?? t('Unknown position')} · {player.club ?? t('Unknown club')}</small></span>
            <Icon name="chevron" size={13}/>
          </button>
        </div>)}
      </div>
    </div>
    {!visible.length && <div className="player-search-empty">{t("No players match this search.")}</div>}
    {visible.length > visibleLimit && <Button className="player-list-more" onClick={onShowMore}>
      {t('Show next 100')} · {visible.length - visibleLimit} {t('remaining')}
    </Button>}
  </Surface>;
}

export default memo(PlayerListPanel);
