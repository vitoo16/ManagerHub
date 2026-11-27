import type { AttributeKey } from './player-import';
import { isValidRating20, evaluateFootAbility, buildAttributeDiagnostics } from './rca-diagnostics';
export { evaluateFootAbility } from './rca-diagnostics';
import type { RolePosition } from './football-role-registry';
import type { RcaDiagnosticReport, RcaEditionProfile, RcaPlayerInput, EvaluatePlayerRcaOptions, RcaPositionCandidateScore } from './rca-types';
export type * from './rca-types';
import { getRcaEditionProfile, FM2013_ADVISORY_COEFFICIENTS } from './rca-editions';
import { FMRTE26_RCA_ARCHETYPES, ATTRIBUTE_GROUP_BY_KEY, referenceAttributeWeight,
  ZERO_COST_VISIBLE_ATTRIBUTES, ZERO_COST_HIDDEN_TRAITS, ZERO_COST_PERSONALITY_TRAITS } from './rca-weights';
export { getRcaEditionProfile, FM2013_RCA_EDITION_PROFILE, FM2026_RCA_EDITION_PROFILE, FM2013_ADVISORY_COEFFICIENTS, FM2013_HISTORICAL_UNIVERSAL } from './rca-editions';
export { FMRTE26_RCA_ARCHETYPES, ZERO_COST_VISIBLE_ATTRIBUTES, ZERO_COST_HIDDEN_TRAITS, ZERO_COST_PERSONALITY_TRAITS } from './rca-weights';
export { RCA_EVIDENCE_REGISTRY } from './rca-evidence';

const isValidAbility200 = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 200;

function clampCa200(value: number): number {
  const rounded = Math.round(value);
  return rounded < 1 ? 1 : rounded > 200 ? 200 : rounded;
}

function scoreSinglePositionCandidate(
  attributes: Readonly<Partial<Record<AttributeKey, number>>>,
  weakerFootRating: number | null,
  position: RolePosition,
  familiarity: number | null,
  profile: RcaEditionProfile
): {
  candidate: RcaPositionCandidateScore | null;
  coverage: number;
  observedWeight: number;
  groupTotals: { Technical: number; Mental: number; Physical: number; Goalkeeping: number; WeakerFoot: number };
} | null {
  if (!profile.positionsSupported.includes(position) || profile.edition !== 'FM2013') return null;
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

  const wfPts = weakerFootRating === null ? 0 : spec.weakerFootWeight * weakerFootRating;
  if (weakerFootRating !== null) {
    observedWeight += spec.weakerFootWeight;
    rawWeightedSum += wfPts;
    groupTotals.WeakerFoot = wfPts;
  }

  const coverage = observedWeight / spec.sumTotalWeights;
  if (coverage < 0.7) return { candidate: null, coverage, observedWeight, groupTotals };

  // Missing attributes and missing weaker foot contribute neither points nor weight.
  const weightedMean = rawWeightedSum / observedWeight;
  const { intercept, slope } = FM2013_ADVISORY_COEFFICIENTS[archetypeId];
  const advisoryRca = clampCa200(intercept + slope * weightedMean);

  return {
    candidate: {
      position,
      familiarity,
      archetype: archetypeId,
      weightedMean: Number(weightedMean.toFixed(4)),
      observedWeight,
      rawWeightedSum: Number(rawWeightedSum.toFixed(2)),
      advisoryRca,
      isFallbackMapping: Boolean(profile.positionFallbackNotes[position])
    },
    coverage,
    observedWeight,
    groupTotals: {
      Technical: Number(groupTotals.Technical.toFixed(2)),
      Mental: Number(groupTotals.Mental.toFixed(2)),
      Physical: Number(groupTotals.Physical.toFixed(2)),
      Goalkeeping: Number(groupTotals.Goalkeeping.toFixed(2)),
      WeakerFoot: weakerFootRating !== null ? Number(wfPts.toFixed(2)) : 0
    }
  };
}

