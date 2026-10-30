import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { inspectLocalArchive, parseObservedDirectory, parseObservedDirectoryDetails, selectCodecProbeMembers, observedAfeDirectoryMarkerOffset } from './afe-batch-codec.mjs';

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

test('prioritizes actual small summary files and then smaller members regardless of catalogue order', () => {
  const members = [
    { filename: 'huge.dat', storedBytes: 300000, reportedUncompressedBytes: 20 },
    { filename: 'other.dat', storedBytes: 20, reportedUncompressedBytes: 25 },
    { filename: 'save_game_summary.dat', storedBytes: 141, reportedUncompressedBytes: 170 },
    { filename: 'small.dat', storedBytes: 9, reportedUncompressedBytes: 13 },
    { filename: 'game_info.dat', storedBytes: 2702, reportedUncompressedBytes: 2651 }
  ];
  const chosen = selectCodecProbeMembers(members, 3).map(member => member.filename);
  assert.deepEqual(chosen, ['game_info.dat', 'save_game_summary.dat', 'small.dat']);
  assert.equal(selectCodecProbeMembers(members).some(member => member.filename === 'huge.dat'), false);
  assert.throws(() => selectCodecProbeMembers(members, 17), RangeError);
});

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
    assert.equal(result.unparsedDirectoryBytes, 0);
    assert.ok(result.parsedDirectoryBytes > 0);
    assert.equal(result.inspectedMembers, 1);
    assert.equal(result.rawLz4Probes.length, 1);
    assert.equal(result.rawLz4Probes[0].status, 'unsupported_codec');
    assert.equal(Object.hasOwn(result.rawLz4Probes[0], 'payload'), false);
    assert.equal(result.validatedDecodes.length, 1);
    assert.equal(result.validatedDecodes[0].status, 'validated_stream');
    assert.equal(result.validatedDecodes[0].codec, 'zlib');
    assert.equal(Object.hasOwn(result.validatedDecodes[0], 'payload'), false);
    assert.equal(result.directoryOffset, 18 + member.length);
    assert.ok(result.trials.some(t => t.codec === 'deflate' && t.skip === 8 &&
      t.result === 'candidate_only' && t.inputBytes === member.length - 8));
    assert.equal(JSON.stringify(result).includes('DDDDDDDD'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('index-only mode returns validated member locations without probing payload diagnostics', async () => {
  const member = Buffer.concat([prefix, Buffer.alloc(110, 0x51)]);
  const file = Buffer.concat([
    Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12), member,
    trailer, deflateSync(makeDirectory(member))
  ]);
  const dir = await mkdtemp(join(tmpdir(), 'afe-index-only-'));
  const path = join(dir, 'synthetic.fm');
  try {
    await writeFile(path, file);
    const index = await inspectLocalArchive(path, { indexOnly: true, includeMemberIndex: true });
    assert.equal(index.status, 'experimental_index');
    assert.equal(index.memberCount, 1);
    assert.deepEqual(index.memberIndex, [{
      filename: 'summary.dat', offset: 0,
      storedBytes: member.length, reportedUncompressedBytes: 100
    }]);
    assert.equal('trials' in index, false);
    assert.equal('envelopeCensus' in index, false);
    assert.equal('gapAudit' in index, false);
    assert.equal('framedCodecSignatures' in index, false);
    const privateIndex = await inspectLocalArchive(path, { indexOnly: true });
    assert.equal('memberIndex' in privateIndex, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resolves genuine AFE header pointer relationship and verifies catalogue', async () => {
  const member = Buffer.concat([prefix, deflateSync(Buffer.alloc(100, 0x44))]);
  const markerOffset = 18 + member.length;
  const header = Buffer.concat([
    Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12)
  ]);
  header.writeUInt32LE(markerOffset - 9, 9);
  const file = Buffer.concat([header, member, trailer, deflateSync(makeDirectory(member))]);
  assert.equal(observedAfeDirectoryMarkerOffset(header, file.length), markerOffset);
  const dir = await mkdtemp(join(tmpdir(), 'afe-direct-pointer-'));
  const path = join(dir, 'direct.fm');
  try {
    await writeFile(path, file);
    const index = await inspectLocalArchive(path, { indexOnly: true });
    assert.equal(index.status, 'experimental_index');
    assert.equal(index.directoryLocator, 'header_pointer');
    assert.equal(index.directoryOffset, markerOffset);
    assert.equal(index.totalIndexedMembers, 1);

    // A pointer is only an untrusted hint, not sufficient to accept a file.
    const badHeader = Buffer.from(header);
    badHeader.writeUInt32LE(markerOffset - 8, 9);
    await writeFile(path, Buffer.concat([badHeader, member, trailer, deflateSync(makeDirectory(member))]));
    const fallback = await inspectLocalArchive(path, { indexOnly: true });
    assert.equal(fallback.status, 'experimental_index');
    assert.equal(fallback.directoryLocator, 'tail_scan');
    assert.equal(fallback.directoryOffset, markerOffset);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects malformed header pointer candidates', () => {
  const header = Buffer.concat([Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12)]);
  assert.equal(observedAfeDirectoryMarkerOffset(header, 100), null);
  header.writeUInt32LE(1000, 9);
  assert.equal(observedAfeDirectoryMarkerOffset(header, 100), null);
  assert.equal(observedAfeDirectoryMarkerOffset(Buffer.alloc(18), 100), null);
  assert.equal(observedAfeDirectoryMarkerOffset(header.subarray(0, 10), 100), null);
});

test('decodes a nested named catalogue and accounts for its last four zero bytes', () => {
  const root = makeDirectory(Buffer.alloc(20));
  const parts = [];
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); parts.push(b); };
  const name = value => { u32(value.length); parts.push(Buffer.from(value, 'utf16le'), Buffer.alloc(2)); };
  u32(1);
  name('rgman');
  u32(2);
  name('rgman'); name('.dat'); u32(20); u32(10); u32(35);
  name('player_stats'); name('.dat'); u32(30); u32(30); u32(100);
  u32(0);
  const directory = Buffer.concat([root, ...parts]);
  const parsed = parseObservedDirectoryDetails(directory, 60);
  assert.equal(parsed?.members.length, 1);
  assert.equal(parsed?.groups[0]?.groupName, 'rgman');
  assert.equal(parsed?.groups[0]?.members.length, 2);
  assert.equal(parsed?.allMembers.length, 3);
  assert.equal(parsed?.trailingBytes, 4);
  assert.equal(parsed?.parsedBytes, directory.length - 4);

  const overlapping = Buffer.from(directory);
  // Another group member with a duplicate name must never be accepted.
  assert.equal(parseObservedDirectoryDetails(overlapping, 55), null);
  assert.equal(parseObservedDirectoryDetails(Buffer.concat([directory, Buffer.from([2])]), 60), null);
});


