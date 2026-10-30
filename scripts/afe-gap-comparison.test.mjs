import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareEqualSizePayloads, compareGapToEqualSizeMembers } from './afe-gap-comparison.mjs';

const envelope = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
const payload = (suffix) => Buffer.concat([envelope, Buffer.from(suffix)]);
const reader = data => ({
  async read(output, _start, requested, offset) {
    const bytesRead = offset >= data.length ? 0 :
      data.copy(output, 0, offset, Math.min(data.length, offset + requested));
    return { bytesRead };
  }
});

test('identical lengths and headers do not imply equal payload content', () => {
  const result = compareEqualSizePayloads(payload([1, 2, 3, 4]), payload([4, 3, 2, 1]));
  assert.equal(result.comparedBytes, 12);
  assert.equal(result.commonPrefixBytes, 8);
  assert.equal(result.equalBytePositions, 8);
  assert.equal(result.matchingEightByteEnvelope, true);
  assert.equal(result.identicalSuffixAfterHeader, false);
  assert.equal(result.identicalPayloads, false);
  assert.equal(result.equalPositionFraction, 0.666667);
});

test('identical complete payloads are explicitly distinguished', () => {
  const data = payload([1, 2, 3, 4]);
  const result = compareEqualSizePayloads(data, Buffer.from(data));
  assert.equal(result.identicalPayloads, true);
  assert.equal(result.identicalSuffixAfterHeader, true);
  assert.equal(result.commonPrefixBytes, data.length);
  assert.equal(result.differingBytePositions, 0);
});

test('reads only equal-size indexed members and emits metadata', async () => {
  const a = payload([1, 2, 3, 4]), b = payload([5, 6, 7, 8]);
  const data = Buffer.concat([Buffer.alloc(18), a, b, Buffer.alloc(6)]);
  const report = await compareGapToEqualSizeMembers(reader(data),
    { relativeOffset: 0, sizeBytes: a.length }, [
      { filename: 'named.dat', offset: a.length, storedBytes: b.length },
      { filename: 'other.dat', offset: a.length + b.length, storedBytes: 6 }
    ]);
  assert.equal(report.status, 'compared');
  assert.equal(report.equalSizeIndexedMembers, 1);
  assert.equal(report.comparisons[0].indexedFilename, 'named.dat');
  assert.equal(report.comparisons[0].commonPrefixBytes, 8);
  assert.equal(JSON.stringify(report).includes('05060708'), false);
});

test('honors size, candidate and short-read limits', async () => {
  const empty = reader(Buffer.alloc(0));
  const gap = { relativeOffset: 0, sizeBytes: 20 };
  const same = Array.from({length: 9}, (_, i) => ({
    filename: 'member_' + i, offset: 100 + i * 20, storedBytes: 20
  }));
  assert.equal((await compareGapToEqualSizeMembers(empty, gap, [])).status, 'no_equal_size_members');
  assert.equal((await compareGapToEqualSizeMembers(empty, gap, same)).status, 'skipped_many_candidates');
  assert.equal((await compareGapToEqualSizeMembers(empty,
    { relativeOffset: 0, sizeBytes: 262145 }, [])).status, 'skipped_oversized');
  await assert.rejects(compareGapToEqualSizeMembers(empty, gap, same.slice(0, 1)),
    /Incomplete bounded comparison/);
  assert.throws(() => compareEqualSizePayloads(Buffer.alloc(8), Buffer.alloc(9)), RangeError);
});
