const MAX_COMPARISON_BYTES = 256 * 1024;
const MAX_CANDIDATES = 8;
const HEADER_BYTES = 8;

/**
 * Research-only byte equality check for an unindexed gap and same-size
 * indexed members. Identical length or envelope is never archive membership
 * evidence. Return aggregated comparisons only, not payloads or hashes.
 */
export function compareEqualSizePayloads(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) ||
      left.byteLength !== right.byteLength || left.byteLength < HEADER_BYTES ||
      left.byteLength > MAX_COMPARISON_BYTES) {
    throw new RangeError('Comparable payloads must have identical bounded sizes.');
  }
  let equalPositions = 0;
  let commonPrefixBytes = 0;
  let prefixStillEqual = true;
  let identicalAfterHeader = true;
  for (let i = 0; i < left.byteLength; i++) {
    if (left[i] === right[i]) {
      equalPositions++;
      if (prefixStillEqual) commonPrefixBytes++;
    } else {
      prefixStillEqual = false;
      if (i >= HEADER_BYTES) identicalAfterHeader = false;
    }
  }
  return {
    comparedBytes: left.byteLength,
    identicalPayloads: equalPositions === left.byteLength,
    equalBytePositions: equalPositions,
    differingBytePositions: left.byteLength - equalPositions,
    commonPrefixBytes,
    matchingEightByteEnvelope: commonPrefixBytes >= HEADER_BYTES,
    identicalSuffixAfterHeader: identicalAfterHeader,
    equalPositionFraction: Number((equalPositions / left.byteLength).toFixed(6))
  };
}

export async function compareGapToEqualSizeMembers(handle, gap, members, base = 18) {
  if (!gap || !Number.isSafeInteger(gap.relativeOffset) || gap.relativeOffset < 0 ||
      !Number.isSafeInteger(gap.sizeBytes) || gap.sizeBytes < HEADER_BYTES ||
      !Number.isSafeInteger(base) || base < 0 || !Array.isArray(members) ||
      members.length > 4096) throw new RangeError('Invalid gap comparison metadata.');
  const candidates = members.filter(member => member.storedBytes === gap.sizeBytes);
  if (gap.sizeBytes > MAX_COMPARISON_BYTES) {
    return { status: 'skipped_oversized', gapSizeBytes: gap.sizeBytes,
      equalSizeIndexedMembers: candidates.length, comparisons: [] };
  }
  if (candidates.length > MAX_CANDIDATES) {
    return { status: 'skipped_many_candidates', gapSizeBytes: gap.sizeBytes,
      equalSizeIndexedMembers: candidates.length, comparisons: [] };
  }
  if (candidates.length === 0) {
    return { status: 'no_equal_size_members', gapSizeBytes: gap.sizeBytes,
      equalSizeIndexedMembers: 0, comparisons: [] };
  }
  const read = async relativeOffset => {
    if (!Number.isSafeInteger(relativeOffset) || relativeOffset < 0 ||
        !Number.isSafeInteger(base + relativeOffset)) throw new RangeError('Invalid comparison offset.');
    const data = Buffer.alloc(gap.sizeBytes);
    const result = await handle.read(data, 0, data.length, base + relativeOffset);
    if (result.bytesRead !== data.length) throw new Error('Incomplete bounded comparison read.');
    return data;
  };
  const gapBytes = await read(gap.relativeOffset);
  const comparisons = [];
  for (const member of candidates) {
    const candidateBytes = await read(member.offset);
    comparisons.push({
      indexedFilename: member.filename,
      ...compareEqualSizePayloads(gapBytes, candidateBytes)
    });
  }
  return { status: 'compared', gapSizeBytes: gap.sizeBytes,
    equalSizeIndexedMembers: candidates.length, comparisons };
}
