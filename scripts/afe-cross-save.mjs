import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inspectLocalArchive } from './afe-batch-codec.mjs';

const MAX_INPUT_BYTES = 256 * 1024 * 1024;
const MAX_COMPARE_MEMBERS = 32;
const SAMPLE_BYTES = 64;
const HASH_CHUNK_BYTES = 64 * 1024;
const MAX_HASH_MEMBER_BYTES = 8 * 1024 * 1024;
const DATA_BASE = 18;

async function fingerprint(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size < 1 || info.size > MAX_INPUT_BYTES) {
    throw new RangeError('Save size exceeds bounded comparison limits.');
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return { bytes: info.size, digest: hash.digest('hex') };
}

/** Compare bounded byte samples without returning save bytes or hashes. */
export function compareMemberSamples(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) ||
      a.length < 1 || a.length > SAMPLE_BYTES || b.length < 1 || b.length > SAMPLE_BYTES) {
    throw new RangeError('Invalid bounded sample.');
  }
  const common = Math.min(a.length, b.length);
  let identicalPositions = 0;
  let commonPrefixBytes = 0;
  let stillEqual = true;
  for (let i = 0; i < common; i++) {
    if (a[i] === b[i]) {
      identicalPositions++;
      if (stillEqual) commonPrefixBytes++;
    } else {
      stillEqual = false;
    }
  }
  return {
    comparedBytes: common,
    sameSampleLength: a.length === b.length,
    identicalPositions,
    commonPrefixBytes,
    identicalSample: a.length === b.length && identicalPositions === common
  };
}

/**
 * Two distinct saves are required to evaluate whether byte-level differences
 * occur across saves. Even distinct files do not establish randomness,
 * encryption, player identity, or matching in-game semantic content.
 */
/**
 * Select comparable member pairs deterministically. Prefer identical stored
 * lengths and meaningful small metadata names; track omitted coverage so a
 * 32-pair sample cannot be mistaken for the full archive.
 */
export function selectComparableMembers(left, right, limit = MAX_COMPARE_MEMBERS) {
  if (!Array.isArray(left) || !Array.isArray(right) ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_COMPARE_MEMBERS) {
    throw new RangeError('Invalid bounded cross-save selection.');
  }
  const names = new Set();
  for (const member of right) {
    if (!member || typeof member.filename !== 'string' || names.has(member.filename))
      throw new RangeError('Duplicate or invalid member names in second save.');
    names.add(member.filename);
  }
  const available = new Map(right.map(member => [member.filename, member]));
  const shared = left.filter(member => available.has(member.filename));
  const priority = new Map([['game_info.dat', 0], ['save_game_summary.dat', 1]]);
  const comparable = shared.filter(member => member.storedBytes === available.get(member.filename).storedBytes);
  const differingStoredSizes = shared.length - comparable.length;
  const paired = comparable.sort((x, y) =>
    (priority.get(x.filename) ?? 2) - (priority.get(y.filename) ?? 2) ||
    x.storedBytes - y.storedBytes || x.filename.localeCompare(y.filename)).slice(0, limit);
  return {
    available, paired,
    coverage: {
      sharedNamedMembers: shared.length,
      differingStoredSizes,
      sameStoredSizeCandidates: comparable.length,
      selectedMembers: paired.length,
      omittedSameSizeCandidates: comparable.length - paired.length,
      leftOnlyMembers: left.length - shared.length,
      rightOnlyMembers: right.length - shared.length
    }
  };
}

