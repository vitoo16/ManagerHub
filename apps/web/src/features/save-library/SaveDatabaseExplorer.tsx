import { memo, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  projectPlayerHiddenFields,
  projectStaffAbility,
  type DecodedSaveDatabase,
  type DecodedSaveMode
} from '@managerhub/domain/fm2013-offline';
import { Button, Icon, Status, Surface } from '@managerhub/ui';
import { registerSaveDbI18n } from '../../i18n/register-save-db-i18n';
import './save-database-explorer.css';

registerSaveDbI18n();

type ExplorerTab = 'players' | 'clubs' | 'staff' | 'teams' | 'stadiums' | 'nations' | 'competitions';
type PlayerSort = 'value' | 'wage' | 'name' | 'age' | 'ca' | 'pa';
type ClubSort = 'players' | 'balance' | 'transfer' | 'name';

const PAGE_SIZE = 50;

function formatGbp(amount: number | null): string {
  if (amount === null) return '—';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000).toLocaleString()}K`;
  return `${sign}£${abs.toLocaleString()}`;
}

function teamTypeLabel(teamType: number, isNational: boolean): string {
  if (isNational) return 'National Team';
  switch (teamType) {
    case 0: return 'First Team';
    case 1: return 'Reserve';
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return 'Youth / U18';
    default:
      return 'Club Team';
  }
}

export interface SaveDatabaseExplorerProps {
  readonly database: DecodedSaveDatabase;
  readonly allDecodedSaves: readonly DecodedSaveDatabase[];
  readonly saveMode: DecodedSaveMode;
  readonly isSavedInBrowser: boolean;
  readonly saveActivity: 'saving' | 'opening' | 'deleting' | null;
  readonly onSetSaveMode: (mode: DecodedSaveMode) => void;
  readonly onSwitchDecodedSave: (saveId: string) => void;
  readonly onPersistDatabase: (db: DecodedSaveDatabase) => void;
  readonly onRemovePersistedDatabase: (saveId: string, fileName: string) => void;
  readonly onOpenPlayerInLab: (playerUid: number, clubUid: number | null) => void;
  readonly onLoadClubInSquad: (clubUid: number | null) => void;
}

function SaveDatabaseExplorerView({
  database,
  allDecodedSaves,
  saveMode,
  isSavedInBrowser,
  saveActivity,
  onSetSaveMode,
  onSwitchDecodedSave,
  onPersistDatabase,
  onRemovePersistedDatabase,
  onOpenPlayerInLab,
  onLoadClubInSquad
}: SaveDatabaseExplorerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ExplorerTab>('players');
  const [search, setSearch] = useState('');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [playerSort, setPlayerSort] = useState<PlayerSort>('value');
  const [clubSort, setClubSort] = useState<ClubSort>('players');
  const [clubsWithPlayersOnly, setClubsWithPlayersOnly] = useState(true);
  const [page, setPage] = useState(0);

  const searchId = useId();
  const clubFilterId = useId();
  const sortId = useId();
  const switcherId = useId();

  // Reset pagination & club filter whenever the active decoded save changes.
  useEffect(() => {
    setPage(0);
    setClubFilter('all');
    setSearch('');
  }, [database.source.saveId]);

  // If Realism mode is turned on while sorting by CA/PA, fall back to Market Value immediately.
  useEffect(() => {
    if (saveMode === 'realism' && (playerSort === 'ca' || playerSort === 'pa')) {
      setPlayerSort('value');
    }
  }, [saveMode, playerSort]);

  useEffect(() => {
    setPage(0);
  }, [tab, search, clubFilter, playerSort, clubSort, clubsWithPlayersOnly]);

  const deferredQuery = useDeferredValue(search.trim().toLowerCase());

  const clubsWithPlayers = useMemo(() => {
    return database.clubs
      .filter(c => c.playerCount > 0)
      .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName));
  }, [database.clubs]);

  const filteredPlayers = useMemo(() => {
    const selectedClubUid = clubFilter === 'all' ? null : Number(clubFilter);
    const list = database.players.filter(player => {
      if (selectedClubUid !== null && player.clubUid !== selectedClubUid) return false;
      if (!deferredQuery) return true;
      return (
        player.displayName.toLowerCase().includes(deferredQuery) ||
        player.fullName.toLowerCase().includes(deferredQuery) ||
        (player.clubName?.toLowerCase().includes(deferredQuery) ?? false) ||
        (player.primaryNationName?.toLowerCase().includes(deferredQuery) ?? false) ||
        player.positionSummary.toLowerCase().includes(deferredQuery)
      );
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (playerSort) {
        case 'name': return a.displayName.localeCompare(b.displayName);
        case 'age': return (a.calendarAge ?? 99) - (b.calendarAge ?? 99);
        case 'wage': return (b.contract?.weeklyWageGbp ?? -1) - (a.contract?.weeklyWageGbp ?? -1);
        case 'ca': return saveMode === 'editor' ? b.actualCa - a.actualCa : 0;
        case 'pa': return saveMode === 'editor' ? b.potentialAbility - a.potentialAbility : 0;
        case 'value':
        default:
          return (b.marketValueGbp ?? -1) - (a.marketValueGbp ?? -1) || a.displayName.localeCompare(b.displayName);
      }
    });
    return sorted;
  }, [database.players, clubFilter, deferredQuery, playerSort, saveMode]);

  const filteredClubs = useMemo(() => {
    const list = database.clubs.filter(club => {
      if (clubsWithPlayersOnly && club.playerCount === 0) return false;
      if (!deferredQuery) return true;
      return (
        club.fullName.toLowerCase().includes(deferredQuery) ||
        club.shortName.toLowerCase().includes(deferredQuery) ||
        (club.nationName?.toLowerCase().includes(deferredQuery) ?? false)
      );
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (clubSort) {
        case 'name': return a.fullName.localeCompare(b.fullName);
        case 'balance': return (b.balanceGbp ?? Number.MIN_SAFE_INTEGER) - (a.balanceGbp ?? Number.MIN_SAFE_INTEGER);
        case 'transfer': return (b.transferBudgetGbp ?? Number.MIN_SAFE_INTEGER) - (a.transferBudgetGbp ?? Number.MIN_SAFE_INTEGER);
        case 'players':
        default:
          return b.playerCount - a.playerCount || (b.balanceGbp ?? -1) - (a.balanceGbp ?? -1);
      }
    });
    return sorted;
  }, [database.clubs, clubsWithPlayersOnly, deferredQuery, clubSort]);

  const filteredStaff = useMemo(() => {
    const list = database.staff.filter(member => {
      if (!deferredQuery) return true;
      return (
        member.displayName.toLowerCase().includes(deferredQuery) ||
        (member.clubName?.toLowerCase().includes(deferredQuery) ?? false) ||
        (member.primaryNationName?.toLowerCase().includes(deferredQuery) ?? false)
      );
    });
    return [...list].sort((a, b) => Number(b.isHuman) - Number(a.isHuman) || a.displayName.localeCompare(b.displayName));
  }, [database.staff, deferredQuery]);

  const filteredTeams = useMemo(() => {
    return database.teams.filter(team => {
      if (!deferredQuery) return true;
      return (
        (team.ownerClubName?.toLowerCase().includes(deferredQuery) ?? false) ||
        String(team.uid).includes(deferredQuery)
      );
    });
  }, [database.teams, deferredQuery]);

  const filteredStadiums = useMemo(() => {
    const list = database.stadiums.filter(stadium => {
      if (!deferredQuery) return true;
      return (
        (stadium.customName?.toLowerCase().includes(deferredQuery) ?? false) ||
        (stadium.ownerClubName?.toLowerCase().includes(deferredQuery) ?? false) ||
        String(stadium.uid).includes(deferredQuery)
      );
    });
    return [...list].sort((a, b) => b.capacity - a.capacity);
  }, [database.stadiums, deferredQuery]);

  const filteredNations = useMemo(() => {
    const list = database.nations.filter(nation => {
      if (!deferredQuery) return true;
      return (
        nation.fullName.toLowerCase().includes(deferredQuery) ||
        nation.shortName.toLowerCase().includes(deferredQuery)
      );
    });
    return [...list].sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName));
  }, [database.nations, deferredQuery]);

  const filteredCompetitions = useMemo(() => {
    const list = database.competitions.filter(comp => {
      if (!deferredQuery) return true;
      return (
        (comp.customName?.toLowerCase().includes(deferredQuery) ?? false) ||
        comp.sampleClubs.some(club => club.toLowerCase().includes(deferredQuery)) ||
        String(comp.uid).includes(deferredQuery)
      );
    });
    return [...list].sort((a, b) => b.teamCount - a.teamCount);
  }, [database.competitions, deferredQuery]);

  const totalCount =
    tab === 'players' ? filteredPlayers.length :
    tab === 'clubs' ? filteredClubs.length :
    tab === 'staff' ? filteredStaff.length :
    tab === 'teams' ? filteredTeams.length :
    tab === 'stadiums' ? filteredStadiums.length :
    tab === 'nations' ? filteredNations.length :
    filteredCompetitions.length;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const startIdx = safePage * PAGE_SIZE;
  const endIdx = Math.min(totalCount, startIdx + PAGE_SIZE);

  const tabs: readonly { key: ExplorerTab; label: string; count: number }[] = [
    { key: 'players', label: 'Players', count: database.counts.players },
    { key: 'clubs', label: 'Clubs & Finances', count: database.counts.clubs },
    { key: 'staff', label: 'Staff & Managers', count: database.counts.staff },
    { key: 'teams', label: 'Teams', count: database.counts.teams },
    { key: 'stadiums', label: 'Stadiums', count: database.counts.stadiums },
    { key: 'nations', label: 'Nations', count: database.counts.nations },
    { key: 'competitions', label: 'Competitions', count: database.counts.competitions }
  ];

  const defaultSquadClubUid = useMemo(() => {
    const humanClub = database.humans.find(h => h.clubUid !== null && database.players.some(p => p.clubUid === h.clubUid));
    return humanClub?.clubUid ?? clubsWithPlayers[0]?.uid ?? null;
  }, [database.humans, database.players, clubsWithPlayers]);

  return (
    <section className="save-db-explorer" aria-label={t('Decoded save database')}>
      <Surface className="save-db-header">
        <div className="save-db-header__top">
          <div className="save-db-header__title">
            <span className="mh-eyebrow">{t('Decoded offline from FM2013')}</span>
            <h2>{database.source.fileName}</h2>
            <p>
              {database.source.edition} {database.source.build} · {database.source.family.toUpperCase()} ({database.source.compressed ? 'zlib' : 'raw'})
              {database.source.gameDate ? ` · ${t('Game date')}: ${database.source.gameDate}` : ''}
              {' · '}DB {database.source.gameDbVersionHex}
            </p>
          </div>
          <div className="save-db-header__badges">
            {database.coverage.gameDbExactEof && <Status tone="positive">{t('Exact EOF verified')}</Status>}
            <Status tone="info">{t('Read-only · Original .fm unchanged')}</Status>
          </div>
        </div>

        <div className="save-db-stats">
          <div className="save-db-stat"><span>{t('Players')}</span><strong>{database.counts.players.toLocaleString()}</strong></div>
          <div className="save-db-stat"><span>{t('Clubs & Finances')}</span><strong>{database.counts.clubs.toLocaleString()}</strong></div>
          <div className="save-db-stat"><span>{t('Staff & Managers')}</span><strong>{database.counts.staff.toLocaleString()}</strong></div>
          <div className="save-db-stat"><span>{t('Teams')}</span><strong>{database.counts.teams.toLocaleString()}</strong></div>
        </div>

        {database.humans.length > 0 && (
          <div className="save-db-humans">
            <strong>{t('Active managers')}:</strong>
            {database.humans.map((human, idx) => (
              <span className="save-db-human-chip" key={`${human.managerName}-${idx}`}>
                <Icon name="compass" size={13} />
                {human.managerName} · {human.clubName}
              </span>
            ))}
          </div>
        )}

        <div className="save-db-header__controls">
          <div className="save-db-mode-group">
            <div className="save-db-mode-switch" role="group" aria-label={t('Display mode')}>
              <button
                type="button"
                aria-pressed={saveMode === 'realism'}
                onClick={() => onSetSaveMode('realism')}
              >
                {t('Realism mode')}
              </button>
              <button
                type="button"
                aria-pressed={saveMode === 'editor'}
                onClick={() => onSetSaveMode('editor')}
              >
                {t('Editor mode')}
              </button>
            </div>
            <p className="save-db-mode-note">
              {t(saveMode === 'realism'
                ? 'Realism mode hides Actual CA, Actual PA, reputations, and hidden personality/playing traits.'
                : 'Editor mode displays verified Actual CA, Actual PA, reputations, and hidden traits decoded from the .fm save.')}
            </p>
          </div>

          <div className="save-db-actions">
            <Button
              variant="primary"
              onClick={() => onLoadClubInSquad(defaultSquadClubUid)}
            >
              <Icon name="layers" size={15} /> {t('Load squad in Squad Planner')}
            </Button>
            <Button
              variant={isSavedInBrowser ? 'quiet' : 'default'}
              disabled={saveActivity !== null}
              onClick={() => {
                if (isSavedInBrowser) {
                  onRemovePersistedDatabase(database.source.saveId, database.source.fileName);
                } else {
                  onPersistDatabase(database);
                }
              }}
            >
              <Icon name={isSavedInBrowser ? 'trash' : 'download'} size={15} />
              {t(isSavedInBrowser ? 'Remove saved database' : 'Save database on this browser')}
            </Button>
          </div>
        </div>

        {allDecodedSaves.length > 1 && (
          <div className="save-db-switcher">
            <label htmlFor={switcherId}>{t('Switch active save')}</label>
            <select
              id={switcherId}
              value={database.source.saveId}
              onChange={event => onSwitchDecodedSave(event.currentTarget.value)}
            >
              {allDecodedSaves.map(item => (
                <option key={item.source.saveId} value={item.source.saveId}>
                  {item.source.fileName} ({item.counts.players.toLocaleString()} {t('Players')})
                </option>
              ))}
            </select>
          </div>
        )}
      </Surface>

      <Surface className="save-db-panel">
        <div className="save-db-tabs" role="tablist" aria-label={t('Database explorer')}>
          {tabs.map(item => (
            <button
              key={item.key}
              id={`save-db-tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              aria-controls="save-db-tabpanel"
              className={'save-db-tab ' + (tab === item.key ? 'save-db-tab--active' : '')}
              onClick={() => setTab(item.key)}
            >
              <span>{t(item.label)}</span>
              <span className="save-db-tab__count">{item.count.toLocaleString()}</span>
            </button>
          ))}
        </div>

        <div className="save-db-toolbar">
          <div className="search-box">
            <Icon name="search" size={15} />
            <label htmlFor={searchId} className="visually-hidden">{t('Search database…')}</label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={event => setSearch(event.currentTarget.value)}
              placeholder={t('Search database…')}
            />
          </div>

          {tab === 'players' && (
            <>
              <label htmlFor={clubFilterId} className="visually-hidden">{t('Filter by club')}</label>
              <select
                id={clubFilterId}
                className="save-db-filter-select"
                aria-label={t('Filter by club')}
                value={clubFilter}
                onChange={event => setClubFilter(event.currentTarget.value)}
              >
                <option value="all">{t('All clubs')} ({database.counts.players.toLocaleString()})</option>
                {clubsWithPlayers.map(club => (
                  <option key={club.uid} value={String(club.uid)}>
                    {club.shortName || club.fullName} ({club.playerCount})
                  </option>
                ))}
              </select>

              <label htmlFor={sortId} className="visually-hidden">{t('Sort by')}</label>
              <select
                id={sortId}
                className="save-db-filter-select"
                aria-label={t('Sort by')}
                value={playerSort}
                onChange={event => setPlayerSort(event.currentTarget.value as PlayerSort)}
              >
                <option value="value">{t('Value')}</option>
                <option value="wage">{t('Wage')}</option>
                <option value="name">{t('Name')}</option>
                <option value="age">{t('Age')}</option>
                {saveMode === 'editor' && <option value="ca">{t('Actual CA')}</option>}
                {saveMode === 'editor' && <option value="pa">{t('Actual PA')}</option>}
              </select>
            </>
          )}

          {tab === 'clubs' && (
            <>
              <label className="save-db-checkbox">
                <input
                  type="checkbox"
                  checked={clubsWithPlayersOnly}
                  onChange={event => setClubsWithPlayersOnly(event.currentTarget.checked)}
                />
                <span>{t('Clubs with players only')}</span>
              </label>

              <label htmlFor={sortId} className="visually-hidden">{t('Sort by')}</label>
              <select
                id={sortId}
                className="save-db-filter-select"
                aria-label={t('Sort by')}
                value={clubSort}
                onChange={event => setClubSort(event.currentTarget.value as ClubSort)}
              >
                <option value="players">{t('Player count')}</option>
                <option value="balance">{t('Balance')}</option>
                <option value="transfer">{t('Transfer budget')}</option>
                <option value="name">{t('Name')}</option>
              </select>
            </>
          )}
        </div>

        <div className="save-db-table-wrap" role="tabpanel" id="save-db-tabpanel" aria-labelledby={`save-db-tab-${tab}`}>
          {totalCount === 0 ? (
            <div className="empty-library"><p>{t('No matching records.')}</p></div>
          ) : tab === 'players' ? (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('Players')}</th>
                  <th scope="col">{t('Club')}</th>
                  <th scope="col">{t('Position')}</th>
                  <th scope="col">{t('Age')}</th>
                  <th scope="col">{t('Nation')}</th>
                  <th scope="col">{t('Value')}</th>
                  <th scope="col">{t('Wage')}</th>
                  <th scope="col">{t('Expires')}</th>
                  {saveMode === 'editor' && <th scope="col">{t('CA')}</th>}
                  {saveMode === 'editor' && <th scope="col">PA</th>}
                  <th scope="col">{t('Open')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.slice(startIdx, endIdx).map(player => {
                  const hidden = projectPlayerHiddenFields(
                    player,
                    saveMode,
                    database.source.edition,
                    database.source.build
                  );
                  return (
                    <tr key={player.uid}>
                      <td>
                        <strong>{player.displayName}</strong>
                        <span className="save-db-sub">
                          UID {player.uid}{player.isLoanedIn && player.parentClubName ? ` · ${t('On loan from')}: ${player.parentClubName}` : ''}
                        </span>
                      </td>
                      <td>{player.clubShortName ?? player.clubName ?? t('Free agent')}</td>
                      <td>{player.positionSummary}</td>
                      <td className="save-db-num">{player.calendarAge ?? '—'}</td>
                      <td>{player.primaryNationName ?? '—'}</td>
                      <td className="save-db-num">{formatGbp(player.marketValueGbp)}</td>
                      <td className="save-db-num">{player.contract ? formatGbp(player.contract.weeklyWageGbp) : '—'}</td>
                      <td className="save-db-num">{player.contract?.expiresAt ?? '—'}</td>
                      {saveMode === 'editor' && <td className="save-db-num"><strong>{hidden.actualCa.value ?? '—'}</strong></td>}
                      {saveMode === 'editor' && <td className="save-db-num"><strong>{hidden.potentialAbility.value ?? '—'}</strong></td>}
                      <td>
                        <div className="save-db-row-actions">
                          <Button
                            type="button"
                            onClick={() => onOpenPlayerInLab(player.uid, player.clubUid)}
                          >
                            {t('Open in Player Lab')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : tab === 'clubs' ? (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('Club')}</th>
                  <th scope="col">{t('Nation')}</th>
                  <th scope="col">{t('Player count')}</th>
                  <th scope="col">{t('Staff count')}</th>
                  <th scope="col">{t('Balance')}</th>
                  <th scope="col">{t('Transfer budget')}</th>
                  <th scope="col">{t('Wage budget')}</th>
                  <th scope="col">{t('Facilities')}</th>
                  <th scope="col">{t('Founded')}</th>
                  <th scope="col">{t('Open')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredClubs.slice(startIdx, endIdx).map(club => (
                  <tr key={club.uid}>
                    <td>
                      <strong>{club.fullName}</strong>
                      <span className="save-db-sub">{club.shortName} · UID {club.uid}</span>
                    </td>
                    <td>{club.nationName ?? '—'}</td>
                    <td className="save-db-num">{club.playerCount}</td>
                    <td className="save-db-num">{club.staffCount}</td>
                    <td className="save-db-num">{formatGbp(club.balanceGbp)}</td>
                    <td className="save-db-num">{formatGbp(club.transferBudgetGbp)}</td>
                    <td className="save-db-num">{formatGbp(club.weeklyWageBudgetGbp)}</td>
                    <td className="save-db-num">
                      {club.trainingFacilities !== null ? `TR ${club.trainingFacilities} / YTH ${club.youthFacilities ?? '—'}` : '—'}
                    </td>
                    <td className="save-db-num">{club.yearFounded ?? '—'}</td>
                    <td>
                      {club.playerCount > 0 && (
                        <div className="save-db-row-actions">
                          <Button type="button" onClick={() => onLoadClubInSquad(club.uid)}>
                            {t('Load squad in Squad Planner')}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'staff' ? (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('Staff & Managers')}</th>
                  <th scope="col">{t('Role')}</th>
                  <th scope="col">{t('Club')}</th>
                  <th scope="col">{t('Nation')}</th>
                  <th scope="col">{t('Age')}</th>
                  <th scope="col">{t('Wage')}</th>
                  <th scope="col">{t('Expires')}</th>
                  {saveMode === 'editor' && <th scope="col">{t('CA')}</th>}
                  {saveMode === 'editor' && <th scope="col">PA</th>}
                  {saveMode === 'editor' && <th scope="col">{t('Reputation')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.slice(startIdx, endIdx).map(member => {
                  const projected = projectStaffAbility(
                    member,
                    saveMode,
                    database.source.edition,
                    database.source.build
                  );
                  return (
                    <tr key={member.uid}>
                      <td>
                        <strong>{member.displayName}</strong>
                        <span className="save-db-sub">UID {member.uid}</span>
                      </td>
                      <td>
                        <span className={'save-db-badge ' + (member.isHuman ? 'save-db-badge--human' : '')}>
                          {t(member.isHuman ? 'Human manager' : 'Staff')}
                        </span>
                      </td>
                      <td>{member.clubName ?? t('Unemployed')}</td>
                      <td>{member.primaryNationName ?? '—'}</td>
                      <td className="save-db-num">{member.calendarAge ?? '—'}</td>
                      <td className="save-db-num">{formatGbp(member.weeklyWageGbp)}</td>
                      <td className="save-db-num">{member.contractExpiresAt ?? '—'}</td>
                      {saveMode === 'editor' && <td className="save-db-num">{projected.staffCa.value ?? '—'}</td>}
                      {saveMode === 'editor' && <td className="save-db-num">{projected.staffPa.value ?? '—'}</td>}
                      {saveMode === 'editor' && <td className="save-db-num">{projected.currentReputation.value ?? '—'}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : tab === 'teams' ? (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('UID')}</th>
                  <th scope="col">{t('Owner')}</th>
                  <th scope="col">{t('Type')}</th>
                  {saveMode === 'editor' && <th scope="col">{t('Reputation')}</th>}
                  <th scope="col">{t('Competition')} UID</th>
                  <th scope="col">{t('Stadium')} UID</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.slice(startIdx, endIdx).map(team => (
                  <tr key={team.uid}>
                    <td className="save-db-num">{team.uid}</td>
                    <td><strong>{team.ownerClubName ?? `Team #${team.uid}`}</strong></td>
                    <td>{t(teamTypeLabel(team.teamType, team.isNationalTeam))}</td>
                    {saveMode === 'editor' && <td className="save-db-num">{team.reputation.toLocaleString()}</td>}
                    <td className="save-db-num">{team.compUid ?? '—'}</td>
                    <td className="save-db-num">{team.stadiumUid ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'stadiums' ? (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('Stadium')}</th>
                  <th scope="col">{t('Name source')}</th>
                  <th scope="col">{t('Owner')}</th>
                  <th scope="col">{t('Capacity')}</th>
                  <th scope="col">{t('Seating')}</th>
                  <th scope="col">{t('Expansion')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStadiums.slice(startIdx, endIdx).map(stadium => (
                  <tr key={stadium.uid}>
                    <td>
                      <strong>{stadium.customName ?? `${t('Stadium')} #${stadium.uid}`}</strong>
                      <span className="save-db-sub">UID {stadium.uid}</span>
                    </td>
                    <td>
                      <span className={'save-db-badge ' + (stadium.nameProvenance === 'decoded_save' ? 'save-db-badge--verified' : 'save-db-badge--external')}>
                        {t(stadium.nameProvenance === 'decoded_save' ? 'Inline in save' : 'Base name in lang_db.dat')}
                      </span>
                    </td>
                    <td>{stadium.ownerClubName ?? '—'}</td>
                    <td className="save-db-num">{stadium.capacity.toLocaleString()}</td>
                    <td className="save-db-num">{stadium.seatingCapacity.toLocaleString()}</td>
                    <td className="save-db-num">{stadium.expansionCapacity.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'nations' ? (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('Nation')}</th>
                  <th scope="col">{t('Player count')}</th>
                  <th scope="col">{t('Club count')}</th>
                  <th scope="col">{t('Staff count')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNations.slice(startIdx, endIdx).map(nation => (
                  <tr key={nation.uid}>
                    <td>
                      <strong>{nation.fullName}</strong>
                      <span className="save-db-sub">{nation.shortName} · UID {nation.uid}</span>
                    </td>
                    <td className="save-db-num">{nation.playerCount.toLocaleString()}</td>
                    <td className="save-db-num">{nation.clubCount.toLocaleString()}</td>
                    <td className="save-db-num">{nation.staffCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="save-db-table">
              <thead>
                <tr>
                  <th scope="col">{t('Competition')}</th>
                  <th scope="col">{t('Name source')}</th>
                  <th scope="col">{t('Teams count')}</th>
                  <th scope="col">{t('Sample clubs')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitions.slice(startIdx, endIdx).map(comp => (
                  <tr key={comp.uid}>
                    <td>
                      <strong>{comp.customName ?? `${t('Competition')} #${comp.uid}`}</strong>
                      <span className="save-db-sub">UID {comp.uid}</span>
                    </td>
                    <td>
                      <span className={'save-db-badge ' + (comp.nameProvenance === 'decoded_save' ? 'save-db-badge--verified' : 'save-db-badge--external')}>
                        {t(comp.nameProvenance === 'decoded_save' ? 'Inline in save' : 'Base name in lang_db.dat')}
                      </span>
                    </td>
                    <td className="save-db-num">{comp.teamCount.toLocaleString()}</td>
                    <td>{comp.sampleClubs.length > 0 ? comp.sampleClubs.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalCount > 0 && (
          <div className="save-db-pagination">
            <span>
              {t('Showing {{from}}–{{to}} of {{total}}', {
                from: (startIdx + 1).toLocaleString(),
                to: endIdx.toLocaleString(),
                total: totalCount.toLocaleString()
              })}
            </span>
            <div className="save-db-pagination__controls">
              <Button
                type="button"
                variant="quiet"
                disabled={safePage === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                {t('Previous page')}
              </Button>
              <span>{t('Page {{current}} of {{total}}', { current: safePage + 1, total: totalPages })}</span>
              <Button
                type="button"
                variant="quiet"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              >
                {t('Next page')}
              </Button>
            </div>
          </div>
        )}
      </Surface>

      <Surface className="save-db-coverage">
        <details>
          <summary>{t('Database coverage & honest limits')}</summary>
          <div className="save-db-coverage__grid">
            <div className="save-db-coverage__col">
              <strong>{t('Verified decoded domains')}</strong>
              <p>{database.coverage.verifiedDomains.join(', ')}</p>
            </div>
            <div className="save-db-coverage__col">
              <strong>{t('Not stored in .fm save')}</strong>
              <p>{database.coverage.notStoredInSave.join(', ')}</p>
            </div>
            <div className="save-db-coverage__col">
              <strong>{t('Not yet decoded')}</strong>
              <p>{database.coverage.notDecoded.join(', ')} · {t('Write capability')}: {t('Unsupported')}</p>
            </div>
          </div>
        </details>
      </Surface>
    </section>
  );
}

export default memo(SaveDatabaseExplorerView);
