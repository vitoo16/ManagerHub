import type { AttributeKey } from './player-import';
import type { RcaFootDiagnostics, RcaArchetypeId, RcaAttributeBreakdownRow } from './rca-types';
import { ATTRIBUTE_GROUP_BY_KEY, referenceAttributeWeight } from './rca-weights';

export const isValidRating20 = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 20;

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
      preferredFoot: 'unknown',
      preferredFootRating: null,
      weakerFootRating: null,
      isTwoFooted: null,
      weakerFootWeight,
      weightedPoints: null,
      marginalAdvisoryCaPerStep: null
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


/** Local pre-rounding derivatives, only for observed values with a known reference weight. */
export function buildAttributeDiagnostics(
  attributes: Readonly<Partial<Record<AttributeKey, number>>>,
  archetype: RcaArchetypeId,
  observedDenominator: number,
  slope: number
): RcaAttributeBreakdownRow[] {
  const allKeys = Object.keys(ATTRIBUTE_GROUP_BY_KEY) as AttributeKey[];
  return allKeys.map(key => {
    const val = isValidRating20(attributes[key]) ? attributes[key]! : null;
    const weight = referenceAttributeWeight(archetype, key);
    const marginalAdvisoryCaPerStep =
      weight === null || val === null ? null : Number(((weight / observedDenominator) * slope).toFixed(3));
    return {
      key,
      group: ATTRIBUTE_GROUP_BY_KEY[key],
      value: val,
      weight,
      zeroCost: weight === null ? null : weight === 0,
      weightedPoints: val !== null && weight !== null ? Number((weight * val).toFixed(2)) : null,
      marginalAdvisoryCaPerStep
    };
  }).sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1) || a.key.localeCompare(b.key, 'en'));

}
