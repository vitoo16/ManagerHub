import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runFm2013NativeWorker, NATIVE_PROBE_SCHEMA } from './fm2013-native-worker-broker.mjs';

const request = () => ({
  schema: NATIVE_PROBE_SCHEMA, pid: 1234, startedAtFileTime: '134064000000000001',
  address: 0x123400, byteLength: 4,
});
const approved = () => ({ schema: NATIVE_PROBE_SCHEMA, status: 'read_only_smoke', reason: null, bytesRead: 4 });
const denied = reason => ({ schema: NATIVE_PROBE_SCHEMA, status: 'rejected', reason, bytesRead: 0 });
function worker(code, input = request(), timeoutMs = 2000) {
  return runFm2013NativeWorker({ executable: process.execPath, args: ['-e', code], request: input, timeoutMs });
}
const emit = (value, overrideId = null) => `let text='';process.stdin.on('data',v=>text+=v);process.stdin.on('end',()=>{const req=JSON.parse(text);process.stdout.write(JSON.stringify({...${JSON.stringify(value)},requestId:${overrideId===null?'req.requestId':JSON.stringify(overrideId)}}));});`;

test('strict child result only permits sanitized length without raw address or memory', async () => {
  assert.deepEqual(await worker(emit(approved())), { status: 'read_only_smoke', reason: null, bytesRead: 4 });
  const f = await worker(emit(denied('unsupported_build')));
  assert.deepEqual(f, { status: 'rejected', reason: 'unsupported_build', bytesRead: 0 });
});
test('rejected malformed PID, pointer, identity, overlap bounds and extra keys before spawn', async () => {
  for (const change of [
    { pid: 0 }, { pid: 0x80000000 }, { pid: -1 },
    { address: 0 }, { address: 0x123401 }, { address: 0x7ffffffc, byteLength: 8 },
    { byteLength: 513 }, { byteLength: 0 }, { startedAtFileTime: 'not-filetime' },
    { unexpected: true }, { schema: 'different' },
  ]) {
    const result = await runFm2013NativeWorker({
      executable: process.execPath, args: [], request: { ...request(), ...change },
      spawnWorker: () => { throw Error('must not spawn'); },
    });
    assert.equal(result.reason, 'invalid_request');
  }
});
test('private child exception strings and malformed JSON never escape', async () => {
  const code = `process.stderr.write('PRIVATE PII');process.stdout.write('private-bad-json');`;
  const result = await worker(code);
  assert.deepEqual(result, { status: 'rejected', reason: 'invalid_response', bytesRead: 0 });
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
});
test('worker cannot send memory, extra fields, oversized or inconsistent read sizes', async () => {
  for (const output of [
    { ...approved(), bytes: [1, 2, 3, 4] },
    { ...approved(), address: 0x123400 },
    { ...approved(), bytesRead: 3 },
    { ...approved(), bytesRead: 513 },
    { ...denied('read_failed'), bytesRead: 4 },
    { ...denied('private-data') },
  ]) assert.equal((await worker(emit(output))).reason, 'invalid_response');
  const huge = `process.stdout.write('x'.repeat(2048));`;
  assert.equal((await worker(huge)).reason, 'invalid_response');
});
test('v2 correlation rejects wrong, missing and replayed worker response IDs', async () => {
  assert.equal((await worker(emit(approved(), '0'.repeat(32)))).reason, 'invalid_response');
  assert.equal((await worker(emit({ ...approved(), requestId: undefined }, 'deadbeef'))).reason, 'invalid_response');
  const legacy = `process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify({ schema: 'managerhub-native-probe-v1', status: 'read_only_smoke', reason: null, bytesRead: 4 }))}));`;
  assert.equal((await worker(legacy)).reason, 'invalid_response');
  const unbound = `process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(approved()))}));`;
  assert.equal((await worker(unbound)).reason, 'invalid_response');
  const caller = request(); caller.requestId = 'f'.repeat(32);
  const blocked = await runFm2013NativeWorker({
    executable: process.execPath, request: caller,
    spawnWorker: () => { throw Error('request rejected before spawn'); },
  });
  assert.equal(blocked.reason, 'invalid_request');
});

test('child exit code and spawn errors are fail-closed', async () => {
  assert.equal((await worker('process.exit(9)')).reason, 'worker_failed');
  assert.equal((await runFm2013NativeWorker({
    executable: '/unlikely/missing-exe-managerhub-native',
    args: [], request: request(),
  })).reason, 'worker_failed');
});
test('hung native child must not delay broker beyond requested deadline', async () => {
  const begin = Date.now();
  const response = await worker(`process.stdin.resume();setInterval(()=>{},1000);`, request(), 200);
  assert.deepEqual(response, { status: 'rejected', reason: 'time_limit', bytesRead: 0 });
  assert.ok(Date.now() - begin < 5000);
});
test('rejects invalid worker arguments without spawning', async () => {
  assert.equal((await runFm2013NativeWorker({
    executable: process.execPath, request: request(), timeoutMs: 5001,
    spawnWorker: () => { throw Error('must not spawn'); },
  })).reason, 'invalid_request');
  assert.equal((await runFm2013NativeWorker({
    executable: process.execPath, request: request(), args: [null],
    spawnWorker: () => { throw Error('must not spawn'); },
  })).reason, 'invalid_request');
});
test('broker requires an absolute native host executable path', async () => {
  const result = await runFm2013NativeWorker({
    executable: 'dotnet', request: request(),
    spawnWorker: () => { throw Error('must reject PATH lookup before spawn'); },
  });
  assert.equal(result.reason, 'invalid_request');
});

test('worker is allowed only the explicit safe statuses', async () => {
  for (const reason of ['process_identity_changed', 'process_not_found', 'partial_or_invalid_read', 'time_limit']) {
    assert.deepEqual(await worker(emit(denied(reason))), { status: 'rejected', reason, bytesRead: 0 });
  }
});
