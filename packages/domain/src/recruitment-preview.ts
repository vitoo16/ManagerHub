import type { PlayerExport } from './player-import';
import { optimizeSquad, type FormationId, type SlotAssignment, type SquadSolution } from './squad-optimizer';

export type SquadContributionStatus =
  | 'player-not-found'
  | 'insufficient-data'
  | 'not-selected'
  | 'required-for-complete-xi'
  | 'comparison-ready';

export interface SquadContributionAssessment {
  readonly status: SquadContributionStatus;
  readonly formation: FormationId;
  readonly baseline: SquadSolution | null;
  readonly withoutPlayer: SquadSolution | null;
  readonly assignment: SlotAssignment | null;
  /** Baseline XI role-fit average minus the best XI average after excluding this player. */
  readonly roleFitDelta: number | null;
  /** Number of slots assigned to a different player when this player is excluded. */
  readonly changedSlots: number | null;
}

/**
 * Explain the selected export player's impact on a best-fit XI from the same
 * imported pool. This is a lineup sensitivity check, not a transfer verdict,
 * player value, match prediction, or native Football Manager metric.
 */
export function assessSquadContribution(
  players: readonly PlayerExport[],
  playerId: string,
  formation: FormationId
): SquadContributionAssessment {
  if (!players.some(player => player.id === playerId)) {
    return {
      status: 'player-not-found', formation, baseline: null, withoutPlayer: null,
      assignment: null, roleFitDelta: null, changedSlots: null
    };
  }

  const baseline = optimizeSquad(players, formation);
  const withoutPlayer = optimizeSquad(players, formation, { excludedPlayerIds: [playerId] });

  if (!baseline.complete) {
    return {
      status: 'insufficient-data', formation, baseline, withoutPlayer,
      assignment: null, roleFitDelta: null, changedSlots: null
    };
  }

  const assignment = baseline.lineup.find(item => item.playerId === playerId) ?? null;
  if (!assignment) {
    return {
      status: 'not-selected', formation, baseline, withoutPlayer,
      assignment: null, roleFitDelta: null, changedSlots: null
    };
  }

  if (!withoutPlayer.complete) {
    return {
      status: 'required-for-complete-xi', formation, baseline, withoutPlayer,
      assignment, roleFitDelta: null, changedSlots: null
    };
  }

  const alternativeBySlot = new Map(withoutPlayer.lineup.map(item => [item.slot.id, item.playerId]));
  const changedSlots = baseline.lineup.filter(item => alternativeBySlot.get(item.slot.id) !== item.playerId).length;
  const roleFitDelta = Math.round(((baseline.averageRoleScore ?? 0) - (withoutPlayer.averageRoleScore ?? 0)) * 10) / 10;

  return {
    status: 'comparison-ready', formation, baseline, withoutPlayer, assignment,
    roleFitDelta, changedSlots
  };
}