test('rejects duplicate or overlapping members in synthetic index', () => {
  const member = Buffer.alloc(48);
  const ordinary = makeDirectory(member);
  assert.equal(parseObservedDirectory(ordinary, 48)?.length, 1);
  assert.equal(parseObservedDirectory(ordinary, 20), null);
  assert.equal(parseObservedDirectory(Buffer.alloc(4), 48), null);
});

test('rejects a valid-looking trailing directory in a non-AFE container', async () => {
  const member = Buffer.concat([prefix, deflateSync(Buffer.alloc(100, 0x44))]);
  const file = Buffer.concat([
    Buffer.alloc(18, 0), member, trailer, deflateSync(makeDirectory(member))
  ]);
  const dir = await mkdtemp(join(tmpdir(), 'afe-research-'));
  const path = join(dir, 'not-afe.fm');
  try {
    await writeFile(path, file);
    const result = await inspectLocalArchive(path);
    assert.equal(result.status, 'not_recognized');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects an otherwise valid directory stream with appended junk', async () => {
  const member = Buffer.concat([prefix, deflateSync(Buffer.alloc(100, 0x44))]);
  const file = Buffer.concat([
    Buffer.from([2, 1, 97, 102, 101, 46]), Buffer.alloc(12), member,
    trailer, deflateSync(makeDirectory(member)), Buffer.from([0xde, 0xad, 0xbe, 0xef])
  ]);
  const dir = await mkdtemp(join(tmpdir(), 'afe-research-'));
  const path = join(dir, 'trailing.fm');
  try {
    await writeFile(path, file);
    const result = await inspectLocalArchive(path);
    assert.equal(result.status, 'not_recognized');
    assert.equal(result.trials.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
