import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeByteCohort } from './afe-cohort-profile.mjs';

const header = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
const sample = (suffix) => Buffer.concat([header, Buffer.from(suffix)]);

test('captures identical envelopes with distinct opaque suffixes without returning bytes', () => {
  const result = summarizeByteCohort([
    sample([1, 2, 3, 4, 5]), sample([9, 2, 8, 4, 7]),
    sample([5, 2, 6, 4, 3])
  ]);
  assert.equal(result.samples, 3);
  assert.equal(result.storedBytes, 13);
  assert.equal(result.distinctEnvelopes, 1);
  assert.equal(result.distinctSuffixPayloads, 3);
  assert.equal(result.sharedPrefixBytes, 8);
  assert.equal(result.fixedSuffixPositions, 2);
  assert.equal(result.varyingSuffixPositions, 3);
  assert.ok(result.meanSuffixShannonBitsPerByte > 0);
  assert.equal(JSON.stringify(result).includes('header'), false);
});

test('detects repeated payloads and longer identical leading spans', () => {
  const result = summarizeByteCohort([
    sample([9, 9, 1, 2]), sample([9, 9, 1, 2])
  ]);
  assert.equal(result.distinctSuffixPayloads, 1);
  assert.equal(result.sharedPrefixBytes, 12);
  assert.equal(result.fixedSuffixPositions, 4);
  assert.equal(result.varyingSuffixPositions, 0);
});

test('rejects unequal or excessive payload samples', () => {
  assert.throws(() => summarizeByteCohort([sample([1]), sample([1, 2])]), RangeError);
  assert.throws(() => summarizeByteCohort([sample([1])]), RangeError);
  assert.throws(() => summarizeByteCohort([sample([1]), Buffer.alloc(257)]), RangeError);
  assert.throws(() => summarizeByteCohort(Array.from({ length: 257 }, () => sample([1]))), RangeError);
});
