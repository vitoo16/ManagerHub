import type { PlayerExport } from './player-import';
import { optimizeSquad, type FormationId, type SlotAssignment, type SquadSolution } from './squad-optimizer';

export type ScoutClubScenarioStatus =
  | 'candidate-not-found'
  | 'club-not-found'
  | 'candidate-club-unknown'
  | 'already-in-club'
  | 'incomplete-xi'
  | 'fills-xi-gap'
  | 'not-selected'
  | 'changes-xi';

export interface ScoutClubScenario {
  readonly status: ScoutClubScenarioStatus;
  readonly clubPlayerCount: number;
  readonly before: SquadSolution | null;
  readonly after: SquadSolution | null;
  readonly candidateAssignment: SlotAssignment | null;
  readonly previousAssignment: SlotAssignment | null;
  readonly roleFitDelta: number | null;
  readonly changedSlots: number | null;
}

/**
 * A hypothetical same-export club-group scenario. The Club field identifies
 * only the observed group, never a verified complete roster or transfer access.
 */
export function assessScoutClubScenario(
  players: readonly PlayerExport[], club: string, candidateId: string, formation: FormationId
): ScoutClubScenario {
  const clubPlayers = players.filter(player => player.club === club);
  const empty = (status: ScoutClubScenarioStatus): ScoutClubScenario => ({
    status, clubPlayerCount: clubPlayers.length, before: null, after: null,
    candidateAssignment: null, previousAssignment: null, roleFitDelta: null, changedSlots: null
  });
  const candidate = players.find(player => player.id === candidateId);
  if (!candidate) return empty('candidate-not-found');
  if (!club || clubPlayers.length === 0) return empty('club-not-found');
  if (!candidate.club) return empty('candidate-club-unknown');
  if (candidate.club === club) return empty('already-in-club');

  const before = optimizeSquad(clubPlayers, formation);
  const after = optimizeSquad([...clubPlayers, candidate], formation);
  const candidateAssignment = after.lineup.find(item => item.playerId === candidateId) ?? null;
  const previousAssignment = candidateAssignment
    ? before.lineup.find(item => item.slot.id === candidateAssignment.slot.id) ?? null : null;
  const changedSlots = before.complete && after.complete
    ? after.lineup.filter(item => before.lineup.find(earlier => earlier.slot.id === item.slot.id)?.playerId !== item.playerId).length
    : null;
  const roleFitDelta = before.complete && after.complete
    ? Math.round(((after.averageRoleScore ?? 0) - (before.averageRoleScore ?? 0)) * 10) / 10
    : null;
  const status: ScoutClubScenarioStatus = !after.complete ? 'incomplete-xi'
    : !before.complete ? 'fills-xi-gap'
    : !candidateAssignment ? 'not-selected' : 'changes-xi';

  return {
    status, clubPlayerCount: clubPlayers.length, before, after, candidateAssignment,
    previousAssignment, roleFitDelta, changedSlots
  };
}
