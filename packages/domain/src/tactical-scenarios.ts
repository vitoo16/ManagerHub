import type { PlayerDataset } from './player-import';
import { FORMATIONS, type FormationId } from './squad-optimizer';
import { squadDatasetSha256 } from './squad-plan-library';
import type { SquadPlanKey, SquadPlans } from './squad-scenarios';
export { defaultTacticalScenario, defaultTacticalScenarios, tacticalScenarioForFormation } from './tactical-state';

export type TacticalPhase = 'possession' | 'defending';
export type TacticalWidth = 'narrow' | 'balanced' | 'wide';
export type TacticalIntensity = 'low' | 'balanced' | 'high';
export interface TacticalPoint { readonly x: number; readonly y: number }
export interface TacticalInstructions {
  readonly width: TacticalWidth;
  readonly tempo: TacticalIntensity;
  readonly pressing: TacticalIntensity;
  readonly defensiveLine: TacticalIntensity;
}
export interface TacticalScenario {
  readonly formation: FormationId;
  readonly placements: Readonly<Record<TacticalPhase, Readonly<Record<string, TacticalPoint>>>>;
  readonly instructions: TacticalInstructions;
}
export type TacticalScenarios = Readonly<Record<SquadPlanKey, TacticalScenario>>;

export const TACTICAL_SCHEMA = 'managerhub.tactical-scenarios.v1' as const;
export const TACTICAL_STORAGE_PREFIX = 'mh.tactical-scenarios.v1:';
const MAX_JSON = 12_000;

export function tacticalPosition(scenario: TacticalScenario, phase: TacticalPhase, slotId: string): TacticalPoint {
  const slot = FORMATIONS[scenario.formation].find(item => item.id === slotId);
  if (!slot) throw new Error('unknown_tactical_slot');
  return scenario.placements[phase][slotId] ?? {
    x: 2 + slot.column * 4,
    y: slot.row === -1 ? 2 : slot.row === 0 ? (scenario.formation === '4-2-3-1' ? 6 : 4)
      : slot.row === 1 ? 10 : slot.row === 2 ? 15 : 19
  };
}

/** Pitch coordinates are integer 5% steps, bounded away from the edge. */
export function positionTacticalSlot(
  scenario: TacticalScenario, phase: TacticalPhase, slotId: string, point: TacticalPoint
): TacticalScenario {
  if (!FORMATIONS[scenario.formation].some(slot => slot.id === slotId) ||
    !Number.isInteger(point.x) || !Number.isInteger(point.y) ||
    point.x < 1 || point.x > 19 || point.y < 1 || point.y > 19) throw new Error('invalid_tactical_position');
  return {
    ...scenario,
    placements: { ...scenario.placements, [phase]: { ...scenario.placements[phase], [slotId]: point } }
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isObject(value) && Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function canonicalScenario(value: unknown, formation: FormationId): TacticalScenario {
  if (!exact(value, ['formation', 'placements', 'instructions']) || value.formation !== formation ||
    !exact(value.placements, ['possession', 'defending']) ||
    !exact(value.instructions, ['width', 'tempo', 'pressing', 'defensiveLine'])) throw new Error('invalid_tactical_scenario');
  const width = value.instructions.width;
  const level = (input: unknown) => input === 'low' || input === 'balanced' || input === 'high';
  if ((width !== 'narrow' && width !== 'balanced' && width !== 'wide') ||
    !level(value.instructions.tempo) || !level(value.instructions.pressing) ||
    !level(value.instructions.defensiveLine)) throw new Error('invalid_tactical_instructions');
  const slots = new Set(FORMATIONS[formation].map(slot => slot.id));
  const validated: Record<TacticalPhase, Record<string, TacticalPoint>> = { possession: {}, defending: {} };
  for (const phase of ['possession', 'defending'] as const) {
    const positions = value.placements[phase];
    if (!isObject(positions) || Object.keys(positions).length > slots.size) throw new Error('invalid_tactical_positions');
    for (const [id, point] of Object.entries(positions)) {
      if (!slots.has(id) || !exact(point, ['x', 'y']) ||
        !Number.isInteger(point.x) || !Number.isInteger(point.y) ||
        (point.x as number) < 1 || (point.x as number) > 19 ||
        (point.y as number) < 1 || (point.y as number) > 19) throw new Error('invalid_tactical_positions');
      validated[phase][id] = { x: point.x as number, y: point.y as number };
    }
  }
  return {
    formation,
    placements: validated,
    instructions: {
      width: width as TacticalWidth,
      tempo: value.instructions.tempo as TacticalIntensity,
      pressing: value.instructions.pressing as TacticalIntensity,
      defensiveLine: value.instructions.defensiveLine as TacticalIntensity
    }
  };
}

function canonicalScenarios(value: unknown, plans: SquadPlans): TacticalScenarios {
  if (!exact(value, ['A', 'B'])) throw new Error('invalid_tactical_scenarios');
  return {
    A: canonicalScenario(value.A, plans.A.formation),
    B: canonicalScenario(value.B, plans.B.formation)
  };
}

export interface SavedTacticalScenarios {
  readonly schema: typeof TACTICAL_SCHEMA;
  readonly datasetSha256: string;
  readonly savedAt: string;
  readonly scenarios: TacticalScenarios;
}

export async function makeSavedTacticalScenarios(
  dataset: PlayerDataset, scenarios: TacticalScenarios, plans: SquadPlans,
  savedAt = new Date().toISOString()
): Promise<SavedTacticalScenarios> {
  if (!Number.isFinite(Date.parse(savedAt)) || new Date(savedAt).toISOString() !== savedAt) throw new Error('invalid_saved_time');
  const saved: SavedTacticalScenarios = {
    schema: TACTICAL_SCHEMA,
    datasetSha256: await squadDatasetSha256(dataset),
    savedAt,
    scenarios: canonicalScenarios(scenarios, plans)
  };
  if (JSON.stringify(saved).length > MAX_JSON) throw new Error('tactical_scenario_too_large');
  return saved;
}

export async function restoreSavedTacticalScenarios(
  raw: string, dataset: PlayerDataset, plans: SquadPlans
): Promise<SavedTacticalScenarios> {
  if (raw.length === 0 || raw.length > MAX_JSON) throw new Error('invalid_tactical_scenarios');
  const value: unknown = JSON.parse(raw);
  if (!exact(value, ['schema', 'datasetSha256', 'savedAt', 'scenarios']) ||
    value.schema !== TACTICAL_SCHEMA || typeof value.datasetSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.datasetSha256) ||
    typeof value.savedAt !== 'string' || value.savedAt.length > 40 ||
    !Number.isFinite(Date.parse(value.savedAt)) ||
    new Date(value.savedAt).toISOString() !== value.savedAt) throw new Error('invalid_tactical_scenarios');
  const digest = await squadDatasetSha256(dataset);
  if (value.datasetSha256 !== digest) throw new Error('different_player_export');
  return {
    schema: TACTICAL_SCHEMA, datasetSha256: digest, savedAt: value.savedAt,
    scenarios: canonicalScenarios(value.scenarios, plans)
  };
}
