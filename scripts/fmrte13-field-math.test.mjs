import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { decodeAbilityWord, encodeAbilityWord, decodeAttributeByte, encodeAttributeByte } from './fmrte13-field-math.mjs';

test('matches retained outputs of the separate file-backed CIL interpreter', () => {
  const fixture = JSON.parse(readFileSync(new URL('../docs/research/fmrte/field-math-vectors.json', import.meta.url), 'utf8'));
  assert.equal(fixture.vectors.length, 90);
  for (const v of fixture.vectors) {
    assert.equal(decodeAbilityWord(v.rawWord, 0x200000 + v.key, v.mode, v.field), v.decoded);
    assert.equal(encodeAbilityWord(v.encodeInput, 0x200000 + v.key, v.mode, v.field), v.encoded);
  }
});

test('every 16-bit word round-trips in six recovered paths at all address nibble keys', () => {
  for (const field of ['ca', 'pa']) {
    for (const mode of [0, 1, 3]) {
      for (let key = 0; key < 16; key++) {
        for (let word = 0; word <= 0xffff; word++) {
          const decoded = decodeAbilityWord(word, 0x100000 + key, mode, field);
          const encoded = encodeAbilityWord(decoded, 0x100000 + key, mode, field);
          if (encoded !== word) assert.fail(`${field}/${mode}/${key}/${word}: ${encoded}`);
        }
      }
    }
  }
});

test('address uses the effective field address and only its low nibble', () => {
  assert.equal(decodeAbilityWord(0xabcd, 0x10000003, 0, 'ca'), decodeAbilityWord(0xabcd, 3, 0, 'ca'));
  assert.notEqual(decodeAbilityWord(0xabcd, 3, 0, 'ca'), decodeAbilityWord(0xabcd, 4, 0, 'ca'));
});

test('unresolved modes, field identities and malformed inputs fail closed', () => {
  for (const mode of [2, 4, -1, '0', NaN]) assert.throws(() => decodeAbilityWord(0, 0, mode, 'ca'), RangeError);
  for (const word of [-1, 65536, 1.5, NaN]) assert.throws(() => decodeAbilityWord(word, 0, 0, 'ca'), RangeError);
  for (const address of [-1, 0x100000000, 0.5, NaN]) assert.throws(() => decodeAbilityWord(0, address, 0, 'ca'), RangeError);
  assert.throws(() => decodeAbilityWord(0, 0, 0, 'eca'), RangeError);
  assert.throws(() => encodeAbilityWord(32768, 0, 0, 'ca'), RangeError);
});

test('attribute scaling preserves signed-byte conversion and lower bound, without a 20 cap', () => {
  assert.equal(decodeAttributeByte(100, 5), 20);
  assert.equal(decodeAttributeByte(127, 5), 25);
  assert.equal(decodeAttributeByte(8, 5), 2);
  assert.equal(decodeAttributeByte(7, 5), 1);
  assert.equal(decodeAttributeByte(-128, 5), 1);
  assert.equal(decodeAttributeByte(0, 1), 1);
  assert.equal(decodeAttributeByte(127, 1), 127);
  assert.equal(encodeAttributeByte(20, 5), 100);
  assert.equal(encodeAttributeByte(26, 5), -126);
  assert.equal(encodeAttributeByte(-128, 1), -128);
  assert.throws(() => decodeAttributeByte(128, 5), RangeError);
  assert.throws(() => decodeAttributeByte(100, 0), RangeError);
});
