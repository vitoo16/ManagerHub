import { isSafeArchiveLabel, type ArchiveMember } from '../archive';
import { Fm2013BinaryReader, siDateToIso } from './binary-reader';
import { FM2013DecodeError, type DecodedSaveHuman } from './types';

export const MAX_FM_SAVE_BYTES = 256 * 1024 * 1024;
export const MAX_DIRECTORY_COMPRESSED_BYTES = 512 * 1024;
export const MAX_DIRECTORY_DECOMPRESSED_BYTES = 2 * 1024 * 1024;
export const MAX_MEMBER_DECOMPRESSED_BYTES = 200 * 1024 * 1024;

const AFE_MEMBER_HEADER_BYTES = 40;
export const MEMBER_DATA_BASE_OFFSET = 18;
const MAX_TOTAL_DIRECTORY_FILES = 10_000;
const MAX_DIRECTORY_DEPTH = 8;
const MAX_COMPONENT_CHARS = 128;

export interface FmfDirectoryFileEntry {
  readonly stem: string;
  readonly ext: string;
  readonly filename: string;
  readonly fullPath: string;
  readonly offset: number;
  readonly storedBytes: number;
  readonly reportedUncompressedBytes: number;
}

export interface FmfDirectoryNode {
  readonly name: string;
  readonly rootHeader: number;
  readonly files: readonly FmfDirectoryFileEntry[];
  readonly subDirs: readonly FmfDirectoryNode[];
}

export interface AfeContainerHeader {
  readonly family: 'afe' | 'fmf';
  readonly formatVersion: number;
  readonly directoryPtr: number;
  readonly directoryMetaLen: number;
  readonly memberDataBaseOffset: number;
  readonly compressed: boolean;
  readonly directoryOffset: number;
  readonly members: readonly ArchiveMember[];
  readonly allMembers: readonly FmfDirectoryFileEntry[];
  readonly directoryTree: FmfDirectoryNode;
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

export async function readSlice(source: BinarySliceSource, start: number, end: number): Promise<Uint8Array> {
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

/** Compress a byte array as RFC 1950 zlib (`deflate`). */
export async function deflateZlib(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new FM2013DecodeError(
      'DECOMPRESSION_UNAVAILABLE',
      'CompressionStream is unavailable in this environment.'
    );
  }
  const copy = new Uint8Array(input);
  const stream = new Blob([copy]).stream().pipeThrough(new CompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
      total += next.value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return out;
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

/** Encrypt a member payload into a genuine 40-byte FM2013 `afe.` AES-128-CTR envelope. */
export async function encryptAfeMemberEnvelope(
  plaintext: Uint8Array,
  explicitKeyIv?: { readonly key: Uint8Array; readonly iv: Uint8Array }
): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new FM2013DecodeError(
      'CRYPTO_UNAVAILABLE',
      'Web Crypto API (crypto.subtle) is unavailable for offline FM2013 archive encryption.'
    );
  }
  const keyBytes = explicitKeyIv ? explicitKeyIv.key.slice(0, 16) : crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = explicitKeyIv ? explicitKeyIv.iv.slice(0, 16) : crypto.getRandomValues(new Uint8Array(16));
  if (keyBytes.byteLength !== 16 || ivBytes.byteLength !== 16) {
    throw new FM2013DecodeError('CORRUPT_MEMBER', 'AES-128-CTR envelope requires 16-byte key and IV.');
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CTR' }, false, ['encrypt']);
  const copy = new Uint8Array(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: ivBytes, length: 128 },
    key,
    copy
  );
  const cipherBytes = new Uint8Array(cipherBuffer);
  const out = new Uint8Array(AFE_MEMBER_HEADER_BYTES + cipherBytes.byteLength);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 16, true);
  dv.setUint32(4, 16, true);
  out.set(keyBytes, 8);
  out.set(ivBytes, 24);
  out.set(cipherBytes, 40);
  return out;
}

/**
 * Parse the full recursive FMF v4 directory tree (`fm.exe` `0x13bf680`/`0x13bf870`).
 * Strictly enforces exact EOF (or legacy 0-subdir synthetic omission when at exact EOF),
 * unique member paths, and non-overlapping extents inside `[0, boundary)`.
 */
