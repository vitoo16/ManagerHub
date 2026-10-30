import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, deflateRawSync, gzipSync } from 'node:zlib';
import { probeCodecConsumption } from './afe-codec-consumption.mjs';

const payload = Buffer.from('repeated fixture blocks '.repeat(12));

test('zlib records complete consumption only for an exact input stream', () => {
  const stream = deflateSync(payload);
  const exact = probeCodecConsumption(stream, payload.length)
    .find(trial => trial.codec === 'deflate' && trial.skip === 0);
  assert.equal(exact.result, 'candidate_only');
  assert.equal(exact.consumedBytes, stream.length);
  assert.equal(exact.outputBytes, payload.length);

  const withJunk = Buffer.concat([stream, Buffer.from([1, 2, 3, 4])]);
  const trailing = probeCodecConsumption(withJunk, payload.length)
    .find(trial => trial.codec === 'deflate' && trial.skip === 0);
  assert.equal(trailing.result, 'trailing_input');
  assert.equal(trailing.consumedBytes, stream.length);
  assert.equal(trailing.inputBytes, withJunk.length);
});

test('raw DEFLATE after eight-byte envelope is only a candidate when fully consumed', () => {
  const envelope = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
  const stream = deflateRawSync(payload);
  const wrapped = Buffer.concat([envelope, stream]);
  const trial = probeCodecConsumption(wrapped, payload.length)
    .find(trial => trial.codec === 'deflate-raw' && trial.skip === 8);
  assert.equal(trial.result, 'candidate_only');
  assert.equal(trial.consumedBytes, stream.length);
});

test('gzip must consume full input and match reported output size', () => {
  const stream = gzipSync(payload);
  const trial = probeCodecConsumption(stream, payload.length + 1)
    .find(trial => trial.codec === 'gzip' && trial.skip === 0);
  assert.equal(trial.result, 'size_mismatch');
});

test('malformed data produces no false-positive candidate', () => {
  const trials = probeCodecConsumption(Buffer.alloc(40, 0xff), 100);
  assert.equal(trials.some(trial => trial.result === 'candidate_only'), false);
});

test('rejects oversized inputs and output expectations', () => {
  assert.throws(() => probeCodecConsumption(Buffer.alloc(256 * 1024 + 1), 100), RangeError);
  assert.throws(() => probeCodecConsumption(Buffer.from([1]), 2 * 1024 * 1024 + 1), RangeError);
});

test('offset 32 raw DEFLATE consuming only a tiny prefix cannot claim codec compatibility', () => {
  const raw = deflateRawSync(Buffer.from('six'));
  const member = Buffer.concat([Buffer.alloc(32, 0x41), raw, Buffer.alloc(70, 0x6b)]);
  const trial = probeCodecConsumption(member, 200).find(item =>
    item.codec === 'deflate-raw' && item.skip === 32);
  assert.equal(trial.result, 'trailing_input');
  assert.equal(trial.consumedBytes, raw.length);
  assert.equal(trial.inputBytes, member.length - 32);
});

test('offset 24 only becomes a candidate for an exact and size-matching stream', () => {
  const raw = deflateRawSync(payload);
  const wrapped = Buffer.concat([Buffer.alloc(24, 0x15), raw]);
  const candidate = probeCodecConsumption(wrapped, payload.length).find(item =>
    item.codec === 'deflate-raw' && item.skip === 24);
  assert.equal(candidate.result, 'candidate_only');
});
