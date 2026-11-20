import assert from 'node:assert/strict';
import test from 'node:test';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { probeFm2013ReadOnly, FM2013_READONLY_LIMITS } from './fm2013-readonly-boundary.mjs';

const imagePath = 'C:\\Games\\Football Manager 2013\\fm.exe';
const process = { pid: 1234, startedAtFileTime: '134064000000000001', imagePath,
  binarySha256: profile.binarySha256 };
const item = { address: 0x123400, byteLength: 4, nativeKind: 'player' };
const request = () => ({ process: { ...process }, reads: [{ ...item }] });

function fixture(options = {}) {
  const calls = { consent: 0, observe: 0, open: 0, type: 0, read: 0, close: 0, write: 0 };
  const handle = {
    async inspectType(address) {
      calls.type++;
      assert.equal(address, item.address);
      if (options.types && calls.type <= options.types.length) return options.types[calls.type - 1];
      return options.type ?? { nativeKind: 'player', ...profile.nativeKinds.player };
    },
    async readAt(address, length) {
      calls.read++;
      assert.equal(address, item.address);
      assert.equal(length, item.byteLength);
      if (options.readError) throw new Error('PRIVATE READ DETAILS MUST NOT LEAK');
      return options.bytes ?? Uint8Array.from([1, 2, 3, 4]);
    },
    async close() {
      calls.close++;
      if (options.closeError) throw Error('PRIVATE CLOSE DETAILS');
      if (options.closeReturnsFalse) return false;
    },
    async write() { calls.write++; throw Error('writer should never be used'); },
  };
  const host = {
    async confirmUserSelection(selected) { calls.consent++; assert.equal(selected.pid, process.pid); return options.consent ?? true; },
    async observe(pid) {
      calls.observe++;
      assert.equal(pid, process.pid);
      if (options.observations && calls.observe <= options.observations.length) return options.observations[calls.observe - 1];
      return { status: 'observed', process: { ...process } };
    },
    async openReadOnly(pid) {
      calls.open++;
      assert.equal(pid, process.pid);
      if (options.openError) throw Error('PRIVATE OPEN DETAILS');
      return options.invalidHandle ?? handle;
    },
  };
  return { host, calls };
}

test('explicit host consent and exact process identity are prerequisites to any native access', async () => {
  const no = fixture({ consent: false });
  assert.deepEqual(await probeFm2013ReadOnly(request(), no.host),
    { status: 'rejected', reason: 'consent_denied', blocks: [] });
  assert.equal(no.calls.observe, 0);
  assert.equal(no.calls.open, 0);
  const bad = fixture();
  const input = request(); input.process.binarySha256 = '0'.repeat(64);
  assert.equal((await probeFm2013ReadOnly(input, bad.host)).reason, 'unsupported_build');
  assert.equal(bad.calls.consent, 0);
  for (const invalidPid of [0, -1, 0x80000000]) {
    const invalid = request(); invalid.process.pid = invalidPid;
    assert.equal((await probeFm2013ReadOnly(invalid, bad.host)).reason, 'unsupported_build');
  }
  assert.equal(bad.calls.consent, 0);
  const moved = fixture({ observations: [{ status: 'observed', process: { ...process, startedAtFileTime: '134064000000000002' } }] });
  assert.equal((await probeFm2013ReadOnly(request(), moved.host)).reason, 'process_identity_changed');
  assert.equal(moved.calls.open, 0);
});

test('valid exact-build mocked read is bounded, typed, byte-copying and always closes', async () => {
  const f = fixture();
  const result = await probeFm2013ReadOnly(request(), f.host);
  assert.equal(result.status, 'read_only_sample');
  assert.equal(result.reason, null);
  assert.equal(result.blocks.length, 1);
  assert.deepEqual([...result.blocks[0].bytes], [1, 2, 3, 4]);
  assert.equal(result.blocks[0].nativeKind, 'player');
  assert.deepEqual(f.calls, { consent: 1, observe: 3, open: 1, type: 2, read: 1, close: 1, write: 0 });
});

test('invalid pointer, count, duplicate and overflow requests are rejected before consent', async () => {
  const bad = [
    { ...item, address: 0x100 }, { ...item, address: 0x123401 },
    { ...item, address: 0x80000000 }, { ...item, address: NaN },
    { ...item, address: 0x7ffffffc, byteLength: 5 },
    { ...item, byteLength: 0 }, { ...item, byteLength: FM2013_READONLY_LIMITS.maxReadBytes + 1 },
    { ...item, nativeKind: 'fm27' }, { ...item, nativeKind: null },
    { ...item, [Symbol('hidden')]: true },
  ];
  for (const value of bad) {
    const f = fixture();
    const r = request(); r.reads = [value];
    assert.equal((await probeFm2013ReadOnly(r, f.host)).reason, 'invalid_request');
    assert.equal(f.calls.consent, 0);
  }
  for (const reads of [
    [item, item],
    [{ ...item, address: 0x123400, byteLength: 8 }, { ...item, address: 0x123404, byteLength: 4 }],
    [],
    Array.from({ length: 17 }, (_, i) => ({ ...item, address: item.address + i * 4 })),
  ]) {
    const f = fixture();
    const r = request(); r.reads = reads;
    assert.equal((await probeFm2013ReadOnly(r, f.host)).reason, 'invalid_request');
    assert.equal(f.calls.consent, 0);
  }
});

