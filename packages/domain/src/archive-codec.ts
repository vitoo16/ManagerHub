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
const CODECS = ['deflate', 'deflate-raw', 'gzip'] as const;
type CandidateCodec = typeof CODECS[number];
type DecodeOutcome = { status: 'decoded' | 'trailer_mismatch'; outputBytes: number } | { status: 'invalid_stream' | 'output_limit_exceeded'; outputBytes: null };

export interface MemberCodecTrial {
  readonly filename: string;
  readonly codec: CandidateCodec;
  readonly skippedBytes: number;
  readonly result: 'size_match' | 'size_match_unverified_input' | 'size_mismatch' | 'invalid_stream' | 'output_limit_exceeded' | 'trailer_mismatch';
  readonly outputBytes: number | null;
}

export interface MemberCodecValidation {
  readonly inspectedMembers: number;
  readonly skippedOversizedMembers: number;
  readonly trials: readonly MemberCodecTrial[];
}

/** Consume only bounded byte counts. A malformed or overlarge stream never returns payload bytes. */
async function decodeLengthOnly(bytes: Uint8Array, codec: CandidateCodec): Promise<DecodeOutcome> {
  // Raw DEFLATE has no integrity trailer; verify zlib/gzip end checksums to
  // reject trailing bytes that an inflater might silently ignore.
  let adlerA = 1;
  let adlerB = 0;
  let crc = 0xffffffff;
  const inputView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Browsers lacking raw DEFLATE support reject the constructor. Such trials
  // remain inconclusive rather than being treated as real AFE codec failures.
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = new Blob([new Uint8Array(bytes)]).stream()
      .pipeThrough(new DecompressionStream(codec)).getReader();
  } catch {
    return { status: 'invalid_stream', outputBytes: null };
  }
  let outputBytes = 0;
  let outcome: DecodeOutcome = { status: 'invalid_stream', outputBytes: null };
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) {
        let trailerValid = true;
        if (codec === 'deflate') {
          trailerValid = bytes.length >= 6 &&
            inputView.getUint32(bytes.length - 4, false) === (((adlerB << 16) | adlerA) >>> 0);
        } else if (codec === 'gzip') {
          trailerValid = bytes.length >= 18 &&
            inputView.getUint32(bytes.length - 8, true) === ((crc ^ 0xffffffff) >>> 0) &&
            inputView.getUint32(bytes.length - 4, true) === (outputBytes >>> 0);
        }
        outcome = { status: trailerValid ? 'decoded' : 'trailer_mismatch', outputBytes };
        break;
      }
      outputBytes += item.value.byteLength;
      if (codec === 'deflate') {
        for (const byte of item.value) {
          adlerA = (adlerA + byte) % 65521;
          adlerB = (adlerB + adlerA) % 65521;
        }
      } else if (codec === 'gzip') {
        for (const byte of item.value) {
          crc ^= byte;
          for (let bit = 0; bit < 8; bit++) {
            crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
          }
        }
      }
      if (outputBytes > MAX_DECODED_BYTES) {
        outcome = { status: 'output_limit_exceeded', outputBytes: null };
        break;
      }
    }
  } catch {
    outcome = { status: 'invalid_stream', outputBytes: null };
  } finally {
    // Cancel any still-running inflation before releasing the stream lock.
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return outcome;
}

function memberFits(member: ArchiveMember, boundary: number): boolean {
  return Number.isSafeInteger(member.offset) && Number.isSafeInteger(member.storedBytes) &&
    Number.isSafeInteger(member.reportedUncompressedBytes) &&
    member.offset >= 0 && member.storedBytes > 0 && member.reportedUncompressedBytes > 0 &&
    member.offset <= boundary && member.storedBytes <= boundary - member.offset;
}

/**
 * Tests small members only: 4 members x 3 offsets x 3 codecs, each input <= 256 KiB,
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
        const outcome = await decodeLengthOnly(candidate, codec);
        trials.push({
          filename: member.filename, codec, skippedBytes,
          result: outcome.status === 'decoded'
            ? outcome.outputBytes !== member.reportedUncompressedBytes ? 'size_mismatch'
              : codec === 'deflate-raw' ? 'size_match_unverified_input' : 'size_match'
            : outcome.status,
          outputBytes: outcome.outputBytes
        });
      }
    }
  }
  return { inspectedMembers, skippedOversizedMembers, trials };
}
