import { memo, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ATTRIBUTE_GROUPS, type AttributeKey } from '@managerhub/domain';
import {
  buildClubSquadPresetOverlay,
  buildEditedSaveFileName,
  buildMassEditPlayersOverlay,
  buildPlayerPresetPatch,
  summarizeDraftChanges,
  type ClubDraftPatch,
  type ClubSquadPresetKind,
  type DecodedHiddenPlayingAttributes,
  type DecodedPersonalityAttributes,
  type DecodedPositionRatings,
  type DecodedSaveDatabase,
  type DecodedStaffAttributes,
  type PlayerDraftPatch,
  type PlayerPresetKind,
  type SaveDraftOverlay,
  type StadiumDraftPatch,
  type StaffDraftPatch
} from '@managerhub/domain/fm2013-offline';
import { Button, Icon, Status } from '@managerhub/ui';
import { registerSaveDbI18n } from '../../i18n/register-save-db-i18n';
import './save-session.css';

registerSaveDbI18n();

export type EditorModalTarget =
  | { readonly kind: 'player'; readonly uid: number }
  | { readonly kind: 'staff'; readonly uid: number }
  | { readonly kind: 'club'; readonly uid: number }
  | { readonly kind: 'stadium'; readonly uid: number }
  | { readonly kind: 'mass_edit' }
  | { readonly kind: 'save_as' };

export interface SaveEntityEditorModalProps {
  readonly target: EditorModalTarget;
  readonly baseDatabase: DecodedSaveDatabase;
  readonly workingDatabase: DecodedSaveDatabase;
  readonly overlay: SaveDraftOverlay;
  readonly managedClubUid: number | null;
  readonly hasRawSaveBytes: boolean;
  readonly writerKeyReady: boolean;
  readonly writingSave: boolean;
  readonly writeError: string | null;
  readonly onClose: () => void;
  readonly onCommitOverlay: (label: string, mutator: (cur: SaveDraftOverlay) => SaveDraftOverlay) => void;
  readonly onDiscardAll: () => void;
  readonly onAuthorizeFmExe: (file: File) => void;
  readonly onSaveAsFm: (outputFileName: string) => void;
}

const POSITION_KEYS: readonly (keyof DecodedPositionRatings)[] = [
  'GK', 'SW', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'
];

const HIDDEN_KEYS: readonly { readonly key: keyof DecodedHiddenPlayingAttributes; readonly label: string }[] = [
  { key: 'consistency', label: 'Consistency' },
  { key: 'importantMatches', label: 'Important Matches' },
  { key: 'injuryProneness', label: 'Injury Proneness' },
  { key: 'dirtiness', label: 'Dirtiness' },
  { key: 'versatility', label: 'Versatility' }
];

const PERSONALITY_KEYS: readonly { readonly key: keyof DecodedPersonalityAttributes; readonly label: string }[] = [
  { key: 'adaptability', label: 'Adaptability' },
  { key: 'ambition', label: 'Ambition' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'sportsmanship', label: 'Sportsmanship' },
  { key: 'temperament', label: 'Temperament' },
  { key: 'controversy', label: 'Controversy' }
];

const STAFF_ATTR_KEYS: readonly { readonly key: keyof DecodedStaffAttributes; readonly label: string }[] = [
  { key: 'attacking', label: 'Coaching Attacking' },
  { key: 'defending', label: 'Coaching Defending' },
  { key: 'fitness', label: 'Coaching Fitness' },
  { key: 'goalkeepers', label: 'Coaching Goalkeepers' },
  { key: 'mental', label: 'Coaching Mental' },
  { key: 'technical', label: 'Coaching Technical' },
  { key: 'tactical', label: 'Coaching Tactical' },
  { key: 'player', label: 'Coaching Outfield' },
  { key: 'manManagement', label: 'Man Management' },
  { key: 'workingWithYoungsters', label: 'Working With Youngsters' },
  { key: 'judgingPlayerAbility', label: 'Judging Player Ability' },
  { key: 'judgingPlayerPotential', label: 'Judging Player Potential' },
  { key: 'tacticalKnowledge', label: 'Tactical Knowledge' },
  { key: 'motivating', label: 'Motivating' },
  { key: 'levelOfDiscipline', label: 'Level of Discipline' },
  { key: 'determination', label: 'Determination' },
  { key: 'adaptability', label: 'Adaptability' },
  { key: 'physiotherapy', label: 'Physiotherapy' }
];