export function evaluatePlayerRca(
  player: RcaPlayerInput,
  options: EvaluatePlayerRcaOptions = {}
): RcaDiagnosticReport {
  const edition = options.edition ?? null;
  const build = options.build ?? null;
  const profile = getRcaEditionProfile(edition);

  const unavailable = !edition ? 'unknown-edition' : !profile ? 'unsupported-edition'
    : !build ? 'unknown-build' : !profile.supportedBuilds.includes(build) ? 'unsupported-build'
    : options.targetPositionOverride && !profile.positionsSupported.includes(options.targetPositionOverride) ? 'unsupported-position'
    : Object.entries(player.positions ?? {}).some(([pos, rating]) =>
        isValidRating20(rating) && !profile.positionsSupported.includes(pos as RolePosition)) ? 'unsupported-position'
    : profile.edition === 'FM2026' ? 'reference-only' : null;
  if (unavailable || !profile) {
    return {
      status: unavailable ?? 'unsupported-edition',
      profile,
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
      zeroCostVisibleAttributes: [],
      zeroCostHiddenTraits: [],
      zeroCostPersonalityTraits: [],
      autoMatchDecision: {
        allowed: false,
        nextCa: null,
        preservesPa: true,
        reason: unavailable ?? 'unsupported-edition'
      },
      provenanceSummary: `RCA unavailable: ${unavailable}; edition=${edition}, build=${build}.`
    };
  }

  const rawPos = (player.positions ?? {}) as Readonly<Partial<Record<RolePosition, number>>>;
  const allValidPositions: { pos: RolePosition; fam: number }[] = [];
  for (const pos of profile.positionsSupported) {
    const val = rawPos[pos];
    if (typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 20) {
      allValidPositions.push({ pos, fam: val });
    }
  }

  const naturalPositions = allValidPositions.filter(p => p.fam === 20).map(p => p.pos);
  const accomplishedPositions = allValidPositions.filter(p => p.fam >= 15 && p.fam < 20).map(p => p.pos);

  let candidatePositions: { pos: RolePosition; fam: number | null }[] = [];
  let basis: RcaDiagnosticReport['positionSelectionBasis'] = 'default-mc';

  if (options.targetPositionOverride) {
    const fam = rawPos[options.targetPositionOverride];
    candidatePositions = [{
      pos: options.targetPositionOverride,
      fam: isValidRating20(fam) ? fam : null
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
    candidatePositions = [{ pos: isLikelyGk ? 'GK' : 'MC', fam: null }];
    basis = 'default-mc';
  }

  const weakerFootRating =
    isValidRating20(player.leftFoot) && isValidRating20(player.rightFoot)
      ? Math.min(player.leftFoot, player.rightFoot)
      : null;

  const attemptedCandidates = candidatePositions
    .map(item => scoreSinglePositionCandidate(player.attributes, weakerFootRating, item.pos, item.fam, profile))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const evaluatedCandidates = attemptedCandidates.filter(
    (item): item is typeof item & { candidate: RcaPositionCandidateScore } => item.candidate !== null
  );

  if (evaluatedCandidates.length === 0) {
    return {
      status: 'insufficient-attributes',
      profile,
      selectedPosition: null,
      selectedArchetype: null,
      positionSelectionBasis: basis,
      naturalPositions,
      accomplishedPositions,
      multiPositionPenaltyNote: null,
      candidateScores: [],
      observedWeightCoverage: Math.max(0, ...attemptedCandidates.map(item => item.coverage)),
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
  const slope = FM2013_ADVISORY_COEFFICIENTS[winner.candidate.archetype].slope;
  const observedDenominator = winner.observedWeight;
  const foot = evaluateFootAbility(
    player.leftFoot,
    player.rightFoot,
    spec.weakerFootWeight,
    slope,
    observedDenominator
  );

  const attributeRows = buildAttributeDiagnostics(player.attributes, winner.candidate.archetype, observedDenominator, slope);

  const actualCa = isValidAbility200(player.actualCa) ? player.actualCa : null;
  const pa = isValidAbility200(player.potentialAbility) ? player.potentialAbility : null;
  const advisoryRca = winner.candidate.advisoryRca;

  const autoMatchAllowed = build === '13.3.3f359652' && profile.certifiedForAutoMatch;

  const multiPositionPenaltyNote =
    basis === 'explicit-override' ? 'Selected target-position hypothesis; no observed familiarity or native position change is inferred.'
      : naturalPositions.length >= 2
      ? `Multi-position player (${naturalPositions.join(', ')} = 20): selected highest-cost natural archetype (${winner.candidate.archetype}). No additional versatility surcharge is applied; its magnitude is unverified.`
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
      reason: autoMatchAllowed ? 'certified' : 'profile-not-certified'
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
  edition: string | null,
  build: string | null
): number | null {
  const profile = getRcaEditionProfile(edition);
  if (!profile || !build || !profile.supportedBuilds.includes(build) || !profile.positionsSupported.includes(position)) return null;
  return referenceAttributeWeight(profile.positionArchetypeMap[position], attribute);
}
