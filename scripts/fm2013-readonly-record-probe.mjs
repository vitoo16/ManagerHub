// Isolated REA/Frida research probe, never imported by the browser application.
// This layout is a candidate from one exact-build session, not a certified adapter.
export const FM2013_RESEARCH_BINARY_SHA256 = 'df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871';

function observeRecord(config) {
  function fail(code) { throw new Error(code); }
  function artifact() {
    return { path: Process.mainModule.path, callerVerifiedFileSha256: config.binarySha256,
      runtimeImageBytesAuthenticated: false };
  }
  function checkedPointer(value) {
    const address = value.toUInt32();
    if (address < 0x10000 || address > 0xfffff000 || address % 4 !== 0) fail('invalid_pointer');
    return value;
  }
  function readName(object) {
    const header = checkedPointer(checkedPointer(object).add(40).readPointer());
    const length = header.add(1).readU8();
    if (header.readU8() !== 1 || length === 0 || length > 64) fail('invalid_name_header');
    const name = header.add(4).readUtf16String(length);
    if (typeof name !== 'string' || name.length !== length || /[\u0000-\u001f]/u.test(name)) fail('invalid_name');
    return name;
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
  function readCandidate(player, expected, includeAbilities) {
    const person = player.add(356);
    const before = readIdentity(person);
    if (before.id <= 0 || before.id !== before.id2 || before.sid < 0) fail('invalid_identity');
    if (expected && (before.id !== expected.expectedId || before.firstName !== expected.firstName ||
        before.lastName !== expected.lastName)) fail('identity_mismatch');
    const attributes = checkedPointer(player.add(228).readPointer());
    const caAddress = player.add(336), paAddress = player.add(338);
    const passingRaw = attributes.add(54).readS8(), paceRaw = attributes.add(85).readS8();
    const words = includeAbilities ? { ca: caAddress.readU16(), pa: paAddress.readU16() } : null;
    const after = readIdentity(person);
    if (JSON.stringify(before) !== JSON.stringify(after) ||
        player.add(228).readPointer().toString() !== attributes.toString()) fail('stale_record');
    if ((words && (caAddress.readU16() !== words.ca || paAddress.readU16() !== words.pa)) ||
        attributes.add(54).readS8() !== passingRaw || attributes.add(85).readS8() !== paceRaw) fail('changed_fields');
    return {
      kind: 'fm2013-readonly-record', status: 'observed_candidate', pid: Process.id,
      artifact: artifact(),
      layoutStatus: 'candidate', independentGroundTruthVerified: false,
      identity: before,
      addresses: { player: player.toString(), person: person.toString(), attributes: attributes.toString(),
        ca: caAddress.toString(), pa: paAddress.toString() },
      ...(words ? { rawAbilityWords: words } : {}),
      attributes: { passing: { raw: passingRaw, candidateScale5: Math.max(1, Math.round(passingRaw / 5)) },
        pace: { raw: paceRaw, candidateScale5: Math.max(1, Math.round(paceRaw / 5)) } },
      actualAbilityVerified: false,
    };
  }
  function verifiedImageMarker() {
    const proof = config.imageType, image = Process.mainModule;
    if (image.size !== proof.imageSize) fail('image_size_mismatch');
    const marker = image.base.add(proof.markerRva), locator = marker.add(-4).readPointer();
    const descriptor = image.base.add(proof.typeDescriptorRva);
    if (locator.toString() !== image.base.add(proof.locatorRva).toString() || locator.readU32() !== 0 ||
        locator.add(4).readU32() !== proof.subobjectOffset ||
        locator.add(8).readU32() !== proof.constructorDisplacement ||
        locator.add(12).readPointer().toString() !== descriptor.toString() ||
        locator.add(16).readPointer().toString() !== image.base.add(proof.hierarchyRva).toString()) fail('rtti_locator_mismatch');
    for (let i = 0; i <= proof.decoratedName.length; i++) {
      if (descriptor.add(8 + i).readU8() !== (i === proof.decoratedName.length ? 0 : proof.decoratedName.charCodeAt(i))) fail('rtti_name_mismatch');
    }
    for (let i = 0; i < proof.firstFunctionRvas.length; i++) {
      const address = marker.add(i * 4).readPointer();
      if (address.toString() !== image.base.add(proof.firstFunctionRvas[i]).toString() ||
          !Process.findRangeByAddress(address)?.protection.includes('x')) fail('rtti_function_mismatch');
    }
    return marker.toUInt32();
  }
  function scanPlayers(anchor) {
    const limits = config.scan;
    const marker = config.imageType ? verifiedImageMarker() : ptr(anchor.addresses.person).readU32();
    const imageStart = Process.mainModule.base.toUInt32();
    if (marker < imageStart || marker >= imageStart + Process.mainModule.size) fail('marker_outside_image');
    const pattern = [0, 8, 16, 24].map(shift => ((marker >>> shift) & 255).toString(16).padStart(2, '0')).join(' ');
    const ranges = Process.enumerateRanges({ protection: 'rw-', coalesce: true }).filter(range => !range.file);
    const started = Date.now(), records = [], seenAddresses = new Set(), seenIds = new Set(), faults = [];
    let bytesScanned = 0, matches = 0, rejected = 0, duplicates = 0, faultCount = 0, stopReason = null;
    outer: for (const range of ranges) {
      for (let offset = 0; offset < range.size;) {
        if (Date.now() - started >= limits.maxDurationMs) { stopReason = 'time_limit'; break outer; }
        const available = limits.maxBytes - bytesScanned;
        if (available < 4) { stopReason = 'byte_limit'; break outer; }
        const length = Math.min(65536, range.size - offset, available);
        let hits;
        try { hits = Memory.scanSync(range.base.add(offset), length, pattern); }
        catch (error) {
          faultCount++;
          if (faults.length < 16) faults.push({ address: range.base.add(offset).toString(), diagnostic: String(error) });
          // A failed read is attempted work too: it consumes the scan byte budget.
          hits = [];
        }
        bytesScanned += length;
        for (const hit of hits) {
          const address = hit.address.toString();
          if (seenAddresses.has(address)) continue;
          if (matches >= limits.maxMatches) { stopReason = 'match_limit'; break outer; }
          if (Date.now() - started >= limits.maxDurationMs) { stopReason = 'time_limit'; break outer; }
          seenAddresses.add(address); matches++;
          try {
            const candidatePerson = checkedPointer(hit.address);
            if (candidatePerson.readU32() !== marker) fail('stale_marker');
            const record = readCandidate(checkedPointer(candidatePerson.add(-356)), null, false);
            if (candidatePerson.readU32() !== marker) fail('stale_marker');
            if (seenIds.has(record.identity.id)) { duplicates++; continue; }
            seenIds.add(record.identity.id); records.push(record);
            if (records.length >= limits.maxRecords) { stopReason = 'record_limit'; break outer; }
          } catch { rejected++; }
        }
        if (offset + length >= range.size) break;
        if (length <= 3) { stopReason = 'byte_limit'; break outer; }
        offset += length - 3; // Retain matches that straddle chunk boundaries.
      }
    }
    return {
      kind: 'fm2013-readonly-player-scan', status: 'observed_candidates', pid: Process.id,
      artifact: artifact(), layoutStatus: 'candidate', actualAbilityVerified: false,
      independentGroundTruthVerified: false, databaseCompletenessVerified: false,
      scope: config.imageType ? 'anonymous-writable-mappings-file-derived-rtti-marker' :
        'anonymous-writable-mappings-one-anchor-derived-person-marker', marker: `0x${marker.toString(16)}`,
      imageTypeMetadataVerified: !!config.imageType,
      limits, coverage: { bytesScanned, matches, rejected, duplicates, faultCount, faults, stopReason,
        selectedMappingsExhausted: stopReason === null && faultCount === 0, elapsedMs: Date.now() - started },
      anchorFound: anchor ? records.some(record => record.addresses.person === anchor.addresses.person) : null, records,
    };
  }
  try {
    const expectedPath = 'C:\\Program Files (x86)\\Football Manager 2013\\fm.exe';
    if (Process.id !== config.pid) fail('pid_mismatch');
    if (Process.arch !== 'ia32' || Process.pointerSize !== 4) fail('architecture_mismatch');
    if (Process.mainModule.path.toLowerCase() !== expectedPath.toLowerCase()) fail('image_path_mismatch');
    const anchor = config.imageType ? null : readCandidate(checkedPointer(ptr(config.playerAddress)), config, !config.scan);
    send(config.scan ? scanPlayers(anchor) : anchor);
  } catch (error) {
    send({ kind: config.scan ? 'fm2013-readonly-player-scan' : 'fm2013-readonly-record',
      status: 'rejected', diagnostic: String(error.message || error) });
  }
}

/** Caller must hash the selected on-disk image before building a same-session probe. */
function checkedTarget(config) {
  if (config?.binarySha256 !== FM2013_RESEARCH_BINARY_SHA256) throw new RangeError('Unsupported research artifact');
  if (!Number.isInteger(config.pid) || config.pid < 1 || config.pid > 0x7fffffff) throw new RangeError('Invalid PID');
  return { binarySha256: config.binarySha256, pid: config.pid };
}

function checkedConfig(config) {
  const target = checkedTarget(config);
  if (!Number.isInteger(config.expectedId) || config.expectedId < 1 || config.expectedId > 0x7fffffff) throw new RangeError('Invalid expected identity');
  if (typeof config.playerAddress !== 'string' || !/^0x[0-9a-f]{1,8}$/i.test(config.playerAddress)) throw new RangeError('Invalid record address');
  const address = Number.parseInt(config.playerAddress.slice(2), 16);
  if (address < 0x10000 || address > 0xfffff000 || address % 4 !== 0) throw new RangeError('Invalid record address');
  for (const name of [config.firstName, config.lastName]) {
    if (typeof name !== 'string' || name.length === 0 || name.length > 64 || /[\u0000-\u001f]/u.test(name)) throw new RangeError('Invalid expected name');
  }
  const checked = { ...target, expectedId: config.expectedId,
    playerAddress: config.playerAddress, firstName: config.firstName, lastName: config.lastName };
  return checked;
}

export function buildFm2013ReadOnlyRecordProbe(config) {
  return `(${observeRecord.toString()})(${JSON.stringify(checkedConfig(config))});`;
}

/** An anchor-derived research scan; this never certifies whole-database coverage. */
export function buildFm2013ReadOnlyPlayerScan(config, limits = {}) {
  const checked = checkedConfig(config);
  return `(${observeRecord.toString()})(${JSON.stringify({ ...checked, scan: checkedScanLimits(limits) })});`;
}

function checkedScanLimits(limits) {
  const scan = { maxBytes: 1073741824, maxDurationMs: 20000, maxRecords: 10000, maxMatches: 20000, ...limits };
  const ceilings = { maxBytes: 1073741824, maxDurationMs: 20000, maxRecords: 10000, maxMatches: 20000 };
  for (const key of Object.keys(scan)) {
    if (!Object.hasOwn(ceilings, key) || !Number.isSafeInteger(scan[key]) || scan[key] < (key === 'maxBytes' ? 4 : 1) ||
        scan[key] > ceilings[key]) throw new RangeError(`Invalid scan limit: ${key}`);
  }
  return scan;
}

/** Requires a file-derived unique RTTI proof; accepts no heap address or expected player. */
export function buildFm2013ImageRelativePlayerScan(config, fileProof, limits = {}) {
  const target = checkedTarget(config);
  if (fileProof?.fileSha256 !== target.binarySha256 || fileProof.candidates?.length !== 1 ||
      !Number.isSafeInteger(fileProof.imageSize) || fileProof.imageSize < 4096 || fileProof.imageSize > 536870912) {
    throw new RangeError('Missing unique exact-artifact RTTI proof');
  }
  const candidate = fileProof.candidates[0];
  if (candidate.decoratedName !== '.?AVACTUAL_PLAYER@@' || candidate.subobjectOffset !== 356 ||
      !Number.isSafeInteger(candidate.constructorDisplacement) || candidate.constructorDisplacement < 0 ||
      candidate.constructorDisplacement > 65536 || !Array.isArray(candidate.firstFunctionRvas) || candidate.firstFunctionRvas.length !== 3) {
    throw new RangeError('Unsupported native type proof');
  }
  for (const rva of [candidate.markerRva, candidate.locatorRva, candidate.typeDescriptorRva, candidate.hierarchyRva,
    ...candidate.firstFunctionRvas]) {
    if (!Number.isSafeInteger(rva) || rva < 4 || rva + 128 > fileProof.imageSize || rva % 4 !== 0) throw new RangeError('Invalid native type RVA');
  }
  const imageType = { imageSize: fileProof.imageSize, decoratedName: candidate.decoratedName,
    subobjectOffset: candidate.subobjectOffset, constructorDisplacement: candidate.constructorDisplacement,
    markerRva: candidate.markerRva, locatorRva: candidate.locatorRva, typeDescriptorRva: candidate.typeDescriptorRva,
    hierarchyRva: candidate.hierarchyRva, firstFunctionRvas: candidate.firstFunctionRvas };
  return `(${observeRecord.toString()})(${JSON.stringify({ ...target, imageType, scan: checkedScanLimits(limits) })});`;
}
