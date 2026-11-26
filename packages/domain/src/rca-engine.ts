import type { AttributeKey } from './player-import';
import type { RolePosition } from './football-role-registry';

/**
 * Epistemic verification levels aligned with ManagerHub Research & Save Safety governance.
 */
export type RcaEpistemicStatus =
  | 'OBSERVED'
  | 'INFERRED'
  | 'VERIFIED'
  | 'CERTIFIED'
  | 'UNKNOWN';

export type RcaCompatibilityStatus =
  | 'Shared and verified'
  | 'Version-specific'
  | 'Compatible but unverified'
  | 'Changed between versions'
  | 'Unknown';

export type RcaArchetypeId =
  | 'Goalkeeper'
  | 'DefenderCentral'
  | 'FullBack'
  | 'WingBack'
  | 'DefensiveMidfielder'
  | 'MidfielderCentral'
  | 'WideMidfielder'
  | 'AttackingMidfielderCentral'
  | 'Winger'
  | 'Striker';

export type RcaZeroCostHiddenTrait =
  | 'consistency'
  | 'dirtiness'
  | 'importantMatches'
  | 'injuryProneness'
  | 'versatility';

export type RcaZeroCostPersonalityTrait =
  | 'adaptability'
  | 'ambition'
  | 'controversy'
  | 'loyalty'
  | 'pressure'
  | 'professionalism'
  | 'sportsmanship'
  | 'temperament';

export interface RcaEvidenceRecord {
  readonly id: string;
  readonly artifact: string;
  readonly version: string;
  readonly sha256: string;
  readonly method: string;
  readonly status: RcaEpistemicStatus;
  readonly summary: string;
}

export interface RcaArchetypeWeightSpec {
  readonly archetype: RcaArchetypeId;
  readonly weakerFootWeight: number;
  readonly attributeWeights: Readonly<Partial<Record<AttributeKey, number>>>;
  readonly sumAttributeWeights: number;
  readonly sumTotalWeights: number;
  /** Empirical affine calibration: CA ≈ intercept + slope * weightedMean(1..20) */
  readonly empiricalIntercept: number;
  readonly empiricalSlope: number;
}

export interface RcaEditionProfile {
  readonly profileId: 'FM2013-research-v1' | 'FM2026-research-v1';
  readonly edition: 'FM2013' | 'FM2026';
  readonly supportedBuilds: readonly string[];
  readonly settingsVersion: '24.4.0.35';
  readonly weightSourceSha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa';
  readonly weightStatus: RcaEpistemicStatus;
  readonly formulaStatus: RcaEpistemicStatus;
  readonly compatibilityStatus: RcaCompatibilityStatus;
  /**
   * Fail-closed native write gate: true ONLY when exact edition + build formula is CERTIFIED.
   * Currently false for both FM2013 and FM2026 because FMRTE 26's Fmrte.Framework.dll is packed
   * (`uAutp`) and FM2013 predates FMRTE's RCA feature (`13.3.3.62` had no RCA).
   */
  readonly certifiedForAutoMatch: boolean;
  readonly positionsSupported: readonly RolePosition[];
  readonly positionArchetypeMap: Readonly<Record<RolePosition, RcaArchetypeId>>;
  readonly positionFallbackNotes: Readonly<Partial<Record<RolePosition, string>>>;
}

export interface RcaFootDiagnostics {
  readonly leftFoot: number | null;
  readonly rightFoot: number | null;
  readonly preferredFoot: 'left' | 'right' | 'both' | 'unknown';
  readonly preferredFootRating: number | null;
  readonly weakerFootRating: number | null;
  readonly isTwoFooted: boolean;
  readonly weakerFootWeight: number;
  readonly weightedPoints: number | null;
  readonly marginalAdvisoryCaPerStep: number;
}

export interface RcaAttributeBreakdownRow {
  readonly key: AttributeKey;
  readonly group: 'Technical' | 'Mental' | 'Physical' | 'Goalkeeping';
  readonly value: number | null;
  readonly weight: number;
  readonly zeroCost: boolean;
  readonly weightedPoints: number | null;
  readonly marginalAdvisoryCaPerStep: number;
}

export interface RcaPositionCandidateScore {
  readonly position: RolePosition;
  readonly familiarity: number;
  readonly archetype: RcaArchetypeId;
  readonly weightedMean: number;
  readonly rawWeightedSum: number;
  readonly advisoryRca: number;
  readonly isFallbackMapping: boolean;
}

