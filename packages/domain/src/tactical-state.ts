import type { FormationId } from './squad-optimizer';
import type { TacticalScenario, TacticalScenarios } from './tactical-scenarios';

/** Lightweight scenario defaults for the app shell, without a data-reader dependency. */
export function defaultTacticalScenario(formation: FormationId): TacticalScenario {
  return {
    formation,
    placements: { possession: {}, defending: {} },
    instructions: { width: 'balanced', tempo: 'balanced', pressing: 'balanced', defensiveLine: 'balanced' }
  };
}

export function defaultTacticalScenarios(): TacticalScenarios {
  return { A: defaultTacticalScenario('4-3-3'), B: defaultTacticalScenario('4-3-3') };
}

/** A change of formation invalidates saved slot coordinates for that plan only. */
export function tacticalScenarioForFormation(current: TacticalScenario, formation: FormationId): TacticalScenario {
  return current.formation === formation ? current : defaultTacticalScenario(formation);
}
