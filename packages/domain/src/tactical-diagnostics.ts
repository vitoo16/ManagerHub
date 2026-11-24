import { FORMATIONS, type SquadSolution } from './squad-optimizer';
import { positionTacticalSlot, tacticalPosition, type TacticalScenario } from './tactical-scenarios';

export const TACTICAL_DIAGNOSTIC_VERSION = 'managerhub.tactical-diagnostics.v1' as const;

export type TacticalDiagnosticId =
  | 'incomplete-xi'
  | 'high-line-low-press'
  | 'advanced-fullbacks-without-cover'
  | 'open-central-channel';

export interface TacticalDiagnostic {
  readonly id: TacticalDiagnosticId;
  readonly severity: 'caution' | 'information';
  readonly title: string;
  readonly trigger: string;
  readonly adjustment: string;
  readonly limitation: string;
}

export interface TacticalDiagnosticReport {
  readonly model: typeof TACTICAL_DIAGNOSTIC_VERSION;
  readonly source: 'manager-authored-scenario';
  readonly lineupEvidence: 'complete-xi' | 'incomplete-xi';
  readonly diagnostics: readonly TacticalDiagnostic[];
}

const RULES = {
  'incomplete-xi': {
    id: 'incomplete-xi',
    severity: 'information',
    title: 'Complete the XI to assess tactical shape',
    trigger: 'This formation does not have eleven unique assigned players in the current lineup.',
    adjustment: 'Fill the remaining lineup slots and review the tactical board again.',
    limitation: 'The position markers are still editable, but shape warnings need a full assigned XI.'
  },
  'high-line-low-press': {
    id: 'high-line-low-press',
    severity: 'caution',
    title: 'High line with low pressing',
    trigger: 'The proposed defensive line is high while pressing intensity is low.',
    adjustment: 'Review pressure on the ball, or consider a lower defensive line.',
    limitation: 'Actual pressure, recovery pace and match outcomes cannot be inferred from these settings.'
  },
  'advanced-fullbacks-without-cover': {
    id: 'advanced-fullbacks-without-cover',
    severity: 'caution',
    title: 'Both fullbacks advance without central cover',
    trigger: 'Both fullbacks move at least four grid steps forward in possession and no central midfielder occupies the deeper central cover zone.',
    adjustment: 'Keep one fullback deeper or position a central midfielder behind the advancing pair.',
    limitation: 'The check uses manager-drawn positions only. It cannot assess speed, work rate or real recovery runs.'
  },
  'open-central-channel': {
    id: 'open-central-channel',
    severity: 'caution',
    title: 'Open central defensive channel',
    trigger: 'The two centre-backs are at least ten grid steps apart in the defending phase, with no midfielder in the deeper central zone.',
    adjustment: 'Narrow the centre-back spacing or move a central midfielder into the covering zone.',
    limitation: 'Spacing is a drawn geometry check. Opponent movement, marking and player ability are unknown.'
  }
} as const satisfies Record<TacticalDiagnosticId, TacticalDiagnostic>;

/** Deterministic shape checks on user-authored 1–19 pitch coordinates and scenario settings. */
export function diagnoseTacticalScenario(
  scenario: TacticalScenario, solution: SquadSolution | null
): TacticalDiagnosticReport {
  const slots = FORMATIONS[scenario.formation];
  const ids = new Set(slots.map(slot => slot.id));
  const complete = solution?.complete === true && solution.formation === scenario.formation &&
    solution.lineup.length === slots.length &&
    new Set(solution.lineup.map(item => item.slot.id)).size === slots.length &&
    new Set(solution.lineup.map(item => item.playerId)).size === slots.length &&
    solution.lineup.every(item => ids.has(item.slot.id));

  if (!complete) return {
    model: TACTICAL_DIAGNOSTIC_VERSION,
    source: 'manager-authored-scenario',
    lineupEvidence: 'incomplete-xi',
    diagnostics: [RULES['incomplete-xi']]
  };

  const diagnostics: TacticalDiagnostic[] = [];
  if (scenario.instructions.defensiveLine === 'high' && scenario.instructions.pressing === 'low') {
    diagnostics.push(RULES['high-line-low-press']);
  }

  const midfielders = slots.filter(slot => slot.position === 'CM' || slot.position === 'DM');
  const centralCover = (phase: 'possession' | 'defending') => midfielders.some(slot => {
    const point = tacticalPosition(scenario, phase, slot.id);
    return point.x >= 7 && point.x <= 13 && point.y >= 12;
  });

  const fullbacksAdvance = ['lb', 'rb'].every(id =>
    tacticalPosition(scenario, 'defending', id).y - tacticalPosition(scenario, 'possession', id).y >= 4
  );
  if (fullbacksAdvance && !centralCover('possession')) {
    diagnostics.push(RULES['advanced-fullbacks-without-cover']);
  }

  const leftCentreBack = tacticalPosition(scenario, 'defending', 'lcb');
  const rightCentreBack = tacticalPosition(scenario, 'defending', 'rcb');
  if (Math.abs(rightCentreBack.x - leftCentreBack.x) >= 10 && !centralCover('defending')) {
    diagnostics.push(RULES['open-central-channel']);
  }

  return {
    model: TACTICAL_DIAGNOSTIC_VERSION,
    source: 'manager-authored-scenario',
    lineupEvidence: 'complete-xi',
    diagnostics
  };
}

/**
 * An opt-in, reversible suggestion for a *manager-authored* tactic.
 * These corrections address only the specified geometric rule; they never
 * predict match performance or mutate an imported game source.
 */
export type TacticalAdjustmentId = Exclude<TacticalDiagnosticId, 'incomplete-xi'>;

export function applyTacticalDiagnosticAdjustment(
  scenario: TacticalScenario, id: TacticalAdjustmentId
): TacticalScenario {
  if (id === 'high-line-low-press') {
    return { ...scenario, instructions: { ...scenario.instructions, defensiveLine: 'balanced' } };
  }
  if (id === 'advanced-fullbacks-without-cover') {
    const rightBack = tacticalPosition(scenario, 'possession', 'rb');
    const defendingRightBack = tacticalPosition(scenario, 'defending', 'rb');
    return positionTacticalSlot(scenario, 'possession', 'rb', { ...rightBack, y: defendingRightBack.y });
  }
  if (id === 'open-central-channel') {
    const left = tacticalPosition(scenario, 'defending', 'lcb');
    const right = tacticalPosition(scenario, 'defending', 'rcb');
    const targetX = Math.max(1, Math.min(19, left.x + (right.x >= left.x ? 9 : -9)));
    return positionTacticalSlot(scenario, 'defending', 'rcb', { ...right, x: targetX });
  }
  throw new Error('unknown_tactical_adjustment');
}
