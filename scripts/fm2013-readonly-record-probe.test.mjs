import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildFm2013ReadOnlyRecordProbe, buildFm2013ReadOnlyPlayerScan,
  FM2013_RESEARCH_BINARY_SHA256 } from './fm2013-readonly-record-probe.mjs';

const config = { binarySha256: FM2013_RESEARCH_BINARY_SHA256, pid: 100, playerAddress: '0x10000',
  expectedId: 123, firstName: 'Test', lastName: 'Fixture' };

function execute(options = {}) {
  const numbers = new Map([[0x10000 + 356 + 20, 123], [0x10000 + 356 + 28, 123],
    [0x10000 + 356 + 24, 45], [0x10000 + 356 + 92, 0x20000], [0x10000 + 356 + 96, 0x21000],
    [0x20000 + 40, 0x30000], [0x21000 + 40, 0x31000], [0x30000, 1], [0x30001, 4],
    [0x31000, 1], [0x31001, 7], [0x10000 + 228, 0x40000], [0x40000 + 54, 80],
    [0x40000 + 85, 75], [0x10000 + 336, 12345], [0x10000 + 338, 54321]]);
  const strings = new Map([[0x30004, 'Test'], [0x31004, 'Fixture']]);
  const marker = 0x50000;
  numbers.set(0x10000 + 356, marker);
  for (const [address, value] of [...numbers]) {
    if (address >= 0x10000 && address < 0x10200) numbers.set(address + 0x2000, value);
  }
  numbers.set(0x12000 + 356 + 20, options.duplicateId ? 123 : 456);
  numbers.set(0x12000 + 356 + 28, options.duplicateId ? 123 : 456);
  const reads = [], messages = [], scans = [];
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
      readU16: () => numeric(value), readU32: () => numeric(value), readUtf16String: length => {
        reads.push(value); const text = strings.get(value);
        if (text === undefined || text.length !== length) throw new Error('unmapped_string');
        return text;
      } };
  }
  if (options.nullAttributes) numbers.set(0x10000 + 228, 0);
  if (options.badHeader) numbers.set(0x30001, 255);
  const Process = { id: options.pid ?? 100, arch: options.arch ?? 'ia32', pointerSize: 4,
    mainModule: { base: pointer(marker), size: 0x10000,
      path: options.path ?? 'C:\\Program Files (x86)\\Football Manager 2013\\fm.exe' },
    enumerateRanges: () => options.ranges ?? [{ base: pointer(0x10000), size: 0x4000 }] };
  const Memory = { scanSync(base, length, pattern) {
    scans.push({ base: base.toUInt32(), length, pattern });
    if (options.fault) throw new Error('unreadable_page');
    return (options.hits ?? [0x10000 + 356, 0x12000 + 356]).filter(address =>
      address >= base.toUInt32() && address + 4 <= base.toUInt32() + length).map(address => ({ address: pointer(address) }));
  } };
  let ticks = 0;
  class Clock extends Date { static now() { return options.clockStep ? (ticks++ * options.clockStep) : 1000; } }
  const source = options.scan ? buildFm2013ReadOnlyPlayerScan({ ...config, ...options.config }, options.limits) :
    buildFm2013ReadOnlyRecordProbe({ ...config, ...options.config });
  vm.runInNewContext(source, { Process, Memory, Date: Clock, ptr: pointer,
    send: message => messages.push(JSON.parse(JSON.stringify(message))) }, { timeout: 1000 });
  return { result: messages[0], reads, scans };
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

test('discovers multiple candidate IDs without reading hidden ability words or claiming completeness', () => {
  const { result, reads } = execute({ scan: true });
  assert.equal(result.status, 'observed_candidates');
  assert.deepEqual(result.records.map(record => record.identity.id), [123, 456]);
  assert.equal(result.anchorFound, true);
  assert.equal(result.coverage.selectedMappingsExhausted, true);
  assert.equal(result.databaseCompletenessVerified, false);
  assert.equal(result.actualAbilityVerified, false);
  for (const address of [0x10000 + 336, 0x10000 + 338, 0x12000 + 336, 0x12000 + 338]) assert.ok(!reads.includes(address));
  assert.ok(result.records.every(record => !Object.hasOwn(record, 'rawAbilityWords')));
});

test('scan refuses stale anchors before enumeration and excludes file-backed mappings', () => {
  const invalid = execute({ scan: true, config: { firstName: 'Wrong' } });
  assert.equal(invalid.result.status, 'rejected'); assert.equal(invalid.scans.length, 0);
  const excluded = execute({ scan: true, ranges: [{ base: { toUInt32: () => 0x10000 }, size: 4096, file: { path: 'image' } }] });
  assert.equal(excluded.scans.length, 0); assert.equal(excluded.result.anchorFound, false);
});

test('scan reports byte, record, match and elapsed-time limits as partial', () => {
  for (const [limits, reason] of [[{ maxBytes: 4 }, 'byte_limit'], [{ maxRecords: 1 }, 'record_limit'],
    [{ maxMatches: 1 }, 'match_limit']]) {
    const { result } = execute({ scan: true, limits });
    assert.equal(result.coverage.stopReason, reason); assert.equal(result.coverage.selectedMappingsExhausted, false);
    assert.ok(result.coverage.bytesScanned <= result.limits.maxBytes);
  }
  assert.equal(execute({ scan: true, clockStep: 2, limits: { maxDurationMs: 1 } }).result.coverage.stopReason, 'time_limit');
});

test('scan handles overlapping chunks, duplicate IDs, invalid hits and failed reads explicitly', () => {
  // The second marker straddles the 64 KiB boundary of this mapping.
  const { result, scans } = execute({ scan: true, ranges: [{ base: {
    toUInt32: () => 0x2166, add: offset => ({ toUInt32: () => 0x2166 + offset,
      toString: () => `0x${(0x2166 + offset).toString(16)}` }) }, size: 0x20000 }] });
  assert.equal(result.records.length, 2); assert.ok(scans.length > 1);
  assert.equal(execute({ scan: true, duplicateId: true }).result.coverage.duplicates, 1);
  assert.equal(execute({ scan: true, hits: [0x10000 + 356, 0x11000] }).result.coverage.rejected, 1);
  const fault = execute({ scan: true, fault: true }).result;
  assert.equal(fault.coverage.faultCount, 1); assert.equal(fault.coverage.selectedMappingsExhausted, false);
});

test('scan limits reject oversized work, non-integers and unknown keys', () => {
  for (const limits of [{ maxBytes: 3 }, { maxBytes: 1073741825 }, { maxDurationMs: 20001 },
    { maxRecords: 0 }, { maxRecords: 1.5 }, { maxMatches: 20001 }, { unknown: 1 }, { constructor: 1 }]) {
    assert.throws(() => buildFm2013ReadOnlyPlayerScan(config, limits), RangeError);
  }
});
