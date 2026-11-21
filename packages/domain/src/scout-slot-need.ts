import type { PlayerExport } from './player-import';
import { ROLE_PROFILES, scoreRole, type ScoredRole } from './player-analysis';
import {
  declaredPositions, FORMATIONS, optimizeSquad,
  type FormationId, type LineupSlot, type SlotAssignment, type SquadSolution
} from './squad-optimizer';

export type ScoutSlotCandidateStatus =
  | 'candidate-not-found'
  | 'club-not-found'
  | 'candidate-club-unknown'
  | 'already-in-club'
  | 'position-ineligible'
  | 'insufficient-attributes'
  | 'eligible';

export interface ScoutSlotCandidateComparison {
  readonly candidateId: string;
  readonly name: string;
  readonly club: string | null;
  readonly position: string | null;
  readonly status: ScoutSlotCandidateStatus;
  readonly roleFit: number | null;
  readonly coverage: number | null;
  readonly differenceFromIncumbent: number | null;
  readonly evidence: ScoredRole['evidence'];
  readonly missing: ScoredRole['missing'];
}

export interface ScoutSlotNeed {
  readonly slot: LineupSlot | null;
  readonly clubPlayerCount: number;
  readonly baseline: SquadSolution | null;
  readonly incumbent: SlotAssignment | null;
  readonly internalDepth: ScoutSlotInternalDepth | null;
  readonly candidates: readonly ScoutSlotCandidateComparison[];
}

export interface ScoutSlotInternalDepth {
  readonly withoutIncumbent: SquadSolution;
  readonly replacement: SlotAssignment | null;
  readonly averageRoleFitDelta: number | null;
  readonly changedSlots: number | null;
}

/** A same-export, per-slot fit comparison, never a confirmed club recruitment need. */
export function compareScoutCandidatesForSlot(
  players: readonly PlayerExport[], club: string, formation: FormationId,
  slotId: string, candidateIds: readonly string[]
): ScoutSlotNeed {
  const slot = FORMATIONS[formation].find(item => item.id === slotId) ?? null;
  const clubPlayers = players.filter(player => player.club === club && club !== '');
  const baseline = slot && clubPlayers.length ? optimizeSquad(clubPlayers, formation) : null;
  const incumbent = baseline?.complete
    ? baseline.lineup.find(item => item.slot.id === slotId) ?? null : null;
  const withoutIncumbent = incumbent
    ? optimizeSquad(clubPlayers, formation, { excludedPlayerIds: [incumbent.playerId] }) : null;
  const internalDepth: ScoutSlotInternalDepth | null = withoutIncumbent && baseline ? {
    withoutIncumbent,
    replacement: withoutIncumbent.complete
      ? withoutIncumbent.lineup.find(item => item.slot.id === slotId) ?? null : null,
    averageRoleFitDelta: withoutIncumbent.complete
      ? Math.round(((withoutIncumbent.averageRoleScore ?? 0) - (baseline.averageRoleScore ?? 0)) * 10) / 10
      : null,
    changedSlots: withoutIncumbent.complete
      ? withoutIncumbent.lineup.filter(item => baseline.lineup.find(previous => previous.slot.id === item.slot.id)
        ?.playerId !== item.playerId).length : null
  } : null;
  if (!slot) return { slot, clubPlayerCount: clubPlayers.length, baseline, incumbent, internalDepth, candidates: [] };

  const role = ROLE_PROFILES.find(profile => profile.id === slot.roleId);
  if (!role) throw new Error('Unknown role profile: ' + slot.roleId);
  const byId = new Map(players.map(player => [player.id, player]));
  const candidates: ScoutSlotCandidateComparison[] = [];
  for (const candidateId of new Set(candidateIds)) {
    const player = byId.get(candidateId);
    const scored = player && clubPlayers.length && player.club && player.club !== club
      && declaredPositions(player.position).has(slot.position)
      ? scoreRole(player, role) : null;
    const status: ScoutSlotCandidateStatus = !player ? 'candidate-not-found'
      : !clubPlayers.length ? 'club-not-found'
      : !player.club ? 'candidate-club-unknown'
      : player.club === club ? 'already-in-club'
      : !declaredPositions(player.position).has(slot.position) ? 'position-ineligible'
      : scored?.score === null ? 'insufficient-attributes' : 'eligible';
    candidates.push({
      candidateId, name: player?.name ?? candidateId, club: player?.club ?? null,
      position: player?.position ?? null, status,
      roleFit: scored?.score ?? null, coverage: scored?.coverage ?? null,
      differenceFromIncumbent: scored?.score !== null && scored?.score !== undefined && incumbent
        ? scored.score - incumbent.roleScore : null,
      evidence: scored?.evidence ?? [], missing: scored?.missing ?? []
    });
  }
  candidates.sort((a, b) => (b.roleFit ?? -1) - (a.roleFit ?? -1)
    || a.name.localeCompare(b.name) || a.candidateId.localeCompare(b.candidateId));
  return { slot, clubPlayerCount: clubPlayers.length, baseline, incumbent, internalDepth, candidates };
}
