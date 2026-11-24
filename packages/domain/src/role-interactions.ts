import { FORMATIONS, type SquadSolution } from './squad-optimizer';
import { tacticalPosition, type TacticalScenario } from './tactical-scenarios';

/**
 * MH-09 bounded role-partnership checks against the existing XI role assignments.
 * These are geometry/role heuristics, not match-engine dynamics or a team synergy score.
 */
export const ROLE_INTERACTION_VERSION = 'managerhub.role-interactions.v1' as const;
export type RoleInteractionId = 'incomplete-role-evidence' | 'flank-advance-exposure' | 'central-cover-partnership';
export interface RoleInteractionFinding {
  readonly id: RoleInteractionId;
  readonly slotIds: readonly string[];
  readonly playerNames: readonly string[];
  readonly title: string;
  readonly reason: string;
  readonly suggestion: string;
  readonly limitation: string;
}
export interface RoleInteractionReport {
  readonly model: typeof ROLE_INTERACTION_VERSION;
  readonly source: 'imported-export-and-manager-scenario';
  readonly status: 'complete-xi' | 'incomplete-xi';
  readonly findings: readonly RoleInteractionFinding[];
}

export function analyzeRoleInteractions(
  scenario: TacticalScenario, solution: SquadSolution | null
): RoleInteractionReport {
  const slots = FORMATIONS[scenario.formation];
  const validIds = new Set(slots.map(slot => slot.id));
  const complete = solution?.complete === true && solution.formation === scenario.formation &&
    solution.lineup.length === 11 &&
    new Set(solution.lineup.map(item => item.playerId)).size === 11 &&
    new Set(solution.lineup.map(item => item.slot.id)).size === 11 &&
    solution.lineup.every(item => validIds.has(item.slot.id) &&
      slots.some(slot => slot.id === item.slot.id && slot.roleId === item.slot.roleId && slot.position === item.slot.position));
  const output: RoleInteractionFinding[] = [];
  if (!complete || !solution) {
    output.push({
      id: 'incomplete-role-evidence', slotIds: [], playerNames: [],
      title: 'Role partnership checks need a complete XI',
      reason: 'There is no complete, uniquely assigned XI with the expected formation roles.',
      suggestion: 'Complete the XI and confirm the imported positions before reviewing partnerships.',
      limitation: 'No role relationship is inferred from missing lineup data.'
    });
    return {
      model: ROLE_INTERACTION_VERSION, source: 'imported-export-and-manager-scenario',
      status: 'incomplete-xi', findings: output
    };
  }

  const assigned = new Map(solution.lineup.map(item => [item.slot.id, item] as const));
  const advancingFlanks: number[] = [];
  for (const [backId, wideId] of [['lb','lw'], ['rb','rw']] as const) {
    const back = assigned.get(backId);
    const wide = assigned.get(wideId);
    if (!back || !wide || back.slot.roleId !== 'wing-back' || wide.slot.roleId !== 'winger') continue;
    const defender = tacticalPosition(scenario, 'defending', backId);
    const advanced = tacticalPosition(scenario, 'possession', backId);
    const winger = tacticalPosition(scenario, 'possession', wideId);
    if (defender.y - advanced.y < 4 || Math.abs(advanced.x - winger.x) > 4) continue;
    // A nominal winger moved into the centre is no longer drawing a wide corridor.
    if (wideId === 'lw' ? winger.x > 6 : winger.x < 14) continue;
    advancingFlanks.push(advanced.y);
    output.push({
      id: 'flank-advance-exposure',
      slotIds: [backId, wideId], playerNames: [back.name, wide.name],
      title: 'Advancing wing-back and winger share a flank',
      reason: 'The wing-back advances at least four grid steps and stays within four horizontal steps of the winger in the drawn wide corridor.',
      suggestion: 'Review cover behind this flank or stagger the fullback and winger before committing to this pattern.',
      limitation: 'This is a shape/assigned-role interaction, not a measured overlap, opponent matchup or match-engine partnership.'
    });
  }

  const midfield = slots.filter(slot => slot.position === 'CM' || slot.position === 'DM')
    .filter(slot => {
      const point = tacticalPosition(scenario, 'possession', slot.id);
      return point.x >= 7 && point.x <= 13 && point.y >= 12 &&
        advancingFlanks.some(depth => point.y > depth);
    });
  if (midfield.length > 0) {
    const cover = midfield[0]!;
    const player = assigned.get(cover.id);
    output.push({
      id: 'central-cover-partnership', slotIds: [cover.id], playerNames: player ? [player.name] : [],
      title: 'Deep central midfield cover is drawn',
      reason: 'A central midfielder is drawn in the deeper central grid behind at least one advancing wing-back.',
      suggestion: 'Consider keeping this midfielder available for cover behind an advancing flank in the proposed shape.',
      limitation: 'Position alone does not verify that this player will recover, defend or coordinate successfully.'
    });
  }
  return {
    model: ROLE_INTERACTION_VERSION, source: 'imported-export-and-manager-scenario',
    status: 'complete-xi', findings: output
  };
}
