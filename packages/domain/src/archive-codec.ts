import type { ArchiveIndex, ArchiveMember } from './archive';

/**
 * Experimental, opt-in AFE codec hypothesis validation.
 * It never returns decompressed content and does not infer game edition or CA/PA.
 */
const OBSERVED_MEMBER_BASE = 18;
const MAX_MEMBER_STORED_BYTES = 256 * 1024;
const MAX_DECODED_BYTES = 2 * 1024 * 1024;
const MAX_MEMBERS_TO_CHECK = 4;
const START_OFFSETS = [0, 8, 16] as const;
const CODECS = ['deflate', 'gzip'] as const;

export interface MemberCodecTrial {
  readonly filename: string;
  readonly codec: 'deflate' | 'gzip';
  readonly skippedBytes: number;
  readonly result: 'size_match' | 'size_mismatch' | 'invalid_stream';
  readonly outputBytes: number | null;
}

export interface MemberCodecValidation {
  readonly inspectedMembers: number;
  readonly skippedOversizedMembers: number;
  readonly trials: readonly MemberCodecTrial[];
}

/** Consume only bounded byte counts. A malformed or overlarge stream never returns payload bytes. */
async function decodeLengthOnly(bytes: Uint8Array, codec: 'deflate' | 'gzip'): Promise<number | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream(codec));
  const reader = stream.getReader();
  let outputBytes = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) return outputBytes;
      outputBytes += item.value.byteLength;
      if (outputBytes > MAX_DECODED_BYTES) return null;
    }
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function memberFits(member: ArchiveMember, boundary: number): boolean {
  return Number.isSafeInteger(member.offset) && Number.isSafeInteger(member.storedBytes) &&
    Number.isSafeInteger(member.reportedUncompressedBytes) &&
    member.offset >= 0 && member.storedBytes > 0 && member.reportedUncompressedBytes > 0 &&
    member.offset <= boundary && member.storedBytes <= boundary - member.offset;
}

/**
 * Tests small members only: 4 members x 3 offsets x 2 codecs, each input <= 256 KiB,
 * each output <= 2 MiB. Exact size agreement is a hypothesis, never field verification.
 */
export async function validateMemberCodecCandidates(
  file: File, index: ArchiveIndex
): Promise<MemberCodecValidation> {
  const empty: MemberCodecValidation = { inspectedMembers: 0, skippedOversizedMembers: 0, trials: [] };
  if (!Number.isSafeInteger(index.directoryOffset) ||
      index.directoryOffset > file.size || index.directoryOffset <= OBSERVED_MEMBER_BASE) return empty;
  if (typeof DecompressionStream === 'undefined') return empty;
  const boundary = index.directoryOffset - OBSERVED_MEMBER_BASE;
  let inspectedMembers = 0;
  let skippedOversizedMembers = 0;
  const trials: MemberCodecTrial[] = [];
  for (const member of index.members) {
    if (!memberFits(member, boundary)) continue;
    if (member.storedBytes > MAX_MEMBER_STORED_BYTES ||
        member.reportedUncompressedBytes > MAX_DECODED_BYTES) {
      skippedOversizedMembers++;
      continue;
    }
    if (inspectedMembers >= MAX_MEMBERS_TO_CHECK) break;
    inspectedMembers++;
    const start = OBSERVED_MEMBER_BASE + member.offset;
    const bytes = new Uint8Array(await file.slice(start, start + member.storedBytes).arrayBuffer());
    for (const skippedBytes of START_OFFSETS) {
      if (skippedBytes >= bytes.length) continue;
      const candidate = bytes.subarray(skippedBytes);
      for (const codec of CODECS) {
        const outputBytes = await decodeLengthOnly(candidate, codec);
        trials.push({
          filename: member.filename, codec, skippedBytes,
          result: outputBytes === null ? 'invalid_stream' :
            outputBytes === member.reportedUncompressedBytes ? 'size_match' : 'size_mismatch',
          outputBytes
        });
      }
    }
  }
  return { inspectedMembers, skippedOversizedMembers, trials };
}
