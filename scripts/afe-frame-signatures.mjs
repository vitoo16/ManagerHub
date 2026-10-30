/**
 * Local AFE format research only: recognize framed-codec signatures, never
 * claim successful decompression or interpret any game data.
 *
 * All scans are bounded and only aggregate counts escape to the CLI.
 */
const SKIPS = [0, 8, 16, 24, 32];
const MAX_MEMBERS = 4096;
const MAX_READ_BYTES = 40 * MAX_MEMBERS;
const SIGNATURES = [
  ['zstd_frame', Buffer.from([0x28, 0xb5, 0x2f, 0xfd])],
  ['lz4_frame', Buffer.from([0x04, 0x22, 0x4d, 0x18])],
  ['gzip', Buffer.from([0x1f, 0x8b, 0x08])],
  ['xz', Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])],
  ['bzip2', Buffer.from([0x42, 0x5a, 0x68])]
];
export const FRAME_PROBE_OFFSETS = Object.freeze([...SKIPS]);

export function findFramedCodecSignatures(bytes, offset = 0) {
  if (!(bytes instanceof Uint8Array) || !Number.isSafeInteger(offset) || offset < 0)
    throw new RangeError('Invalid bounded codec-signature sample.');
  const slice = bytes.subarray(offset);
  const matching = SIGNATURES.filter(([, signature]) =>
    slice.byteLength >= signature.length &&
    signature.every((byte, index) => slice[index] === byte))
    .map(([name]) => name);
  // A zlib CMF/FLG is only a plausible signature, not a complete stream.
  if (slice.byteLength >= 2 &&
      (slice[0] & 0x0f) === 8 &&
      (slice[0] >>> 4) <= 7 &&
      (((slice[0] << 8) | slice[1]) % 31) === 0) {
    matching.push('zlib_header_candidate');
  }
  return matching;
}

export async function censusFramedCodecSignatures(handle, members, base = 18) {
  if (!Array.isArray(members) || members.length > MAX_MEMBERS ||
      !Number.isSafeInteger(base) || base < 0) throw new RangeError('Invalid bounded catalogue.');
  const frequencies = new Map();
  for (const skip of SKIPS) frequencies.set(skip, new Map());
  let reads = 0;
  let sampledBytes = 0;
  const eligibleAtOffset = Object.fromEntries(SKIPS.map(skip => [skip, 0]));
  for (const member of members) {
    if (!member || !Number.isSafeInteger(member.offset) || member.offset < 0 ||
        !Number.isSafeInteger(member.storedBytes) || member.storedBytes < 1 ||
        !Number.isSafeInteger(base + member.offset)) throw new RangeError('Invalid member extent.');
    const sampleLength = Math.min(member.storedBytes, 40);
    if (sampledBytes + sampleLength > MAX_READ_BYTES) throw new RangeError('Signature sampling budget exceeded.');
    const data = Buffer.alloc(sampleLength);
    const { bytesRead } = await handle.read(data, 0, sampleLength, base + member.offset);
    if (bytesRead !== sampleLength) throw new Error('Incomplete framed-codec signature read.');
    reads++;
    sampledBytes += sampleLength;
    for (const skip of SKIPS) {
      if (sampleLength < skip + 2) continue;
      eligibleAtOffset[skip]++;
      for (const name of findFramedCodecSignatures(data, skip)) {
        const count = frequencies.get(skip).get(name) ?? 0;
        frequencies.get(skip).set(name, count + 1);
      }
    }
  }
  return {
    status: 'signature_only',
    inspectedMembers: reads,
    sampledBytes,
    offsets: SKIPS.map(skip => ({
      skip,
      eligibleMembers: eligibleAtOffset[skip],
      matches: [...frequencies.get(skip)]
        .map(([codec, count]) => ({ codec, count }))
        .sort((a, b) => a.codec.localeCompare(b.codec))
    }))
  };
}
