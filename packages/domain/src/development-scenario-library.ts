import { ATTRIBUTE_LABELS, type AttributeKey, type PlayerExport } from './player-import';
import { getRoleDutyProfile, type RoleDuty, type RolePosition } from './football-role-registry';
import { evaluateDevelopmentScenario, type DevelopmentScenario } from './player-development';
import { localContentSha256 } from './local-content-hash';

export const DEVELOPMENT_LIBRARY_SCHEMA = 'managerhub.development-library.v1' as const;
export const DEVELOPMENT_STORAGE_PREFIX = 'mh.development.v1:';
export const MAX_DEVELOPMENT_SCENARIOS = 20;
const MAX_JSON = 64_000;
const MODEL = 'manual-role-what-if-v1' as const;
const IMPORTANCE = 'managerhub-role-importance-v1' as const;
const DIGEST = /^[a-f0-9]{64}$/u;
const ID = /^[a-zA-Z0-9-]{1,80}$/u;

export interface DevelopmentBinding {
  readonly scope: string;
  readonly revision: string;
}
export interface SavedDevelopmentScenario {
  readonly id: string;
  readonly name: string;
  readonly savedAt: string;
  readonly revision: string;
  readonly scenario: DevelopmentScenario;
}
export interface DevelopmentLibrary {
  readonly schema: typeof DEVELOPMENT_LIBRARY_SCHEMA;
  readonly model: typeof MODEL;
  readonly importanceModel: typeof IMPORTANCE;
  readonly scope: string;
  readonly records: readonly SavedDevelopmentScenario[];
}
type Source = Pick<PlayerExport, 'id' | 'source' | 'nativeId' | 'attributes' | 'positions' | 'age' | 'leftFoot' | 'rightFoot'>;
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
  Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const rating = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20;
const hasAsciiControl = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};
const nameValid = (value: unknown): value is string => typeof value === 'string' && value === value.trim() &&
  value.length >= 1 && value.length <= 80 && !hasAsciiControl(value);
const isoDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 30 &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function developmentVisibleRevision(player: Source): string {
  // Canonical field order, excludes CA/PA, reputation, hidden traits, name and source bytes.
  return JSON.stringify([player.age, Object.entries(player.attributes).sort(([a], [b]) => a.localeCompare(b, 'en')),
    Object.entries(player.positions ?? {}).sort(([a], [b]) => a.localeCompare(b, 'en')),
    player.leftFoot ?? null, player.rightFoot ?? null]);
}

export async function bindDevelopmentSource(player: Source, sourceId: string, edition: string | null, build: string | null): Promise<DevelopmentBinding> {
  if (!sourceId || !player.id || sourceId.length > 2048 || player.id.length > 2048 ||
      (edition !== null && edition !== 'FM2013') ||
      (player.source === 'decoded_save' && (!DIGEST.test(sourceId) || !Number.isSafeInteger(player.nativeId)))) {
    throw new Error('invalid_development_source');
  }
  const scope = await localContentSha256([player.source, sourceId, player.id, player.nativeId ?? null, edition, build], 16_384);
  const revision = await localContentSha256(developmentVisibleRevision(player), 16_384);
  return { scope, revision };
}

