import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, deflateRawSync, gzipSync } from 'node:zlib';
import { decodeValidatedMemberPayload, summarizeValidatedMemberDecode } from './afe-validated-decode.mjs';

const payload = Buffer.from('synthetic AFE payload '.repeat(24));
const envelope = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);

test('recovers bytes from a correctly framed synthetic zlib stream', () => {
  const input = Buffer.concat([envelope, deflateSync(payload)]);
  const result = decodeValidatedMemberPayload(input, payload.length);
  assert.equal(result.status, 'validated_stream');
  assert.equal(result.envelopeMatches, true);
  assert.equal(result.codec, 'zlib');
  assert.equal(result.skip, 8);
  assert.deepEqual(result.payload, payload);
  const summary = summarizeValidatedMemberDecode(result);
  assert.equal(summary.decodedBytes, payload.length);
  assert.equal(JSON.stringify(summary).includes('synthetic AFE'), false);
  assert.equal(Object.hasOwn(summary, 'payload'), false);
});

test('validates raw deflate and gzip when input is fully consumed', () => {
  for (const [stream, codec] of [
    [deflateRawSync(payload), 'raw-deflate'],
    [gzipSync(payload), 'gzip']
  ]) {
    const result = decodeValidatedMemberPayload(Buffer.concat([envelope, stream]), payload.length);
    assert.equal(result.status, 'validated_stream');
    assert.equal(result.codec, codec);
    assert.deepEqual(result.payload, payload);
  }
});

test('rejects false positives caused by ignored trailing input', () => {
  const member = Buffer.concat([
    envelope, deflateRawSync(payload), Buffer.alloc(50, 0xab)
  ]);
  const result = decodeValidatedMemberPayload(member, payload.length);
  assert.equal(result.status, 'unsupported_codec');
  assert.equal(Object.hasOwn(result, 'payload'), false);
});

test('rejects valid compression with a mismatched directory length', () => {
  const member = Buffer.concat([envelope, deflateSync(payload)]);
  assert.equal(decodeValidatedMemberPayload(member, payload.length + 1).status, 'unsupported_codec');
});

test('refuses oversized and invalid inputs', () => {
  assert.throws(() => decodeValidatedMemberPayload(Buffer.alloc(256 * 1024 + 1), 1), RangeError);
  assert.throws(() => decodeValidatedMemberPayload(Buffer.alloc(8), 2 * 1024 * 1024 + 1), RangeError);
  assert.throws(() => decodeValidatedMemberPayload(Buffer.alloc(8), 0), RangeError);
  assert.equal(decodeValidatedMemberPayload(Buffer.alloc(40, 0xee), 100).status, 'invalid_envelope');
});

test('rejects valid standalone gzip/zlib streams without an AFE envelope', () => {
  for (const stream of [gzipSync(payload), deflateSync(payload)]) {
    const result = decodeValidatedMemberPayload(stream, payload.length);
    assert.equal(result.status, 'invalid_envelope');
    assert.equal(result.envelopeMatches, false);
    assert.equal(Object.hasOwn(result, 'payload'), false);
    assert.deepEqual(summarizeValidatedMemberDecode(result),
      { status: 'invalid_envelope', envelopeMatches: false });
  }
});

test('declared output length prevents accepting a larger decompressed stream', () => {
  const input = Buffer.concat([envelope, deflateSync(payload)]);
  const result = decodeValidatedMemberPayload(input, 2);
  assert.equal(result.status, 'unsupported_codec');
  assert.equal(Object.hasOwn(result, 'payload'), false);
});
