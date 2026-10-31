import assert from 'node:assert/strict';
import test from 'node:test';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { buildFm2013LiveWireCapture, extractFm2013WireCapture } from './fm2013-live-wire.mjs';

function proof(kind) {
  return { fileSha256: profile.binarySha256, imageSize: 0x10000, candidates: [{ ...profile.nativeKinds[kind],
    subobjectOffset: profile.nativeKinds[kind].personOffset, constructorDisplacement: 4, markerRva: 0x1000,
    locatorRva: 0x2000, typeDescriptorRva: 0x3000, hierarchyRva: 0x4000, firstFunctionRvas: [0x5000, 0x5004, 0x5008] }] };
}
test('wire builder requires both unique file-bound native kinds before any runtime work', () => {
  const target = { pid: 100, binarySha256: profile.binarySha256 };
  for (const proofs of [[], [proof('player')], [proof('player'), proof('player')],
    [proof('player'), { ...proof('playerStaff'), fileSha256: 'wrong' }]]) {
    assert.throws(() => buildFm2013LiveWireCapture(target, proofs), RangeError);
  }
  const source = buildFm2013LiveWireCapture(target, [proof('playerStaff'), proof('player')]);
  assert.ok(source.includes('fm2013-live-capture-v1'));
  assert.ok(source.includes('hex-i8-tuples-v2'));
});

test('biography transport preserves unsigned date bytes, optional absence and bounded nation references', () => {
  const row = [42, 'Synthetic', 'Fixture', '4b'.repeat(49), '00'.repeat(15)+':c600dc07:0', -1];
  const payload = { kind: 'fm2013-live-capture', status: 'captured', encoding: 'hex-i8-tuples-v2', capture: {
    schema: profile.schema, profileVersion: profile.profileVersion, target: {}, clubs: [], nations: [[77, 'Synthetic Nation']],
    passes: [{ nativeKind: 'player', records: [row] }, { nativeKind: 'playerStaff', records: [] }] } };
  const evidence = () => ({ normalized_result: { messages_truncated: false, messages: [{ type: 'send', payload }] } });
  let player = extractFm2013WireCapture(evidence()).passes[0].records[0];
  assert.deepEqual(player.birthDateBytes, [198, 0, 220, 7]);
  assert.deepEqual(player.primaryNation, { nativeId: 77, name: 'Synthetic Nation' });
  row[4] = '00'.repeat(15)+':-:-1';
  player = extractFm2013WireCapture(evidence()).passes[0].records[0];
  assert.equal(Object.hasOwn(player, 'birthDateBytes'), false); assert.equal(Object.hasOwn(player, 'primaryNation'), false);
  row[4] = '00'.repeat(15)+':-:1'; assert.throws(() => extractFm2013WireCapture(evidence()));
  row[4] = '00'.repeat(15)+':ff:0'; assert.throws(() => extractFm2013WireCapture(evidence()));
});
test('extractor refuses truncated, failed or ambiguous captures instead of accepting previews', () => {
  const capture = { schema: profile.schema, passes: [] };
  const message = { type: 'send', payload: { kind: 'fm2013-live-capture', status: 'captured', capture } };
  const evidence = { normalized_result: { messages_truncated: false, messages: [message] } };
  assert.equal(extractFm2013WireCapture(evidence), capture);
  for (const normalized_result of [{ messages: [message] }, { messages_truncated: true, messages: [message] },
    { messages_truncated: false, messages: [message, message] }, { messages_truncated: false, messages: [{ type: 'error' }, message] },
    { messages_truncated: false, messages: [{ ...message, payload: { ...message.payload, status: 'rejected' } }] }]) {
    assert.throws(() => extractFm2013WireCapture({ normalized_result }));
  }
});
test('compact transport preserves signed bytes and zero, with bounded dictionaries and tuples', () => {
  const player = [42, 'Synthetic', 'Fixture', '80' + '4b'.repeat(48), '00'.repeat(15), 0];
  const payload = { kind: 'fm2013-live-capture', status: 'captured', encoding: 'hex-i8-tuples-v1', capture: {
    schema: profile.schema, profileVersion: profile.profileVersion, target: {}, clubs: [[77, 'Synthetic Club', 'player_team_pointer']],
    passes: [{ nativeKind: 'player', records: [player] }, { nativeKind: 'playerStaff', records: [] }] } };
  const evidence = () => ({ normalized_result: { messages_truncated: false, messages: [{ type: 'send', payload }] } });
  const wire = extractFm2013WireCapture(evidence());
  assert.equal(wire.passes[0].records[0].attributeBytes[0], -128);
  assert.equal(wire.passes[0].records[0].positionBytes[0], 0);
  assert.equal(wire.passes[0].records[0].club.nativeId, 77);
  player[3] = '4b'; assert.throws(() => extractFm2013WireCapture(evidence()));
  player[3] = '4b'.repeat(49); player[5] = 1; assert.throws(() => extractFm2013WireCapture(evidence()));
});
