import { open, stat } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { probeCodecConsumption } from './afe-codec-consumption.mjs';
import { summarizeNestedStructure } from './afe-structure-summary.mjs';
import { summarizeByteCohort } from './afe-cohort-profile.mjs';
import { censusMemberEnvelopes } from './afe-envelope-census.mjs';
import { auditUnindexedGaps } from './afe-gap-audit.mjs';
import { compareGapToEqualSizeMembers } from './afe-gap-comparison.mjs';

// AFE offsets relative to 18 bytes and FMF-directory trailer are observations
// from one save family, not a confirmed format specification.
const BASE = 18;
const TAIL = 64 * 1024;
const MAX_DIRECTORY = 512 * 1024;
const MAX_MEMBERS = 1024;
const MAX_GROUPS = 16;
const MAX_TOTAL_MEMBERS = 4096;
const MAX_TEXT_UNITS = 256;
const MAX_PROBES = 16;
const MAX_MEMBER_BYTES = 256 * 1024;
const MARKER = Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]);
const AFE_HEADER = Buffer.from([2, 1, 97, 102, 101, 46]);

export function parseObservedDirectoryDetails(data, boundary) {
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
    // Optional nested archive tables. The fixture has one 'rgman' group
    // containing 724 additional member extents, not opaque arbitrary bytes.
    const groups = [];
    if (cursor + 4 <= data.length) {
      const groupCount = u32();
      if (groupCount > MAX_GROUPS) return null;
      for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
        const groupName = name();
        const childCount = u32();
        if (childCount < 1 || childCount > MAX_TOTAL_MEMBERS ||
            members.length + childCount > MAX_TOTAL_MEMBERS) return null;
        const children = [];
        for (let i = 0; i < childCount; i++) {
          const filename = name() + name();
          const offset = u32(), storedBytes = u32(), reportedUncompressedBytes = u32();
          if (names.has(filename) || storedBytes < 1 || reportedUncompressedBytes < 1 ||
              offset > boundary || storedBytes > boundary - offset) return null;
          names.add(filename);
          children.push({ filename, offset, storedBytes, reportedUncompressedBytes });
        }
        groups.push({ groupName, members: children });
      }
    }
    const allMembers = [...members, ...groups.flatMap(group => group.members)];
    const sorted = [...allMembers].sort((a, b) => a.offset - b.offset);
    if (sorted.some((member, i) => i > 0 &&
      sorted[i - 1].offset + sorted[i - 1].storedBytes > member.offset)) return null;
    // The observed directory ends with one LE u32 zero. No opaque remainder
    // should be mistaken for a second catalogue.
    const unparsed = data.subarray(cursor);
    if (unparsed.length !== 0 && !(unparsed.length === 4 && unparsed.readUInt32LE(0) === 0)) return null;
    return { members, groups, allMembers, parsedBytes: cursor,
      trailingBytes: unparsed.length };
  } catch {
    return null;
  }
}

export function parseObservedDirectory(data, boundary) {
  return parseObservedDirectoryDetails(data, boundary)?.members ?? null;
}

export async function inspectLocalArchive(filePath) {
  const fileStat = await stat(filePath);
  if (fileStat.size < BASE + MARKER.length + 2) return { status: 'not_recognized', members: [], trials: [] };
  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(AFE_HEADER.length);
    const { bytesRead: headerBytesRead } = await handle.read(header, 0, header.length, 0);
    if (headerBytesRead !== header.length || !header.equals(AFE_HEADER)) {
      return { status: 'not_recognized', members: [], trials: [] };
    }
    const tailStart = Math.max(0, fileStat.size - TAIL);
    const tail = Buffer.alloc(fileStat.size - tailStart);
    const { bytesRead } = await handle.read(tail, 0, tail.length, tailStart);
    if (bytesRead !== tail.length) throw Error('Incomplete directory tail read');
    let members = null;
    let directoryOffset = 0;
    let parsedDirectoryBytes = 0;
    let unparsedDirectoryBytes = 0;
    let groupCounts = [];
    let groupStructure = [];
    let selectedCohort = [];
    let parsedGroups = [];
    let totalMembers = 0;
    // Last candidate first; cap inflation attempts on marker-heavy input.
    let attempted = 0;
    for (let cursor = tail.lastIndexOf(MARKER); cursor >= 0 && attempted < 32;
      cursor = tail.lastIndexOf(MARKER, cursor - 1)) {
      attempted++;
      const offset = tailStart + cursor;
      if (tail[cursor + MARKER.length] !== 0x78 || offset <= BASE) continue;
      try {
        const compressed = tail.subarray(cursor + MARKER.length);
        // Exact consumption matters: a valid index followed by unrelated bytes
        // must not masquerade as a complete trailing directory.
        const { buffer: directory, engine } = inflateSync(compressed, {
          info: true, maxOutputLength: MAX_DIRECTORY
        });
        if (engine.bytesWritten !== compressed.length) continue;
        const parsed = parseObservedDirectoryDetails(directory, offset - BASE);
        if (parsed) {
          members = parsed.allMembers;
          parsedGroups = parsed.groups.map(group => ({ name: group.groupName, members: group.members }));
          groupCounts = parsed.groups.map(group => ({ name: group.groupName, count: group.members.length }));
          groupStructure = summarizeNestedStructure(parsed);
          // Profile only one frequent, small, equal-sized nested cohort.
          const group = parsed.groups.find(g => g.members.length > 1);
          const dominant = groupStructure[0]?.topSizePairs.find(pair =>
            pair.count >= 2 && pair.storedBytes >= 9 && pair.storedBytes <= 256);
          if (group && dominant) selectedCohort = group.members.filter(m =>
            m.storedBytes === dominant.storedBytes &&
            m.reportedUncompressedBytes === dominant.reportedUncompressedBytes).slice(0, 256);
          totalMembers = parsed.members.length;
          parsedDirectoryBytes = parsed.parsedBytes;
          unparsedDirectoryBytes = parsed.trailingBytes;
          directoryOffset = offset;
          break;
        }
      } catch { /* Not a bounded, valid candidate. */ }
    }
    if (!members) return { status: 'not_recognized', members: [], trials: [] };
    const envelopeCensus = await censusMemberEnvelopes(handle, members, parsedGroups, BASE);
    const gapAudit = await auditUnindexedGaps(handle, members, directoryOffset, BASE);
    const gapComparisons = [];
    for (const gap of gapAudit.gaps) {
      gapComparisons.push(await compareGapToEqualSizeMembers(handle, gap, members, BASE));
    }
    let cohortProfile = null;
    if (selectedCohort.length >= 2) {
      const samples = [];
      for (const member of selectedCohort) {
        const input = Buffer.alloc(member.storedBytes);
        const { bytesRead } = await handle.read(input, 0, input.length, BASE + member.offset);
        if (bytesRead !== input.length) throw Error('Incomplete cohort member read');
        samples.push(input);
      }
      cohortProfile = {
        reportedUncompressedBytes: selectedCohort[0].reportedUncompressedBytes,
        ...summarizeByteCohort(samples)
      };
    }
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
    return { status: 'experimental_index', directoryOffset,
      memberCount: totalMembers, nestedGroups: groupCounts, nestedStructure: groupStructure,
      dominantCohortProfile: cohortProfile, envelopeCensus, gapAudit, gapComparisons,
      totalIndexedMembers: members.length,
      parsedDirectoryBytes, unparsedDirectoryBytes,
      inspectedMembers: inspected, skippedOversized: skipped, trials };
  } finally {
    await handle.close();
  }
}
