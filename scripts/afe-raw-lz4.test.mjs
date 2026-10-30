import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRawLz4Block, probeAfeRawLz4 } from './afe-raw-lz4.mjs';

const envelope = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);

test('decodes an exact raw LZ4 literal-only block', () => {
  const block = Buffer.concat([Buffer.from([0x50]), Buffer.from('hello')]);
  assert.equal(decodeRawLz4Block(block, 5).toString(), 'hello');
  const probe = probeAfeRawLz4(Buffer.concat([envelope, block]), 5);
  assert.deepEqual(probe, {
    status: 'size_consistent_candidate', envelopeMatches: true,
    matches: [{ skip: 8 }]
  });
});

test('handles overlapping LZ4 match copies', () => {
  // First 4 literals, then repeat from 4 bytes behind for 8 more bytes,
  // followed by a terminal 5-byte literal sequence.
  const block = Buffer.concat([
    Buffer.from([0x44]), Buffer.from('abcd'), Buffer.from([4, 0]),
    Buffer.from([0x50]), Buffer.from('vwxyz')
  ]);
  assert.equal(decodeRawLz4Block(block, 17).toString(), 'abcdabcdabcdvwxyz');
});

test('rejects bad match distances and truncated literal sequences', () => {
  assert.throws(() => decodeRawLz4Block(Buffer.from([0x00, 0x00, 0x00]), 4), /Invalid LZ4 match/);
  assert.throws(() => decodeRawLz4Block(Buffer.from([0x50, 0x61]), 5), /Invalid LZ4 literal/);
  assert.throws(() => decodeRawLz4Block(Buffer.from([0x50, ...Buffer.from('hello'), 0]), 5));
});

test('requires the known envelope and respects output bounds', () => {
  assert.equal(probeAfeRawLz4(Buffer.from([0x50, ...Buffer.from('hello')]), 5).status,
    'invalid_envelope');
  assert.equal(probeAfeRawLz4(Buffer.concat([envelope, Buffer.alloc(49, 0xfe)]), 9).status,
    'unsupported_codec');
  assert.throws(() => decodeRawLz4Block(Buffer.from([0x50]), 0), RangeError);
  assert.throws(() => decodeRawLz4Block(Buffer.alloc(262145), 10), RangeError);
  assert.throws(() => decodeRawLz4Block(Buffer.from([0x50]), 2097153), RangeError);
});

test('rejects malformed extended match/literal lengths', () => {
  assert.throws(() => decodeRawLz4Block(Buffer.from([0xf0, 255]), 10));
  assert.throws(() => decodeRawLz4Block(Buffer.from([0xf0, 255, 255, 1]), 10));
});
