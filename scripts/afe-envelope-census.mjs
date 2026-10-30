/**
 * Local read-only envelope census, not a codec or encryption detector.
 * Only eight-byte header frequencies and count summaries leave this function.
 */
const HEADER_BYTES = 8;
const MAX_ENTRIES = 4096;
const MAX_READ_BYTES = HEADER_BYTES * MAX_ENTRIES;

export async function censusMemberEnvelopes(handle, members, groups, baseOffset = 18) {
  if (!Array.isArray(members) || members.length > MAX_ENTRIES ||
      !Number.isSafeInteger(baseOffset) || baseOffset < 0 ||
      !Array.isArray(groups) || !groups.every(group =>
        typeof group.name === 'string' && Array.isArray(group.members))) {
    throw new RangeError('Invalid bounded member census input.');
  }
  const groupByMember = new Map();
  for (const group of groups) {
    for (const member of group.members) {
      if (groupByMember.has(member)) throw new RangeError('Overlapping group membership.');
      groupByMember.set(member, group.name);
    }
  }
  const buckets = new Map();
  let sampled = 0;
  let skippedShort = 0;
  let totalRead = 0;
  for (const member of members) {
    if (!Number.isSafeInteger(member.offset) || member.offset < 0 ||
        !Number.isSafeInteger(member.storedBytes) || member.storedBytes < 1 ||
        !Number.isSafeInteger(baseOffset + member.offset)) {
      throw new RangeError('Invalid member extent.');
    }
    const group = groupByMember.get(member) ?? 'primary';
    let bucket = buckets.get(group);
    if (!bucket) {
      bucket = { group, indexed: 0, sampled: 0, skippedShort: 0, headers: new Map() };
      buckets.set(group, bucket);
    }
    bucket.indexed++;
    if (member.storedBytes < HEADER_BYTES) {
      skippedShort++;
      bucket.skippedShort++;
      continue;
    }
    if (totalRead + HEADER_BYTES > MAX_READ_BYTES) throw new RangeError('Envelope read budget exceeded.');
    const header = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(header, 0, HEADER_BYTES, baseOffset + member.offset);
    if (bytesRead !== HEADER_BYTES) throw new Error('Short read of indexed member envelope.');
    totalRead += HEADER_BYTES;
    sampled++;
    bucket.sampled++;
    const signature = header.toString('hex');
    bucket.headers.set(signature, (bucket.headers.get(signature) ?? 0) + 1);
  }
  const serialize = bucket => ({
    group: bucket.group,
    indexed: bucket.indexed,
    sampled: bucket.sampled,
    skippedShort: bucket.skippedShort,
    headerFrequencies: [...bucket.headers].map(([hex, count]) => ({ hex, count }))
      .sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex))
  });
  return {
    indexed: members.length,
    sampled, skippedShort, bytesRead: totalRead,
    groups: [...buckets.values()].map(serialize)
  };
}
