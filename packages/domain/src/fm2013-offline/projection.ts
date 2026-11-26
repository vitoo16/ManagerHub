import { ATTRIBUTE_GROUPS, type AttributeKey, type PlayerDataset, type PlayerExport } from '../player-import';
import type { EvidenceField } from '../types';
import {
  DECODED_SAVE_DB_SCHEMA_VERSION,
  type DecodedHiddenPlayingAttributes,
  type DecodedPersonalityAttributes,
  type DecodedSaveDatabase,
  type DecodedSaveDatabaseSummary,
  type DecodedSaveMode,
  type DecodedSavePlayer,
  type DecodedSaveStaff,
  type DecodedStaffAttributes,
  type ProjectedPlayerHiddenFields
} from './types';

const ALL_DECODED_ATTRIBUTE_COLUMNS: readonly AttributeKey[] = [
  ...ATTRIBUTE_GROUPS.Technical,
  ...ATTRIBUTE_GROUPS.Mental,
  ...ATTRIBUTE_GROUPS.Physical,
  ...ATTRIBUTE_GROUPS.Goalkeeping
];

function verifiedField<T>(
  value: T,
  edition: string,
  build: string
): EvidenceField<T> {
  return {
    value,
    source: 'decoded_save',
    verification: 'verified',
    edition,
    build,
    missingReason: null
  };
}

function redactedField<T>(edition: string, build: string): EvidenceField<T> {
  return {
    value: null,
    source: 'decoded_save',
    verification: 'verified',
    edition,
    build,
    missingReason: 'redacted'
  };
}

function notPresentField<T>(edition: string, build: string): EvidenceField<T> {
  return {
    value: null,
    source: 'decoded_save',
    verification: 'verified',
    edition,
    build,
    missingReason: 'not_present'
  };
}

/**
 * Enforce strict Editor vs Realism field isolation for every decoded player.
 * Realism mode redacts Actual CA, Actual PA, reputations, hidden playing traits,
 * and hidden personality attributes so they never leak into tables, profiles, or exports.
 */
export function projectPlayerHiddenFields(
  player: DecodedSavePlayer,
  mode: DecodedSaveMode,
  edition: string,
  build: string
): ProjectedPlayerHiddenFields {
  if (mode === 'realism') {
    return {
      actualCa: redactedField<number>(edition, build),
      potentialAbility: redactedField<number>(edition, build),
      homeReputation: redactedField<number>(edition, build),
      currentReputation: redactedField<number>(edition, build),
      worldReputation: redactedField<number>(edition, build),
      hiddenPlaying: redactedField<DecodedHiddenPlayingAttributes>(edition, build),
      personality: redactedField<DecodedPersonalityAttributes>(edition, build)
    };
  }
  return {
    actualCa: verifiedField(player.actualCa, edition, build),
    potentialAbility: verifiedField(player.potentialAbility, edition, build),
    homeReputation: verifiedField(player.homeReputation, edition, build),
    currentReputation: verifiedField(player.currentReputation, edition, build),
    worldReputation: verifiedField(player.worldReputation, edition, build),
    hiddenPlaying: verifiedField(player.hiddenPlaying, edition, build),
    personality: player.personality
      ? verifiedField(player.personality, edition, build)
      : notPresentField<DecodedPersonalityAttributes>(edition, build)
  };
}

/** Project staff CA/PA and coaching/mental attributes cleanly under Editor vs Realism isolation. */
export function projectStaffAbility(
  staff: DecodedSaveStaff,
  mode: DecodedSaveMode,
  edition: string,
  build: string
): {
  readonly staffCa: EvidenceField<number>;
  readonly staffPa: EvidenceField<number>;
  readonly currentReputation: EvidenceField<number>;
  readonly attributes: EvidenceField<DecodedStaffAttributes>;
} {
  const attrsField = staff.attributes
    ? verifiedField(staff.attributes, edition, build)
    : notPresentField<DecodedStaffAttributes>(edition, build);
  if (mode === 'realism') {
    return {
      staffCa: redactedField<number>(edition, build),
      staffPa: redactedField<number>(edition, build),
      currentReputation: redactedField<number>(edition, build),
      attributes: attrsField
    };
  }
  return {
    staffCa: verifiedField(staff.staffCa, edition, build),
    staffPa: verifiedField(staff.staffPa, edition, build),
    currentReputation: verifiedField(staff.currentReputation, edition, build),
    attributes: attrsField
  };
}