export async function compareLocalAfeSaves(pathA, pathB) {
  const [fingerprintA, fingerprintB] = await Promise.all([
    fingerprint(pathA), fingerprint(pathB)
  ]);
  if (fingerprintA.bytes === fingerprintB.bytes &&
      fingerprintA.digest === fingerprintB.digest) {
    return { status: 'duplicate_input', identicalFiles: true,
      comparedMembers: 0, comparisons: [] };
  }
  const [a, b] = await Promise.all([
    inspectLocalArchive(pathA, { includeMemberIndex: true }),
    inspectLocalArchive(pathB, { includeMemberIndex: true })
  ]);
  if (a.status !== 'experimental_index' || b.status !== 'experimental_index') {
    return { status: 'unsupported_or_invalid_container', identicalFiles: false,
      comparedMembers: 0, comparisons: [] };
  }
  const selection = selectComparableMembers(a.memberIndex, b.memberIndex);
  const { available, paired, coverage } = selection;
  const [handleA, handleB] = await Promise.all([open(pathA, 'r'), open(pathB, 'r')]);
  try {
    // Sample separated regions: a shared header does not imply an equal body.
    // These comparisons remain samples, never a whole-member equality claim.
    const sampleWindows = storedBytes => {
      const length = Math.min(storedBytes, SAMPLE_BYTES);
      const positions = [
        0,
        Math.max(0, Math.floor((storedBytes - length) / 2)),
        Math.max(0, storedBytes - length)
      ];
      return [...new Set(positions)].map(offset => ({ offset, length }));
    };
    const readWindow = async (handle, member, window) => {
      const data = Buffer.alloc(window.length);
      const { bytesRead } = await handle.read(
        data, 0, data.length, DATA_BASE + member.offset + window.offset
      );
      if (bytesRead !== data.length) throw new Error('Incomplete compared member read.');
      return data;
    };
    // Hash the complete stored member in bounded chunks. Digests never leave
    // this function; the output records equality evidence only.
    const digestMember = async (handle, member) => {
      if (member.storedBytes > MAX_HASH_MEMBER_BYTES) return null;
      const hash = createHash('sha256');
      let consumed = 0;
      while (consumed < member.storedBytes) {
        const length = Math.min(HASH_CHUNK_BYTES, member.storedBytes - consumed);
        const block = Buffer.alloc(length);
        const { bytesRead } = await handle.read(
          block, 0, length, DATA_BASE + member.offset + consumed
        );
        if (bytesRead !== length) throw new Error('Incomplete full-member hash read.');
        hash.update(block);
        consumed += length;
      }
      return hash.digest('hex');
    };
    const comparisons = [];
    for (const memberA of paired) {
      const memberB = available.get(memberA.filename);
      const windowsA = sampleWindows(memberA.storedBytes);
      const windowsB = sampleWindows(memberB.storedBytes);
      const windowResults = [];
      for (let i = 0; i < Math.min(windowsA.length, windowsB.length); i++) {
        const [sampleA, sampleB] = await Promise.all([
          readWindow(handleA, memberA, windowsA[i]),
          readWindow(handleB, memberB, windowsB[i])
        ]);
        windowResults.push({ region: i === 0 ? 'start' :
          i === windowsA.length - 1 ? 'end' : 'middle',
          ...compareMemberSamples(sampleA, sampleB) });
      }
      let completeMemberHashMatch = null;
      if (memberA.storedBytes === memberB.storedBytes &&
          memberA.storedBytes <= MAX_HASH_MEMBER_BYTES) {
        const [digestA, digestB] = await Promise.all([
          digestMember(handleA, memberA), digestMember(handleB, memberB)
        ]);
        completeMemberHashMatch = digestA === digestB;
      }
      comparisons.push({
        filename: memberA.filename,
        completeMemberHashMatch,
        fullMemberHashAlgorithm: completeMemberHashMatch === null ? null : 'SHA-256',
        sameStoredLength: memberA.storedBytes === memberB.storedBytes,
        sameReportedLength: memberA.reportedUncompressedBytes === memberB.reportedUncompressedBytes,
        evidence: 'sample_only',
        sampledRegions: windowResults,
        allComparedSamplesIdentical: windowsA.length === windowsB.length &&
          windowResults.every(region => region.identicalSample)
      });
    }
    return {
      status: 'different_files',
      identicalFiles: false,
      indexedMembersA: a.totalIndexedMembers,
      indexedMembersB: b.totalIndexedMembers,
      ...coverage,
      comparedMembers: comparisons.length,
      comparisons
    };
  } finally {
    await Promise.all([handleA.close(), handleB.close()]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [first, second] = process.argv.slice(2);
  if (!first || !second) {
    console.error('Usage: node scripts/afe-cross-save.mjs <first-local.fm> <second-local.fm>');
    process.exitCode = 2;
  } else {
    compareLocalAfeSaves(first, second)
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