export interface RcaDiagnosticReport {
  readonly status: 'evaluated' | 'insufficient-attributes' | 'unsupported-edition';
  readonly profile: RcaEditionProfile | null;
  readonly selectedPosition: RolePosition | null;
  readonly selectedArchetype: RcaArchetypeId | null;
  readonly positionSelectionBasis: 'explicit-override' | 'natural-20' | 'highest-familiarity' | 'default-mc' | 'none';
  readonly naturalPositions: readonly RolePosition[];
  readonly accomplishedPositions: readonly RolePosition[];
  readonly multiPositionPenaltyNote: string | null;
  readonly candidateScores: readonly RcaPositionCandidateScore[];
  readonly observedWeightCoverage: number;
  readonly weightedMeanRating: number | null;
  readonly rawWeightedSum: number | null;
  readonly totalArchetypeWeight: number | null;
  /** Advisory research RCA on 1..200 scale; NEVER claimed as certified native CA. */
  readonly advisoryRca: number | null;
  /** Signed actualCa - advisoryRca when both exist. */
  readonly caMinusAdvisoryRca: number | null;
  /** Signed potentialAbility - advisoryRca when both exist. */
  readonly paMinusAdvisoryRca: number | null;
  readonly exceedsPotentialAbility: boolean;
  readonly foot: RcaFootDiagnostics | null;
  readonly groupWeightedTotals: Readonly<{
    readonly Technical: number;
    readonly Mental: number;
    readonly Physical: number;
    readonly Goalkeeping: number;
    readonly WeakerFoot: number;
  }> | null;
  readonly attributeRows: readonly RcaAttributeBreakdownRow[];
  readonly zeroCostVisibleAttributes: readonly AttributeKey[];
  readonly zeroCostHiddenTraits: readonly RcaZeroCostHiddenTrait[];
  readonly zeroCostPersonalityTraits: readonly RcaZeroCostPersonalityTrait[];
  readonly autoMatchDecision: {
    readonly allowed: boolean;
    readonly nextCa: number | null;
    readonly preservesPa: true;
    readonly reason:
      | 'certified'
      | 'profile-not-certified'
      | 'edition-build-unknown'
      | 'unsupported-edition'
      | 'insufficient-attributes';
  };
  readonly provenanceSummary: string;
}

/**
 * Canonical evidence registry referencing SHA-256 digests and retained REA Evidence IDs.
 */
export const RCA_EVIDENCE_REGISTRY: readonly RcaEvidenceRecord[] = [
  {
    id: 'EV-FMRTE26-RCA-JSON',
    artifact: '<FMRTE26_INSTALL_ROOT>/Ratings/rca.json',
    version: '24.4.0.35 (shipped in FMRTE 26.3.2-build41)',
    sha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa',
    method: 'Direct JSON schema & weight matrix extraction',
    status: 'OBSERVED',
    summary: '10 positional archetypes, 47 visible attributes, 5 hidden traits, 8 personality traits, and WeakerFoot weights (3.0..7.5).'
  },
  {
    id: 'EV-FMRTE26-POSITIONS-JSON',
    artifact: '<FMRTE26_INSTALL_ROOT>/Ratings/positions.json',
    version: '24.4.0.35 (shipped in FMRTE 26.3.2-build41)',
    sha256: 'c1ee11733e8d76715a3d157f76e1742b8f4b6f2e22a11b9b54ada9891c7de675',
    method: 'Direct JSON comparison against rca.json and FMRTE 13 Ratings/FMRTE.xml',
    status: 'OBSERVED',
    summary: 'Proves positional % rating weights (-20..100 + AgePeak + AbilityDependent) are distinct from RCA CA-cost weights.'
  },
  {
    id: 'EV-FMRTE26-AVALONIA-DLL',
    artifact: '<FMRTE26_INSTALL_ROOT>/current/FmrteAvalonia.dll',
    version: '26.3.2.42 (MVID ae81bf4d-f887-2214-dad5-9a575848146b)',
    sha256: 'c763b9614e98f13a16f1b49b4a14ad191fc585627919fbac165970938d425ecf',
    method: 'REA inspect_managed_members (ev_bdf1ea070b38a8c685160958522acf7fce6383af642029c8d8373c25e122580e, ev_a61d53d35232eb3beaf07b84804b1f99848c90deb30f32c4ab1acd5830f7eeb3)',
    status: 'OBSERVED',
    summary: 'Confirms PersonalInformationViewModel CA(i2), PA(i2), RCA(i4), AbilityDifference(string), MatchCaWithRCA(bool), and AbilityView XAML bindings.'
  },
  {
    id: 'EV-FMRTE26-FRAMEWORK-PACKED',
    artifact: '<FMRTE26_INSTALL_ROOT>/current/FMRTE.dll (resource uAutp 0x28000002)',
    version: '26.3.2.42 (MVID c1d1bd13-5fbc-417d-40ad-2d18cd8973c8)',
    sha256: '29122b04bde4d77b5860423544d93f6bbef5b2e9c65b9a5749bd388c2be4b89e',
    method: 'REA inspect_managed_artifact (ev_4354c5ba30f94943de7cbe1fca1540aa417532a1cc435c3582dec562bf6dcd54)',
    status: 'UNKNOWN',
    summary: 'Fmrte.Framework.dll is embedded inside encrypted resource uAutp; never unpacked per anti-tamper compliance. Exact internal rounding/multi-position branches remain UNKNOWN.'
  },
  {
    id: 'EV-FMRTE13-NO-RCA',
    artifact: '<FMRTE13_INSTALL_ROOT>/FMRTE.exe',
    version: '13.3.3.62 (MVID 3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6)',
    sha256: 'c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae',
    method: 'REA inspect_managed_members (ev_c8421357f4ab30ad6d10deef76764b37f98e186374efe5eb4a85ccaeb169b607)',
    status: 'OBSERVED',
    summary: 'FMRTE 13 implements Match CA to PA and positional % ratings, but contains zero RCA engine or weight table.'
  },
  {
    id: 'EV-FM26-EDITOR-FMF',
    artifact: '<FM26_INSTALL_ROOT>/shared/data/editor.fmf',
    version: 'FM26 afe./fmf. v8 (zstd)',
    sha256: '3652da78662d8f0da91e67a6d396f1b47ef6c76c306d20ec7cc2538c7f3fffbc',
    method: 'Read-only zstd container decompression of SI Pre-Game Editor XML',
    status: 'OBSERVED',
    summary: 'Exposes SI person ability fourCCs: PCAB (CA), ERCL (Rec. CA), PCRD (CA/RCA % diff), PRDF (CA/RCA diff), PPAB (PA).'
  },
  {
    id: 'EV-FM2013-CORPUS-VALIDATION',
    artifact: '<FM2013_INSTALL_ROOT>/data/tutorial/*.fm + 4,058-player holdout save',
    version: 'FM2013 13.3.3f359652 (game_db v0x765..0x774)',
    sha256: 'df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871',
    method: 'Offline game_db decode + out-of-sample affine weighted-mean validation',
    status: 'VERIFIED',
    summary: 'R² = 0.9800 on 5,211 single-position tutorial players; out-of-sample MAE = 3.41..5.42 CA across 1,818 single-position holdout players (4.87 across all 4,058 players).'
  }
];

