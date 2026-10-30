const MAX_GAPS = 32;
const MAX_SAMPLE_BYTES = 64 * 1024;
const MAX_COMPLETE_MARKER_SCAN_BYTES = 256 * 1024;
const ENVELOPE = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);

function entropy(bytes) {
  const frequencies = new Uint32Array(256);
  for (const byte of bytes) frequencies[byte]++;
  let bits = 0;
  for (const count of frequencies) {
    if (!count) continue;
    const p = count / bytes.length;
    bits -= p * Math.log2(p);
  }
  return Number(bits.toFixed(3));
}

/**
 * Audit uncovered archive byte extents using a bounded sample.
 * A matching prefix is evidence of an envelope candidate, not proof of
 * member boundaries, a codec, or Football Manager records.
 */
export async function auditUnindexedGaps(handle, members, directoryOffset, base = 18) {
  if (!Array.isArray(members) || members.length < 1 || members.length > 4096 ||
      !Number.isSafeInteger(directoryOffset) || directoryOffset <= base ||
      !Number.isSafeInteger(base) || base < 0) throw new RangeError('Invalid archive extent metadata.');
  const boundary = directoryOffset - base;
  const sorted = [...members].sort((a, b) => a.offset - b.offset);
  let previousEnd = 0;
  let previousName = null;
  const gaps = [];
  const scan = async (start, end, beforeName) => {
    const length = end - start;
    if (length === 0) return;
    if (gaps.length >= MAX_GAPS) throw new RangeError('Too many unindexed gaps.');
    const size = Math.min(length, MAX_SAMPLE_BYTES);
    const sample = Buffer.alloc(size);
    const { bytesRead } = await handle.read(sample, 0, size, base + start);
    if (bytesRead !== size) throw new Error('Incomplete gap sample read.');
    let envelopeOccurrencesInSample = 0;
    for (let i = 0; i <= sample.length - ENVELOPE.length; i++) {
      if (sample.subarray(i, i + ENVELOPE.length).equals(ENVELOPE)) envelopeOccurrencesInSample++;
    }
    // For reasonably small gaps, scan the entire range for the observed
    // 8-byte envelope. This is independent from bounded entropy sampling.
    // Large gaps remain explicitly partial; never extrapolate marker counts.
    let envelopeOccurrencesInFullGap = null;
    if (length <= MAX_COMPLETE_MARKER_SCAN_BYTES) {
      const full = size === length ? sample : Buffer.alloc(length);
      if (size !== length) {
        const { bytesRead: fullBytesRead } = await handle.read(full, 0, length, base + start);
        if (fullBytesRead !== length) throw new Error('Incomplete complete-gap marker read.');
      }
      envelopeOccurrencesInFullGap = 0;
      for (let i = 0; i <= full.length - ENVELOPE.length; i++) {
        if (full.subarray(i, i + ENVELOPE.length).equals(ENVELOPE)) envelopeOccurrencesInFullGap++;
      }
    }
    gaps.push({
      afterMember: previousName,
      beforeMember: beforeName,
      relativeOffset: start,
      sizeBytes: length,
      sampledBytes: size,
      startsWithObservedEnvelope: sample.subarray(0, ENVELOPE.length).equals(ENVELOPE),
      observedEnvelopeOccurrencesInSample: envelopeOccurrencesInSample,
      fullGapEnvelopeScan: envelopeOccurrencesInFullGap !== null,
      observedEnvelopeOccurrencesInFullGap: envelopeOccurrencesInFullGap,
      sampleEntropyBitsPerByte: entropy(sample),
      completeGapSample: size === length
    });
  };
  for (const member of sorted) {
    if (!member || typeof member.filename !== 'string' ||
        !Number.isSafeInteger(member.offset) || member.offset < previousEnd ||
        !Number.isSafeInteger(member.storedBytes) || member.storedBytes < 1 ||
        member.offset > boundary || member.storedBytes > boundary - member.offset) {
      throw new RangeError('Overlapping or out-of-range archive members.');
    }
    await scan(previousEnd, member.offset, member.filename);
    previousEnd = member.offset + member.storedBytes;
    previousName = member.filename;
  }
  await scan(previousEnd, boundary, null);
  return { indexedMembers: sorted.length, gapCount: gaps.length, gaps };
}
