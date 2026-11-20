import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { validateFm2013ProcessIdentity } from '../packages/domain/src/live-session.ts';

/** Research-only, in-process native-side guard. Never import this module into the browser. */
export const FM2013_READONLY_LIMITS = Object.freeze({
  maxRequests: 16,
  maxReadBytes: 512,
  maxTotalBytes: 4096,
  maxDurationMs: 5000,
  minimumAddress: 0x10000,
  maximumAddress: 0x7fffffff,
});

const rejected = (reason) => Object.freeze({ status: 'rejected', reason, blocks: [] });
const allowedErrors = new Set(['process_not_found', 'access_denied', 'observation_failed', 'unsupported_build']);
const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function processStatus(raw, expected) {
  if (exactKeys(raw, ['status']) && allowedErrors.has(raw.status)) return raw.status;
  if (!exactKeys(raw, ['status', 'process']) || raw.status !== 'observed') return 'invalid_observation';
  let observed;
  try { observed = validateFm2013ProcessIdentity(raw.process); } catch { return 'invalid_observation'; }
  if (observed.pid !== expected.pid || observed.startedAtFileTime !== expected.startedAtFileTime ||
      observed.imagePath !== expected.imagePath || observed.binarySha256 !== expected.binarySha256) return 'process_identity_changed';
  return null;
}

function readPlan(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > FM2013_READONLY_LIMITS.maxRequests) return null;
  const seen = new Set();
  let total = 0;
  const plan = [];
  for (const request of raw) {
    if (!exactKeys(request, ['address', 'byteLength', 'nativeKind']) ||
        typeof request.nativeKind !== 'string' ||
        !Object.hasOwn(profile.nativeKinds, request.nativeKind)) return null;
    const { address, byteLength, nativeKind } = request;
    if (!Number.isSafeInteger(address) || address < FM2013_READONLY_LIMITS.minimumAddress ||
        address > FM2013_READONLY_LIMITS.maximumAddress || address % 4 !== 0 ||
        !Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > FM2013_READONLY_LIMITS.maxReadBytes ||
        byteLength - 1 > FM2013_READONLY_LIMITS.maximumAddress - address || seen.has(address)) return null;
    seen.add(address);
    total += byteLength;
    if (total > FM2013_READONLY_LIMITS.maxTotalBytes) return null;
    plan.push({ address, byteLength, nativeKind });
  }
  return plan;
}

/**
 * No OS calls or process attach occur here. The host supplies user-confirmed consent,
 * observation, a read-only OS handle, RTTI inspection, and close. This function does
 * not authenticate loaded image bytes or career lineage; it is not a product reader.
 * Returned buffers and addresses are native-side only, never IPC/web payloads.
 */
export async function probeFm2013ReadOnly(request, host, clock = Date.now) {
  let selected, plan;
  try {
    if (!exactKeys(request, ['process', 'reads'])) return rejected('invalid_request');
    plan = readPlan(request.reads);
    if (!plan) return rejected('invalid_request');
  } catch { return rejected('invalid_request'); }
  try { selected = validateFm2013ProcessIdentity(request.process); } catch { return rejected('unsupported_build'); }
  if (!host || typeof host.confirmUserSelection !== 'function' || typeof host.observe !== 'function' ||
      typeof host.openReadOnly !== 'function' || typeof clock !== 'function') return rejected('invalid_host');

  const currentTime = () => { try { return clock(); } catch { return NaN; } };
  const started = currentTime();
  if (!Number.isFinite(started)) return rejected('invalid_host');
  const expired = () => {
    const current = currentTime();
    return !Number.isFinite(current) || current < started || current - started >= FM2013_READONLY_LIMITS.maxDurationMs;
  };
  try {
    if (await host.confirmUserSelection(selected) !== true) return rejected('consent_denied');
  } catch { return rejected('consent_denied'); }
  if (expired()) return rejected('time_limit');
  let observed;
  try { observed = processStatus(await host.observe(selected.pid), selected); }
  catch { return rejected('observation_failed'); }
  if (observed) return rejected(observed);
  if (expired()) return rejected('time_limit');

  let handle;
  try { handle = await host.openReadOnly(selected.pid); }
  catch { return rejected('access_denied'); }
  if (!handle || typeof handle.readAt !== 'function' || typeof handle.inspectType !== 'function' ||
      typeof handle.close !== 'function') {
    try { if (typeof handle?.close === 'function') await handle.close(); } catch { /* Unsafe handle is rejected either way. */ }
    return rejected('invalid_handle');
  }

  const blocks = [];
  let error = null;
  try {
    for (const item of plan) {
      if (expired()) { error = 'time_limit'; break; }
      const checkBefore = processStatus(await host.observe(selected.pid), selected);
      if (checkBefore) { error = checkBefore; break; }
      const observedClass = await handle.inspectType(item.address);
      const expected = profile.nativeKinds[item.nativeKind];
      if (!exactKeys(observedClass, ['nativeKind', 'decoratedName', 'personOffset']) ||
          observedClass.nativeKind !== item.nativeKind ||
          observedClass.decoratedName !== expected.decoratedName ||
          observedClass.personOffset !== expected.personOffset) { error = 'wrong_native_type'; break; }
      const buffer = await handle.readAt(item.address, item.byteLength);
      if (!(buffer instanceof Uint8Array) || buffer.byteLength !== item.byteLength ||
          buffer.buffer instanceof SharedArrayBuffer) { error = 'partial_or_invalid_read'; break; }
      const afterClass = await handle.inspectType(item.address);
      if (!exactKeys(afterClass, ['nativeKind', 'decoratedName', 'personOffset']) ||
          afterClass.nativeKind !== item.nativeKind || afterClass.decoratedName !== expected.decoratedName ||
          afterClass.personOffset !== expected.personOffset) { error = 'wrong_native_type'; break; }
      const checkAfter = processStatus(await host.observe(selected.pid), selected);
      if (checkAfter) { error = checkAfter; break; }
      if (expired()) { error = 'time_limit'; break; }
      blocks.push({ address: item.address, nativeKind: item.nativeKind, bytes: Uint8Array.from(buffer) });
    }
  } catch { error = 'read_failed'; }
  try { await handle.close(); } catch { error = 'close_failed'; }
  if (error) {
    for (const block of blocks) block.bytes.fill(0);
    return rejected(error);
  }
  return Object.freeze({ status: 'read_only_sample', reason: null, blocks });
}
