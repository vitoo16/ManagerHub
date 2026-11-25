import { parseArchiveDirectoryDetails, type ArchiveMember } from '../archive';
import { Fm2013BinaryReader, siDateToIso } from './binary-reader';
import { FM2013DecodeError, type DecodedSaveHuman } from './types';

export const MAX_FM_SAVE_BYTES = 256 * 1024 * 1024;
export const MAX_DIRECTORY_COMPRESSED_BYTES = 512 * 1024;
export const MAX_DIRECTORY_DECOMPRESSED_BYTES = 2 * 1024 * 1024;
export const MAX_MEMBER_DECOMPRESSED_BYTES = 200 * 1024 * 1024;

const AFE_MEMBER_HEADER_BYTES = 40;
const MEMBER_DATA_BASE_OFFSET = 18;

export interface AfeContainerHeader {
  readonly family: 'afe' | 'fmf';
  readonly formatVersion: number;
  readonly directoryPtr: number;
  readonly directoryMetaLen: number;
  readonly compressed: boolean;
  readonly directoryOffset: number;
  readonly members: readonly ArchiveMember[];
  readonly nestedGroups: readonly { readonly name: string; readonly memberCount: number }[];
}

export interface SaveSummaryMetadata {
  readonly dbString: string;
  readonly gameVersion: string;
  readonly gameDate: string | null;
  readonly humans: readonly { readonly managerName: string; readonly clubShortName: string }[];
}

export type BinarySliceSource = Blob | Uint8Array;

function sourceSize(source: BinarySliceSource): number {
  return source instanceof Uint8Array ? source.byteLength : source.size;
}

async function readSlice(source: BinarySliceSource, start: number, end: number): Promise<Uint8Array> {
  const total = sourceSize(source);
  if (start < 0 || end < start || end > total) {
    throw new FM2013DecodeError(
      'TRUNCATED_ARCHIVE',
      `Archive read out of bounds [${start}, ${end}) for file size ${total}.`
    );
  }
  if (source instanceof Uint8Array) {
    return source.subarray(start, end);
  }
  return new Uint8Array(await source.slice(start, end).arrayBuffer());
}

/** Inflate a zlib-wrapped stream with an explicit output ceiling. */
export async function inflateZlibBounded(input: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new FM2013DecodeError(
      'DECOMPRESSION_UNAVAILABLE',
      'DecompressionStream is unavailable in this environment.'
    );
  }
  if (input.byteLength < 6) {
    throw new FM2013DecodeError('CORRUPT_MEMBER', 'Compressed stream is too short to be valid zlib.');
  }
  // Ensure an isolated ArrayBuffer slice for Blob construction.
  const copy = input.byteOffset === 0 && input.byteLength === input.buffer.byteLength
    ? new Uint8Array(input)
    : input.slice();
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new FM2013DecodeError(
          'SIZE_LIMIT_EXCEEDED',
          `Decompressed member exceeded safety limit (${maxBytes} bytes).`
        );
      }
      chunks.push(next.value);
    }
  } catch (error) {
    if (error instanceof FM2013DecodeError) throw error;
    throw new FM2013DecodeError('CORRUPT_MEMBER', 'Failed to inflate zlib payload in save archive.');
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    output.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return output;
}

/**
 * Decrypt a single FM2013 `afe.` member envelope using its embedded 40-byte header:
 * [0..3]: u32 key length (16)
 * [4..7]: u32 iv length (16)
 * [8..23]: 16-byte per-member random AES-128 key
 * [24..39]: 16-byte per-member big-endian CTR initial counter
 * [40..]: AES-128-CTR ciphertext
 */
export async function decryptAfeMemberEnvelope(blob: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new FM2013DecodeError(
      'CRYPTO_UNAVAILABLE',
      'Web Crypto API (crypto.subtle) is unavailable for offline FM2013 archive decryption.'
    );
  }
  if (blob.byteLength < AFE_MEMBER_HEADER_BYTES) {
    throw new FM2013DecodeError('CORRUPT_MEMBER', 'AFE member envelope is shorter than 40 bytes.');
  }
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const keyLen = view.getUint32(0, true);
  const ivLen = view.getUint32(4, true);
  if (keyLen !== 16 || ivLen !== 16) {
    throw new FM2013DecodeError(
      'CORRUPT_MEMBER',
      `Unexpected AFE member key/IV lengths (${keyLen}, ${ivLen}); expected (16, 16).`
    );
  }
  const keyBytes = blob.slice(8, 24);
  const ivBytes = blob.slice(24, 40);
  const cipherBytes = blob.slice(40);
  try {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CTR' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter: ivBytes, length: 128 },
      key,
      cipherBytes
    );
    return new Uint8Array(decrypted);
  } catch {
    throw new FM2013DecodeError('CORRUPT_MEMBER', 'AES-128-CTR decryption failed for save archive member.');
  }
}

