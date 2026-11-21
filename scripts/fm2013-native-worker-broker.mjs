import { spawn } from 'node:child_process';

export const NATIVE_PROBE_SCHEMA = 'managerhub-native-probe-v1';
export const NATIVE_PROBE_TIMEOUT_MS = 5000;
const MAX_REQUEST_BYTES = 512;
const MAX_RESPONSE_BYTES = 1024;
const reasons = new Set([
  'invalid_request', 'unsupported_platform', 'unsupported_build', 'process_not_found',
  'process_identity_changed', 'access_denied', 'invalid_image', 'partial_or_invalid_read',
  'read_failed', 'time_limit', 'worker_failed', 'invalid_response',
]);
const failed = reason => Object.freeze({ status: 'rejected', reason, bytesRead: 0 });

/** Native-side broker only. Never call this from browser/renderer/worker bundles.
 * The process kill makes the broker return by its deadline; it cannot prove that
 * a hung kernel syscall was canceled or the worker's OS handle was released.
 */
export async function runFm2013NativeWorker({ executable, args = [], request, timeoutMs = NATIVE_PROBE_TIMEOUT_MS, spawnWorker = spawn }) {
  if (typeof executable !== 'string' || !executable || !Array.isArray(args) ||
    args.some(x => typeof x !== 'string') || typeof spawnWorker !== 'function' ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > NATIVE_PROBE_TIMEOUT_MS ||
    !request || typeof request !== 'object' || Array.isArray(request)) return failed('invalid_request');
  const required = ['schema', 'pid', 'startedAtFileTime', 'address', 'byteLength'];
  try {
    if (Reflect.ownKeys(request).length !== required.length || !required.every(k => Object.hasOwn(request, k)) ||
      request.schema !== NATIVE_PROBE_SCHEMA || !Number.isSafeInteger(request.pid) ||
      request.pid < 1 || request.pid > 0x7fffffff ||
      typeof request.startedAtFileTime !== 'string' || !/^[1-9]\d{17,19}$/u.test(request.startedAtFileTime) ||
      BigInt(request.startedAtFileTime) > 18446744073709551615n ||
      !Number.isSafeInteger(request.address) || request.address < 0x10000 ||
      request.address > 0x7fffffff || request.address % 4 !== 0 ||
      !Number.isSafeInteger(request.byteLength) || request.byteLength < 1 || request.byteLength > 512 ||
      request.address + request.byteLength - 1 > 0x7fffffff) return failed('invalid_request');
  } catch { return failed('invalid_request'); }
  let payload;
  try {
    payload = JSON.stringify(request) + '\n';
    if (Buffer.byteLength(payload, 'utf8') > MAX_REQUEST_BYTES) return failed('invalid_request');
  } catch { return failed('invalid_request'); }

  return await new Promise(resolve => {
    let child;
    try {
      child = spawnWorker(executable, args, {
        shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch { resolve(failed('worker_failed')); return; }
    let settled = false, response = '', oversized = false;
    let timer;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const stop = reason => {
      if (settled) return;
      try { child.kill('SIGKILL'); } catch { /* Failure still reported; native OS cleanup unverified. */ }
      finish(failed(reason));
    };
    const onChunk = chunk => {
      if (settled || oversized) return;
      if (Buffer.byteLength(response, 'utf8') + chunk.byteLength > MAX_RESPONSE_BYTES) {
        oversized = true;
        stop('invalid_response');
      } else response += chunk.toString('utf8');
    };
    child.stdout?.on('data', onChunk);
    child.stdout?.on('error', () => stop('worker_failed'));
    child.stderr?.on('data', () => {}); // Deliberately never forward native stderr/private data.
    child.stdin?.on('error', () => {}); // Child may already have exited.
    child.on('error', () => stop('worker_failed'));
    child.on('close', code => {
      if (settled) return;
      if (code !== 0 || oversized) { finish(failed('worker_failed')); return; }
      try {
        const value = JSON.parse(response.trim());
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          Object.keys(value).length !== 4 ||
          !['schema', 'status', 'reason', 'bytesRead'].every(k => Object.hasOwn(value, k)) ||
          value.schema !== NATIVE_PROBE_SCHEMA || !Number.isInteger(value.bytesRead)) {
          finish(failed('invalid_response')); return;
        }
        if (value.status === 'read_only_smoke' && value.reason === null &&
          value.bytesRead === request.byteLength) {
          finish(Object.freeze({ status: value.status, reason: null, bytesRead: value.bytesRead }));
        } else if (value.status === 'rejected' && reasons.has(value.reason) && value.bytesRead === 0) {
          finish(failed(value.reason));
        } else finish(failed('invalid_response'));
      } catch { finish(failed('invalid_response')); }
    });
    timer = setTimeout(() => stop('time_limit'), timeoutMs);
    try { child.stdin.end(payload); } catch { stop('worker_failed'); }
  });
}
