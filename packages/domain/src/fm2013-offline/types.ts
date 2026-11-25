import type { AttributeKey } from '../player-import';
import type { EvidenceField } from '../types';

export const DECODED_SAVE_DB_SCHEMA_VERSION = 1 as const;
export const FM2013_OFFLINE_ADAPTER_VERSION = 'fm2013-offline-1.0.0' as const;
export const FM2013_MIN_GAME_DB_VERSION = 0x757;
export const FM2013_MAX_GAME_DB_VERSION = 0x774;
export const OBSERVED_FM2013_GAME_DB_VERSIONS = [
  0x757,
  0x75f,
  0x763,
  0x765,
  0x76e,
  0x773,
  0x774
] as const;

export type DecodedSaveMode = 'realism' | 'editor';

export type ChecksumVerificationStatus =
  | 'verified_hmac_sha512'
  | 'structural_64b_unverified';

export type CompatibilityVerificationStatus =
  | 'verified'
  | 'research_only'
  | 'unsupported_build'
  | 'edition_build_unknown'
  | 'ambiguous_profile'
  | 'unknown_format';

export type FM2013DecodeErrorCode =
  | 'INVALID_FILE'
  | 'SIZE_LIMIT_EXCEEDED'
  | 'INVALID_SIGNATURE'
  | 'TRUNCATED_ARCHIVE'
  | 'CORRUPT_DIRECTORY'
  | 'MISSING_GAME_DB'
  | 'CORRUPT_MEMBER'
  | 'UNSUPPORTED_DB_VERSION'
  | 'TRUNCATED_DATABASE'
  | 'CORRUPT_DATABASE'
  | 'TAMPERED_CHECKSUM'
  | 'UNSUPPORTED_WRITE_TARGET'
  | 'CRYPTO_UNAVAILABLE'
  | 'DECOMPRESSION_UNAVAILABLE';

export class FM2013DecodeError extends Error {
  readonly code: FM2013DecodeErrorCode;

  constructor(code: FM2013DecodeErrorCode, message: string) {
    super(message);
    this.name = 'FM2013DecodeError';
    this.code = code;
  }
}

export type FM2013DecodeStage =
  | 'hashing'
  | 'reading_container'
  | 'decrypting_database'
  | 'parsing_tables'
  | 'indexing_database';

export interface FM2013DecodeProgress {
  readonly stage: FM2013DecodeStage;
  readonly percent: number;
  readonly detail?: string;
}

export interface DecodedPositionRatings {
  readonly GK: number;
  readonly SW: number;
  readonly DL: number;
  readonly DC: number;
  readonly DR: number;
  readonly DM: number;
  readonly ML: number;
  readonly MC: number;
  readonly MR: number;
  readonly AML: number;
  readonly AMC: number;
  readonly AMR: number;
  readonly ST: number;
  readonly WBL: number;
  readonly WBR: number;
}

export interface DecodedHiddenPlayingAttributes {
  readonly dirtiness: number;
  readonly consistency: number;
  readonly importantMatches: number;
  readonly injuryProneness: number;
  readonly versatility: number;
}

export interface DecodedPersonalityAttributes {
  readonly adaptability: number;
  readonly ambition: number;
  readonly loyalty: number;
  readonly pressure: number;
  readonly professionalism: number;
  readonly sportsmanship: number;
  readonly temperament: number;
  readonly controversy: number;
}

/**
 * Complete FMRTE13 staff Coaching + Mental/Scouting/Medical attributes
 * decoded from T28 `NON_PLAYING_DATA` (`0x29` = 41 bytes, verified against `fm.exe` `0x1247480`).
 */
export interface DecodedStaffAttributes {
  readonly attacking: number;
  readonly defending: number;
  readonly fitness: number;
  readonly goalkeepers: number;
  readonly mental: number;
  readonly player: number;
  readonly tactical: number;
  readonly technical: number;
  readonly manManagement: number;
  readonly workingWithYoungsters: number;
  readonly adaptability: number;
  readonly determination: number;
  readonly judgingPlayerAbility: number;
  readonly judgingPlayerPotential: number;
  readonly levelOfDiscipline: number;
  readonly motivating: number;
  readonly physiotherapy: number;
  readonly tacticalKnowledge: number;
}