export async function parseFm2013Container(source: BinarySliceSource): Promise<AfeContainerHeader> {
  const total = sourceSize(source);
  if (total < 28) {
    throw new FM2013DecodeError('TRUNCATED_ARCHIVE', 'File is too small to be a valid FM2013 save.');
  }
  if (total > MAX_FM_SAVE_BYTES) {
    throw new FM2013DecodeError(
      'SIZE_LIMIT_EXCEEDED',
      `Save file size (${total} bytes) exceeds 256 MB safety ceiling.`
    );
  }
  const head = await readSlice(source, 0, 18);
  const isAfe = head[0] === 0x02 && head[1] === 0x01 && head[2] === 0x61 &&
    head[3] === 0x66 && head[4] === 0x65 && head[5] === 0x2e;
  const isFmf = head[0] === 0x02 && head[1] === 0x01 && head[2] === 0x66 &&
    head[3] === 0x6d && head[4] === 0x66 && head[5] === 0x2e;

  if (!isAfe && !isFmf) {
    throw new FM2013DecodeError(
      'INVALID_SIGNATURE',
      'File does not start with a recognized FM2013 AFE or FMF container signature.'
    );
  }

  const headView = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const formatVersion = headView.getUint16(6, true);
  if (formatVersion !== 5) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Unsupported FM2013 archive version ${formatVersion}.`);
  }
  const directoryPtr = headView.getUint32(9, true);
  const directoryMetaLen = headView.getUint32(13, true);
  const compByte = head[17]!;

  if (compByte !== 0 && compByte !== 1) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Unexpected archive compression flag ${compByte}.`);
  }

  const directoryOffset = directoryPtr + directoryMetaLen;
  if (directoryOffset < MEMBER_DATA_BASE_OFFSET || directoryOffset + 9 >= total) {
    throw new FM2013DecodeError(
      'TRUNCATED_ARCHIVE',
      `Archive directory offset (${directoryOffset}) is outside file bounds (${total}).`
    );
  }

  const dirHeader = await readSlice(source, directoryOffset, directoryOffset + 9);
  const validDirMagic =
    dirHeader[0] === 0x02 && dirHeader[1] === 0x01 &&
    dirHeader[2] === 0x66 && dirHeader[3] === 0x6d && dirHeader[4] === 0x66 && dirHeader[5] === 0x2e &&
    dirHeader[6] === 0x04 && dirHeader[7] === 0x00 && dirHeader[8] === 0x00;

  if (!validDirMagic) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Archive trailing directory header does not match FMF v4.');
  }

  const dirCompressedLen = total - (directoryOffset + 9);
  if (dirCompressedLen > MAX_DIRECTORY_COMPRESSED_BYTES) {
    throw new FM2013DecodeError('SIZE_LIMIT_EXCEEDED', 'Archive directory exceeds bounded size limit.');
  }

  const dirCompressed = await readSlice(source, directoryOffset + 9, total);
  const dirBytes = await inflateZlibBounded(dirCompressed, MAX_DIRECTORY_DECOMPRESSED_BYTES);
  const memberDataBoundary = directoryOffset - MEMBER_DATA_BASE_OFFSET;
  const parsed = parseArchiveDirectoryDetails(dirBytes, memberDataBoundary);
  if (!parsed) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Archive directory table failed integrity validation.');
  }

  return {
    family: isAfe ? 'afe' : 'fmf',
    formatVersion,
    directoryPtr,
    directoryMetaLen,
    compressed: compByte === 1,
    directoryOffset,
    members: parsed.members,
    nestedGroups: parsed.nestedGroups
  };
}

