import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inspectLocalArchive } from './afe-batch-codec.mjs';

const MAX_INPUT_BYTES = 256 * 1024 * 1024;
const MAX_COMPARE_MEMBERS = 32;
const SAMPLE_BYTES = 64;
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
  const available = new Map(b.memberIndex.map(member => [member.filename, member]));
  const paired = a.memberIndex.filter(member => available.has(member.filename))
    .sort((left, right) => left.storedBytes - right.storedBytes ||
      left.filename.localeCompare(right.filename)).slice(0, MAX_COMPARE_MEMBERS);
  const [handleA, handleB] = await Promise.all([open(pathA, 'r'), open(pathB, 'r')]);
  try {
    const read = async (handle, member) => {
      const length = Math.min(member.storedBytes, SAMPLE_BYTES);
      const data = Buffer.alloc(length);
      const { bytesRead } = await handle.read(data, 0, length, DATA_BASE + member.offset);
      if (bytesRead !== length) throw new Error('Incomplete compared member read.');
      return data;
    };
    const comparisons = [];
    for (const memberA of paired) {
      const memberB = available.get(memberA.filename);
      const [sampleA, sampleB] = await Promise.all([
        read(handleA, memberA), read(handleB, memberB)
      ]);
      comparisons.push({
        filename: memberA.filename,
        sameStoredLength: memberA.storedBytes === memberB.storedBytes,
        sameReportedLength: memberA.reportedUncompressedBytes === memberB.reportedUncompressedBytes,
        ...compareMemberSamples(sampleA, sampleB)
      });
    }
    return {
      status: 'different_files',
      identicalFiles: false,
      indexedMembersA: a.totalIndexedMembers,
      indexedMembersB: b.totalIndexedMembers,
      sharedNamedMembers: a.memberIndex.filter(member => available.has(member.filename)).length,
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