export interface DecodedPlayerContract {
  readonly clubUid: number | null;
  readonly clubName: string | null;
  readonly weeklyWageGbp: number | null;
  readonly expiresAt: string | null;
  readonly joinedAt: string | null;
  readonly isLoan: boolean;
  readonly jobType: number;
  readonly squadNumber: number | null;
}

export interface DecodedSavePlayer {
  readonly uid: number;
  readonly rowId: number;
  readonly personTag: 2 | 3;
  readonly firstName: string;
  readonly lastName: string;
  readonly commonName: string | null;
  readonly fullName: string;
  readonly displayName: string;
  readonly birthDate: string | null;
  readonly calendarAge: number | null;
  readonly primaryNationUid: number | null;
  readonly primaryNationName: string | null;
  readonly birthCityUid: number | null;
  readonly birthCityName?: string | null;
  readonly clubUid: number | null;
  readonly clubName: string | null;
  readonly clubShortName: string | null;
  readonly parentClubUid: number | null;
  readonly parentClubName: string | null;
  readonly teamUid: number | null;
  readonly teamType: number | null;
  readonly positionSummary: string;
  readonly positions: DecodedPositionRatings;
  readonly attributes: Readonly<Record<AttributeKey, number>>;
  readonly leftFoot: number;
  readonly rightFoot: number;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly morale: number | null;
  readonly marketValueGbp: number | null;
  readonly intCaps: number;
  readonly intGoals: number;
  readonly squadNumber: number | null;
  readonly isLoanedIn: boolean;
  readonly contract: DecodedPlayerContract | null;
  /** Editor-only verified hidden fields; redacted by projection in Realism mode. */
  readonly actualCa: number;
  readonly potentialAbility: number;
  readonly homeReputation: number;
  readonly currentReputation: number;
  readonly worldReputation: number;
  readonly hiddenPlaying: DecodedHiddenPlayingAttributes;
  readonly personality: DecodedPersonalityAttributes | null;
}

export interface DecodedSaveStaff {
  readonly uid: number;
  readonly rowId: number;
  readonly personTag: 1 | 3 | 9;
  readonly isHuman: boolean;
  readonly firstName: string;
  readonly lastName: string;
  readonly commonName: string | null;
  readonly displayName: string;
  readonly birthDate: string | null;
  readonly calendarAge: number | null;
  readonly primaryNationUid: number | null;
  readonly primaryNationName: string | null;
  readonly clubUid: number | null;
  readonly clubName: string | null;
  readonly jobType: number | null;
  readonly weeklyWageGbp: number | null;
  readonly contractExpiresAt: string | null;
  readonly attributes?: DecodedStaffAttributes | null;
  /** Editor-only verified staff ability fields; redacted in Realism mode. */
  readonly staffCa: number;
  readonly staffPa: number;
  readonly homeReputation: number;
  readonly currentReputation: number;
  readonly worldReputation: number;
}

export interface DecodedSaveClub {
  readonly uid: number;
  readonly rowId: number;
  readonly fullName: string;
  readonly shortName: string;
  readonly sixLetterName: string;
  readonly nickname: string;
  readonly nationUid: number | null;
  readonly nationName: string | null;
  readonly cityUid: number | null;
  readonly cityName?: string | null;
  readonly yearFounded: number | null;
  readonly trainingFacilities: number | null;
  readonly youthFacilities: number | null;
  readonly youthCoaching: number | null;
  readonly youthRecruitment: number | null;
  readonly professionalStatus: number | null;
  readonly financeType: 'basic' | 'full' | 'none';
  readonly balanceGbp: number | null;
  readonly transferBudgetGbp: number | null;
  readonly transferBudgetSeasonGbp: number | null;
  readonly weeklyWageBillGbp: number | null;
  readonly weeklyWageBudgetGbp: number | null;
  readonly primaryStadiumUid: number | null;
  readonly primaryCompUid: number | null;
  readonly firstTeamReputation: number | null;
  readonly playerCount: number;
  readonly staffCount: number;
}

export interface DecodedSaveTeam {
  readonly uid: number;
  readonly rowId: number;
  readonly isNationalTeam: boolean;
  readonly ownerClubUid: number | null;
  readonly ownerClubName: string | null;
  readonly teamType: number;
  readonly reputation: number;
  readonly compUid: number | null;
  readonly stadiumUid: number | null;
  readonly managerPersonUid: number | null;
}

export type ExternalNameProvenance = 'decoded_save' | 'lang_db' | 'not_stored_in_save';

