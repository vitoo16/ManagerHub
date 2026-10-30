import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { inspectLocalArchive, parseObservedDirectory } from './afe-batch-codec.mjs';

const prefix = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
const trailer = Buffer.from([2, 1, 102, 109, 102, 46, 4, 0, 0]);
function makeDirectory(member) {
  const chunks = [];
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); chunks.push(b); };
  const name = text => {
    u32(text.length);
    chunks.push(Buffer.from(text, 'utf16le'), Buffer.alloc(2));
  };
  u32(0); u32(1);
  name('summary'); name('.dat');
  u32(0); u32(member.length); u32(100);
  return Buffer.concat(chunks);
}

test('bounded batch discovers one synthetic catalogue and reports metadata only', async () => {
  const member = Buffer.concat([prefix, deflateSync(Buffer.alloc(100, 0x44))]);
  const file = Buffer.concat([
    Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12), member,
    trailer, deflateSync(makeDirectory(member))
  ]);
  const dir = await mkdtemp(join(tmpdir(), 'afe-research-'));
  const path = join(dir, 'synthetic.fm');
  try {
    await writeFile(path, file);
    const result = await inspectLocalArchive(path);
    assert.equal(result.status, 'experimental_index');
    assert.equal(result.memberCount, 1);
    assert.equal(result.inspectedMembers, 1);
    assert.equal(result.directoryOffset, 18 + member.length);
    assert.ok(result.trials.some(t => t.codec === 'deflate' && t.skip === 8 &&
      t.result === 'candidate_only' && t.inputBytes === member.length - 8));
    assert.equal(JSON.stringify(result).includes('DDDDDDDD'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects duplicate or overlapping members in synthetic index', () => {
  const member = Buffer.alloc(48);
  const ordinary = makeDirectory(member);
  assert.equal(parseObservedDirectory(ordinary, 48)?.length, 1);
  assert.equal(parseObservedDirectory(ordinary, 20), null);
  assert.equal(parseObservedDirectory(Buffer.alloc(4), 48), null);
});

test('does not claim archive support for non-AFE bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'afe-research-'));
  const path = join(dir, 'random.fm');
  try {
    await writeFile(path, Buffer.alloc(4096, 0xab));
    const result = await inspectLocalArchive(path);
    assert.equal(result.status, 'not_recognized');
    assert.equal(result.trials.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
