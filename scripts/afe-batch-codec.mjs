import { open, stat } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { probeCodecConsumption } from './afe-codec-consumption.mjs';
import { summarizeNestedStructure } from './afe-structure-summary.mjs';
import { summarizeByteCohort } from './afe-cohort-profile.mjs';
import { censusMemberEnvelopes } from './afe-envelope-census.mjs';
import { auditUnindexedGaps } from './afe-gap-audit.mjs';
import { compareGapToEqualSizeMembers } from './afe-gap-comparison.mjs';
import { censusFramedCodecSignatures } from './afe-frame-signatures.mjs';
import { decodeValidatedMemberPayload, summarizeValidatedMemberDecode } from './afe-validated-decode.mjs';
import { probeAfeRawLz4 } from './afe-raw-lz4.mjs';

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

/**
 * Candidate locator inferred from one authentic AFE save.
 * Not a documented format guarantee: caller must verify marker and catalogue.
 */
export function observedAfeDirectoryMarkerOffset(header, fileSize) {
  if (!(header instanceof Uint8Array) || header.length < BASE ||
      !Number.isSafeInteger(fileSize) || fileSize < BASE + MARKER.length + 2 ||
      !Buffer.from(header.subarray(0, AFE_HEADER.length)).equals(AFE_HEADER)) return null;
  const bytes = Buffer.from(header);
  const pointer = bytes.readUInt32LE(9);
  const markerLength = bytes.readUInt32LE(13);
  // The authentic AFE fixture stores 9 as a separate header field. Require
  // it to equal the observed marker length before trusting this locator.
  // Unknown versions continue through the validated tail-scanning fallback.
  if (markerLength !== MARKER.length || pointer === 0) return null;
  const offset = pointer + markerLength;
  if (offset <= BASE || offset > fileSize - MARKER.length - 2) return null;
  return offset;
}

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

/**
 * Inspect known small metadata candidates first, then the smallest eligible
 * members from both tables. Never imply filename = decoded game record.
 */
export function selectCodecProbeMembers(members, limit = MAX_PROBES) {
  if (!Array.isArray(members) || !Number.isInteger(limit) || limit < 1 || limit > MAX_PROBES)
    throw new RangeError('Invalid probe selection budget.');
  const eligible = members.filter(member =>
    Number.isSafeInteger(member.storedBytes) && member.storedBytes > 0 &&
    member.storedBytes <= MAX_MEMBER_BYTES &&
    Number.isSafeInteger(member.reportedUncompressedBytes) &&
    member.reportedUncompressedBytes > 0 &&
    member.reportedUncompressedBytes <= 2 * 1024 * 1024);
  const priority = new Map([['game_info.dat', 0], ['save_game_summary.dat', 1]]);
  return [...eligible].sort((a, b) =>
    (priority.get(a.filename) ?? 2) - (priority.get(b.filename) ?? 2) ||
    a.storedBytes - b.storedBytes || a.filename.localeCompare(b.filename)).slice(0, limit);
}

