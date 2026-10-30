import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareMemberSamples, compareLocalAfeSaves, selectComparableMembers } from './afe-cross-save.mjs';
import { deflateSync } from 'node:zlib';

test('bounded comparison distinguishes shared envelope from different payloads', () => {
  const a = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0, 1, 2, 3]);
  const b = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0, 4, 5, 6]);
  assert.deepEqual(compareMemberSamples(a, b), {
    comparedBytes: 11, sameSampleLength: true, identicalPositions: 8,
    commonPrefixBytes: 8, identicalSample: false
  });
  assert.equal(compareMemberSamples(a, a).identicalSample, true);
  assert.equal(compareMemberSamples(a, a.subarray(0, 8)).identicalSample, false);
});

test('duplicate private-save copies are stopped before archive probing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'afe-cross-save-'));
  const first = join(dir, 'first.fm');
  const second = join(dir, 'copy.fm');
  try {
    // Purely synthetic bytes. Deliberately no real FM fixture.
    await writeFile(first, Buffer.alloc(128, 0x63));
    await writeFile(second, Buffer.alloc(128, 0x63));
    const result = await compareLocalAfeSaves(first, second);
    assert.deepEqual(result, {
      status: 'duplicate_input', identicalFiles: true,
      comparedMembers: 0, comparisons: []
    });
    await writeFile(second, Buffer.alloc(128, 0x64));
    const distinct = await compareLocalAfeSaves(first, second);
    assert.equal(distinct.status, 'unsupported_or_invalid_container');
    assert.equal(distinct.comparedMembers, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects malformed or oversized byte samples', () => {
  assert.throws(() => compareMemberSamples(Buffer.alloc(65), Buffer.alloc(3)), RangeError);
  assert.throws(() => compareMemberSamples(Buffer.alloc(0), Buffer.alloc(3)), RangeError);
});

test('compares two distinct, synthetically indexed AFE archives end to end', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'afe-pair-fixture-'));
  const first = join(dir, 'one.fm'), second = join(dir, 'two.fm');
  const make = tail => {
    const member = Buffer.concat([
      Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]),
      Buffer.from([1, 2, 3, 4]), Buffer.from([tail])
    ]);
    const chunks = [];
    const u32 = value => {
      const b = Buffer.alloc(4); b.writeUInt32LE(value); chunks.push(b);
    };
    const name = value => {
      u32(value.length); chunks.push(Buffer.from(value, 'utf16le'), Buffer.alloc(2));
    };
    u32(0); u32(1); name('game_info'); name('.dat');
    u32(0); u32(member.length); u32(30);
    return Buffer.concat([
      Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12), member,
      Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]),
      deflateSync(Buffer.concat(chunks))
    ]);
  };
  try {
    await writeFile(first, make(0x45));
    await writeFile(second, make(0x66));
    const report = await compareLocalAfeSaves(first, second);
    assert.equal(report.status, 'different_files');
    assert.equal(report.indexedMembersA, 1);
    assert.equal(report.indexedMembersB, 1);
    assert.equal(report.comparedMembers, 1);
    assert.equal(report.comparisons[0].filename, 'game_info.dat');
    assert.equal(report.comparisons[0].evidence, 'sample_only');
    assert.equal(report.comparisons[0].sampledRegions[0].commonPrefixBytes, 12);
    assert.equal(report.comparisons[0].allComparedSamplesIdentical, false);
    assert.equal(report.comparisons[0].completeMemberHashMatch, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('stratified samples find differences beyond a shared 64-byte prefix', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'afe-stratified-'));
  const first = join(dir, 'first.fm'), second = join(dir, 'second.fm');
  const make = lastByte => {
    const member = Buffer.alloc(320, 0x42);
    Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]).copy(member);
    member[319] = lastByte;
    const parts = [];
    const u32 = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value); parts.push(b); };
    const name = value => { u32(value.length); parts.push(Buffer.from(value, 'utf16le'), Buffer.alloc(2)); };
    u32(0); u32(1); name('metadata'); name('.dat');
    u32(0); u32(member.length); u32(360);
    return Buffer.concat([
      Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12),
      member, Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]),
      deflateSync(Buffer.concat(parts))
    ]);
  };
  try {
    await writeFile(first, make(0x57));
    await writeFile(second, make(0x72));
    const report = await compareLocalAfeSaves(first, second);
    assert.equal(report.status, 'different_files');
    const compared = report.comparisons[0];
    assert.equal(compared.sampledRegions.length, 3);
    assert.equal(compared.sampledRegions[0].identicalSample, true);
    assert.equal(compared.sampledRegions[1].identicalSample, true);
    assert.equal(compared.sampledRegions[2].identicalSample, false);
    assert.equal(compared.allComparedSamplesIdentical, false);
    assert.equal(compared.evidence, 'sample_only');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('full-member hash detects changes missed by all sampled windows', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'afe-full-member-hash-'));
  const first = join(dir, 'one.fm'), second = join(dir, 'two.fm');
  const make = value => {
    const member = Buffer.alloc(320, 0x42);
    Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]).copy(member);
    member[100] = value; // Outside start [0,64), middle [128,192), end [256,320).
    const parts = [];
    const u32 = number => {
      const buf = Buffer.alloc(4); buf.writeUInt32LE(number); parts.push(buf);
    };
    const name = str => { u32(str.length); parts.push(Buffer.from(str, 'utf16le'), Buffer.alloc(2)); };
    u32(0); u32(1); name('metadata'); name('.dat');
    u32(0); u32(member.length); u32(360);
    return Buffer.concat([
      Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12), member,
      Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]),
      deflateSync(Buffer.concat(parts))
    ]);
  };
  try {
    await writeFile(first, make(0x51));
    await writeFile(second, make(0x72));
    const result = await compareLocalAfeSaves(first, second);
    assert.equal(result.status, 'different_files');
    const member = result.comparisons[0];
    assert.equal(member.allComparedSamplesIdentical, true);
    assert.equal(member.completeMemberHashMatch, false);
    assert.equal(member.fullMemberHashAlgorithm, 'SHA-256');
    assert.equal(JSON.stringify(result).includes('sha256:'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('does not compare mismatched stored lengths and reports complete selection coverage', () => {
  const left = [
    { filename: 'a.dat', storedBytes: 15 },
    { filename: 'game_info.dat', storedBytes: 420 },
    { filename: 'save_game_summary.dat', storedBytes: 120 },
    { filename: 'unchanged.dat', storedBytes: 28 },
    { filename: 'left-only.dat', storedBytes: 40 }
  ];
  const right = [
    { filename: 'a.dat', storedBytes: 16 },
    { filename: 'game_info.dat', storedBytes: 420 },
    { filename: 'save_game_summary.dat', storedBytes: 120 },
    { filename: 'unchanged.dat', storedBytes: 28 },
    { filename: 'right-only.dat', storedBytes: 40 }
  ];
  const result = selectComparableMembers(left, right, 2);
  assert.deepEqual(result.paired.map(member => member.filename),
    ['game_info.dat', 'save_game_summary.dat']);
  assert.deepEqual(result.coverage, {
    sharedNamedMembers: 4,
    differingStoredSizes: 1,
    sameStoredSizeCandidates: 3,
    selectedMembers: 2,
    omittedSameSizeCandidates: 1,
    leftOnlyMembers: 1,
    rightOnlyMembers: 1
  });
  assert.throws(() => selectComparableMembers(left, [right[0], right[0]]), RangeError);
  assert.throws(() => selectComparableMembers(left, right, 33), RangeError);
});

test('prioritizes supported metadata names even when other entries are smaller', () => {
  const left = Array.from({ length: 50 }, (_, i) => ({
    filename: 'comp_' + i + '.dat', storedBytes: 16
  }));
  left.push({ filename: 'game_info.dat', storedBytes: 2500 });
  left.push({ filename: 'save_game_summary.dat', storedBytes: 140 });
  const result = selectComparableMembers(left, left);
  assert.equal(result.paired.length, 32);
  assert.deepEqual(result.paired.slice(0, 2).map(member => member.filename),
    ['game_info.dat', 'save_game_summary.dat']);
  assert.equal(result.coverage.omittedSameSizeCandidates, 20);
});
