import { evaluatePlayerRca, type RcaDiagnosticReport, type RcaPlayerInput } from './rca-engine';

/**
 * Ability budget contract separating certified native CA/PA state (`recommendedCa`, `autoMatchAvailable`)
 * from advisory research RCA diagnostics (`advisoryRca`, `caMinusAdvisoryRca`, `paMinusAdvisoryRca`).
 * Read compatibility never certifies automatic native CA mutation.
 */
export interface AbilityBudget {
  readonly remainingPotential: number | null;
  readonly recommendedCa: null;
  readonly remainingRcaBudget: null;
  readonly autoMatchAvailable: false;
  readonly reason: 'edition-build-unknown' | 'rca-model-unverified';
  /** Advisory research RCA (1–200) when player attributes/positions are supplied; null otherwise. */
  readonly advisoryRca: number | null;
  /** Signed Actual CA minus Advisory RCA when both exist. */
  readonly caMinusAdvisoryRca: number | null;
  /** Signed Potential Ability minus Advisory RCA when both exist. */
  readonly paMinusAdvisoryRca: number | null;
  readonly exceedsPotentialAbility: boolean;
  readonly rcaDiagnostics: RcaDiagnosticReport | null;
}

export function remainingPotential(actualCa: unknown, pa: unknown): number | null {
  return typeof actualCa === 'number' && Number.isInteger(actualCa) && actualCa >= 1 && actualCa <= 200 &&
    typeof pa === 'number' && Number.isInteger(pa) && pa >= 1 && pa <= 200 ? pa - actualCa : null;
}

export function inspectAbilityBudget(
  edition: string | null | undefined,
  build: string | null | undefined,
  actualCa: unknown,
  pa: unknown,
  playerContext?: Omit<RcaPlayerInput, 'actualCa' | 'potentialAbility'> | null
): AbilityBudget {
  const diagnostics = playerContext
    ? evaluatePlayerRca(
        {
          ...playerContext,
          actualCa: typeof actualCa === 'number' ? actualCa : null,
          potentialAbility: typeof pa === 'number' ? pa : null
        },
        { edition: edition ?? null, build: build ?? null }
      )
    : null;

  return {
    remainingPotential: remainingPotential(actualCa, pa),
    recommendedCa: null,
    remainingRcaBudget: null,
    autoMatchAvailable: false,
    reason: edition && build ? 'rca-model-unverified' : 'edition-build-unknown',
    advisoryRca: diagnostics?.advisoryRca ?? null,
    caMinusAdvisoryRca: diagnostics?.caMinusAdvisoryRca ?? null,
    paMinusAdvisoryRca: diagnostics?.paMinusAdvisoryRca ?? null,
    exceedsPotentialAbility: diagnostics?.exceedsPotentialAbility ?? false,
    rcaDiagnostics: diagnostics
  };
}