export async function inspectLocalArchive(filePath, { includeMemberIndex = false, indexOnly = false } = {}) {
  const fileStat = await stat(filePath);
  if (fileStat.size < BASE + MARKER.length + 2) return { status: 'not_recognized', members: [], trials: [] };
  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(BASE);
    const { bytesRead: headerBytesRead } = await handle.read(header, 0, header.length, 0);
    if (headerBytesRead !== header.length || !header.subarray(0, AFE_HEADER.length).equals(AFE_HEADER)) {
      return { status: 'not_recognized', members: [], trials: [] };
    }
    let members = null;
    let directoryOffset = 0;
    let directoryLocator = null;
    let parsedDirectoryBytes = 0;
    let unparsedDirectoryBytes = 0;
    let groupCounts = [];
    let groupStructure = [];
    let selectedCohort = [];
    let parsedGroups = [];
    let totalMembers = 0;
    const acceptDirectory = (parsed, offset, locator) => {
      members = parsed.allMembers;
      parsedGroups = parsed.groups.map(group => ({ name: group.groupName, members: group.members }));
      groupCounts = parsed.groups.map(group => ({ name: group.groupName, count: group.members.length }));
      groupStructure = summarizeNestedStructure(parsed);
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
      directoryLocator = locator;
    };
    const parseCandidate = (bytes, offset, locator) => {
      if (offset <= BASE || bytes.length < MARKER.length + 2 ||
          !bytes.subarray(0, MARKER.length).equals(MARKER) ||
          bytes[MARKER.length] !== 0x78) return false;
      try {
        const compressed = bytes.subarray(MARKER.length);
        const { buffer: directory, engine } = inflateSync(compressed, {
          info: true, maxOutputLength: MAX_DIRECTORY
        });
        if (engine.bytesWritten !== compressed.length) return false;
        const parsed = parseObservedDirectoryDetails(directory, offset - BASE);
        if (!parsed) return false;
        acceptDirectory(parsed, offset, locator);
        return true;
      } catch {
        return false;
      }
    };

    // Observed AFE header u32 at absolute byte 9 satisfies:
    // directory marker absolute offset = pointer + markerLength (u32 at 13).
    // Validate it; never trust the pointer without parsing the catalogue.
    const directOffset = observedAfeDirectoryMarkerOffset(header, fileStat.size);
    if (directOffset !== null) {
      const bytesToRead = fileStat.size - directOffset;
      if (bytesToRead <= MAX_DIRECTORY) {
        const candidate = Buffer.alloc(bytesToRead);
        const { bytesRead } = await handle.read(candidate, 0, candidate.length, directOffset);
        if (bytesRead !== candidate.length) throw Error('Incomplete header-directed directory read');
        parseCandidate(candidate, directOffset, 'header_pointer');
      }
    }

    // Fallback for variant AFE headers and synthetic fixtures without pointer.
    if (!members) {
      const tailStart = Math.max(0, fileStat.size - TAIL);
      const tail = Buffer.alloc(fileStat.size - tailStart);
      const { bytesRead } = await handle.read(tail, 0, tail.length, tailStart);
      if (bytesRead !== tail.length) throw Error('Incomplete directory tail read');
      let attempted = 0;
      for (let cursor = tail.lastIndexOf(MARKER); cursor >= 0 && attempted < 32;
        cursor = tail.lastIndexOf(MARKER, cursor - 1)) {
        attempted++;
        if (parseCandidate(tail.subarray(cursor), tailStart + cursor, 'tail_scan')) break;
      }
    }
    if (!members) return { status: 'not_recognized', members: [], trials: [] };
    // Cross-save comparisons only require the validated directory. Do not
    // rerun unrelated codec, entropy, gap or envelope studies for both saves.
    if (indexOnly) {
      return {
        status: 'experimental_index',
        directoryOffset,
        directoryLocator,
        memberCount: totalMembers,
        totalIndexedMembers: members.length,
        nestedGroups: groupCounts,
        parsedDirectoryBytes,
        unparsedDirectoryBytes,
        ...(includeMemberIndex ? { memberIndex: members } : {})
      };
    }
    const envelopeCensus = await censusMemberEnvelopes(handle, members, parsedGroups, BASE);
    const framedCodecSignatures = await censusFramedCodecSignatures(handle, members, BASE);
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
    const validatedDecodes = [];
    const rawLz4Probes = [];
    const eligibleMembers = selectCodecProbeMembers(members);
    const skipped = members.length - eligibleMembers.length;
    let inspected = 0;
    for (const member of eligibleMembers) {
      const input = Buffer.alloc(member.storedBytes);
      const { bytesRead: read } = await handle.read(input, 0, input.length, BASE + member.offset);
      if (read !== input.length) throw Error('Incomplete member read');
      inspected++;
      rawLz4Probes.push({
        filename: member.filename,
        ...probeAfeRawLz4(input, member.reportedUncompressedBytes)
      });
      validatedDecodes.push({
        filename: member.filename,
        ...summarizeValidatedMemberDecode(decodeValidatedMemberPayload(
          input, member.reportedUncompressedBytes
        ))
      });
      for (const trial of probeCodecConsumption(input, member.reportedUncompressedBytes)) {
        trials.push({ filename: member.filename, ...trial });
      }
    }
    return { status: 'experimental_index', directoryOffset, directoryLocator,
      memberCount: totalMembers, nestedGroups: groupCounts, nestedStructure: groupStructure,
      dominantCohortProfile: cohortProfile, envelopeCensus, framedCodecSignatures, gapAudit, gapComparisons,
      totalIndexedMembers: members.length,
      ...(includeMemberIndex ? { memberIndex: members } : {}),
      parsedDirectoryBytes, unparsedDirectoryBytes,
      inspectedMembers: inspected, skippedOversized: skipped, trials, validatedDecodes, rawLz4Probes };
  } finally {
    await handle.close();
  }
}
