import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { inspectOfflinePe32RttiPairs, inspectPinnedFm2013FileRtti } from './fm2013-rtti-evidence.mjs';

const kinds = {
  player: { decoratedName: '.?AVACTUAL_PLAYER@@', personOffset: 356 },
  playerStaff: { decoratedName: '.?AVACTUAL_PLAYER_AND_NON_PLAYER@@', personOffset: 452 },
};
function fixture() {
  const b = Buffer.alloc(0xc00);
  const u16 = (p, v) => b.writeUInt16LE(v, p);
  const u32 = (p, v) => b.writeUInt32LE(v, p);
  u16(0, 0x5a4d); u32(0x3c, 0x80); u32(0x80, 0x4550);
  u16(0x84, 0x14c); u16(0x86, 3); u16(0x94, 0xe0);
  u16(0x98, 0x10b); u32(0x98 + 28, 0x400000); u32(0x98 + 56, 0x4000);
  for (const [i, rva, size, raw, flags] of [[0, 0x1000, 0x200, 0x400, 0x60000020],
    [1, 0x2000, 0x400, 0x600, 0x40000040],
    [2, 0x3000, 0x200, 0xa00, 0xc0000040]]) {
    const p = 0x178 + i * 40;
    u32(p + 8, size); u32(p + 12, rva); u32(p + 16, size);
    u32(p + 20, raw); u32(p + 36, flags);
  }
  b.write(kinds.player.decoratedName + '\0', 0xa08, 'ascii');
  b.write(kinds.playerStaff.decoratedName + '\0', 0xa88, 'ascii');
  // Player: COL, class hierarchy, base-class array and vtable
  u32(0x700, 0); u32(0x704, 356); u32(0x708, 4); u32(0x70c, 0x403000);
  u32(0x710, 0x402200); u32(0x800, 0); u32(0x804, 0);
  u32(0x808, 1); u32(0x80c, 0x402240);
  u32(0x840, 0x402280); u32(0x880, 0x403000);
  u32(0x620, 0x402100); [0, 4, 8].forEach((n, i) => u32(0x624 + n, 0x401000 + i * 4));
  // PlayerStaff: a distinct COL with the real dual-class subobject offset
  u32(0x730, 0); u32(0x734, 452); u32(0x738, 4); u32(0x73c, 0x403080);
  u32(0x740, 0x402220); u32(0x820, 0); u32(0x824, 0);
  u32(0x828, 1); u32(0x82c, 0x402260);
  u32(0x860, 0x4022a0); u32(0x8a0, 0x403080);
  u32(0x650, 0x402130); [0, 4, 8].forEach((n, i) => u32(0x654 + n, 0x401000 + i * 4));
  return b;
}
const sha = b => createHash('sha256').update(b).digest('hex');
const expectation = b => ({ sha256: sha(b), nativeKinds: kinds });

test('accepts both exact FM2013 native class pairs as file-only evidence, never runtime proof', () => {
  const bytes = fixture(), before = Buffer.from(bytes);
  const proof = inspectOfflinePe32RttiPairs(bytes, expectation(bytes));
  assert.deepEqual(bytes, before);
  assert.equal(proof.status, 'file_rtti_candidates');
  assert.equal(proof.runtimeVerified, false);
  assert.equal(proof.scope, 'offline_pe32_only');
  assert.deepEqual(proof.kinds.map(k => [k.nativeKind, k.decoratedName, k.personOffset, [...k.markerRvas]]), [
    ['player', '.?AVACTUAL_PLAYER@@', 356, [0x2024]],
    ['playerStaff', '.?AVACTUAL_PLAYER_AND_NON_PLAYER@@', 452, [0x2054]],
  ]);
  assert.ok(Object.isFrozen(proof));
  assert.ok(Object.isFrozen(proof.kinds));
});
test('the pinned FM2013 entry point never accepts a synthetic binary or arbitrary hash', () => {
  assert.equal(inspectPinnedFm2013FileRtti(fixture()).reason, 'image_hash_mismatch');
  const b = fixture(); b[0x624] ^= 1;
  assert.equal(inspectOfflinePe32RttiPairs(b, { sha256: sha(fixture()), nativeKinds: kinds }).reason,
    'image_hash_mismatch');
});
test('wrong actual class name, swapped subobject displacement and missing RTTI fail closed', () => {
  const b = fixture();
  for (const nativeKinds of [
    { ...kinds, playerStaff: { ...kinds.playerStaff, decoratedName: '.?AVACTUAL_PLAYER_STAFF@@' } },
    { ...kinds, playerStaff: { ...kinds.playerStaff, personOffset: 356 } },
    { ...kinds, player: kinds.playerStaff },
  ]) assert.notEqual(inspectOfflinePe32RttiPairs(b, { sha256: sha(b), nativeKinds }).status, 'file_rtti_candidates');
  const wrong = fixture(); wrong.writeUInt32LE(448, 0x734);
  assert.equal(inspectOfflinePe32RttiPairs(wrong, expectation(wrong)).reason, 'rtti_missing');
});
test('ambiguity is visible; no arbitrary first-vtable selection', () => {
  const b = fixture();
  b.copy(b, 0x680, 0x650, 0x660);
  const result = inspectOfflinePe32RttiPairs(b, expectation(b));
  assert.equal(result.status, 'file_rtti_candidates');
  assert.equal(result.kinds[1].ambiguous, true);
  assert.deepEqual([...result.kinds[1].markerRvas], [0x2054, 0x2084]);
});
test('reject malformed image and caller-provided malformed profile', () => {
  assert.equal(inspectOfflinePe32RttiPairs(Buffer.alloc(10), expectation(fixture())).reason, 'invalid_image');
  assert.equal(inspectOfflinePe32RttiPairs(fixture(), { nativeKinds: kinds }).reason, 'invalid_profile');
  assert.equal(inspectOfflinePe32RttiPairs(fixture(), { sha256: sha(fixture()), nativeKinds: {
    player: kinds.player, playerStaff: kinds.player,
  } }).reason, 'invalid_profile');
});
