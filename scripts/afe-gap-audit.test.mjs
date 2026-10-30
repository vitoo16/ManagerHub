import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditUnindexedGaps } from './afe-gap-audit.mjs';

const envelope = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
const handleFrom = data => ({
  async read(target, _offset, count, position) {
    const bytesRead = position >= data.length ? 0 : data.copy(target, 0, position, Math.min(data.length, position + count));
    return { bytesRead };
  }
});

test('accounts for one unindexed range with observed eight-byte envelope', async () => {
  const bytes = Buffer.concat([
    Buffer.alloc(18), Buffer.alloc(10, 0xaa),
    envelope, Buffer.alloc(12, 0xb7),
    Buffer.alloc(10, 0xcc)
  ]);
  const members = [
    { filename: 'first.dat', offset: 0, storedBytes: 10 },
    { filename: 'second.dat', offset: 30, storedBytes: 10 }
  ];
  const report = await auditUnindexedGaps(handleFrom(bytes), members, 58);
  assert.equal(report.indexedMembers, 2);
  assert.equal(report.gapCount, 1);
  assert.deepEqual(report.gaps[0], {
    afterMember: 'first.dat',
    beforeMember: 'second.dat',
    relativeOffset: 10,
    sizeBytes: 20,
    sampledBytes: 20,
    startsWithObservedEnvelope: true,
    observedEnvelopeOccurrencesInSample: 1,
    fullGapEnvelopeScan: true,
    observedEnvelopeOccurrencesInFullGap: 1,
    sampleEntropyBitsPerByte: report.gaps[0].sampleEntropyBitsPerByte,
    completeGapSample: true
  });
  assert.equal(JSON.stringify(report).includes('b7b7'), false);
});

test('truncates large gap samples and never claims full-range entropy', async () => {
  const data = Buffer.alloc(18 + 100000 + 8);
  envelope.copy(data, 18);
  const report = await auditUnindexedGaps(handleFrom(data),
    [{ filename: 'last.dat', offset: 100000, storedBytes: 8 }], data.length);
  const gap = report.gaps[0];
  assert.equal(gap.sizeBytes, 100000);
  assert.equal(gap.sampledBytes, 65536);
  assert.equal(gap.completeGapSample, false);
  assert.equal(gap.startsWithObservedEnvelope, true);
  assert.equal(gap.fullGapEnvelopeScan, true);
  assert.equal(gap.observedEnvelopeOccurrencesInFullGap, 1);
});

test('full scan discovers a marker beyond the entropy sample without returning bytes', async () => {
  const gapSize = 178694;
  const bytes = Buffer.alloc(18 + gapSize + 8, 0xaa);
  envelope.copy(bytes, 18);
  envelope.copy(bytes, 18 + 125000);
  const report = await auditUnindexedGaps(handleFrom(bytes),
    [{ filename: 'later.dat', offset: gapSize, storedBytes: 8 }], bytes.length);
  assert.equal(report.gapCount, 1);
  const gap = report.gaps[0];
  assert.equal(gap.sampledBytes, 65536);
  assert.equal(gap.observedEnvelopeOccurrencesInSample, 1);
  assert.equal(gap.fullGapEnvelopeScan, true);
  assert.equal(gap.observedEnvelopeOccurrencesInFullGap, 2);
  assert.equal(gap.completeGapSample, false);
  assert.equal(JSON.stringify(report).includes('aaaaaaaa'), false);
});

test('large gaps do not claim exhaustive marker scans', async () => {
  const gapSize = 256 * 1024 + 8;
  const bytes = Buffer.alloc(18 + gapSize + 8, 0xaa);
  envelope.copy(bytes, 18);
  const report = await auditUnindexedGaps(handleFrom(bytes),
    [{ filename: 'later.dat', offset: gapSize, storedBytes: 8 }], bytes.length);
  assert.equal(report.gaps[0].fullGapEnvelopeScan, false);
  assert.equal(report.gaps[0].observedEnvelopeOccurrencesInFullGap, null);
  assert.equal(report.gaps[0].sampledBytes, 65536);
});

test('rejects overlaps and truncated file reads', async () => {
  const reader = handleFrom(Buffer.alloc(16));
  await assert.rejects(auditUnindexedGaps(reader, [
    { filename: 'a', offset: 0, storedBytes: 10 },
    { filename: 'b', offset: 9, storedBytes: 10 }
  ], 40), RangeError);
  await assert.rejects(auditUnindexedGaps(reader, [
    { filename: 'a', offset: 12, storedBytes: 8 }
  ], 40), /Incomplete gap/);
});