export const ZERO_COST_VISIBLE_ATTRIBUTES: readonly AttributeKey[] = [
  'aggression',
  'determination',
  'flair',
  'naturalFitness',
  'eccentricity',
  'rushingOut',
  'tendencyToPunch',
  'punching'
];

export const ZERO_COST_HIDDEN_TRAITS: readonly RcaZeroCostHiddenTrait[] = [
  'consistency',
  'dirtiness',
  'importantMatches',
  'injuryProneness',
  'versatility'
];

export const ZERO_COST_PERSONALITY_TRAITS: readonly RcaZeroCostPersonalityTrait[] = [
  'adaptability',
  'ambition',
  'controversy',
  'loyalty',
  'pressure',
  'professionalism',
  'sportsmanship',
  'temperament'
];

const ATTRIBUTE_GROUP_BY_KEY: Readonly<Record<AttributeKey, 'Technical' | 'Mental' | 'Physical' | 'Goalkeeping'>> = {
  corners: 'Technical', crossing: 'Technical', dribbling: 'Technical', finishing: 'Technical',
  firstTouch: 'Technical', freeKickTaking: 'Technical', heading: 'Technical', longShots: 'Technical',
  longThrows: 'Technical', marking: 'Technical', passing: 'Technical', penaltyTaking: 'Technical',
  tackling: 'Technical', technique: 'Technical',
  aggression: 'Mental', anticipation: 'Mental', bravery: 'Mental', composure: 'Mental',
  concentration: 'Mental', decisions: 'Mental', determination: 'Mental', flair: 'Mental',
  leadership: 'Mental', offTheBall: 'Mental', positioning: 'Mental', teamwork: 'Mental',
  vision: 'Mental', workRate: 'Mental',
  acceleration: 'Physical', agility: 'Physical', balance: 'Physical', jumpingReach: 'Physical',
  naturalFitness: 'Physical', pace: 'Physical', stamina: 'Physical', strength: 'Physical',
  aerialReach: 'Goalkeeping', commandOfArea: 'Goalkeeping', communication: 'Goalkeeping',
  eccentricity: 'Goalkeeping', handling: 'Goalkeeping', kicking: 'Goalkeeping',
  oneOnOnes: 'Goalkeeping', reflexes: 'Goalkeeping', rushingOut: 'Goalkeeping',
  throwing: 'Goalkeeping', punching: 'Goalkeeping', tendencyToPunch: 'Goalkeeping'
};

function defineArchetype(
  archetype: RcaArchetypeId,
  weakerFootWeight: number,
  empiricalIntercept: number,
  empiricalSlope: number,
  attributeWeights: Readonly<Partial<Record<AttributeKey, number>>>
): RcaArchetypeWeightSpec {
  let sumAttributeWeights = 0;
  for (const w of Object.values(attributeWeights)) {
    if (typeof w === 'number') sumAttributeWeights += w;
  }
  return {
    archetype,
    weakerFootWeight,
    attributeWeights,
    sumAttributeWeights,
    sumTotalWeights: sumAttributeWeights + weakerFootWeight,
    empiricalIntercept,
    empiricalSlope
  };
}

/**
 * Exact non-zero attribute weights extracted from FMRTE 26 `Ratings/rca.json` (`SettingsVersion: "24.4.0.35"`,
 * SHA-256 `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa`), mapped cleanly onto
 * ManagerHub's canonical `AttributeKey` identifiers (`Vision -> vision`, `Leadership -> leadership`,
 * `Jumping -> jumpingReach`, `AerialAbility -> aerialReach`).
 *
 * Empirical affine coefficients (`CA ≈ intercept + slope * weightedMean(1..20)`) are calibrated on the
 * shipped FM2013 tutorial corpus (`n = 5,211` single-natural-position players, `R² = 0.9800`) and verified
 * out-of-sample on an independent 4,058-player save without touching private fixtures.
 */
