import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildFm2013ReadOnlyRecordProbe, FM2013_RESEARCH_BINARY_SHA256 } from './fm2013-readonly-record-probe.mjs';

const config = { binarySha256: FM2013_RESEARCH_BINARY_SHA256, pid: 100, playerAddress: '0x10000',
  expectedId: 123, firstName: 'Test', lastName: 'Fixture' };

function execute(options = {}) {
  const numbers = new Map([[0x10000 + 356 + 20, 123], [0x10000 + 356 + 28, 123],
    [0x10000 + 356 + 24, 45], [0x10000 + 356 + 92, 0x20000], [0x10000 + 356 + 96, 0x21000],
    [0x20000 + 40, 0x30000], [0x21000 + 40, 0x31000], [0x30000, 1], [0x30001, 4],
    [0x31000, 1], [0x31001, 7], [0x10000 + 228, 0x40000], [0x40000 + 54, 80],
    [0x40000 + 85, 75], [0x10000 + 336, 12345], [0x10000 + 338, 54321]]);
  const strings = new Map([[0x30004, 'Test'], [0x31004, 'Fixture']]);
  const reads = [], messages = [];
  function numeric(address) {
    reads.push(address);
    if (!numbers.has(address)) throw new Error('unmapped_read');
    if (options.stale && address === 0x10000 + 356 + 20 && reads.filter(x => x === address).length > 1) return 124;
    if (options.changedFields && address === 0x10000 + 336 && reads.filter(x => x === address).length > 1) return 12346;
    return numbers.get(address);
  }
  function pointer(address) {
    const value = typeof address === 'string' ? Number.parseInt(address, 16) : address;
    return { toUInt32: () => value, toString: () => `0x${value.toString(16)}`,
      add: offset => pointer(value + offset), readPointer: () => pointer(numeric(value)),
      readU8: () => numeric(value), readS8: () => numeric(value), readS32: () => numeric(value),
      readU16: () => numeric(value), readUtf16String: length => {
        reads.push(value); const text = strings.get(value);
        if (text === undefined || text.length !== length) throw new Error('unmapped_string');
        return text;
      } };
  }
  if (options.nullAttributes) numbers.set(0x10000 + 228, 0);
  if (options.badHeader) numbers.set(0x30001, 255);
  const Process = { id: options.pid ?? 100, arch: options.arch ?? 'ia32', pointerSize: 4,
    mainModule: { path: options.path ?? 'C:\\Program Files (x86)\\Football Manager 2013\\fm.exe' } };
  vm.runInNewContext(buildFm2013ReadOnlyRecordProbe({ ...config, ...options.config }),
    { Process, ptr: pointer, send: message => messages.push(JSON.parse(JSON.stringify(message))) }, { timeout: 1000 });
  return { result: messages[0], reads };
}

test('observes a supplied record with repeated identity and explicit candidate provenance', () => {
  const { result } = execute();
  assert.equal(result.status, 'observed_candidate');
  assert.equal(result.identity.id, 123);
  assert.deepEqual(result.rawAbilityWords, { ca: 12345, pa: 54321 });
  assert.equal(result.attributes.passing.candidateScale5, 16);
  assert.equal(result.attributes.pace.candidateScale5, 15);
  assert.equal(result.actualAbilityVerified, false);
  assert.equal(result.artifact.runtimeImageBytesAuthenticated, false);
});

test('wrong process, architecture or image path rejects before touching memory', () => {
  for (const options of [{ pid: 101 }, { arch: 'x64' }, { path: 'C:\\other\\fm.exe' }]) {
    const { result, reads } = execute(options);
    assert.equal(result.status, 'rejected'); assert.equal(reads.length, 0);
  }
});

test('identity mismatch refuses to read attributes or ability words', () => {
  const { result, reads } = execute({ config: { firstName: 'Wrong' } });
  assert.equal(result.diagnostic, 'identity_mismatch');
  assert.ok(!reads.includes(0x10000 + 336));
  assert.ok(!reads.includes(0x10000 + 228));
});

test('stale record, null pointer and invalid string header reject explicitly', () => {
  assert.equal(execute({ stale: true }).result.diagnostic, 'stale_record');
  assert.equal(execute({ changedFields: true }).result.diagnostic, 'changed_fields');
  assert.equal(execute({ nullAttributes: true }).result.diagnostic, 'invalid_pointer');
  assert.equal(execute({ badHeader: true }).result.diagnostic, 'invalid_name_header');
});

test('builder rejects unselected artifacts, malformed addresses and ambiguous expected identity', () => {
  for (const change of [{ binarySha256: 'unknown' }, { playerAddress: '0x1' }, { playerAddress: '0x10001' },
    { playerAddress: '0x100000000' }, { expectedId: 0 }, { pid: 0 }, { firstName: '' }, { lastName: '\u0000' }]) {
    assert.throws(() => buildFm2013ReadOnlyRecordProbe({ ...config, ...change }), RangeError);
  }
});
