import { open, stat } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { probeCodecConsumption } from './afe-codec-consumption.mjs';

// AFE offsets relative to 18 bytes and FMF-directory trailer are observations
// from one save family, not a confirmed format specification.
const BASE = 18;
const TAIL = 64 * 1024;
const MAX_DIRECTORY = 512 * 1024;
const MAX_MEMBERS = 1024;
const MAX_TEXT_UNITS = 256;
const MAX_PROBES = 16;
const MAX_MEMBER_BYTES = 256 * 1024;
const MARKER = Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]);

export function parseObservedDirectory(data, boundary) {
  if (!Buffer.isBuffer(data) || data.length < 8 || !Number.isSafeInteger(boundary) || boundary < 1) return null;
  let cursor = 0;
  const u32 = () => {
    if (cursor + 4 > data.length) throw Error('truncated integer');
    const v = data.readUInt32LE(cursor); cursor += 4; return v;
  };
  const name = () => {
    const length = u32();
    if (length < 1 || length > MAX_TEXT_UNITS || cursor + length * 2 + 2 > data.length) throw Error('bad member name');
    const value = data.toString('utf16le', cursor, cursor + length * 2);
    cursor += length * 2;
    if (data.readUInt16LE(cursor) !== 0) throw Error('missing terminator');
    cursor += 2;
    if (!value || /[\\/\x00-\x1f]/.test(value)) throw Error('invalid filename');
    return value;
  };
  try {
    if (u32() !== 0) return null;
    const count = u32();
    if (count < 1 || count > MAX_MEMBERS) return null;
    const members = [];
    const names = new Set();
    for (let i = 0; i < count; i++) {
      const filename = name() + name();
      const offset = u32(), storedBytes = u32(), reportedUncompressedBytes = u32();
      if (names.has(filename) || storedBytes < 1 || reportedUncompressedBytes < 1 ||
          offset > boundary || storedBytes > boundary - offset) return null;
      names.add(filename);
      members.push({ filename, offset, storedBytes, reportedUncompressedBytes });
    }
    const sorted = [...members].sort((a, b) => a.offset - b.offset);
    if (sorted.some((member, i) => i > 0 && sorted[i - 1].offset + sorted[i - 1].storedBytes > member.offset)) return null;
    return members;
  } catch {
    return null;
  }
}

export async function inspectLocalArchive(filePath) {
  const fileStat = await stat(filePath);
  if (fileStat.size < BASE + MARKER.length + 2) return { status: 'not_recognized', members: [], trials: [] };
  const handle = await open(filePath, 'r');
  try {
    const tailStart = Math.max(0, fileStat.size - TAIL);
    const tail = Buffer.alloc(fileStat.size - tailStart);
    const { bytesRead } = await handle.read(tail, 0, tail.length, tailStart);
    if (bytesRead !== tail.length) throw Error('Incomplete directory tail read');
    let members = null;
    let directoryOffset = 0;
    // Last candidate first; cap inflation attempts on marker-heavy input.
    let attempted = 0;
    for (let cursor = tail.lastIndexOf(MARKER); cursor >= 0 && attempted < 32;
      cursor = tail.lastIndexOf(MARKER, cursor - 1)) {
      attempted++;
      const offset = tailStart + cursor;
      if (tail[cursor + MARKER.length] !== 0x78 || offset <= BASE) continue;
      try {
        const compressed = tail.subarray(cursor + MARKER.length);
        const directory = inflateSync(compressed, { maxOutputLength: MAX_DIRECTORY });
        members = parseObservedDirectory(directory, offset - BASE);
        if (members) { directoryOffset = offset; break; }
      } catch { /* Not a bounded, valid candidate. */ }
    }
    if (!members) return { status: 'not_recognized', members: [], trials: [] };
    const trials = [];
    let skipped = 0;
    let inspected = 0;
    for (const member of members) {
      if (inspected >= MAX_PROBES) break;
      if (member.storedBytes > MAX_MEMBER_BYTES || member.reportedUncompressedBytes > 2 * 1024 * 1024) {
        skipped++;
        continue;
      }
      const input = Buffer.alloc(member.storedBytes);
      const { bytesRead: read } = await handle.read(input, 0, input.length, BASE + member.offset);
      if (read !== input.length) throw Error('Incomplete member read');
      inspected++;
      for (const trial of probeCodecConsumption(input, member.reportedUncompressedBytes)) {
        trials.push({ filename: member.filename, ...trial });
      }
    }
    return { status: 'experimental_index', directoryOffset, memberCount: members.length,
      inspectedMembers: inspected, skippedOversized: skipped, trials };
  } finally {
    await handle.close();
  }
}