export const FMRTE26_RCA_ARCHETYPES: Readonly<Record<RcaArchetypeId, RcaArchetypeWeightSpec>> = {
  Goalkeeper: defineArchetype('Goalkeeper', 3.0, -108.18, 19.576, {
    aerialReach: 6, commandOfArea: 6, communication: 5, handling: 8, kicking: 5,
    oneOnOnes: 4, reflexes: 8, throwing: 3,
    anticipation: 3, bravery: 6, composure: 2, concentration: 6, decisions: 10,
    leadership: 2, positioning: 5, teamwork: 2, vision: 1, workRate: 1,
    acceleration: 6, agility: 8, balance: 2, jumpingReach: 1, pace: 3, stamina: 1, strength: 4,
    firstTouch: 1, heading: 1, passing: 3, technique: 1
  }),
  DefenderCentral: defineArchetype('DefenderCentral', 4.5, -106.61, 19.147, {
    anticipation: 5, bravery: 2, composure: 2, concentration: 4, decisions: 10,
    leadership: 2, offTheBall: 1, positioning: 8, teamwork: 1, vision: 1, workRate: 2,
    acceleration: 6, agility: 6, balance: 2, jumpingReach: 6, pace: 5, stamina: 3, strength: 6,
    corners: 1, crossing: 1, dribbling: 1, finishing: 1, firstTouch: 2, freeKickTaking: 1,
    heading: 5, longShots: 1, longThrows: 1, marking: 8, passing: 2, penaltyTaking: 1, tackling: 5, technique: 1
  }),
  FullBack: defineArchetype('FullBack', 4.0, -102.71, 18.587, {
    anticipation: 3, bravery: 2, composure: 2, concentration: 4, decisions: 7,
    leadership: 1, offTheBall: 1, positioning: 4, teamwork: 2, vision: 2, workRate: 2,
    acceleration: 7, agility: 6, balance: 2, jumpingReach: 2, pace: 5, stamina: 6, strength: 4,
    corners: 1, crossing: 2, dribbling: 1, finishing: 1, firstTouch: 3, freeKickTaking: 1,
    heading: 2, longShots: 1, longThrows: 1, marking: 3, passing: 2, penaltyTaking: 1, tackling: 4, technique: 2
  }),
  WingBack: defineArchetype('WingBack', 4.0, -101.24, 18.673, {
    anticipation: 3, bravery: 1, composure: 2, concentration: 3, decisions: 5,
    leadership: 1, offTheBall: 2, positioning: 3, teamwork: 2, vision: 2, workRate: 2,
    acceleration: 8, agility: 5, balance: 2, jumpingReach: 1, pace: 6, stamina: 7, strength: 4,
    corners: 1, crossing: 3, dribbling: 2, finishing: 1, firstTouch: 3, freeKickTaking: 1,
    heading: 1, longShots: 1, longThrows: 1, marking: 2, passing: 3, penaltyTaking: 1, tackling: 3, technique: 3
  }),
  DefensiveMidfielder: defineArchetype('DefensiveMidfielder', 5.0, -103.27, 18.685, {
    anticipation: 5, bravery: 1, composure: 2, concentration: 3, decisions: 8,
    leadership: 1, offTheBall: 1, positioning: 5, teamwork: 2, vision: 4, workRate: 4,
    acceleration: 6, agility: 6, balance: 2, jumpingReach: 1, pace: 4, stamina: 4, strength: 5,
    corners: 1, crossing: 1, dribbling: 2, finishing: 2, firstTouch: 4, freeKickTaking: 1,
    heading: 1, longShots: 3, longThrows: 1, marking: 3, passing: 4, penaltyTaking: 1, tackling: 7, technique: 3
  }),
  MidfielderCentral: defineArchetype('MidfielderCentral', 6.0, -97.73, 17.997, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 7,
    leadership: 1, offTheBall: 3, positioning: 3, teamwork: 2, vision: 6, workRate: 3,
    acceleration: 6, agility: 6, balance: 2, jumpingReach: 1, pace: 5, stamina: 6, strength: 4,
    corners: 1, crossing: 1, dribbling: 2, finishing: 2, firstTouch: 6, freeKickTaking: 1,
    heading: 1, longShots: 3, longThrows: 1, marking: 3, passing: 6, penaltyTaking: 1, tackling: 3, technique: 4
  }),
  WideMidfielder: defineArchetype('WideMidfielder', 5.0, -101.24, 18.673, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 5,
    leadership: 1, offTheBall: 2, positioning: 1, teamwork: 2, vision: 3, workRate: 3,
    acceleration: 8, agility: 6, balance: 2, jumpingReach: 1, pace: 6, stamina: 5, strength: 3,
    corners: 1, crossing: 5, dribbling: 3, finishing: 2, firstTouch: 4, freeKickTaking: 1,
    heading: 1, longShots: 2, longThrows: 1, marking: 1, passing: 3, penaltyTaking: 1, tackling: 2, technique: 4
  }),
  AttackingMidfielderCentral: defineArchetype('AttackingMidfielderCentral', 7.0, -110.25, 19.270, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 6,
    leadership: 1, offTheBall: 3, positioning: 2, teamwork: 2, vision: 6, workRate: 3,
    acceleration: 9, agility: 6, balance: 2, jumpingReach: 1, pace: 7, stamina: 6, strength: 3,
    corners: 1, crossing: 1, dribbling: 3, finishing: 3, firstTouch: 5, freeKickTaking: 1,
    heading: 1, longShots: 3, longThrows: 1, marking: 1, passing: 4, penaltyTaking: 1, tackling: 2, technique: 5
  }),
  Winger: defineArchetype('Winger', 5.5, -90.52, 17.895, {
    anticipation: 3, bravery: 1, composure: 3, concentration: 2, decisions: 5,
    leadership: 1, offTheBall: 2, positioning: 1, teamwork: 2, vision: 3, workRate: 3,
    acceleration: 10, agility: 6, balance: 2, jumpingReach: 1, pace: 10, stamina: 7, strength: 3,
    corners: 1, crossing: 5, dribbling: 5, finishing: 2, firstTouch: 5, freeKickTaking: 1,
    heading: 1, longShots: 2, longThrows: 1, marking: 1, passing: 2, penaltyTaking: 1, tackling: 2, technique: 4
  }),
  Striker: defineArchetype('Striker', 7.5, -90.64, 17.700, {
    anticipation: 5, bravery: 1, composure: 6, concentration: 2, decisions: 5,
    leadership: 1, offTheBall: 6, positioning: 2, teamwork: 1, vision: 2, workRate: 2,
    acceleration: 10, agility: 6, balance: 2, jumpingReach: 5, pace: 7, stamina: 6, strength: 6,
    corners: 1, crossing: 2, dribbling: 5, finishing: 8, firstTouch: 6, freeKickTaking: 1,
    heading: 6, longShots: 2, longThrows: 1, marking: 1, passing: 2, penaltyTaking: 1, tackling: 1, technique: 4
  })
};