/**
 * Convert a decoded FM2013 save database into a unified PlayerDataset directly
 * consumable by Player Lab, Squad Planner, Tactical Lab, and Scouting Shortlist
 * without any CSV or HTML export step.
 */
/** Canonical visibility-aware projection for a single record or a whole roster. */
export function projectSavePlayer(player: DecodedSaveDatabase['players'][number], saveId: string, mode: DecodedSaveMode): PlayerExport {
  return {
    id: `${saveId.slice(0, 12)}:${player.uid}`,
    nativeId: player.uid,
    name: player.displayName,
    position: player.positionSummary,
    age: player.calendarAge,
    club: player.clubShortName ?? player.clubName,
    nationality: player.primaryNationName,
    attributes: player.attributes,
    source: 'decoded_save',
    verification: 'verified',
    birthDate: player.birthDate,
    heightCm: player.heightCm,
    weightKg: player.weightKg,
    marketValueGbp: player.marketValueGbp,
    weeklyWageGbp: player.contract?.weeklyWageGbp ?? null,
    contractExpiresAt: player.contract?.expiresAt ?? null,
    squadNumber: player.squadNumber,
    isLoanedIn: player.isLoanedIn,
    parentClubName: player.parentClubName,
    leftFoot: player.leftFoot,
    rightFoot: player.rightFoot,
    positions: { ...player.positions },
    ...(mode === 'editor'
      ? {
          actualCa: player.actualCa,
          potentialAbility: player.potentialAbility,
          homeReputation: player.homeReputation,
          currentReputation: player.currentReputation,
          worldReputation: player.worldReputation,
          hiddenPlaying: player.hiddenPlaying,
          personality: player.personality
        }
      : {
          actualCa: null,
          potentialAbility: null,
          homeReputation: null,
          currentReputation: null,
          worldReputation: null,
          hiddenPlaying: null,
          personality: null
        })
  };
}

export function saveDatabaseToPlayerDataset(
  db: DecodedSaveDatabase,
  mode: DecodedSaveMode,
  options: { readonly clubUid?: number | null } = {}
): PlayerDataset {
  const clubUid = options.clubUid ?? null;
  const filtered = clubUid !== null
    ? db.players.filter(p => p.clubUid === clubUid)
    : db.players;
  const selectedClub = clubUid !== null
    ? db.clubs.find(c => c.uid === clubUid) ?? null
    : null;

  const players = filtered.map(player => projectSavePlayer(player, db.source.saveId, mode));

  const warnings: string[] = [];
  if (mode === 'realism') {
    warnings.push('Realism mode active: Actual CA, PA, reputations, and hidden personality/playing attributes are redacted.');
  }

  return {
    fileName: selectedClub
      ? `${db.source.fileName} · ${selectedClub.shortName || selectedClub.fullName}`
      : db.source.fileName,
    importedAt: db.source.decodedAt,
    players,
    attributeColumns: ALL_DECODED_ATTRIBUTE_COLUMNS,
    warnings,
    source: 'decoded_save',
    actualCaAvailable: mode === 'editor',
    potentialAbilityAvailable: mode === 'editor',
    saveId: db.source.saveId,
    saveMode: mode,
    saveEdition: db.source.edition,
    saveBuild: db.source.build,
    saveGameDate: db.source.gameDate,
    clubFilterUid: clubUid,
    clubFilterName: selectedClub ? (selectedClub.shortName || selectedClub.fullName) : null
  };
}

export function summarizeSaveDatabase(
  db: DecodedSaveDatabase,
  savedAt: string = new Date().toISOString()
): DecodedSaveDatabaseSummary {
  return {
    saveId: db.source.saveId,
    schemaVersion: DECODED_SAVE_DB_SCHEMA_VERSION,
    savedAt,
    source: db.source,
    counts: db.counts,
    humans: db.humans
  };
}
