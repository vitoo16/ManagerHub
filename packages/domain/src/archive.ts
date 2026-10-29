/**
 * Experimental, read-only inspection of a trailing FMF directory observed in
 * one AFE-family save. NOT a game database decoder or compatibility guarantee.
 *
 * No decompressed member bytes or player information are returned.
 */
export interface ArchiveMember {
  readonly filename: string;
  readonly offset: number;
  readonly storedBytes: number;
  readonly reportedUncompressedBytes: number;
}
export interface ArchiveIndex {
  readonly family: 'fmf-index-candidate';
  readonly evidence: 'experimental';
  readonly memberCount: number;
  readonly directoryOffset: number;
  readonly members: readonly ArchiveMember[];
  readonly probes?: readonly MemberEnvelopeProbe[];
}

const SEARCH_TAIL_BYTES = 64 * 1024;
const MAX_INDEX_COMPRESSED = 64 * 1024;
const MAX_INDEX_DECOMPRESSED = 512 * 1024;
const MAX_MEMBERS = 1024;
// Prevent adversarial marker-heavy files from triggering unbounded inflate attempts.
const MAX_INDEX_CANDIDATES = 32;
const MAX_NAME_CHARS = 256;
// In the one observed AFE save, member offsets are relative to byte 18;
// the trailing directory begins after the final member extent. Keep this
// experimental layout assumption explicit until independently verified.
const OBSERVED_MEMBER_DATA_BASE_BYTES = 18;

