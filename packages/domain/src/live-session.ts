import profile from './fm2013-live-profile.json' with { type: 'json' };

export interface Fm2013ProcessIdentity {
  readonly pid: number;
  /** Opaque Windows creation FILETIME, preserving all 100ns digits. */
  readonly startedAtFileTime: string;
  readonly imagePath: string;
  readonly binarySha256: string;
}
export interface Fm2013CaptureTicket {
  readonly schema: 'fm2013-live-session-v1';
  readonly captureId: string;
  readonly process: Fm2013ProcessIdentity;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly profileVersion: string;
}
export type Fm2013ProcessObservation =
  | { readonly status: 'observed'; readonly process: Fm2013ProcessIdentity }
  | { readonly status: 'process_not_found' | 'access_denied' | 'observation_failed' | 'unsupported_build' };
export interface Fm2013CaptureBinding {
  readonly captureId: string;
  readonly pid: number;
}
export const FM2013_CAPTURE_REJECTION_REASONS = [
  'invalid_ticket', 'invalid_observation', 'invalid_capture', 'invalid_now', 'clock_rollback', 'ticket_expired',
  'process_not_found', 'access_denied', 'observation_failed', 'unsupported_build', 'capture_id_mismatch', 'capture_pid_mismatch', 'process_identity_changed',
] as const;
export type Fm2013CaptureRejectionReason = typeof FM2013_CAPTURE_REJECTION_REASONS[number];
export type Fm2013CaptureAdmission =
  | { readonly status: 'admitted'; readonly reason: null }
  | { readonly status: 'rejected'; readonly reason: Fm2013CaptureRejectionReason };
export const FM2013_CAPTURE_WINDOW_MS = 10 * 60 * 1000;

/** Only local Windows fm.exe paths are accepted; the exact binary hash identifies the supported build. */
export function isSupportedFm2013ImagePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 9 || value.length > 1024 ||
      !/^[a-z]:\\(?:[^\\/:*?"<>|\u0000-\u001f]+\\)*fm\.exe$/iu.test(value)) return false;
  const segments = value.slice(3).split('\\');
  return segments.length > 0 && segments.every(segment => segment.length > 0 && segment !== '.' && segment !== '..');
}

function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Expected a session object');
  const result = value as Record<string, unknown>;
  if (Reflect.ownKeys(result).length !== keys.length || keys.some(key => !Object.hasOwn(result, key))) throw new TypeError('Unexpected session fields');
  return result;
}
function pid(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 0x7fffffff) throw new TypeError('Invalid session PID');
  return value;
}
function captureId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) throw new TypeError('Invalid capture ID');
  return value;
}
function timestamp(value: unknown): { readonly iso: string; readonly milliseconds: number } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) throw new TypeError('Invalid session timestamp');
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) throw new TypeError('Invalid session timestamp');
  return { iso: value, milliseconds };
}
function processIdentity(value: unknown): Fm2013ProcessIdentity {
  const source = object(value, ['pid', 'startedAtFileTime', 'imagePath', 'binarySha256']);
  if (typeof source.startedAtFileTime !== 'string' || !/^[1-9]\d{17,19}$/u.test(source.startedAtFileTime) ||
      BigInt(source.startedAtFileTime) > 18446744073709551615n || !isSupportedFm2013ImagePath(source.imagePath) || source.binarySha256 !== profile.binarySha256) {
    throw new TypeError('Invalid exact-build process identity');
  }
  return Object.freeze({ pid: pid(source.pid), startedAtFileTime: source.startedAtFileTime, imagePath: source.imagePath, binarySha256: profile.binarySha256 });
}
function ticket(value: unknown): Fm2013CaptureTicket {
  const source = object(value, ['schema', 'captureId', 'process', 'issuedAt', 'expiresAt', 'profileVersion']);
  if (source.schema !== 'fm2013-live-session-v1' || source.profileVersion !== profile.profileVersion) throw new TypeError('Unsupported session ticket');
  const issued = timestamp(source.issuedAt), expires = timestamp(source.expiresAt);
  if (expires.milliseconds <= issued.milliseconds || expires.milliseconds - issued.milliseconds > FM2013_CAPTURE_WINDOW_MS) throw new TypeError('Invalid ticket window');
  return Object.freeze({ schema: 'fm2013-live-session-v1', captureId: captureId(source.captureId), process: processIdentity(source.process),
    issuedAt: issued.iso, expiresAt: expires.iso, profileVersion: profile.profileVersion });
}

/** Creates a local research declaration, never proof of career identity or authenticated capture. */
export function createFm2013CaptureTicket(identity: Fm2013ProcessIdentity, id: string, issuedAt: string): Fm2013CaptureTicket {
  const issued = timestamp(issuedAt);
  return ticket({ schema: 'fm2013-live-session-v1', captureId: id, process: identity, issuedAt: issued.iso,
    expiresAt: new Date(issued.milliseconds + FM2013_CAPTURE_WINDOW_MS).toISOString(), profileVersion: profile.profileVersion });
}

/** Endpoint admission only. Admitted snapshots remain historical captures; no currentness,
 * atomicity, career-lineage, capture-authentication or one-use/replay guarantee is established.
 */
export function validateFm2013CaptureAdmission(rawTicket: unknown, rawObservation: Fm2013ProcessObservation,
  rawCapture: Fm2013CaptureBinding, now: string): Fm2013CaptureAdmission {
  const reject = (reason: Fm2013CaptureRejectionReason): Fm2013CaptureAdmission => Object.freeze({ status: 'rejected', reason });
  let selected: Fm2013CaptureTicket;
  try { selected = ticket(rawTicket); } catch { return reject('invalid_ticket'); }
  let current: number;
  try { current = timestamp(now).milliseconds; } catch { return reject('invalid_now'); }
  if (current < Date.parse(selected.issuedAt)) return reject('clock_rollback');
  if (current >= Date.parse(selected.expiresAt)) return reject('ticket_expired');
  let binding: Fm2013CaptureBinding;
  try {
    const source = object(rawCapture, ['captureId', 'pid']);
    binding = { captureId: captureId(source.captureId), pid: pid(source.pid) };
  } catch { return reject('invalid_capture'); }
  if (binding.captureId !== selected.captureId) return reject('capture_id_mismatch');
  if (binding.pid !== selected.process.pid) return reject('capture_pid_mismatch');
  let observed: Fm2013ProcessIdentity;
  try {
    if (rawObservation.status !== 'observed') {
      const source = object(rawObservation, ['status']);
      if (source.status === 'process_not_found' || source.status === 'access_denied' || source.status === 'observation_failed' || source.status === 'unsupported_build') return reject(source.status);
      return reject('invalid_observation');
    }
    observed = processIdentity(object(rawObservation, ['status', 'process']).process);
  } catch { return reject('invalid_observation'); }
  if (observed.pid !== selected.process.pid || observed.startedAtFileTime !== selected.process.startedAtFileTime ||
      observed.imagePath !== selected.process.imagePath || observed.binarySha256 !== selected.process.binarySha256) return reject('process_identity_changed');
  return Object.freeze({ status: 'admitted', reason: null });
}
