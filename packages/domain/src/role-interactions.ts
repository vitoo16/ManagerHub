import { FORMATIONS, type SquadSolution } from './squad-optimizer';
import { positionTacticalSlot, tacticalPosition, type TacticalScenario } from './tactical-scenarios';

/**
 * MH-09 bounded role-partnership checks against the existing XI role assignments.
 * These are geometry/role heuristics, not match-engine dynamics or a team synergy score.
 */
export const ROLE_INTERACTION_VERSION = 'managerhub.role-interactions.v1' as const;
export type RoleInteractionId =
  | 'incomplete-role-evidence'
  | 'flank-advance-exposure'
  | 'central-cover-partnership'
  | 'uncovered-central-pivot'
  | 'central-midfield-congestion';

export type RoleAdjustmentId =
  | 'flank-advance-exposure'
  | 'uncovered-central-pivot'
  | 'central-midfield-congestion';

export function isRoleAdjustmentId(id: RoleInteractionId): id is RoleAdjustmentId {
  return id === 'flank-advance-exposure' || id === 'uncovered-central-pivot' || id === 'central-midfield-congestion';
}

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

  // MH-09 Step 3: Uncovered Central Pivot
  const centralMids = slots.filter(slot => slot.position === 'CM' || slot.position === 'DM');
  const midPlacements = centralMids.map(slot => ({ slot, point: tacticalPosition(scenario, 'possession', slot.id) }));
  const allMidsAdvanced = centralMids.length >= 2 && midPlacements.every(item => item.point.y <= 8);
  const hasScreeningMid = midPlacements.some(item => item.point.x >= 7 && item.point.x <= 13 && item.point.y >= 11);
  if (allMidsAdvanced && !hasScreeningMid) {
    output.push({
      id: 'uncovered-central-pivot',
      slotIds: centralMids.map(slot => slot.id),
      playerNames: centralMids.map(slot => assigned.get(slot.id)?.name).filter((name): name is string => Boolean(name)),
      title: 'Uncovered central pivot',
      reason: 'All central midfielders advance into attacking depth (Y <= 8) without a holding presence in front of the centre-backs.',
      suggestion: 'Retain at least one central midfielder in a deeper position (Y >= 11) to maintain central balance during transitions.',
      limitation: 'This is a spatial guideline based on manager-authored coordinates, not an in-engine simulation of transition defensive shapes.'
    });
  }

  // MH-09 Step 3: Central Midfield Spatial Congestion
  const centralRoles = slots.filter(slot => slot.position === 'CM' || slot.position === 'DM' || slot.position === 'AM');
  for (let i = 0; i < centralRoles.length; i++) {
    for (let j = i + 1; j < centralRoles.length; j++) {
      const s1 = centralRoles[i]!;
      const s2 = centralRoles[j]!;
      const p1 = tacticalPosition(scenario, 'possession', s1.id);
      const p2 = tacticalPosition(scenario, 'possession', s2.id);
      if (p1.x >= 7 && p1.x <= 13 && p2.x >= 7 && p2.x <= 13 &&
          p1.y <= 9 && p2.y <= 9 &&
          Math.abs(p1.x - p2.x) <= 1 && Math.abs(p1.y - p2.y) <= 1) {
        const p1Name = assigned.get(s1.id)?.name ?? s1.label;
        const p2Name = assigned.get(s2.id)?.name ?? s2.label;
        output.push({
          id: 'central-midfield-congestion',
          slotIds: [s1.id, s2.id],
          playerNames: [p1Name, p2Name],
          title: 'Central midfield spatial congestion',
          reason: 'Two central players occupy overlapping positions in the central attacking channel within one grid unit of each other.',
          suggestion: 'Stagger depth or assign different horizontal channels to provide distinct passing options and prevent space congestion.',
          limitation: 'Spatial proximity on the tactical board does not capture dynamic player movement or tactical free-role instructions.'
        });
      }
    }
  }

  return {
    model: ROLE_INTERACTION_VERSION, source: 'imported-export-and-manager-scenario',
    status: 'complete-xi', findings: output
  };
}

/** Apply only the selected, currently supported finding. A stale or invalid XI is a no-op. */
export function applyRoleInteractionAdjustment(
  scenario: TacticalScenario,
  solution: SquadSolution | null,
  target: Pick<RoleInteractionFinding, 'id' | 'slotIds' | 'playerNames'>
): TacticalScenario {
  if (!isRoleAdjustmentId(target.id)) throw new Error('unknown_role_adjustment');
  const finding = analyzeRoleInteractions(scenario, solution).findings.find(item =>
    item.id === target.id &&
    item.slotIds.length === target.slotIds.length &&
    item.slotIds.every((id, index) => id === target.slotIds[index]) &&
    item.playerNames.length === target.playerNames.length &&
    item.playerNames.every((name, index) => name === target.playerNames[index]));
  if (!finding) return scenario;

  if (finding.id === 'flank-advance-exposure') {
    const backId = finding.slotIds[0]!;
    const defending = tacticalPosition(scenario, 'defending', backId);
    return positionTacticalSlot(scenario, 'possession', backId, defending);
  }
  if (finding.id === 'uncovered-central-pivot') {
    const targetSlotId = scenario.formation === '4-3-3' ? 'cm' : 'rdm';
    const defending = tacticalPosition(scenario, 'defending', targetSlotId);
    return positionTacticalSlot(scenario, 'possession', targetSlotId, {
      x: Math.max(7, Math.min(13, defending.x)), y: 12
    });
  }
  if (finding.id === 'central-midfield-congestion') {
    const slotId = finding.slotIds[1]!;
    const point = tacticalPosition(scenario, 'possession', slotId);
    return positionTacticalSlot(scenario, 'possession', slotId, {
      x: point.x, y: point.y + 3
    });
  }
  return scenario;
}