export interface DecodedSaveStadium {
  readonly uid: number;
  readonly rowId: number;
  readonly customName: string | null;
  readonly nameProvenance: ExternalNameProvenance;
  readonly capacity: number;
  readonly seatingCapacity: number;
  readonly expansionCapacity: number;
  readonly ownerClubUid: number | null;
  readonly ownerClubName: string | null;
  readonly cityUid: number | null;
  readonly cityName?: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface DecodedSaveNation {
  readonly uid: number;
  readonly rowId: number;
  readonly fullName: string;
  readonly shortName: string;
  readonly playerCount: number;
  readonly clubCount: number;
  readonly staffCount: number;
}

export interface DecodedSaveCompetition {
  readonly uid: number;
  readonly rowId: number;
  readonly customName: string | null;
  readonly shortName?: string | null;
  readonly nameProvenance: ExternalNameProvenance;
  readonly teamCount: number;
  readonly sampleClubs: readonly string[];
}

export interface DecodedSaveHuman {
  readonly personUid: number | null;
  readonly personRowId: number | null;
  readonly managerName: string;
  readonly clubUid: number | null;
  readonly clubName: string;
}

export interface DecodedSaveEntityCounts {
  readonly players: number;
  readonly staff: number;
  readonly humans: number;
  readonly clubs: number;
  readonly teams: number;
  readonly stadiums: number;
  readonly nations: number;
  readonly competitions: number;
  readonly cities: number;
  readonly awards: number;
  readonly injuries: number;
  readonly derbies: number;
  readonly currencies: number;
  readonly languages: number;
  readonly totalPersons: number;
}

export interface DecodedSaveSourceMetadata {
  readonly saveId: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly lastModified: number;
  readonly sha256: string;
  readonly signature: string;
  readonly family: 'afe' | 'fmf';
  readonly compressed: boolean;
  readonly edition: 'FM2013';
  readonly build: string;
  readonly compatibilityStatus?: CompatibilityVerificationStatus;
  readonly checksumStatus?: ChecksumVerificationStatus;
  readonly langDbAttached?: boolean;
  readonly gameDbVersion: number;
  readonly gameDbVersionHex: string;
  readonly gameDbBytes: number;
  readonly dbString: string | null;
  readonly gameDate: string | null;
  readonly memberCount: number;
  readonly totalArchiveMemberCount?: number;
  readonly decodedAt: string;
  readonly adapterVersion: typeof FM2013_OFFLINE_ADAPTER_VERSION;
  readonly writeCapability: false;
}

export interface DecodedSaveCoverage {
  readonly verifiedDomains: readonly string[];
  readonly notStoredInSave: readonly string[];
  readonly notDecoded: readonly string[];
  readonly gameDbExactEof: boolean;
}

export interface DecodedSaveDatabase {
  readonly schemaVersion: typeof DECODED_SAVE_DB_SCHEMA_VERSION;
  readonly source: DecodedSaveSourceMetadata;
  readonly counts: DecodedSaveEntityCounts;
  readonly coverage: DecodedSaveCoverage;
  readonly humans: readonly DecodedSaveHuman[];
  readonly players: readonly DecodedSavePlayer[];
  readonly staff: readonly DecodedSaveStaff[];
  readonly clubs: readonly DecodedSaveClub[];
  readonly teams: readonly DecodedSaveTeam[];
  readonly stadiums: readonly DecodedSaveStadium[];
  readonly nations: readonly DecodedSaveNation[];
  readonly competitions: readonly DecodedSaveCompetition[];
}

export interface DecodedSaveDatabaseSummary {
  readonly saveId: string;
  readonly schemaVersion: typeof DECODED_SAVE_DB_SCHEMA_VERSION;
  readonly savedAt: string;
  readonly source: DecodedSaveSourceMetadata;
  readonly counts: DecodedSaveEntityCounts;
  readonly humans: readonly DecodedSaveHuman[];
}

export interface ProjectedPlayerHiddenFields {
  readonly actualCa: EvidenceField<number>;
  readonly potentialAbility: EvidenceField<number>;
  readonly homeReputation: EvidenceField<number>;
  readonly currentReputation: EvidenceField<number>;
  readonly worldReputation: EvidenceField<number>;
  readonly hiddenPlaying: EvidenceField<DecodedHiddenPlayingAttributes>;
  readonly personality: EvidenceField<DecodedPersonalityAttributes>;
}