function canonicalScenario(value: unknown): DevelopmentScenario {
  if (!exact(value, ['target','benchmark','overrides','locked']) || !rating(value.benchmark) ||
      !exact(value.target, ['position','roleId','duty']) ||
      typeof value.target.position !== 'string' || typeof value.target.roleId !== 'string' || typeof value.target.duty !== 'string' ||
      !Array.isArray(value.locked) || value.locked.length > 49 || typeof value.overrides !== 'object' ||
      value.overrides === null || Array.isArray(value.overrides)) throw new Error('invalid_development_scenario');
  const target = { position: value.target.position as RolePosition, roleId: value.target.roleId, duty: value.target.duty as RoleDuty };
  const profile = getRoleDutyProfile('FM2013', target.roleId, target.position, target.duty);
  if (!profile || Object.keys(value.overrides).length > 49) throw new Error('invalid_development_scenario');
  const allowed = new Set(Object.keys(profile.demands));
  const locked: AttributeKey[] = [];
  for (const key of value.locked) {
    if (typeof key !== 'string' || !allowed.has(key) || locked.includes(key as AttributeKey)) throw new Error('invalid_development_scenario');
    locked.push(key as AttributeKey);
  }
  const overrides: Partial<Record<AttributeKey, number>> = {};
  for (const [key, proposed] of Object.entries(value.overrides)) {
    if (!Object.hasOwn(ATTRIBUTE_LABELS, key) || !allowed.has(key) || locked.includes(key as AttributeKey) ||
        !rating(proposed)) throw new Error('invalid_development_scenario');
    overrides[key as AttributeKey] = proposed;
  }
  return { target, benchmark: value.benchmark, overrides, locked };
}

export function emptyDevelopmentLibrary(binding: DevelopmentBinding): DevelopmentLibrary {
  return { schema: DEVELOPMENT_LIBRARY_SCHEMA, model: MODEL, importanceModel: IMPORTANCE, scope: binding.scope, records: [] };
}

export function decodeDevelopmentLibrary(raw: string | null, binding: DevelopmentBinding): DevelopmentLibrary {
  if (raw === null) return emptyDevelopmentLibrary(binding);
  if (!raw.length || raw.length > MAX_JSON) throw new Error('invalid_development_library');
  const value: unknown = JSON.parse(raw);
  if (!exact(value, ['schema','model','importanceModel','scope','records']) ||
      value.schema !== DEVELOPMENT_LIBRARY_SCHEMA || value.model !== MODEL || value.importanceModel !== IMPORTANCE ||
      value.scope !== binding.scope || !Array.isArray(value.records) || value.records.length > MAX_DEVELOPMENT_SCENARIOS) {
    throw new Error('invalid_development_library');
  }
  const ids = new Set<string>();
  const records = value.records.map((record: unknown): SavedDevelopmentScenario => {
    if (!exact(record, ['id','name','savedAt','revision','scenario']) || typeof record.id !== 'string' ||
        !ID.test(record.id) || ids.has(record.id) || !nameValid(record.name) || !isoDate(record.savedAt) ||
        typeof record.revision !== 'string' || !DIGEST.test(record.revision)) throw new Error('invalid_development_library');
    ids.add(record.id);
    return { id: record.id, name: record.name, savedAt: record.savedAt, revision: record.revision, scenario: canonicalScenario(record.scenario) };
  });
  return { ...emptyDevelopmentLibrary(binding), records };
}

export function makeDevelopmentRecord(binding: DevelopmentBinding, player: Source, scenario: DevelopmentScenario,
  name: string, id: string, savedAt: string): SavedDevelopmentScenario {
  const canonical = canonicalScenario(scenario);
  const evaluated = evaluateDevelopmentScenario(player, 'FM2013', null, canonical);
  if (!evaluated || evaluated.rejected.length || !nameValid(name) || !ID.test(id) || !isoDate(savedAt) ||
      canonical.locked.some(key => !rating(player.attributes[key]))) throw new Error('invalid_development_scenario');
  return { id, name, savedAt, revision: binding.revision, scenario: canonical };
}

export function restoreDevelopmentRecord(record: SavedDevelopmentScenario, binding: DevelopmentBinding, player: Source): DevelopmentScenario {
  if (record.revision !== binding.revision) throw new Error('stale_development_scenario');
  return makeDevelopmentRecord(binding, player, record.scenario, record.name, record.id, record.savedAt).scenario;
}

export function encodeDevelopmentLibrary(library: DevelopmentLibrary, binding: DevelopmentBinding): string {
  const raw = JSON.stringify(library);
  return JSON.stringify(decodeDevelopmentLibrary(raw, binding));
}