const BASE_POSITION_ARCHETYPE_MAP: Readonly<Record<RolePosition, RcaArchetypeId>> = {
  GK: 'Goalkeeper',
  SW: 'DefenderCentral',
  DC: 'DefenderCentral',
  DL: 'FullBack',
  DR: 'FullBack',
  WBL: 'WingBack',
  WBR: 'WingBack',
  DM: 'DefensiveMidfielder',
  MC: 'MidfielderCentral',
  ML: 'WideMidfielder',
  MR: 'WideMidfielder',
  AMC: 'AttackingMidfielderCentral',
  AML: 'Winger',
  AMR: 'Winger',
  ST: 'Striker'
};

export const FM2013_RCA_EDITION_PROFILE: RcaEditionProfile = {
  profileId: 'FM2013-research-v1',
  edition: 'FM2013',
  supportedBuilds: ['13.3.3f359652', '13.3.3'],
  settingsVersion: '24.4.0.35',
  weightSourceSha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa',
  weightStatus: 'OBSERVED',
  formulaStatus: 'INFERRED',
  compatibilityStatus: 'Compatible but unverified',
  certifiedForAutoMatch: false,
  positionsSupported: ['GK', 'SW', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'],
  positionArchetypeMap: BASE_POSITION_ARCHETYPE_MAP,
  positionFallbackNotes: {
    SW: 'Sweeper (SW) was removed in FM2026; mapped to DefenderCentral weights as an explicit fallback.'
  }
};

export const FM2026_RCA_EDITION_PROFILE: RcaEditionProfile = {
  profileId: 'FM2026-research-v1',
  edition: 'FM2026',
  supportedBuilds: ['26.3.2', '26.3.2-build41'],
  settingsVersion: '24.4.0.35',
  weightSourceSha256: 'a378c8e0be5e268dc7ed2a2b932ed9d478f77294b63d4ffa'.length === 64
    ? 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa'
    : 'a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa',
  weightStatus: 'OBSERVED',
  formulaStatus: 'INFERRED',
  compatibilityStatus: 'Version-specific',
  certifiedForAutoMatch: false,
  positionsSupported: ['GK', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'],
  positionArchetypeMap: BASE_POSITION_ARCHETYPE_MAP,
  positionFallbackNotes: {
    SW: 'Sweeper (SW) does not exist in FM2026 (14-position pitch model).'
  }
};

export function getRcaEditionProfile(edition: string | null | undefined): RcaEditionProfile | null {
  if (!edition || edition === 'FM2013') return FM2013_RCA_EDITION_PROFILE;
  if (edition === 'FM2026' || edition === 'FM26') return FM2026_RCA_EDITION_PROFILE;
  return null;
}

const isValidRating20 = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 20;

const isValidAbility200 = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 200;

function clampCa200(value: number): number {
  const rounded = Math.round(value);
  return rounded < 1 ? 1 : rounded > 200 ? 200 : rounded;
}

/**
 * Evaluate foot preference, weaker-foot rating (`1..20`), two-footed status, and RCA weaker-foot weight cost.
 */
export function evaluateFootAbility(
  leftFoot: number | null | undefined,
  rightFoot: number | null | undefined,
  weakerFootWeight: number,
  empiricalSlope: number,
  sumTotalWeights: number
): RcaFootDiagnostics {
  const left = isValidRating20(leftFoot) ? leftFoot : null;
  const right = isValidRating20(rightFoot) ? rightFoot : null;
  const marginalAdvisoryCaPerStep = Number(((weakerFootWeight / sumTotalWeights) * empiricalSlope).toFixed(3));

  if (left === null || right === null) {
    return {
      leftFoot: left,
      rightFoot: right,
      preferredFoot: left !== null && right === null ? 'left' : right !== null && left === null ? 'right' : 'unknown',
      preferredFootRating: left ?? right,
      weakerFootRating: null,
      isTwoFooted: false,
      weakerFootWeight,
      weightedPoints: null,
      marginalAdvisoryCaPerStep
    };
  }

  const preferredFoot =
    left >= 15 && right >= 15 && Math.abs(left - right) <= 2
      ? 'both'
      : left > right
        ? 'left'
        : right > left
          ? 'right'
          : 'both';
  const preferredFootRating = Math.max(left, right);
  const weakerFootRating = Math.min(left, right);

  return {
    leftFoot: left,
    rightFoot: right,
    preferredFoot,
    preferredFootRating,
    weakerFootRating,
    isTwoFooted: left >= 15 && right >= 15,
    weakerFootWeight,
    weightedPoints: Number((weakerFootWeight * weakerFootRating).toFixed(3)),
    marginalAdvisoryCaPerStep
  };
}

function scoreSinglePositionCandidate(
  attributes: Readonly<Partial<Record<AttributeKey, number>>>,
  weakerFootRating: number | null,
  position: RolePosition,
  familiarity: number,
  profile: RcaEditionProfile
): {
  candidate: RcaPositionCandidateScore;
  coverage: number;
  groupTotals: { Technical: number; Mental: number; Physical: number; Goalkeeping: number; WeakerFoot: number };
} | null {
  const archetypeId = profile.positionArchetypeMap[position];
  const spec = FMRTE26_RCA_ARCHETYPES[archetypeId];

  let observedWeight = 0;
  let rawWeightedSum = 0;
  const groupTotals = { Technical: 0, Mental: 0, Physical: 0, Goalkeeping: 0, WeakerFoot: 0 };

  for (const [key, weight] of Object.entries(spec.attributeWeights) as [AttributeKey, number][]) {
    const val = attributes[key];
    if (isValidRating20(val)) {
      observedWeight += weight;
      const pts = weight * val;
      rawWeightedSum += pts;
      groupTotals[ATTRIBUTE_GROUP_BY_KEY[key]] += pts;
    }
  }

  const effectiveWf = weakerFootRating ?? 1;
  if (weakerFootRating !== null) {
    observedWeight += spec.weakerFootWeight;
  }
  const wfPts = spec.weakerFootWeight * effectiveWf;
  rawWeightedSum += wfPts;
  groupTotals.WeakerFoot = wfPts;

  const coverage = observedWeight / spec.sumTotalWeights;
  if (coverage < 0.7) return null;

  // Normalize over observed weight when weaker foot is absent in CSV/HTML imports, or full weight when present.
  const denom = weakerFootRating !== null ? spec.sumTotalWeights : observedWeight;
  const weightedMean = (weakerFootRating !== null ? rawWeightedSum : rawWeightedSum - wfPts) / denom;
  const advisoryRca = clampCa200(spec.empiricalIntercept + spec.empiricalSlope * weightedMean);

  return {
    candidate: {
      position,
      familiarity,
      archetype: archetypeId,
      weightedMean: Number(weightedMean.toFixed(4)),
      rawWeightedSum: Number(rawWeightedSum.toFixed(2)),
      advisoryRca,
      isFallbackMapping: Boolean(profile.positionFallbackNotes[position])
    },
    coverage: Number(coverage.toFixed(4)),
    groupTotals: {
      Technical: Number(groupTotals.Technical.toFixed(2)),
      Mental: Number(groupTotals.Mental.toFixed(2)),
      Physical: Number(groupTotals.Physical.toFixed(2)),
      Goalkeeping: Number(groupTotals.Goalkeeping.toFixed(2)),
      WeakerFoot: weakerFootRating !== null ? Number(wfPts.toFixed(2)) : 0
    }
  };
}

export interface EvaluatePlayerRcaOptions {
  readonly edition?: string | null;
  readonly build?: string | null;
  readonly targetPositionOverride?: RolePosition | null;
}

/**
 * Pure, deterministic, side-effect-free multi-edition RCA research engine.
 *
 * Strictly separates:
 * - **Advisory RCA** (positional CA-cost weight model from `Ratings/rca.json`, `1..200`)
 * - **Role Fit** (`scoreRole`, `0..100` tactical role suitability)
 * - **Development Priority** (`gap * roleDemandWeight`)
 *
 * Fail-closed Auto-Match rule:
 * - Never enables automatic native `CA` overwrite unless `profile.certifiedForAutoMatch === true`
 *   AND `edition` + `build` match `profile.supportedBuilds`.
 * - Never mutates `PA` under any circumstance, even when `advisoryRca > potentialAbility`.
 */
export interface RcaPlayerInput {
  readonly attributes: Readonly<Partial<Record<AttributeKey, number>>>;
  readonly positions?: Readonly<Partial<Record<RolePosition, number>>> | Readonly<Record<string, number>> | null;
  readonly leftFoot?: number | null;
  readonly rightFoot?: number | null;
  readonly actualCa?: number | null;
  readonly potentialAbility?: number | null;
}

export function evaluatePlayerRca(
  player: RcaPlayerInput,
  options: EvaluatePlayerRcaOptions = {}
): RcaDiagnosticReport {
  const edition = options.edition ?? null;
  const build = options.build ?? null;
  const profile = getRcaEditionProfile(edition);

  if (!profile) {
    return {
      status: 'unsupported-edition',
      profile: null,
      selectedPosition: null,
      selectedArchetype: null,
      positionSelectionBasis: 'none',
      naturalPositions: [],
      accomplishedPositions: [],
      multiPositionPenaltyNote: null,
      candidateScores: [],
      observedWeightCoverage: 0,
      weightedMeanRating: null,
      rawWeightedSum: null,
      totalArchetypeWeight: null,
      advisoryRca: null,
      caMinusAdvisoryRca: null,
      paMinusAdvisoryRca: null,
      exceedsPotentialAbility: false,
      foot: null,
      groupWeightedTotals: null,
      attributeRows: [],
      zeroCostVisibleAttributes: ZERO_COST_VISIBLE_ATTRIBUTES,
      zeroCostHiddenTraits: ZERO_COST_HIDDEN_TRAITS,
      zeroCostPersonalityTraits: ZERO_COST_PERSONALITY_TRAITS,
      autoMatchDecision: {
        allowed: false,
        nextCa: null,
        preservesPa: true,
        reason: 'unsupported-edition'
      },
      provenanceSummary: `Unsupported edition "${edition}" for RCA evaluation.`
    };
  }

  const rawPos = (player.positions ?? {}) as Readonly<Partial<Record<RolePosition, number>>>;
  const allValidPositions: { pos: RolePosition; fam: number }[] = [];
  for (const pos of ['GK', 'SW', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'] as const) {
    const val = rawPos[pos];
    if (typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 20) {
      allValidPositions.push({ pos, fam: val });
    }
  }

  const naturalPositions = allValidPositions.filter(p => p.fam === 20).map(p => p.pos);
  const accomplishedPositions = allValidPositions.filter(p => p.fam >= 15 && p.fam < 20).map(p => p.pos);

  let candidatePositions: { pos: RolePosition; fam: number }[] = [];
  let basis: RcaDiagnosticReport['positionSelectionBasis'] = 'default-mc';

  if (options.targetPositionOverride) {
    const fam = rawPos[options.targetPositionOverride];
    candidatePositions = [{
      pos: options.targetPositionOverride,
      fam: typeof fam === 'number' && Number.isInteger(fam) && fam >= 1 && fam <= 20 ? fam : 20
    }];
    basis = 'explicit-override';
  } else if (naturalPositions.length > 0) {
    candidatePositions = allValidPositions.filter(p => p.fam === 20);
    basis = 'natural-20';
  } else if (allValidPositions.length > 0) {
    const maxFam = Math.max(...allValidPositions.map(p => p.fam));
    candidatePositions = allValidPositions.filter(p => p.fam === maxFam);
    basis = 'highest-familiarity';
  } else {
    // Infer GK vs MC fallback when positions map is absent in minimal exports
    const isLikelyGk = isValidRating20(player.attributes.handling) && player.attributes.handling >= 12 &&
      (!isValidRating20(player.attributes.finishing) || player.attributes.handling > player.attributes.finishing + 4);
    candidatePositions = [{ pos: isLikelyGk ? 'GK' : 'MC', fam: 20 }];
    basis = 'default-mc';
  }

  const weakerFootRating =
    isValidRating20(player.leftFoot) && isValidRating20(player.rightFoot)
      ? Math.min(player.leftFoot, player.rightFoot)
      : null;

  const evaluatedCandidates = candidatePositions
    .map(item => scoreSinglePositionCandidate(player.attributes, weakerFootRating, item.pos, item.fam, profile))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (evaluatedCandidates.length === 0) {
    return {
      status: 'insufficient-attributes',
      profile,
      selectedPosition: candidatePositions[0]?.pos ?? null,
      selectedArchetype: candidatePositions[0] ? profile.positionArchetypeMap[candidatePositions[0].pos] : null,
      positionSelectionBasis: basis,
      naturalPositions,
      accomplishedPositions,
      multiPositionPenaltyNote: null,
      candidateScores: [],
      observedWeightCoverage: 0,
      weightedMeanRating: null,
      rawWeightedSum: null,
      totalArchetypeWeight: null,
      advisoryRca: null,
      caMinusAdvisoryRca: null,
      paMinusAdvisoryRca: null,
      exceedsPotentialAbility: false,
      foot: null,
      groupWeightedTotals: null,
      attributeRows: [],
      zeroCostVisibleAttributes: ZERO_COST_VISIBLE_ATTRIBUTES,
      zeroCostHiddenTraits: ZERO_COST_HIDDEN_TRAITS,
      zeroCostPersonalityTraits: ZERO_COST_PERSONALITY_TRAITS,
      autoMatchDecision: {
        allowed: false,
        nextCa: null,
        preservesPa: true,
        reason: 'insufficient-attributes'
      },
      provenanceSummary: 'Insufficient observed 1–20 attributes (<70% weight coverage) to compute advisory RCA.'
    };
  }

  // Sort deterministically: highest advisoryRca first, then highest weightedMean, then canonical position order.
  evaluatedCandidates.sort(
    (a, b) =>
      b.candidate.advisoryRca - a.candidate.advisoryRca ||
      b.candidate.weightedMean - a.candidate.weightedMean ||
      a.candidate.position.localeCompare(b.candidate.position, 'en')
  );

  const winner = evaluatedCandidates[0]!;
  const spec = FMRTE26_RCA_ARCHETYPES[winner.candidate.archetype];
  const foot = evaluateFootAbility(
    player.leftFoot,
    player.rightFoot,
    spec.weakerFootWeight,
    spec.empiricalSlope,
    spec.sumTotalWeights
  );

  const allKeys = Object.keys(ATTRIBUTE_GROUP_BY_KEY) as AttributeKey[];
  const attributeRows: RcaAttributeBreakdownRow[] = allKeys.map(key => {
    const val = isValidRating20(player.attributes[key]) ? player.attributes[key]! : null;
    const weight = spec.attributeWeights[key] ?? 0;
    const marginalAdvisoryCaPerStep =
      weight > 0 ? Number(((weight / spec.sumTotalWeights) * spec.empiricalSlope).toFixed(3)) : 0;
    return {
      key,
      group: ATTRIBUTE_GROUP_BY_KEY[key],
      value: val,
      weight,
      zeroCost: weight === 0,
      weightedPoints: val !== null ? Number((weight * val).toFixed(2)) : null,
      marginalAdvisoryCaPerStep
    };
  }).sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key, 'en'));

  const actualCa = isValidAbility200(player.actualCa) ? player.actualCa : null;
  const pa = isValidAbility200(player.potentialAbility) ? player.potentialAbility : null;
  const advisoryRca = winner.candidate.advisoryRca;

  const editionBuildKnown = Boolean(edition && build);
  const buildSupported = Boolean(build && profile.supportedBuilds.includes(build));
  const autoMatchAllowed = editionBuildKnown && buildSupported && profile.certifiedForAutoMatch;

  const multiPositionPenaltyNote =
    naturalPositions.length >= 2
      ? `Multi-position player (${naturalPositions.join(', ')} = 20): selected highest-cost natural archetype (${winner.candidate.archetype}). Empirical FM2013 data shows ~+2.6 to +4.3 extra CA cost for multi-natural versatility, which remains uncertified for native write.`
      : accomplishedPositions.length > 0
        ? `Secondary accomplished positions (${accomplishedPositions.join(', ')} 15–19) observed; secondary versatility CA surcharge is uncertified.`
        : null;

  return {
    status: 'evaluated',
    profile,
    selectedPosition: winner.candidate.position,
    selectedArchetype: winner.candidate.archetype,
    positionSelectionBasis: basis,
    naturalPositions,
    accomplishedPositions,
    multiPositionPenaltyNote,
    candidateScores: evaluatedCandidates.map(item => item.candidate),
    observedWeightCoverage: winner.coverage,
    weightedMeanRating: winner.candidate.weightedMean,
    rawWeightedSum: winner.candidate.rawWeightedSum,
    totalArchetypeWeight: spec.sumTotalWeights,
    advisoryRca,
    caMinusAdvisoryRca: actualCa !== null ? actualCa - advisoryRca : null,
    paMinusAdvisoryRca: pa !== null ? pa - advisoryRca : null,
    exceedsPotentialAbility: pa !== null && advisoryRca > pa,
    foot,
    groupWeightedTotals: winner.groupTotals,
    attributeRows,
    zeroCostVisibleAttributes: ZERO_COST_VISIBLE_ATTRIBUTES,
    zeroCostHiddenTraits: ZERO_COST_HIDDEN_TRAITS,
    zeroCostPersonalityTraits: ZERO_COST_PERSONALITY_TRAITS,
    autoMatchDecision: {
      allowed: autoMatchAllowed,
      nextCa: autoMatchAllowed ? advisoryRca : null,
      preservesPa: true,
      reason: !editionBuildKnown
        ? 'edition-build-unknown'
        : autoMatchAllowed
          ? 'certified'
          : 'profile-not-certified'
    },
    provenanceSummary: `Advisory RCA (${profile.profileId}, weights ${profile.weightStatus} from rca.json v${profile.settingsVersion}, scaling ${profile.formulaStatus}). Not certified for automatic CA write.`
  };
}

/**
 * Look up the exact RCA CA-cost weight (`0..10`) for an attribute at a target position.
 * Distinct from tactical Role Fit demand weights (`1..3` in `football-role-registry.ts`).
 */
export function getAttributeRcaWeight(
  position: RolePosition,
  attribute: AttributeKey,
  edition: string | null = 'FM2013'
): number {
  const profile = getRcaEditionProfile(edition) ?? FM2013_RCA_EDITION_PROFILE;
  const archetype = profile.positionArchetypeMap[position];
  return FMRTE26_RCA_ARCHETYPES[archetype].attributeWeights[attribute] ?? 0;
}
