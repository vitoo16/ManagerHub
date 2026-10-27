import type { SquadSolution } from './squad-optimizer';

export interface SquadScenarioComparison {
  readonly comparable: boolean;
  readonly changedSlots: number | null;
  readonly changedPlayers: number | null;
  readonly roleFitDelta: number | null;
  readonly explanation: string;
}

/**
 * Compare two feasible draft XIs. Never compare model averages across
 * different formation/role demands as if they measure identical roles.
 */
export function compareSquadScenarios(a: SquadSolution, b: SquadSolution): SquadScenarioComparison {
  if (!a.complete || !b.complete) return {
    comparable:false,changedSlots:null,changedPlayers:null,roleFitDelta:null,
    explanation:'A complete eleven is required in both scenarios before comparing their effectiveness.'
  };
  if(a.formation!==b.formation) return {
    comparable:false,changedSlots:null,changedPlayers:null,roleFitDelta:null,
    explanation:'These formations have different tactical roles. Compare their player selections and coverage separately; role-fit averages are not like-for-like.'
  };
  const bySlot=new Map(a.lineup.map(assignment=>[assignment.slot.id,assignment.playerId]));
  const changes=b.lineup.filter(assignment=>bySlot.get(assignment.slot.id)!==assignment.playerId).length;
  const first=new Set(a.lineup.map(assignment=>assignment.playerId));
  const incoming=b.lineup.filter(assignment=>!first.has(assignment.playerId)).length;
  const delta=(b.averageRoleScore??0)-(a.averageRoleScore??0);
  return {
    comparable:true, changedSlots:changes,changedPlayers:incoming,
    roleFitDelta:Math.round(delta*10)/10,
    explanation:'Same formation, identical heuristic and source export. Changes reflect attribute-fit only, not expected match performance.'
  };
}