export async function extractFm2013Member(
  source: BinarySliceSource,
  container: AfeContainerHeader,
  filename: string
): Promise<Uint8Array | null> {
  const member = container.members.find(entry => entry.filename === filename);
  if (!member) return null;
  if (member.reportedUncompressedBytes > MAX_MEMBER_DECOMPRESSED_BYTES) {
    throw new FM2013DecodeError(
      'SIZE_LIMIT_EXCEEDED',
      `Member "${filename}" reported size (${member.reportedUncompressedBytes}) exceeds safety limit.`
    );
  }
  const absStart = MEMBER_DATA_BASE_OFFSET + member.offset;
  const absEnd = absStart + member.storedBytes;
  const stored = await readSlice(source, absStart, absEnd);
  const payload = container.family === 'afe'
    ? await decryptAfeMemberEnvelope(stored)
    : stored;
  if (!container.compressed) {
    return payload;
  }
  return inflateZlibBounded(payload, MAX_MEMBER_DECOMPRESSED_BYTES);
}

/**
 * Decode `save_game_summary.dat`:
 * \x02\x01tad. + u16(ver) + u8(0) + siStr(dbString) + siStr(gameVersion) + u8(1)
 * + i32(humanCount) + humanCount * (siStr(managerName), siStr(clubShortName)) + date4(gameDate) + u32
 */
export function parseSaveGameSummary(bytes: Uint8Array): SaveSummaryMetadata | null {
  try {
    const r = new Fm2013BinaryReader(bytes);
    if (bytes.byteLength < 16 ||
        bytes[0] !== 0x02 || bytes[1] !== 0x01 ||
        bytes[2] !== 0x74 || bytes[3] !== 0x61 || bytes[4] !== 0x64 || bytes[5] !== 0x2e) {
      return null;
    }
    r.cursor = 6;
    r.u16(); // version (2)
    r.u8();  // flag (0)
    const dbString = r.siStr();
    const gameVersion = r.siStr();
    r.u8();  // flag (1)
    const humanCount = r.i32();
    if (humanCount < 0 || humanCount > 256) return null;
    const humans: { managerName: string; clubShortName: string }[] = [];
    for (let i = 0; i < humanCount; i++) {
      const managerName = r.siStr();
      const clubShortName = r.siStr();
      humans.push({ managerName, clubShortName });
    }
    const date = r.date4();
    const gameDate = siDateToIso(date.dayOfYear, date.year);
    return { dbString, gameVersion, gameDate, humans };
  } catch {
    return null;
  }
}

/**
 * Decode `humans.dat`:
 * \x02\x01tad. + u16(ver) + u8(0) + u16(count) + count * (i32 personRowId, i32 extra)
 */
export function parseHumansMember(bytes: Uint8Array): readonly number[] {
  try {
    const r = new Fm2013BinaryReader(bytes);
    if (bytes.byteLength < 11 ||
        bytes[0] !== 0x02 || bytes[1] !== 0x01 ||
        bytes[2] !== 0x74 || bytes[3] !== 0x61 || bytes[4] !== 0x64 || bytes[5] !== 0x2e) {
      return [];
    }
    r.cursor = 6;
    r.u16(); // version (5)
    r.u8();  // flag (0)
    const count = r.u16();
    if (count > 256) return [];
    const personRowIds: number[] = [];
    for (let i = 0; i < count; i++) {
      personRowIds.push(r.i32());
      r.i32();
    }
    return personRowIds;
  } catch {
    return [];
  }
}

export function mergeHumanManagers(
  summaryHumans: readonly { readonly managerName: string; readonly clubShortName: string }[],
  humanRowIds: readonly number[],
  lookupHumanByRowId: (rowId: number) => {
    readonly uid: number;
    readonly displayName: string;
    readonly clubUid: number | null;
    readonly clubName: string | null;
  } | null
): readonly DecodedSaveHuman[] {
  const results: DecodedSaveHuman[] = [];
  const count = Math.max(summaryHumans.length, humanRowIds.length);
  for (let i = 0; i < count; i++) {
    const rowId = humanRowIds[i] ?? null;
    const summary = summaryHumans[i];
    const resolved = rowId !== null ? lookupHumanByRowId(rowId) : null;
    const managerName = resolved?.displayName || summary?.managerName || `Manager #${i + 1}`;
    const clubName = resolved?.clubName || summary?.clubShortName || 'Unemployed';
    results.push({
      personUid: resolved?.uid ?? null,
      personRowId: rowId,
      managerName,
      clubUid: resolved?.clubUid ?? null,
      clubName
    });
  }
  return results;
}
