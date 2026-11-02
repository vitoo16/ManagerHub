import assert from 'node:assert/strict';
import test from 'node:test';
import { win32 } from 'node:path';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { observeFm2013Process } from './fm2013-process-observer.mjs';

const imagePath = 'C:\\Games\\Football Manager 2013\\fm.exe';
const identity = { status: 'observed', pid: 123, startedAtFileTime: '134063484000000000', imagePath: imagePath };
function fixture(responses = [identity, identity], digest = profile.binarySha256) {
  const calls = [], hashes = [];
  return { calls, hashes, options: {
    run: async (...args) => { calls.push(args); const value = responses.shift(); if (value instanceof Error) throw value;
      return { stdout: typeof value === 'string' ? value : JSON.stringify(value) }; },
    hashImage: async file => { hashes.push(file); if (digest instanceof Error) throw digest; return digest; },
  } };
}

test('observer binds an exact-build PID to the same opaque start identity across the bounded Node hash', async () => {
  const f = fixture();
  assert.deepEqual(await observeFm2013Process(123, f.options), { status: 'observed', process: {
    pid: 123, startedAtFileTime: identity.startedAtFileTime, imagePath: imagePath, binarySha256: profile.binarySha256 } });
  assert.deepEqual(f.hashes, [imagePath]); assert.equal(f.calls.length, 2);
  for (const [file, args, options] of f.calls) {
    assert.equal(win32.isAbsolute(file), true);
    assert.ok(file.endsWith('\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'));
    assert.deepEqual(args.slice(0, 3), ['-NoProfile', '-NonInteractive', '-Command']);
    assert.match(args[3], /Get-Process -Id 123 /u);
    assert.equal(options.windowsHide, true); assert.equal(options.timeout, 10_000); assert.equal(options.maxBuffer, 65_536);
  }
});

test('observer refuses PID reuse, exit and path changes after hashing', async () => {
  for (const changed of [
    { ...identity, startedAtFileTime: '134063484000000001' },
    { ...identity, pid: 124 }, { ...identity, imagePath: 'C:\\Other\\fm.exe' },
  ]) {
    assert.equal((await observeFm2013Process(123, fixture([identity, changed]).options)).status, 'observation_failed');
  }
  assert.deepEqual(await observeFm2013Process(123, fixture([identity, { status: 'process_not_found' }]).options), { status: 'process_not_found' });
  assert.deepEqual(await observeFm2013Process(123, fixture([identity, { status: 'access_denied' }]).options), { status: 'access_denied' });
});

test('observer stops before hashing denied, absent or unsupported targets and refuses wrong image bytes', async () => {
  for (const status of ['process_not_found', 'access_denied', 'observation_failed']) {
    const f = fixture([{ status }]); assert.deepEqual(await observeFm2013Process(123, f.options), { status });
    assert.equal(f.hashes.length, 0); assert.equal(f.calls.length, 1);
  }
  const wrong = fixture([{ ...identity, imagePath: 'C:\\Other\\not-fm.exe' }]);
  assert.deepEqual(await observeFm2013Process(123, wrong.options), { status: 'unsupported_build' }); assert.equal(wrong.hashes.length, 0);
  assert.deepEqual(await observeFm2013Process(123, fixture([identity], '0'.repeat(64)).options), { status: 'unsupported_build' });
  assert.deepEqual(await observeFm2013Process(123, fixture([identity], new Error('private hash details')).options), { status: 'observation_failed', reason: 'image_hash_failed' });
});

test('observer rejects malformed or widened protocol without leaking command errors', async () => {
  const invalid = ['{', 'null', '[]', '{}', JSON.stringify({ ...identity, address: 'private' }),
    JSON.stringify({ ...identity, startedAtFileTime: Number(identity.startedAtFileTime) }),
    JSON.stringify({ ...identity, startedAtFileTime: 'short' }), JSON.stringify({ status: 'unknown' }),
    JSON.stringify({ ...identity, startedAtFileTime: '000000000000000000' }),
    JSON.stringify({ ...identity, startedAtFileTime: '18446744073709551616' }),
    JSON.stringify({ status: 'access_denied', message: 'private' }), ' '.repeat(65_537)];
  for (const response of invalid) {
    const f = fixture([response]); assert.deepEqual(await observeFm2013Process(123, f.options), { status: 'observation_failed', reason: 'invalid_response' });
    assert.equal(f.hashes.length, 0);
  }
  assert.deepEqual(await observeFm2013Process(123, fixture([new Error('private command stderr')]).options), { status: 'observation_failed', reason: 'query_failed' });
  for (const pid of [0, -1, 1.5, '123; bad', 0x80000000]) {
    const f = fixture(); assert.deepEqual(await observeFm2013Process(pid, f.options), { status: 'observation_failed', reason: 'invalid_pid' });
    assert.equal(f.calls.length, 0);
  }
});
