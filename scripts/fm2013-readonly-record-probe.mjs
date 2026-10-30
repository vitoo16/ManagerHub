// Isolated REA/Frida research probe, never imported by the browser application.
// This layout is a candidate from one exact-build session, not a certified adapter.
export const FM2013_RESEARCH_BINARY_SHA256 = 'df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871';

function observeRecord(config) {
  function fail(code) { throw new Error(code); }
  function checkedPointer(value) {
    const address = value.toUInt32();
    if (address < 0x10000 || address > 0xfffff000 || address % 4 !== 0) fail('invalid_pointer');
    return value;
  }
  function readName(object) {
    const header = checkedPointer(checkedPointer(object).add(40).readPointer());
    const length = header.add(1).readU8();
    if (header.readU8() !== 1 || length === 0 || length > 64) fail('invalid_name_header');
    return header.add(4).readUtf16String(length);
  }
  function readIdentity(person) {
    return {
      id: person.add(20).readS32(),
      id2: person.add(28).readS32(),
      sid: person.add(24).readS32(),
      firstName: readName(person.add(92).readPointer()),
      lastName: readName(person.add(96).readPointer()),
    };
  }
  try {
    const expectedPath = 'C:\\Program Files (x86)\\Football Manager 2013\\fm.exe';
    if (Process.id !== config.pid) fail('pid_mismatch');
    if (Process.arch !== 'ia32' || Process.pointerSize !== 4) fail('architecture_mismatch');
    if (Process.mainModule.path.toLowerCase() !== expectedPath.toLowerCase()) fail('image_path_mismatch');
    const player = checkedPointer(ptr(config.playerAddress));
    const person = player.add(356);
    const before = readIdentity(person);
    if (before.id !== config.expectedId || before.id2 !== config.expectedId ||
        before.firstName !== config.firstName || before.lastName !== config.lastName) fail('identity_mismatch');
    const attributes = checkedPointer(player.add(228).readPointer());
    const caAddress = player.add(336), paAddress = player.add(338);
    const passingRaw = attributes.add(54).readS8(), paceRaw = attributes.add(85).readS8();
    const words = { ca: caAddress.readU16(), pa: paAddress.readU16() };
    const after = readIdentity(person);
    if (JSON.stringify(before) !== JSON.stringify(after) ||
        player.add(228).readPointer().toString() !== attributes.toString()) fail('stale_record');
    if (caAddress.readU16() !== words.ca || paAddress.readU16() !== words.pa ||
        attributes.add(54).readS8() !== passingRaw || attributes.add(85).readS8() !== paceRaw) fail('changed_fields');
    send({
      kind: 'fm2013-readonly-record', status: 'observed_candidate', pid: Process.id,
      artifact: { path: Process.mainModule.path, callerVerifiedFileSha256: config.binarySha256,
        runtimeImageBytesAuthenticated: false },
      layoutStatus: 'candidate', independentGroundTruthVerified: false,
      identity: before,
      addresses: { player: player.toString(), person: person.toString(), attributes: attributes.toString(),
        ca: caAddress.toString(), pa: paAddress.toString() },
      rawAbilityWords: words,
      attributes: { passing: { raw: passingRaw, candidateScale5: Math.max(1, Math.round(passingRaw / 5)) },
        pace: { raw: paceRaw, candidateScale5: Math.max(1, Math.round(paceRaw / 5)) } },
      actualAbilityVerified: false,
    });
  } catch (error) {
    send({ kind: 'fm2013-readonly-record', status: 'rejected', diagnostic: String(error.message || error) });
  }
}

/** Caller must hash the selected on-disk image before building a same-session probe. */
export function buildFm2013ReadOnlyRecordProbe(config) {
  if (config?.binarySha256 !== FM2013_RESEARCH_BINARY_SHA256) throw new RangeError('Unsupported research artifact');
  if (!Number.isInteger(config.pid) || config.pid < 1 || config.pid > 0x7fffffff) throw new RangeError('Invalid PID');
  if (!Number.isInteger(config.expectedId) || config.expectedId < 1 || config.expectedId > 0x7fffffff) throw new RangeError('Invalid expected identity');
  if (typeof config.playerAddress !== 'string' || !/^0x[0-9a-f]{1,8}$/i.test(config.playerAddress)) throw new RangeError('Invalid record address');
  const address = Number.parseInt(config.playerAddress.slice(2), 16);
  if (address < 0x10000 || address > 0xfffff000 || address % 4 !== 0) throw new RangeError('Invalid record address');
  for (const name of [config.firstName, config.lastName]) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 64 || /[\u0000-\u001f]/u.test(name)) throw new RangeError('Invalid expected name');
  }
  const checked = { binarySha256: config.binarySha256, pid: config.pid, expectedId: config.expectedId,
    playerAddress: config.playerAddress, firstName: config.firstName, lastName: config.lastName };
  return `(${observeRecord.toString()})(${JSON.stringify(checked)});`;
}