export function parseRecursiveFmfDirectory(
  bytes: Uint8Array,
  boundary: number
): {
  readonly tree: FmfDirectoryNode;
  readonly rootMembers: readonly ArchiveMember[];
  readonly allMembers: readonly FmfDirectoryFileEntry[];
  readonly nestedGroups: readonly { readonly name: string; readonly memberCount: number }[];
} {
  if (!(bytes instanceof Uint8Array) || !Number.isSafeInteger(boundary) || boundary < 0 ||
      bytes.byteLength < 8 || bytes.byteLength > MAX_DIRECTORY_DECOMPRESSED_BYTES) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Archive directory table failed size bounds.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const utf16Fatal = new TextDecoder('utf-16le', { fatal: true });
  let cursor = 0;
  let totalFiles = 0;
  const allMembers: FmfDirectoryFileEntry[] = [];
  const seenPaths = new Set<string>();

  const readU32 = (): number => {
    if (cursor + 4 > view.byteLength) {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Truncated u32 in FMF v4 directory.');
    }
    const v = view.getUint32(cursor, true);
    cursor += 4;
    return v;
  };

  const readDirText = (allowEmpty: boolean): string => {
    const charLen = readU32();
    if (charLen === 0) {
      if (allowEmpty) return '';
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Empty component name in FMF v4 directory.');
    }
    if (charLen > MAX_COMPONENT_CHARS || cursor + charLen * 2 + 2 > bytes.byteLength) {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Invalid UTF-16 string in FMF v4 directory.');
    }
    let decoded: string;
    try {
      decoded = utf16Fatal.decode(bytes.subarray(cursor, cursor + charLen * 2));
    } catch {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Malformed UTF-16 string in FMF v4 directory.');
    }
    cursor += charLen * 2;
    if (view.getUint16(cursor, true) !== 0) {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Missing UTF-16 null terminator in FMF v4 directory.');
    }
    cursor += 2;
    if (!isSafeArchiveLabel(decoded, MAX_COMPONENT_CHARS)) {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Unsafe archive member label in FMF v4 directory.');
    }
    return decoded;
  };

  const parseNode = (isRoot: boolean, prefix: string, depth: number): FmfDirectoryNode => {
    if (depth > MAX_DIRECTORY_DEPTH) {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Archive directory nesting exceeds safety limit.');
    }
    let rootHeader = 0;
    let name = '/';
    if (isRoot) {
      rootHeader = readU32();
      if (rootHeader !== 0) {
        throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Unexpected FMF directory root header ${rootHeader}.`);
      }
    } else {
      name = readDirText(false);
    }

    const fileCount = readU32();
    if ((isRoot && fileCount < 1) || fileCount > MAX_TOTAL_DIRECTORY_FILES - totalFiles) {
      throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Archive directory file count exceeds safety limit.');
    }
    totalFiles += fileCount;

    const files: FmfDirectoryFileEntry[] = [];
    const nodePrefix = isRoot ? '' : `${prefix}${name}/`;
    for (let i = 0; i < fileCount; i++) {
      const stem = readDirText(false);
      const ext = readDirText(true);
      const filename = stem + ext;
      const fullPath = nodePrefix + filename;
      if (seenPaths.has(fullPath)) {
        throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Duplicate archive member path "${fullPath}".`);
      }
      seenPaths.add(fullPath);

      const offset = readU32();
      const storedBytes = readU32();
      const reportedUncompressedBytes = readU32();
      if (
        storedBytes < 1 ||
        reportedUncompressedBytes < 1 ||
        offset > boundary ||
        storedBytes > boundary - offset
      ) {
        throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Out-of-bounds member extent for "${fullPath}".`);
      }
      const entry: FmfDirectoryFileEntry = {
        stem,
        ext,
        filename,
        fullPath,
        offset,
        storedBytes,
        reportedUncompressedBytes
      };
      files.push(entry);
      allMembers.push(entry);
    }

    const subDirs: FmfDirectoryNode[] = [];
    if (!(isRoot && cursor === bytes.byteLength)) {
      const subDirCount = readU32();
      if (subDirCount > 256) {
        throw new FM2013DecodeError('CORRUPT_DIRECTORY', 'Archive subdirectory count exceeds safety limit.');
      }
      for (let d = 0; d < subDirCount; d++) {
        subDirs.push(parseNode(false, nodePrefix, depth + 1));
      }
    }

    return { name, rootHeader, files, subDirs };
  };

  const tree = parseNode(true, '', 0);
  if (cursor !== bytes.byteLength) {
    throw new FM2013DecodeError(
      'CORRUPT_DIRECTORY',
      `Archive directory table has ${bytes.byteLength - cursor} unparsed trailing bytes.`
    );
  }

  const sorted = [...allMembers].sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (prev.offset + prev.storedBytes > curr.offset) {
      throw new FM2013DecodeError(
        'CORRUPT_DIRECTORY',
        `Overlapping archive member extents ("${prev.fullPath}" and "${curr.fullPath}").`
      );
    }
  }

  const rootMembers: ArchiveMember[] = tree.files.map(f => ({
    filename: f.filename,
    offset: f.offset,
    storedBytes: f.storedBytes,
    reportedUncompressedBytes: f.reportedUncompressedBytes
  }));

  const countSubtreeFiles = (node: FmfDirectoryNode): number =>
    node.files.length + node.subDirs.reduce((acc, sub) => acc + countSubtreeFiles(sub), 0);

  const nestedGroups = tree.subDirs.map(sub => ({
    name: sub.name,
    memberCount: countSubtreeFiles(sub)
  }));

  return { tree, rootMembers, allMembers, nestedGroups };
}

/** Serialize a recursive FMF v4 directory tree back to raw uncompressed bytes. */
export function serializeRecursiveFmfDirectory(tree: FmfDirectoryNode): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const push = (b: Uint8Array) => {
    chunks.push(b);
    total += b.byteLength;
  };
  const writeU32 = (v: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v >>> 0, true);
    push(b);
  };
  const writeStr = (text: string) => {
    if (text.length === 0) {
      writeU32(0);
      return;
    }
    writeU32(text.length);
    const b = new Uint8Array(text.length * 2 + 2);
    const dv = new DataView(b.buffer);
    for (let i = 0; i < text.length; i++) {
      dv.setUint16(i * 2, text.charCodeAt(i), true);
    }
    dv.setUint16(text.length * 2, 0, true);
    push(b);
  };

  const emitNode = (node: FmfDirectoryNode, isRoot: boolean) => {
    if (isRoot) {
      writeU32(node.rootHeader);
    } else {
      writeStr(node.name);
    }
    writeU32(node.files.length);
    for (const file of node.files) {
      writeStr(file.stem);
      writeStr(file.ext);
      writeU32(file.offset);
      writeU32(file.storedBytes);
      writeU32(file.reportedUncompressedBytes);
    }
    writeU32(node.subDirs.length);
    for (const sub of node.subDirs) {
      emitNode(sub, false);
    }
  };

  emitNode(tree, true);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return out;
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
    head[3] === 0x66 && head[4] === 0x65 && head[5] === 0x2e &&
    head[8] === 0x00;
  const isFmf = head[0] === 0x02 && head[1] === 0x01 && head[2] === 0x66 &&
    head[3] === 0x6d && head[4] === 0x66 && head[5] === 0x2e &&
    head[8] === 0x00;

  if (!isAfe && !isFmf) {
    throw new FM2013DecodeError(
      'INVALID_SIGNATURE',
      'File does not start with a recognized FM2013 AFE or FMF container signature.'
    );
  }

  const headView = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const formatVersion = headView.getUint16(6, true);
  if (formatVersion !== 4) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Unsupported FM2013 archive version ${formatVersion}.`);
  }
  const directoryPtr = headView.getUint32(9, true);
  const directoryMetaLen = headView.getUint32(13, true);
  const compByte = head[17]!;

  if (compByte !== 0 && compByte !== 1) {
    throw new FM2013DecodeError('CORRUPT_DIRECTORY', `Unexpected archive compression flag ${compByte}.`);
  }
  if (directoryMetaLen !== 9 && directoryMetaLen !== 0) {
    throw new FM2013DecodeError(
      'CORRUPT_DIRECTORY',
      `Unexpected FM2013 archive header payload offset ${directoryMetaLen}.`
    );
  }

  // In fm.exe (`0x13bfc40`..`0x13bfda6`), `directoryPtr` is relative to byte 9 (`directoryMetaLen === 9`),
  // so `9 + directoryPtr === directoryPtr + directoryMetaLen`; legacy synthetic tests with `directoryMetaLen === 0`
  // store absolute `directoryPtr`.
  const directoryOffset = directoryMetaLen === 9 ? 9 + directoryPtr : directoryPtr;
  const memberDataBaseOffset = MEMBER_DATA_BASE_OFFSET;

  if (directoryOffset < memberDataBaseOffset || directoryOffset + 9 >= total) {
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
  const memberDataBoundary = directoryOffset - memberDataBaseOffset;
  const parsed = parseRecursiveFmfDirectory(dirBytes, memberDataBoundary);

  return {
    family: isAfe ? 'afe' : 'fmf',
    formatVersion,
    directoryPtr,
    directoryMetaLen,
    memberDataBaseOffset,
    compressed: compByte === 1,
    directoryOffset,
    members: parsed.rootMembers,
    allMembers: parsed.allMembers,
    directoryTree: parsed.tree,
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
  const absStart = container.memberDataBaseOffset + member.offset;
  const absEnd = absStart + member.storedBytes;
  const stored = await readSlice(source, absStart, absEnd);
  const payload = container.family === 'afe'
    ? await decryptAfeMemberEnvelope(stored)
    : stored;
  const output = container.compressed
    ? await inflateZlibBounded(payload, MAX_MEMBER_DECOMPRESSED_BYTES)
    : payload;
  if (output.byteLength !== member.reportedUncompressedBytes) {
    throw new FM2013DecodeError(
      'CORRUPT_MEMBER',
      `Member "${filename}" decompressed size (${output.byteLength}) did not match directory size (${member.reportedUncompressedBytes}).`
    );
  }
  return output;
}

/**
 * Compute the 64-byte `HMAC-SHA512` footer enforced by `fm.exe` (`0x165d203` -> `0x6cf3e0` -> `0x119a0e0`):
 * `HMAC-SHA512(key = utf16LeKeyBytes, message = gameDbBytes[9 : len - 68])`.
 */
export async function computeGameDbHmacSha512(
  gameDbBytes: Uint8Array,
  utf16KeyBytes: Uint8Array
): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new FM2013DecodeError('CRYPTO_UNAVAILABLE', 'Web Crypto API is unavailable for HMAC-SHA512.');
  }
  if (gameDbBytes.byteLength < 77) {
    throw new FM2013DecodeError('TRUNCATED_DATABASE', 'game_db.dat is too short to hold a 64-byte HMAC footer.');
  }
  const view = new DataView(gameDbBytes.buffer, gameDbBytes.byteOffset, gameDbBytes.byteLength);
  const hashLen = view.getInt32(gameDbBytes.byteLength - 68, true);
  if (hashLen !== 64) {
    throw new FM2013DecodeError('CORRUPT_DATABASE', `Expected 64-byte game_db checksum length, got ${hashLen}.`);
  }
  const keyCopy = new Uint8Array(utf16KeyBytes);
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    keyCopy,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const msgSlice = gameDbBytes.subarray(9, gameDbBytes.byteLength - 68);
  const msgCopy = msgSlice.byteOffset === 0 && msgSlice.byteLength === msgSlice.buffer.byteLength
    ? msgSlice
    : msgSlice.slice();
  const sig = await crypto.subtle.sign('HMAC', hmacKey, msgCopy as BufferSource);
  return new Uint8Array(sig);
}

/** Constant-time verification of the 64-byte `game_db.dat` `HMAC-SHA512` footer. */
export async function verifyGameDbHmacSha512(
  gameDbBytes: Uint8Array,
  utf16KeyBytes: Uint8Array
): Promise<boolean> {
  const expected = await computeGameDbHmacSha512(gameDbBytes, utf16KeyBytes);
  const actual = gameDbBytes.subarray(gameDbBytes.byteLength - 64);
  if (actual.byteLength !== 64 || expected.byteLength !== 64) return false;
  let diff = 0;
  for (let i = 0; i < 64; i++) {
    diff |= (actual[i]! ^ expected[i]!);
  }
  return diff === 0;
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
    r.u16();
    r.u8();
    const dbString = r.siStr();
    const gameVersion = r.siStr();
    r.u8();
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
    r.u16();
    r.u8();
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