export function parseArchiveDirectory(bytes: Uint8Array, boundary: number): readonly ArchiveMember[] | null {
  if (bytes.byteLength < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 0;
  function readU32(): number | null {
    if (cursor + 4 > view.byteLength) return null;
    const value = view.getUint32(cursor, true);
    cursor += 4;
    return value;
  }
  function readText(): string | null {
    const size = readU32();
    if (size === null || size < 1 || size > MAX_NAME_CHARS || cursor + size * 2 + 2 > bytes.byteLength) return null;
    const text = new TextDecoder('utf-16le', { fatal: true }).decode(bytes.subarray(cursor, cursor + size * 2));
    cursor += size * 2;
    if (view.getUint16(cursor, true) !== 0) return null;
    cursor += 2;
    if (!text || /[\\/\x00-\x1f]/.test(text)) return null;
    return text;
  }
  if (readU32() !== 0) return null;
  const count = readU32();
  if (count === null || count < 1 || count > MAX_MEMBERS) return null;
  const members: ArchiveMember[] = [];
  for (let i = 0; i < count; i++) {
    const stem = readText();
    const ext = readText();
    if (stem === null || ext === null) return null;
    const offset = readU32();
    const storedBytes = readU32();
    const reportedUncompressedBytes = readU32();
    if (offset === null || storedBytes === null || reportedUncompressedBytes === null ||
        storedBytes === 0 || reportedUncompressedBytes === 0 ||
        offset > boundary || storedBytes > boundary - offset) return null;
    members.push({ filename: stem + ext, offset, storedBytes, reportedUncompressedBytes });
  }
  return members;
}

async function inflateIndexBlob(blob: Blob): Promise<Uint8Array> {
  if (blob.size < 3 || blob.size > MAX_INDEX_COMPRESSED) {
    throw new Error('Archive index exceeds bounded inspection limits.');
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support bounded deflate inspection.');
  }
  const stream = blob.stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const read = await reader.read();
      if (read.done) break;
      total += read.value.byteLength;
      if (total > MAX_INDEX_DECOMPRESSED) {
        await reader.cancel();
        throw new Error('Archive index decompressed beyond safety limit.');
      }
      chunks.push(read.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.byteLength;
  }
  return result;
}

export async function inspectArchiveIndex(file: File): Promise<ArchiveIndex | null> {
  const tailStart = Math.max(0, file.size - SEARCH_TAIL_BYTES);
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
  // Only inspect the final self-contained candidate. This marker may occur
  // in payload data; all structure and bounds still require validation.
  let candidatesTried = 0;
  for (let i = tail.length - 11; i >= 0 && candidatesTried < MAX_INDEX_CANDIDATES; i--) {
    if (tail[i] !== 2 || tail[i + 1] !== 1 ||
        tail[i + 2] !== 102 || tail[i + 3] !== 109 ||
        tail[i + 4] !== 102 || tail[i + 5] !== 46 ||
        tail[i + 6] !== 4 || tail[i + 7] !== 0 || tail[i + 8] !== 0 ||
        tail[i + 9] !== 0x78) continue;
    candidatesTried++;
    const position = tailStart + i;
    try {
      const payload = await inflateIndexBlob(file.slice(position + 9));
      const memberDataBoundary = position - OBSERVED_MEMBER_DATA_BASE_BYTES;
      if (memberDataBoundary <= 0) continue;
      const members = parseArchiveDirectory(payload, memberDataBoundary);
      if (members) return { family: 'fmf-index-candidate', evidence: 'experimental',
        memberCount: members.length, directoryOffset: position, members };
    } catch { /* Ignore malformed false positives and continue scanning. */ }
  }
  return null;
}

export type MemberPrefixKind = 'zlib_candidate' | 'gzip' | 'zip' | 'json_text' | 'unknown';

export interface MemberEnvelopeProbe {
  readonly filename: string;
  readonly absoluteOffset: number;
  readonly sampleBytes: number;
  readonly prefixHex: string;
  readonly prefixKind: MemberPrefixKind;
  readonly afterFirstEightBytesHex: string;
  readonly afterFirstEightBytesKind: MemberPrefixKind;
  readonly storedBytes: number;
  readonly reportedUncompressedBytes: number;
}

/**
 * Read at most 16 bytes from each member's declared start. This probe never
 * decompresses or returns member payloads and does not assert a codec.
 * The base offset is an observation from one AFE save, not a universal rule.
 */
export async function probeMemberEnvelopes(
  file: File,
  index: ArchiveIndex
): Promise<readonly MemberEnvelopeProbe[]> {
  const memberDataBoundary = index.directoryOffset - OBSERVED_MEMBER_DATA_BASE_BYTES;
  if (memberDataBoundary <= 0 || index.directoryOffset > file.size) return [];
  const probes: MemberEnvelopeProbe[] = [];
  for (const member of index.members) {
    if (!Number.isSafeInteger(member.offset) || !Number.isSafeInteger(member.storedBytes) ||
        member.offset < 0 || member.storedBytes < 1 ||
        member.offset > memberDataBoundary || member.storedBytes > memberDataBoundary - member.offset) {
      continue;
    }
    const absoluteOffset = OBSERVED_MEMBER_DATA_BASE_BYTES + member.offset;
    if (absoluteOffset >= file.size) continue;
    const sample = new Uint8Array(await file.slice(
      absoluteOffset,
      Math.min(absoluteOffset + 16, file.size, absoluteOffset + member.storedBytes)
    ).arrayBuffer());
    if (sample.length === 0) continue;
    const classifyPrefix = (bytes: Uint8Array): MemberPrefixKind => {
      const first = bytes[0] ?? 0;
      const second = bytes[1] ?? 0;
      if (first === 0x1f && second === 0x8b) return 'gzip';
      if (first === 0x50 && second === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'zip';
      if ((first & 0x0f) === 8 && ((first << 8) + second) % 31 === 0) return 'zlib_candidate';
      if (first === 0x7b || first === 0x5b) return 'json_text';
      return 'unknown';
    };
    const afterFirstEightBytes = sample.slice(8);
    const prefixKind = classifyPrefix(sample);
    probes.push({
      filename: member.filename,
      absoluteOffset,
      sampleBytes: sample.length,
      prefixHex: Array.from(sample, byte => byte.toString(16).padStart(2, '0')).join(' '),
      prefixKind,
      afterFirstEightBytesHex: Array.from(afterFirstEightBytes, byte => byte.toString(16).padStart(2, '0')).join(' '),
      afterFirstEightBytesKind: classifyPrefix(afterFirstEightBytes),
      storedBytes: member.storedBytes,
      reportedUncompressedBytes: member.reportedUncompressedBytes
    });
  }
  return probes;
}

/**
 * Structural observations only. No implication of successful decompression,
 * archive edition, or player-field compatibility.
 */
export interface ArchiveMemberConsistency {
  readonly observedMembers: number;
  readonly contiguousPairs: number;
  readonly discontinuousPairs: number;
  readonly overlappingPairs: number;
  readonly repeatedEightBytePrefixes: number;
  readonly referenceEightBytePrefix: string | null;
}

export function summarizeMemberConsistency(
  index: ArchiveIndex,
  probes: readonly MemberEnvelopeProbe[]
): ArchiveMemberConsistency {
  const ordered = [...index.members].sort((a, b) => a.offset - b.offset);
  let contiguousPairs = 0;
  let discontinuousPairs = 0;
  let overlappingPairs = 0;
  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1];
    const current = ordered[i];
    if (!previous || !current) continue;
    const previousEnd = previous.offset + previous.storedBytes;
    if (previousEnd === current.offset) contiguousPairs++;
    else if (previousEnd < current.offset) discontinuousPairs++;
    else overlappingPairs++;
  }
  const referenceEightBytePrefix = probes.find(p => p.sampleBytes >= 8)?.prefixHex
    .split(' ').slice(0, 8).join(' ') ?? null;
  const repeatedEightBytePrefixes = referenceEightBytePrefix === null ? 0 :
    probes.filter(p => p.sampleBytes >= 8 &&
      p.prefixHex.split(' ').slice(0, 8).join(' ') === referenceEightBytePrefix).length;
  return {
    observedMembers: ordered.length,
    contiguousPairs,
    discontinuousPairs,
    overlappingPairs,
    repeatedEightBytePrefixes,
    referenceEightBytePrefix
  };
}
