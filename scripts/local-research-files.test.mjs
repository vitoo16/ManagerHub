import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, open, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { readBoundedRegularFile, readBoundedUtf8File } from './local-research-files.mjs';

async function temporary(run) {
  const directory = await mkdtemp(join(tmpdir(), 'mh-local-read-'));
  try { await run(directory); } finally {
    const target = resolve(directory);
    assert.equal(dirname(target), resolve(tmpdir())); assert.match(basename(target), /^mh-local-read-[A-Za-z0-9]+$/u);
    await rm(target, { recursive: true, force: true });
  }
}

test('bounded readers preserve exact bytes and decode UTF-8 without mutating source', async () => temporary(async directory => {
  const file = join(directory, 'sample.json'), original = Buffer.from('Synthetic Việt fixture\n');
  await writeFile(file, original);
  assert.deepEqual(await readBoundedRegularFile(file, original.length), original);
  const result = await readBoundedUtf8File(file, original.length);
  assert.deepEqual(result.bytes, original); assert.equal(result.text, original.toString('utf8'));
  assert.deepEqual(await readBoundedRegularFile(file, original.length), original);
  await rm(file); // Confirms the handle has been closed, including on Windows.
}));

test('bounded readers reject missing, non-regular, empty, oversized and invalid UTF-8 inputs', async () => temporary(async directory => {
  const file = join(directory, 'sample.bin');
  await assert.rejects(readBoundedRegularFile(file, 4));
  await mkdir(join(directory, 'child')); await assert.rejects(readBoundedRegularFile(join(directory, 'child'), 4));
  await writeFile(file, Buffer.alloc(0)); await assert.rejects(readBoundedRegularFile(file, 4));
  const handle = await open(file, 'w'); try { await handle.truncate(65); } finally { await handle.close(); }
  await assert.rejects(readBoundedRegularFile(file, 64));
  await writeFile(file, Buffer.from([0xff, 0x61]));
  assert.deepEqual(await readBoundedRegularFile(file, 2), Buffer.from([0xff, 0x61]));
  await assert.rejects(readBoundedUtf8File(file, 2));
  for (const limit of [0, -1, 1.5, NaN, Infinity, 1_073_741_825]) await assert.rejects(readBoundedRegularFile(file, limit), RangeError);
  await rm(file);
}));
