/** No certified RCA adapter is registered. Read compatibility does not certify RCA. */
export interface AbilityBudget {
  readonly remainingPotential: number | null;
  readonly recommendedCa: null;
  readonly remainingRcaBudget: null;
  readonly autoMatchAvailable: false;
  readonly reason: 'edition-build-unknown' | 'rca-model-unverified';
}

export function remainingPotential(actualCa: unknown, pa: unknown): number | null {
  return typeof actualCa === 'number' && Number.isInteger(actualCa) && actualCa >= 1 && actualCa <= 200 &&
    typeof pa === 'number' && Number.isInteger(pa) && pa >= 1 && pa <= 200 ? pa - actualCa : null;
}

export function inspectAbilityBudget(edition: string | null | undefined, build: string | null | undefined,
  actualCa: unknown, pa: unknown): AbilityBudget {
  return {
    remainingPotential: remainingPotential(actualCa, pa), recommendedCa: null, remainingRcaBudget: null,
    autoMatchAvailable: false, reason: edition && build ? 'rca-model-unverified' : 'edition-build-unknown'
  };
}
