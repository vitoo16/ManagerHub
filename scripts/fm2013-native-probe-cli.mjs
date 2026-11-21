import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { observeFm2013Process } from './fm2013-process-observer.mjs';
import { runFm2013NativeWorker, NATIVE_PROBE_SCHEMA } from './fm2013-native-worker-broker.mjs';

const reject = reason => ({ status: 'rejected', reason });
const supported = new Set(['--pid', '--address', '--bytes']);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dll = resolve(root, 'native/ManagerHub.Fm2013Host/bin/Release/net8.0-windows/ManagerHub.Fm2013Host.dll');

function cliArgs(items) {
  if (items.length !== 6) return null;
  const fields = new Map();
  for (let i = 0; i < items.length; i += 2) {
    if (!supported.has(items[i]) || fields.has(items[i]) || typeof items[i + 1] !== 'string') return null;
    fields.set(items[i], items[i + 1]);
  }
  const pid = Number(fields.get('--pid'));
  const length = Number(fields.get('--bytes'));
  const addressText = fields.get('--address');
  const address = /^0x[0-9a-f]+$/iu.test(addressText ?? '') ? Number.parseInt(addressText, 16) : NaN;
  if (!/^[1-9]\d*$/u.test(fields.get('--pid') ?? '') ||
    !Number.isSafeInteger(pid) || pid > 0x7fffffff ||
    !/^[1-9]\d*$/u.test(fields.get('--bytes') ?? '') ||
    !Number.isSafeInteger(length) || length > 512 ||
    !Number.isSafeInteger(address) || address < 0x10000 ||
    address > 0x7fffffff || address % 4 !== 0 ||
    address + length - 1 > 0x7fffffff) return null;
  return { pid, address, length };
}

async function main() {
  if (process.platform !== 'win32') return reject('unsupported_platform');
  if (!process.stdin.isTTY || !process.stdout.isTTY) return reject('consent_required');
  const args = cliArgs(process.argv.slice(2));
  if (!args) return reject('invalid_request');

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let approved = false;
  try {
    const response = await prompt.question(`Read-only FM2013 research probe for PID ${args.pid}. Type "READ ONLY ${args.pid}" to authorize this one operation: `);
    approved = response === `READ ONLY ${args.pid}`;
  } finally { prompt.close(); }
  if (!approved) return reject('consent_denied');

  // The existing research OS observer independently checks the exact installed
  // executable hash and process creation FILETIME; the .NET worker checks again.
  const observation = await observeFm2013Process(args.pid);
  if (observation.status !== 'observed') return reject(observation.status === 'unsupported_build' ? 'unsupported_build' : 'observation_failed');
  try { await access(dll); } catch { return reject('worker_not_built'); }
  return await runFm2013NativeWorker({
    executable: 'dotnet', args: [dll, '--worker'],
    request: {
      schema: NATIVE_PROBE_SCHEMA, pid: observation.process.pid,
      startedAtFileTime: observation.process.startedAtFileTime,
      address: args.address, byteLength: args.length,
    },
  });
}

try {
  const result = await main();
  // Never print address, native memory, absolute image paths or private diagnostics.
  console.log(JSON.stringify(result));
  if (result.status !== 'read_only_smoke') process.exitCode = 1;
} catch {
  console.log(JSON.stringify(reject('worker_failed')));
  process.exitCode = 1;
}
