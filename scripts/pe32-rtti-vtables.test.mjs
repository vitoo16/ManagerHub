import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { findPe32RttiVtables } from './pe32-rtti-vtables.mjs';

const selection = { decoratedName: '.?AVSYNTHETIC_PLAYER@@', subobjectOffset: 356 };
function fixture() {
  const bytes = Buffer.alloc(0xc00), u16 = (p, v) => bytes.writeUInt16LE(v, p), u32 = (p, v) => bytes.writeUInt32LE(v, p);
  u16(0, 0x5a4d); u32(0x3c, 0x80); u32(0x80, 0x4550); u16(0x84, 0x14c); u16(0x86, 3); u16(0x94, 0xe0);
  u16(0x98, 0x10b); u32(0x98 + 28, 0x400000); u32(0x98 + 56, 0x4000);
  for (const [i, rva, size, raw, flags] of [[0, 0x1000, 0x200, 0x400, 0x60000020],
    [1, 0x2000, 0x400, 0x600, 0x40000040], [2, 0x3000, 0x200, 0xa00, 0xc0000040]]) {
    const p = 0x178 + i * 40;
    u32(p + 8, size); u32(p + 12, rva); u32(p + 16, size); u32(p + 20, raw); u32(p + 36, flags);
  }
  bytes.write(selection.decoratedName + '\0', 0xa08, 'ascii');
  u32(0x700, 0); u32(0x704, 356); u32(0x708, 4); u32(0x70c, 0x403000); u32(0x710, 0x402200);
  u32(0x800, 0); u32(0x804, 0); u32(0x808, 1); u32(0x80c, 0x402240);
  u32(0x840, 0x402280); u32(0x880, 0x403000);
  u32(0x620, 0x402100); [0, 4, 8].forEach((offset, i) => u32(0x624 + offset, 0x401000 + i * 4));
  return bytes;
}

test('finds a name-to-locator-to-vtable chain with distinct file offsets and RVAs without mutation', () => {
  const bytes = fixture(), before = Buffer.from(bytes), result = findPe32RttiVtables(bytes, selection);
  assert.deepEqual(bytes, before); assert.equal(result.fileSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(result.runtimeVerified, false); assert.equal(result.typeDescriptorCount, 1); assert.equal(result.locatorCount, 1);
  assert.deepEqual(result.candidates, [{ decoratedName: selection.decoratedName, subobjectOffset: 356,
    locatorRva: 0x2100, typeDescriptorRva: 0x3000, hierarchyRva: 0x2200, constructorDisplacement: 4,
    markerRva: 0x2024, markerFileOffset: 0x624, firstFunctionRvas: [0x1000, 0x1004, 0x1008] }]);
});

test('does not classify names, fake hierarchy references or data pointers as vtables', () => {
  assert.equal(findPe32RttiVtables(fixture(), { ...selection, decoratedName: '.?AVMISSING@@' }).candidates.length, 0);
  for (const [offset, word] of [[0x704, 360], [0x880, 0x403004], [0x624, 0x403000], [0x710, 0xffffffff]]) {
    const bytes = fixture(); bytes.writeUInt32LE(word, offset);
    assert.equal(findPe32RttiVtables(bytes, selection).candidates.length, 0);
  }
});

test('returns ambiguity explicitly rather than choosing the first plausible marker', () => {
  const bytes = fixture(); bytes.copy(bytes, 0x640, 0x620, 0x630);
  assert.equal(findPe32RttiVtables(bytes, selection).candidates.length, 2);
});

test('rejects truncated, wrong-architecture, overlapping and out-of-file PE layouts', () => {
  for (const length of [0, 63, 0x90, 0x180, 0xbff]) assert.throws(() => findPe32RttiVtables(fixture().subarray(0, length), selection), RangeError);
  for (const [offset, value] of [[0x84, 0x8664], [0x98, 0x20b], [0x178 + 40 + 20, 0x400],
    [0x178 + 40 + 12, 0x1000], [0x178 + 20, 0xfffffff0], [0x98 + 56, 0x1000]]) {
    const bytes = fixture(); bytes.writeUInt32LE(value, offset);
    assert.throws(() => findPe32RttiVtables(bytes, selection), RangeError);
  }
  assert.throws(() => findPe32RttiVtables(fixture(), { ...selection, decoratedName: 'unbounded\0name' }), RangeError);
});