test('wrong Player/PlayerStaff type declaration fails without reading bytes', async () => {
  const wrong = fixture({ type: { nativeKind: 'playerStaff', ...profile.nativeKinds.playerStaff } });
  assert.equal((await probeFm2013ReadOnly(request(), wrong.host)).reason, 'wrong_native_type');
  assert.deepEqual([wrong.calls.read, wrong.calls.close], [0, 1]);
  const missing = fixture({ type: { nativeKind: 'player', decoratedName: '.?AVWRONG@@', personOffset: 356 } });
  assert.equal((await probeFm2013ReadOnly(request(), missing.host)).reason, 'wrong_native_type');
  const switched = fixture({ types: [
    { nativeKind: 'player', ...profile.nativeKinds.player },
    { nativeKind: 'playerStaff', ...profile.nativeKinds.playerStaff },
  ] });
  assert.equal((await probeFm2013ReadOnly(request(), switched.host)).reason, 'wrong_native_type');
  assert.equal(switched.calls.close, 1);
});

test('short or malformed native reads fail closed and close handle', async () => {
  for (const bytes of [Uint8Array.of(1, 2), [1, 2, 3, 4], new Uint8Array(5)]) {
    const f = fixture({ bytes });
    const result = await probeFm2013ReadOnly(request(), f.host);
    assert.equal(result.reason, 'partial_or_invalid_read');
    assert.deepEqual(result.blocks, []);
    assert.equal(f.calls.close, 1);
  }
});

test('changed or missing process after memory read never yields successful data', async () => {
  for (const observation of [{ status: 'process_not_found' },
    { status: 'observed', process: { ...process, startedAtFileTime: '134064000000000009' } }]) {
    const f = fixture({ observations: [
      { status: 'observed', process }, { status: 'observed', process }, observation,
    ] });
    const result = await probeFm2013ReadOnly(request(), f.host);
    assert.equal(result.reason, observation.status === 'observed' ? 'process_identity_changed' : 'process_not_found');
    assert.deepEqual(result.blocks, []);
    assert.equal(f.calls.close, 1);
  }
});

test('open, read and close failures do not expose sampled bytes or private error strings', async () => {
  for (const options of [{ openError: true }, { readError: true }, { closeError: true }, { closeReturnsFalse: true }]) {
    const f = fixture(options), result = await probeFm2013ReadOnly(request(), f.host);
    assert.equal(result.status, 'rejected');
    if (options.closeReturnsFalse) assert.equal(result.reason, 'close_failed');
    assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
    assert.deepEqual(result.blocks, []);
    assert.equal(f.calls.close, options.openError ? 0 : 1);
  }
});

test('malformed native handle fails closed and attempts cleanup when possible', async () => {
  let closed = 0;
  const f = fixture({ invalidHandle: { async close() { closed++; } } });
  const result = await probeFm2013ReadOnly(request(), f.host);
  assert.equal(result.reason, 'invalid_handle');
  assert.equal(closed, 1);
});

test('time budget is enforced with deterministic injected clock', async () => {
  const f = fixture();
  let now = 1000;
  const host = { ...f.host, async openReadOnly(pid) { const h = await f.host.openReadOnly(pid); now = 8000; return h; } };
  const result = await probeFm2013ReadOnly(request(), host, () => now);
  assert.equal(result.reason, 'time_limit');
  assert.equal(f.calls.close, 1);
});


test('hostile malformed requests and failing clock never throw or open native handles', async () => {
  const f = fixture();
  const malformed = [null, undefined, [], Object.create(null), { process, reads: [item], extra: 1 }];
  const hostile = new Proxy({}, { ownKeys() { throw new Error('PRIVATE PROXY ERROR'); } });
  malformed.push(hostile);
  for (const value of malformed) {
    const result = await probeFm2013ReadOnly(value, f.host);
    assert.equal(result.reason, 'invalid_request');
  }
  assert.equal(f.calls.open, 0);
  const brokenClock = await probeFm2013ReadOnly(request(), f.host, () => { throw Error('PRIVATE CLOCK ERROR'); });
  assert.equal(brokenClock.reason, 'invalid_host');
  assert.equal(f.calls.open, 0);
});

test('read-only samples copy memory instead of exposing mutable host-owned buffers', async () => {
  const original = Uint8Array.of(2, 3, 4, 5);
  const f = fixture({ bytes: original });
  const result = await probeFm2013ReadOnly(request(), f.host);
  assert.equal(result.status, 'read_only_sample');
  original[0] = 255;
  assert.equal(result.blocks[0].bytes[0], 2);
  assert.equal(f.calls.write, 0);
});

test('PlayerStaff is admitted only with its own exact native class mapping', async () => {
  const f = fixture({ type: { nativeKind: 'playerStaff', ...profile.nativeKinds.playerStaff } });
  const r = request(); r.reads[0].nativeKind = 'playerStaff';
  const response = await probeFm2013ReadOnly(r, f.host);
  assert.equal(response.status, 'read_only_sample');
  assert.equal(response.blocks[0].nativeKind, 'playerStaff');
  assert.equal(f.calls.close, 1);
});

test('oversized aggregate read and unsupported build observations fail without raw memory', async () => {
  const f = fixture();
  const r = request();
  r.reads = Array.from({ length: 9 }, (_, i) => ({ address: item.address + 4 * i, byteLength: 512, nativeKind: 'player' }));
  assert.equal((await probeFm2013ReadOnly(r, f.host)).reason, 'invalid_request');
  assert.equal(f.calls.consent, 0);
  const badBuild = fixture({ observations: [{ status: 'unsupported_build' }] });
  assert.equal((await probeFm2013ReadOnly(request(), badBuild.host)).reason, 'unsupported_build');
  assert.equal(badBuild.calls.open, 0);
});
