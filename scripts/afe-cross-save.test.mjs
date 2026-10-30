import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareMemberSamples, compareLocalAfeSaves } from './afe-cross-save.mjs';

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