const VISIBLE_ATTR_LIST: readonly AttributeKey[] = [
  ...ATTRIBUTE_GROUPS.Technical,
  ...ATTRIBUTE_GROUPS.Mental,
  ...ATTRIBUTE_GROUPS.Physical,
  ...ATTRIBUTE_GROUPS.Goalkeeping
];

type PlayerSubTab = 'general' | 'attributes' | 'positions';

function clampInt(val: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(val, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function SaveEntityEditorModal({
  target,
  baseDatabase,
  workingDatabase,
  overlay,
  managedClubUid,
  hasRawSaveBytes,
  writerKeyReady,
  writingSave,
  writeError,
  onClose,
  onCommitOverlay,
  onDiscardAll,
  onAuthorizeFmExe,
  onSaveAsFm
}: SaveEntityEditorModalProps) {
  const { t } = useTranslation();
  const exeInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [playerSubTab, setPlayerSubTab] = useState<PlayerSubTab>('general');
  const [notice, setNotice] = useState<string | null>(null);
  const [outputName, setOutputName] = useState(() => buildEditedSaveFileName(baseDatabase.source.fileName));

  // Mass-edit filter state
  const [massClubUid, setMassClubUid] = useState<string>(() =>
    managedClubUid !== null ? String(managedClubUid) : 'all'
  );
  const [massMaxAge, setMassMaxAge] = useState<string>('99');
  const [massMorale, setMassMorale] = useState<string>('20');
  const [massCaBoost, setMassCaBoost] = useState<string>('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const player = target.kind === 'player'
    ? workingDatabase.players.find(p => p.uid === target.uid) ?? null
    : null;
  const staffMember = target.kind === 'staff'
    ? workingDatabase.staff.find(s => s.uid === target.uid) ?? null
    : null;
  const club = target.kind === 'club'
    ? workingDatabase.clubs.find(c => c.uid === target.uid) ?? null
    : null;
  const stadium = target.kind === 'stadium'
    ? workingDatabase.stadiums.find(st => st.uid === target.uid) ?? null
    : null;

  const diffEntries = useMemo(
    () => summarizeDraftChanges(baseDatabase, overlay),
    [baseDatabase, overlay]
  );

  const clubsWithPlayers = useMemo(
    () => workingDatabase.clubs
      .filter(c => c.playerCount > 0)
      .sort((a, b) => b.playerCount - a.playerCount || a.fullName.localeCompare(b.fullName)),
    [workingDatabase.clubs]
  );

  const massTargetPlayers = useMemo(() => {
    const clubUid = massClubUid === 'all' ? null : Number(massClubUid);
    const maxAge = clampInt(massMaxAge, 99, 14, 99);
    return workingDatabase.players.filter(p => {
      if (clubUid !== null && p.clubUid !== clubUid) return false;
      if (p.calendarAge !== null && p.calendarAge > maxAge) return false;
      return true;
    });
  }, [workingDatabase.players, massClubUid, massMaxAge]);

  const applyPlayerField = (label: string, patch: PlayerDraftPatch) => {
    if (!player) return;
    onCommitOverlay(label, cur => ({
      ...cur,
      players: {
        ...cur.players,
        [player.uid]: {
          ...cur.players[player.uid],
          ...patch,
          ...(cur.players[player.uid]?.positions || patch.positions
            ? { positions: { ...cur.players[player.uid]?.positions, ...patch.positions } }
            : {}),
          ...(cur.players[player.uid]?.attributes || patch.attributes
            ? { attributes: { ...cur.players[player.uid]?.attributes, ...patch.attributes } }
            : {}),
          ...(cur.players[player.uid]?.hiddenPlaying || patch.hiddenPlaying
            ? { hiddenPlaying: { ...cur.players[player.uid]?.hiddenPlaying, ...patch.hiddenPlaying } }
            : {}),
          ...(cur.players[player.uid]?.personality || patch.personality
            ? { personality: { ...cur.players[player.uid]?.personality, ...patch.personality } }
            : {})
        }
      }
    }));
  };

  const applyPlayerPreset = (preset: PlayerPresetKind, label: string) => {
    if (!player) return;
    const patch = buildPlayerPresetPatch(player, preset, workingDatabase.source.gameDate);
    applyPlayerField(label, patch);
    setNotice(t('Applied preset to active draft. Original .fm file remains untouched until Save As .fm.'));
  };

  const applyStaffField = (label: string, patch: StaffDraftPatch) => {
    if (!staffMember) return;
    onCommitOverlay(label, cur => ({
      ...cur,
      staff: {
        ...cur.staff,
        [staffMember.uid]: {
          ...cur.staff[staffMember.uid],
          ...patch,
          ...(cur.staff[staffMember.uid]?.attributes || patch.attributes
            ? { attributes: { ...cur.staff[staffMember.uid]?.attributes, ...patch.attributes } }
            : {})
        }
      }
    }));
  };

  const applyClubField = (label: string, patch: ClubDraftPatch) => {
    if (!club) return;
    onCommitOverlay(label, cur => ({
      ...cur,
      clubs: {
        ...cur.clubs,
        [club.uid]: {
          ...cur.clubs[club.uid],
          ...patch
        }
      }
    }));
  };

  const applyClubPreset = (targetClubUid: number, preset: ClubSquadPresetKind, label: string) => {
    onCommitOverlay(label, cur => buildClubSquadPresetOverlay(baseDatabase, cur, targetClubUid, preset));
    setNotice(t('Applied club preset to active draft.'));
  };

  const applyStadiumField = (label: string, patch: StadiumDraftPatch) => {
    if (!stadium) return;
    onCommitOverlay(label, cur => ({
      ...cur,
      stadiums: {
        ...cur.stadiums,
        [stadium.uid]: {
          ...cur.stadiums[stadium.uid],
          ...patch
        }
      }
    }));
  };

  const applyMassEdit = () => {
    if (massTargetPlayers.length === 0) return;
    const patch: PlayerDraftPatch = {
      morale: clampInt(massMorale, 20, 1, 20),
      ...(massCaBoost.trim() !== ''
        ? { actualCa: clampInt(massCaBoost, 160, 1, 200) }
        : {})
    };
    const uids = massTargetPlayers.map(p => p.uid);
    onCommitOverlay(
      `Mass edit (${uids.length})`,
      cur => buildMassEditPlayersOverlay(cur, uids, patch)
    );
    setNotice(t('Applied mass edit to {{count}} players in draft.', { count: uids.length }));
  };

  const handleExeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onAuthorizeFmExe(file);
    event.currentTarget.value = '';
  };

  const modalTitle =
    target.kind === 'player' ? `${t('Edit player')} · ${player?.displayName ?? ''}` :
    target.kind === 'staff' ? `${t('Edit staff')} · ${staffMember?.displayName ?? ''}` :
    target.kind === 'club' ? `${t('Edit club & finances')} · ${club?.fullName ?? ''}` :
    target.kind === 'stadium' ? `${t('Edit stadium')} · ${stadium?.customName ?? `#${target.uid}`}` :
    target.kind === 'mass_edit' ? t('FMRTE13 Presets & Mass Edit') :
    t('Save As .fm (Experimental Offline Copy)');

  return (
    <div
      className="editor-modal-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
      >
        <input
          ref={exeInputRef}
          type="file"
          accept=".exe"
          aria-label={t('Authorize FM2013 fm.exe for Save As signing')}
          className="visually-hidden"
          onChange={handleExeChange}
          tabIndex={-1}
        />

        <div className="editor-modal__head">
          <div>
            <span className="mh-eyebrow">{t('Offline Save Editor · Draft Transaction Layer')}</span>
            <h2>{modalTitle}</h2>
            <p>{t('Changes update all ManagerHub workspaces immediately and never touch your original .fm file.')}</p>
          </div>
          <Button type="button" variant="quiet" onClick={onClose} aria-label={t('Close editor')}>
            <Icon name="close" size={16} />
          </Button>
        </div>

        {notice && <div className="editor-notice" role="status">{notice}</div>}
        {writeError && <div className="inline-alert" role="alert">{writeError}</div>}

        {target.kind === 'player' && player && (
          <>
            <div className="editor-presets">
              <strong>{t('Quick presets')}:</strong>
              <Button type="button" onClick={() => applyPlayerPreset('inspire_morale', 'Inspire Player')}>
                {t('Inspire morale')}
              </Button>
              <Button type="button" onClick={() => applyPlayerPreset('match_ca_to_pa', 'Match CA to PA')}>
                {t('Match CA to PA')}
              </Button>
              <Button type="button" onClick={() => applyPlayerPreset('wonderkid_pa_200', 'Wonderkid PA 200')}>
                {t('Wonderkid (PA 200)')}
              </Button>
              <Button type="button" onClick={() => applyPlayerPreset('perfect_model_professional', 'Model Professional')}>
                {t('Model Professional')}
              </Button>
              <Button type="button" onClick={() => applyPlayerPreset('natural_all_positions', 'All Positions 20')}>
                {t('All positions 20')}
              </Button>
              {player.contract && (
                <Button type="button" onClick={() => applyPlayerPreset('extend_contract_5y', 'Extend Contract +5y')}>
                  {t('Extend contract +5y')}
                </Button>
              )}
            </div>

            <div className="editor-modal__tabs" role="tablist" aria-label={t('Player editor sections')}>
              <button
                type="button"
                role="tab"
                className="editor-modal__tab"
                aria-selected={playerSubTab === 'general'}
                onClick={() => setPlayerSubTab('general')}
              >
                {t('Ability, Contract & Personality')}
              </button>
              <button
                type="button"
                role="tab"
                className="editor-modal__tab"
                aria-selected={playerSubTab === 'attributes'}
                onClick={() => setPlayerSubTab('attributes')}
              >
                {t('Visible & Hidden Attributes')}
              </button>
              <button
                type="button"
                role="tab"
                className="editor-modal__tab"
                aria-selected={playerSubTab === 'positions'}
                onClick={() => setPlayerSubTab('positions')}
              >
                {t('Positions & Feet')}
              </button>
            </div>

            {playerSubTab === 'general' && (
              <>
                <div className="editor-section">
                  <h3>{t('Ability, Reputation & Bio')}</h3>
                  <div className="editor-field-grid">
                    <label className="editor-field">
                      <span>{t('Actual CA')} (1–200)</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={player.actualCa}
                        onChange={e => applyPlayerField('Edit Actual CA', { actualCa: clampInt(e.target.value, player.actualCa, 1, 200) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('Actual PA')} (1–200)</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={player.potentialAbility}
                        onChange={e => applyPlayerField('Edit Actual PA', { potentialAbility: clampInt(e.target.value, player.potentialAbility, 1, 200) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('Morale')} (1–20)</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={player.morale ?? 15}
                        onChange={e => applyPlayerField('Edit Morale', { morale: clampInt(e.target.value, player.morale ?? 15, 1, 20) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('Market value')} (£)</span>
                      <input
                        type="number"
                        min={0}
                        max={1_500_000_000}
                        step={50_000}
                        value={player.marketValueGbp ?? 0}
                        onChange={e => applyPlayerField('Edit Market Value', { marketValueGbp: clampInt(e.target.value, player.marketValueGbp ?? 0, 0, 1_500_000_000) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('Current reputation')}</span>
                      <input
                        type="number"
                        min={1}
                        max={10_000}
                        value={player.currentReputation}
                        onChange={e => applyPlayerField('Edit Current Reputation', { currentReputation: clampInt(e.target.value, player.currentReputation, 1, 10_000) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('World reputation')}</span>
                      <input
                        type="number"
                        min={1}
                        max={10_000}
                        value={player.worldReputation}
                        onChange={e => applyPlayerField('Edit World Reputation', { worldReputation: clampInt(e.target.value, player.worldReputation, 1, 10_000) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('International caps')}</span>
                      <input
                        type="number"
                        min={0}
                        max={250}
                        value={player.intCaps}
                        onChange={e => applyPlayerField('Edit Caps', { intCaps: clampInt(e.target.value, player.intCaps, 0, 250) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('International goals')}</span>
                      <input
                        type="number"
                        min={0}
                        max={250}
                        value={player.intGoals}
                        onChange={e => applyPlayerField('Edit Int Goals', { intGoals: clampInt(e.target.value, player.intGoals, 0, 250) })}
                      />
                    </label>
                  </div>
                </div>

                {player.contract && (
                  <div className="editor-section">
                    <h3>{t('Active Contract')}</h3>
                    <div className="editor-field-grid">
                      <label className="editor-field">
                        <span>{t('Weekly wage')} (£)</span>
                        <input
                          type="number"
                          min={0}
                          max={10_000_000}
                          step={1_000}
                          value={player.contract.weeklyWageGbp ?? 0}
                          onChange={e => applyPlayerField('Edit Weekly Wage', { weeklyWageGbp: clampInt(e.target.value, player.contract?.weeklyWageGbp ?? 0, 0, 10_000_000) })}
                        />
                      </label>
                      <label className="editor-field">
                        <span>{t('Contract expiry')}</span>
                        <input
                          type="date"
                          value={player.contract.expiresAt ?? '2016-06-30'}
                          onChange={e => {
                            if (/^\d{4}-\d{2}-\d{2}$/u.test(e.target.value)) {
                              applyPlayerField('Edit Contract Expiry', { contractExpiresAt: e.target.value });
                            }
                          }}
                        />
                      </label>
                      <label className="editor-field">
                        <span>{t('Squad number')} (1–99)</span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={player.squadNumber ?? 1}
                          onChange={e => applyPlayerField('Edit Squad Number', { squadNumber: clampInt(e.target.value, player.squadNumber ?? 1, 1, 99) })}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {player.personality && (
                  <div className="editor-section">
                    <h3>{t('Personality (1–20)')}</h3>
                    <div className="editor-field-grid editor-field-grid--compact">
                      {PERSONALITY_KEYS.map(item => (
                        <label className="editor-field" key={item.key}>
                          <span>{t(item.label)}</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={player.personality![item.key]}
                            onChange={e =>
                              applyPlayerField(`Edit ${item.label}`, {
                                personality: { [item.key]: clampInt(e.target.value, player.personality![item.key], 1, 20) }
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {playerSubTab === 'attributes' && (
              <>
                <div className="editor-section">
                  <h3>{t('Hidden Playing Traits (1–20)')}</h3>
                  <div className="editor-field-grid editor-field-grid--compact">
                    {HIDDEN_KEYS.map(item => (
                      <label className="editor-field" key={item.key}>
                        <span>{t(item.label)}</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={player.hiddenPlaying[item.key]}
                          onChange={e =>
                            applyPlayerField(`Edit ${item.label}`, {
                              hiddenPlaying: { [item.key]: clampInt(e.target.value, player.hiddenPlaying[item.key], 1, 20) }
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="editor-section">
                  <h3>{t('Visible Technical, Mental, Physical & GK Attributes (1–20)')}</h3>
                  <div className="editor-field-grid editor-field-grid--compact">
                    {VISIBLE_ATTR_LIST.map(attrKey => (
                      <label className="editor-field" key={attrKey}>
                        <span>{attrKey}</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={player.attributes[attrKey] ?? 10}
                          onChange={e =>
                            applyPlayerField(`Edit ${attrKey}`, {
                              attributes: { [attrKey]: clampInt(e.target.value, player.attributes[attrKey] ?? 10, 1, 20) }
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {playerSubTab === 'positions' && (
              <>
                <div className="editor-section">
                  <h3>{t('Preferred feet')} (1–20)</h3>
                  <div className="editor-field-grid">
                    <label className="editor-field">
                      <span>{t('Left foot')}</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={player.leftFoot}
                        onChange={e => applyPlayerField('Edit Left Foot', { leftFoot: clampInt(e.target.value, player.leftFoot, 1, 20) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('Right foot')}</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={player.rightFoot}
                        onChange={e => applyPlayerField('Edit Right Foot', { rightFoot: clampInt(e.target.value, player.rightFoot, 1, 20) })}
                      />
                    </label>
                  </div>
                </div>
                <div className="editor-section">
                  <h3>{t('Positional familiarity (1–20)')}</h3>
                  <div className="editor-field-grid editor-field-grid--compact">
                    {POSITION_KEYS.map(pos => (
                      <label className="editor-field" key={pos}>
                        <span>{pos}</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={player.positions[pos]}
                          onChange={e =>
                            applyPlayerField(`Edit ${pos}`, {
                              positions: { [pos]: clampInt(e.target.value, player.positions[pos], 1, 20) }
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {target.kind === 'staff' && staffMember && (
          <>
            <div className="editor-section">
              <h3>{t('Staff Ability, Reputation & Contract')}</h3>
              <div className="editor-field-grid">
                <label className="editor-field">
                  <span>{t('Staff CA')} (1–200)</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={staffMember.staffCa}
                    onChange={e => applyStaffField('Edit Staff CA', { staffCa: clampInt(e.target.value, staffMember.staffCa, 1, 200) })}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Staff PA')} (1–200)</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={staffMember.staffPa}
                    onChange={e => applyStaffField('Edit Staff PA', { staffPa: clampInt(e.target.value, staffMember.staffPa, 1, 200) })}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Current reputation')}</span>
                  <input
                    type="number"
                    min={1}
                    max={10_000}
                    value={staffMember.currentReputation}
                    onChange={e => applyStaffField('Edit Staff Reputation', { currentReputation: clampInt(e.target.value, staffMember.currentReputation, 1, 10_000) })}
                  />
                </label>
                {staffMember.weeklyWageGbp !== null && (
                  <label className="editor-field">
                    <span>{t('Weekly wage')} (£)</span>
                    <input
                      type="number"
                      min={0}
                      max={10_000_000}
                      step={500}
                      value={staffMember.weeklyWageGbp}
                      onChange={e => applyStaffField('Edit Staff Wage', { weeklyWageGbp: clampInt(e.target.value, staffMember.weeklyWageGbp ?? 0, 0, 10_000_000) })}
                    />
                  </label>
                )}
              </div>
            </div>
            {staffMember.attributes && (
              <div className="editor-section">
                <h3>{t('Coaching, Scouting, Mental & Medical Attributes (1–20)')}</h3>
                <div className="editor-field-grid editor-field-grid--compact">
                  {STAFF_ATTR_KEYS.map(item => (
                    <label className="editor-field" key={item.key}>
                      <span>{t(item.label)}</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={staffMember.attributes![item.key]}
                        onChange={e =>
                          applyStaffField(`Edit ${item.label}`, {
                            attributes: { [item.key]: clampInt(e.target.value, staffMember.attributes![item.key], 1, 20) }
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {target.kind === 'club' && club && (
          <>
            <div className="editor-presets">
              <strong>{t('Club presets')}:</strong>
              <Button type="button" onClick={() => applyClubPreset(club.uid, 'inspire_team', 'Inspire Squad')}>
                {t('Inspire squad')}
              </Button>
              <Button type="button" onClick={() => applyClubPreset(club.uid, 'heal_fitness_morale_team', 'Heal & Boost Fitness')}>
                {t('Heal & max fitness squad')}
              </Button>
              <Button type="button" onClick={() => applyClubPreset(club.uid, 'match_squad_ca_pa', 'Match Squad CA to PA')}>
                {t('Match squad CA to PA')}
              </Button>
              <Button type="button" onClick={() => applyClubPreset(club.uid, 'boost_finances_facilities', 'Boost Finances & Facilities')}>
                {t('Max facilities & £250M balance')}
              </Button>
            </div>
            <div className="editor-section">
              <h3>{t('Finances & Facilities')}</h3>
              <div className="editor-field-grid">
                {club.financeType !== 'none' && (
                  <label className="editor-field">
                    <span>{t('Balance')} (£)</span>
                    <input
                      type="number"
                      min={-1_000_000_000}
                      max={1_500_000_000}
                      step={250_000}
                      value={club.balanceGbp ?? 0}
                      onChange={e => applyClubField('Edit Club Balance', { balanceGbp: clampInt(e.target.value, club.balanceGbp ?? 0, -1_000_000_000, 1_500_000_000) })}
                    />
                  </label>
                )}
                {club.financeType === 'full' && (
                  <>
                    <label className="editor-field">
                      <span>{t('Transfer budget')} (£)</span>
                      <input
                        type="number"
                        min={0}
                        max={1_500_000_000}
                        step={250_000}
                        value={club.transferBudgetGbp ?? 0}
                        onChange={e => applyClubField('Edit Transfer Budget', { transferBudgetGbp: clampInt(e.target.value, club.transferBudgetGbp ?? 0, 0, 1_500_000_000) })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{t('Wage budget')} (£)</span>
                      <input
                        type="number"
                        min={0}
                        max={50_000_000}
                        step={10_000}
                        value={club.weeklyWageBudgetGbp ?? 0}
                        onChange={e => applyClubField('Edit Wage Budget', { weeklyWageBudgetGbp: clampInt(e.target.value, club.weeklyWageBudgetGbp ?? 0, 0, 50_000_000) })}
                      />
                    </label>
                  </>
                )}
                <label className="editor-field">
                  <span>{t('Training facilities')} (1–20)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={club.trainingFacilities ?? 10}
                    onChange={e => applyClubField('Edit Training Facilities', { trainingFacilities: clampInt(e.target.value, club.trainingFacilities ?? 10, 1, 20) })}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Youth facilities')} (1–20)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={club.youthFacilities ?? 10}
                    onChange={e => applyClubField('Edit Youth Facilities', { youthFacilities: clampInt(e.target.value, club.youthFacilities ?? 10, 1, 20) })}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Youth coaching')} (1–20)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={club.youthCoaching ?? 10}
                    onChange={e => applyClubField('Edit Youth Coaching', { youthCoaching: clampInt(e.target.value, club.youthCoaching ?? 10, 1, 20) })}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Youth recruitment')} (1–20)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={club.youthRecruitment ?? 10}
                    onChange={e => applyClubField('Edit Youth Recruitment', { youthRecruitment: clampInt(e.target.value, club.youthRecruitment ?? 10, 1, 20) })}
                  />
                </label>
              </div>
            </div>
          </>
        )}

        {target.kind === 'stadium' && stadium && (
          <div className="editor-section">
            <h3>{t('Stadium Capacities')}</h3>
            <div className="editor-field-grid">
              <label className="editor-field">
                <span>{t('Capacity')}</span>
                <input
                  type="number"
                  min={100}
                  max={500_000}
                  step={500}
                  value={stadium.capacity}
                  onChange={e => applyStadiumField('Edit Stadium Capacity', { capacity: clampInt(e.target.value, stadium.capacity, 100, 500_000) })}
                />
              </label>
              <label className="editor-field">
                <span>{t('Seating')}</span>
                <input
                  type="number"
                  min={0}
                  max={500_000}
                  step={500}
                  value={stadium.seatingCapacity}
                  onChange={e => applyStadiumField('Edit Stadium Seating', { seatingCapacity: clampInt(e.target.value, stadium.seatingCapacity, 0, 500_000) })}
                />
              </label>
              <label className="editor-field">
                <span>{t('Expansion')}</span>
                <input
                  type="number"
                  min={0}
                  max={500_000}
                  step={500}
                  value={stadium.expansionCapacity}
                  onChange={e => applyStadiumField('Edit Expansion Capacity', { expansionCapacity: clampInt(e.target.value, stadium.expansionCapacity, 0, 500_000) })}
                />
              </label>
            </div>
          </div>
        )}

        {target.kind === 'mass_edit' && (
          <>
            {managedClubUid !== null && (
              <div className="editor-presets">
                <strong>{t('Managed club presets')}:</strong>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'inspire_team', 'Inspire Managed Squad')}>
                  {t('Inspire squad')}
                </Button>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'heal_fitness_morale_team', 'Heal Managed Squad')}>
                  {t('Heal & max fitness squad')}
                </Button>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'match_squad_ca_pa', 'Match Managed Squad CA-PA')}>
                  {t('Match squad CA to PA')}
                </Button>
                <Button type="button" onClick={() => applyClubPreset(managedClubUid, 'boost_finances_facilities', 'Boost Managed Club')}>
                  {t('Max facilities & £250M balance')}
                </Button>
              </div>
            )}

            <div className="editor-section">
              <h3>{t('Mass Edit Players')} ({massTargetPlayers.length.toLocaleString()} {t('matched')})</h3>
              <div className="editor-field-grid">
                <label className="editor-field">
                  <span>{t('Filter by club')}</span>
                  <select value={massClubUid} onChange={e => setMassClubUid(e.target.value)}>
                    <option value="all">{t('All clubs')}</option>
                    {clubsWithPlayers.map(c => (
                      <option key={c.uid} value={String(c.uid)}>
                        {c.shortName || c.fullName} ({c.playerCount})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  <span>{t('Maximum age')}</span>
                  <input
                    type="number"
                    min={14}
                    max={99}
                    value={massMaxAge}
                    onChange={e => setMassMaxAge(e.target.value)}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Set morale')} (1–20)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={massMorale}
                    onChange={e => setMassMorale(e.target.value)}
                  />
                </label>
                <label className="editor-field">
                  <span>{t('Optional Actual CA')} (1–200)</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="—"
                    value={massCaBoost}
                    onChange={e => setMassCaBoost(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <Button type="button" variant="primary" disabled={massTargetPlayers.length === 0} onClick={applyMassEdit}>
                  {t('Apply mass edit to draft')}
                </Button>
              </div>
            </div>
          </>
        )}

        {target.kind === 'save_as' && (
          <div className="editor-section">
            <div className="editor-presets">
              <Status tone={writerKeyReady ? 'positive' : 'warning'}>
                {t(writerKeyReady ? 'HMAC-SHA512 signing key ready' : 'Local fm.exe authorization required')}
              </Status>
              <span>
                {t('Original SHA-256')}: <code className="mono">{baseDatabase.source.sha256.slice(0, 16)}…</code> ({t('never modified')})
              </span>
              {!writerKeyReady && (
                <Button type="button" variant="primary" onClick={() => exeInputRef.current?.click()}>
                  {t('Select FM2013 fm.exe (13.3.3f359652)')}
                </Button>
              )}
            </div>

            {!hasRawSaveBytes && (
              <div className="inline-alert" role="alert">
                {t('This save was restored from IndexedDB metadata without the original .fm binary. Re-select the .fm file once to export a patched Save As .fm copy.')}
              </div>
            )}

            <label className="editor-field">
              <span>{t('New Save As .fm filename')}</span>
              <input
                type="text"
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
              />
            </label>

            <h3>{t('Pending field changes')} ({diffEntries.length})</h3>
            {diffEntries.length === 0 ? (
              <p className="save-db-mode-note">{t('No draft changes yet — exporting now creates a verified lossless copy of the current save.')}</p>
            ) : (
              <div className="editor-diff-wrap">
                <table className="save-db-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('Type')}</th>
                      <th scope="col">{t('Name')}</th>
                      <th scope="col">{t('Field')}</th>
                      <th scope="col">{t('Before')}</th>
                      <th scope="col">{t('After')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffEntries.slice(0, 200).map((item, idx) => (
                      <tr key={`${item.entityKind}-${item.uid}-${item.field}-${idx}`}>
                        <td>{item.entityKind}</td>
                        <td><strong>{item.entityName}</strong></td>
                        <td className="mono">{item.field}</td>
                        <td className="save-db-num">{String(item.before ?? '—')}</td>
                        <td className="save-db-num"><strong>{String(item.after)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="editor-modal__foot">
          <div>
            {diffEntries.length > 0 && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (window.confirm(t('Discard all unsaved draft edits on this save?'))) {
                    onDiscardAll();
                    setNotice(t('All draft edits discarded.'));
                  }
                }}
              >
                {t('Discard all edits')} ({diffEntries.length})
              </Button>
            )}
          </div>
          <div className="save-db-actions">
            {target.kind === 'save_as' && (
              <Button
                type="button"
                variant="primary"
                disabled={!hasRawSaveBytes || !writerKeyReady || writingSave}
                onClick={() => onSaveAsFm(outputName)}
              >
                <Icon name="download" size={15} />
                {t(writingSave ? 'Signing & verifying .fm copy…' : 'Download experimental Save As .fm')}
              </Button>
            )}
            <Button type="button" variant="default" onClick={onClose}>
              {t('Done')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SaveEntityEditorModal);
