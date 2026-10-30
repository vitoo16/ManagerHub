import { test } from 'node:test';
import assert from 'node:assert/strict';
import { censusMemberEnvelopes } from './afe-envelope-census.mjs';

const common = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
const different = Buffer.from([32, 0, 0, 0, 16, 0, 0, 0]);

test('counts full catalogue envelopes by primary and nested group', async () => {
  const data = Buffer.concat([common, different, common, Buffer.from([1, 2, 3])]);
  const members = [
    { filename: 'primary.dat', offset: 0, storedBytes: 8 },
    { filename: 'rgman1.dat', offset: 8, storedBytes: 8 },
    { filename: 'rgman2.dat', offset: 16, storedBytes: 8 },
    { filename: 'short.dat', offset: 24, storedBytes: 3 }
  ];
  const handle = {
    async read(out, _off, count, position) {
      const bytesRead = data.copy(out, 0, position, position + count);
      return { bytesRead };
    }
  };
  const result = await censusMemberEnvelopes(handle, members, [
    { name: 'rgman', members: [members[1], members[2], members[3]] }
  ], 0);
  assert.equal(result.indexed, 4);
  assert.equal(result.sampled, 3);
  assert.equal(result.skippedShort, 1);
  assert.equal(result.bytesRead, 24);
  assert.deepEqual(result.groups.map(group => [group.group, group.indexed, group.sampled]),
    [['primary', 1, 1], ['rgman', 3, 2]]);
  assert.equal(result.groups[1].headerFrequencies.length, 2);
  assert.equal(JSON.stringify(result).includes('filename'), false);
});

test('rejects malformed ranges, duplicate group assignment, and short reads', async () => {
  const member = { offset: 0, storedBytes: 8 };
  const reader = { async read() { return { bytesRead: 0 }; } };
  await assert.rejects(censusMemberEnvelopes(reader, [member], [], 0), /Short read/);
  await assert.rejects(censusMemberEnvelopes(reader, [{ offset: -1, storedBytes: 8 }], [], 0), RangeError);
  await assert.rejects(censusMemberEnvelopes(reader, [member],
    [{ name: 'a', members: [member] }, { name: 'b', members: [member] }], 0), RangeError);
  await assert.rejects(censusMemberEnvelopes(reader,
    Array.from({ length: 4097 }, () => member), [], 0), RangeError);
});
