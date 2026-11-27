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

export interface RcaArchetypeWeightSpec {
  readonly archetype: RcaArchetypeId;
  readonly weakerFootWeight: number;
  readonly attributeWeights: Readonly<Partial<Record<AttributeKey, number>>>;
  readonly sumAttributeWeights: number;
  readonly sumTotalWeights: number;
}

export interface RcaEditionProfile {
  readonly profileId: 'FM2013-research-v2' | 'FM2026-reference-v1';
  readonly edition: 'FM2013' | 'FM2026';
  readonly supportedBuilds: readonly string[];
  readonly settingsVersion: '24.4.0.35';
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
  readonly marginalAdvisoryCaPerStep: number | null;
}

export interface RcaAttributeBreakdownRow {
  readonly key: AttributeKey;
  readonly group: 'Technical' | 'Mental' | 'Physical' | 'Goalkeeping';
  readonly value: number | null;
  readonly weight: number | null;
  readonly zeroCost: boolean | null;
  readonly weightedPoints: number | null;
  readonly marginalAdvisoryCaPerStep: number | null;
}

export interface RcaPositionCandidateScore {
  readonly position: RolePosition;
  readonly familiarity: number | null;
  readonly archetype: RcaArchetypeId;
  readonly weightedMean: number;
  readonly observedWeight: number;
  readonly rawWeightedSum: number;
  readonly advisoryRca: number;
  readonly isFallbackMapping: boolean;
}

export interface RcaDiagnosticReport {
  readonly status: 'evaluated' | 'insufficient-attributes' | 'unsupported-edition' | 'unknown-edition' | 'unknown-build' | 'unsupported-build' | 'unsupported-position' | 'reference-only';
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
      | 'insufficient-attributes'
      | 'unknown-edition' | 'unknown-build' | 'unsupported-build' | 'unsupported-position' | 'reference-only';
  };
  readonly provenanceSummary: string;
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
