import { test } from 'node:test';
import assert from 'node:assert/strict';
import { censusFramedCodecSignatures, findFramedCodecSignatures } from './afe-frame-signatures.mjs';

test('recognizes framed signatures, but not incomplete or invalid zlib headers', () => {
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('28b52ffd', 'hex')), ['zstd_frame']);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('04224d18', 'hex')), ['lz4_frame']);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('1f8b08', 'hex')), ['gzip']);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('fd377a585a00', 'hex')), ['xz']);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('425a68', 'hex')), ['bzip2']);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('789c', 'hex')), ['zlib_header_candidate']);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('78ff', 'hex')), []);
  assert.deepEqual(findFramedCodecSignatures(Buffer.from('10', 'hex')), []);
});

test('scans multiple offsets, counts matched signatures, and returns no member bytes', async () => {
  const a = Buffer.alloc(40, 0x77);
  a.set(Buffer.from('28b52ffd', 'hex'), 8);
  const b = Buffer.alloc(40, 0x77);
  b.set(Buffer.from('04224d18', 'hex'), 24);
  const bytes = Buffer.concat([a, b]);
  const handle = { async read(target, _offset, length, position) {
    const bytesRead = bytes.copy(target, 0, position, position + length);
    return { bytesRead };
  }};
  const result = await censusFramedCodecSignatures(handle, [
    { filename: 'a.dat', offset: 0, storedBytes: 40 },
    { filename: 'b.dat', offset: 40, storedBytes: 40 }
  ], 0);
  assert.equal(result.status, 'signature_only');
  assert.equal(result.inspectedMembers, 2);
  assert.equal(result.sampledBytes, 80);
  assert.deepEqual(result.offsets.find(item => item.skip === 8).matches,
    [{ codec: 'zstd_frame', count: 1 }]);
  assert.deepEqual(result.offsets.find(item => item.skip === 24).matches,
    [{ codec: 'lz4_frame', count: 1 }]);
  assert.equal(JSON.stringify(result).includes('filename'), false);
  assert.equal(JSON.stringify(result).includes('28b52ffd'), false);
});

test('rejects bad extents, EOF reads and excessive member counts', async () => {
  const handle = { async read() { return { bytesRead: 0 }; }};
  await assert.rejects(censusFramedCodecSignatures(handle, [{ offset: 0, storedBytes: 40 }], 0),
    /Incomplete/);
  await assert.rejects(censusFramedCodecSignatures(handle, [{ offset: -1, storedBytes: 40 }], 0),
    RangeError);
  await assert.rejects(censusFramedCodecSignatures(handle,
    Array.from({length: 4097}, () => ({offset: 0, storedBytes: 1})), 0), RangeError);
});
