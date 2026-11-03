// Isolated REA/Frida research probe, never imported by the browser application.
// This layout is a candidate from one exact-build session, not a certified adapter.
import { FM2013_ORDINARY_ATTRIBUTES } from './fm2013-ordinary-attributes.mjs';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { isSupportedFm2013ImagePath } from '../packages/domain/src/live-session.ts';
export const FM2013_RESEARCH_BINARY_SHA256 = profile.binarySha256;
const nativeKinds = profile.nativeKinds;

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
  function readStringHeader(pointer, maximum) {
    const header = checkedPointer(pointer);
    const length = header.add(1).readU8();
    if (header.readU8() !== 1 || length === 0 || length > maximum) fail('invalid_name_header');
    const name = header.add(4).readUtf16String(length);
    // Deliberately reject control characters from untrusted FM strings and filenames.
    // oxlint-disable-next-line no-control-regex
    if (typeof name !== 'string' || name.length !== length || /[\u0000-\u001f]/u.test(name)) fail('invalid_name');
    return name;
  }
  function readName(object) {
    return readStringHeader(checkedPointer(object).add(40).readPointer(), 64);
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
  function readClubLink(player, person, nativeKind) {
    try {
      function teamPointer() {
        if (nativeKind === 'player') return checkedPointer(player.add(664).readPointer());
        const header = player.add(608), begin = header.readPointer(), end = header.add(4).readPointer();
        const bytes = end.toUInt32() - begin.toUInt32();
        if (bytes < 4 || bytes > 16 || bytes % 4 !== 0) fail('unsupported_contract_vector');
        const contract = checkedPointer(checkedPointer(begin).readPointer());
        if (contract.add(4).readPointer().toString() !== person.toString()) fail('contract_person_mismatch');
        return checkedPointer(contract.add(8).readPointer());
      }
      const team = teamPointer(), club = checkedPointer(team.add(32).readPointer());
      const nativeId = club.add(20).readS32(), name = readStringHeader(club.add(32).readPointer(), 128);
      if (nativeId <= 0) fail('invalid_club_id');
      if (teamPointer().toString() !== team.toString() || team.add(32).readPointer().toString() !== club.toString() ||
          club.add(20).readS32() !== nativeId || readStringHeader(club.add(32).readPointer(), 128) !== name) fail('stale_club');
      return { club: { nativeId, name, relation: nativeKind === 'player' ? 'player_team_pointer' : 'primary_contract_team' } };
    } catch (error) {
      // An unresolved affiliation never becomes a fabricated no-club value.
      return { clubDiagnostic: String(error.message || error).slice(0, 200) };
    }
  }
  function readBiography(person) {
    const layout = config.biographyLayout, biography = {}, diagnostics = [];
    try {
      const address = person.add(layout.birthDateOffset);
      const bytes = [0, 1, 2, 3].map(offset => address.add(offset).readU8());
      if (bytes.some((byte, offset) => address.add(offset).readU8() !== byte)) fail('stale_birth_date');
      biography.birthDateBytes = bytes;
    } catch (error) { diagnostics.push(`birth_date:${String(error.message || error).slice(0, 100)}`); }
    try {
      const slot = person.add(layout.primaryNationOffset), value = slot.readPointer();
      if (value.toUInt32() === 0) fail('unresolved_primary_nation');
      const nation = checkedPointer(value), header = nation.add(layout.nationNamePointerOffset).readPointer();
      const nativeId = nation.add(layout.nationIdOffset).readS32(), name = readStringHeader(header, 128);
      if (nativeId <= 0) fail('invalid_primary_nation_id');
      if (slot.readPointer().toString() !== nation.toString() ||
          nation.add(layout.nationNamePointerOffset).readPointer().toString() !== header.toString() ||
          nation.add(layout.nationIdOffset).readS32() !== nativeId || readStringHeader(header, 128) !== name) fail('stale_primary_nation');
      biography.primaryNation = { nativeId, name };
    } catch (error) { diagnostics.push(`primary_nation:${String(error.message || error).slice(0, 100)}`); }
    return { biography, ...(diagnostics.length ? { biographyDiagnostic: diagnostics.join(';') } : {}) };
  }
  function readCandidate(player, expected, includeAbilities) {
    const person = player.add(config.imageType?.subobjectOffset ?? config.personOffset);
    const before = readIdentity(person);
    if (before.id <= 0 || before.id !== before.id2 || before.sid < 0) fail('invalid_identity');
    if (expected && (before.id !== expected.expectedId || before.firstName !== expected.firstName ||
        before.lastName !== expected.lastName)) fail('identity_mismatch');
    const attributes = checkedPointer(player.add(228).readPointer());
    const caAddress = player.add(336), paAddress = player.add(338);
    const ordinary = Object.fromEntries(config.attributeLayout.map(({ key, offset }) => {
      const raw = attributes.add(offset).readS8();
      return [key, { raw, candidateScale5: Math.max(1, Math.round(raw / 5)) }];
    }));
    const positions = config.positionLayout.length ? Object.fromEntries(config.positionLayout.map(({ key, nativeCode, offset }) =>
      [key, { nativeCode, raw: attributes.add(offset).readS8() }])) : null;
    const clubLink = config.includeClubLinks ? readClubLink(player, person, config.imageType?.nativeKind ?? config.nativeKind) : null;
    const biography = config.biographyLayout ? readBiography(person) : null;
    const words = includeAbilities ? { ca: caAddress.readU16(), pa: paAddress.readU16() } : null;
    const after = readIdentity(person);
    if (JSON.stringify(before) !== JSON.stringify(after) ||
        player.add(228).readPointer().toString() !== attributes.toString()) fail('stale_record');
    if ((words && (caAddress.readU16() !== words.ca || paAddress.readU16() !== words.pa)) ||
        config.attributeLayout.some(({ key, offset }) => attributes.add(offset).readS8() !== ordinary[key].raw) ||
        config.positionLayout.some(({ key, offset }) => attributes.add(offset).readS8() !== positions[key].raw)) fail('changed_fields');
    return {
      kind: 'fm2013-readonly-record', status: 'observed_candidate', pid: Process.id,
      artifact: artifact(),
      layoutStatus: 'candidate', independentGroundTruthVerified: false,
      nativeKind: config.imageType?.nativeKind ?? config.nativeKind, attributeSet: config.attributeSet,
      identity: before,
      addresses: { player: player.toString(), person: person.toString(), attributes: attributes.toString(),
        ca: caAddress.toString(), pa: paAddress.toString() },
      ...(words ? { rawAbilityWords: words } : {}),
      attributes: ordinary,
      ...(positions ? { positions } : {}),
      ...clubLink,
      ...biography,
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
            const record = readCandidate(checkedPointer(candidatePerson.add(-(config.imageType?.subobjectOffset ?? config.personOffset))), null, false);
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
    const expectedPath = config.imagePath;
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
  if (config?.binarySha256 !== FM2013_RESEARCH_BINARY_SHA256 || !isSupportedFm2013ImagePath(config.imagePath)) throw new RangeError('Unsupported research artifact');
  if (!Number.isInteger(config.pid) || config.pid < 1 || config.pid > 0x7fffffff) throw new RangeError('Invalid PID');
  const nativeKind = config.nativeKind ?? 'player', attributeSet = config.attributeSet ?? 'passing_pace';
  if (!Object.hasOwn(nativeKinds, nativeKind) || !['passing_pace', 'ordinary49'].includes(attributeSet)) throw new RangeError('Unsupported research field selection');
  if (config.includePositions !== undefined && typeof config.includePositions !== 'boolean') throw new RangeError('Invalid position selection');
  if (config.includeClubLinks !== undefined && typeof config.includeClubLinks !== 'boolean') throw new RangeError('Invalid club selection');
  if (config.includeBiography !== undefined && typeof config.includeBiography !== 'boolean') throw new RangeError('Invalid biography selection');
  const biographyLayout = config.includeBiography ? Object.fromEntries(
    ['birthDateOffset', 'primaryNationOffset', 'nationIdOffset', 'nationNamePointerOffset'].map(key => {
      const offset = profile.biography?.[key];
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1024) throw new RangeError('Invalid biography profile');
      return [key, offset];
    })) : null;
  const selected = attributeSet === 'ordinary49' ? FM2013_ORDINARY_ATTRIBUTES :
    FM2013_ORDINARY_ATTRIBUTES.filter(attribute => ['passing', 'pace'].includes(attribute.key));
  return { binarySha256: config.binarySha256, imagePath: config.imagePath, pid: config.pid, nativeKind, personOffset: nativeKinds[nativeKind].personOffset,
    attributeSet, attributeLayout: selected.map(({ key, offset }) => ({ key, offset })),
    includeClubLinks: config.includeClubLinks === true,
    biographyLayout,
    positionLayout: config.includePositions ? profile.positions.map(({ key, nativeCode, offset }) => ({ key, nativeCode, offset })) : [] };
}

function checkedConfig(config) {
  const target = checkedTarget(config);
  if (!Number.isInteger(config.expectedId) || config.expectedId < 1 || config.expectedId > 0x7fffffff) throw new RangeError('Invalid expected identity');
  if (typeof config.playerAddress !== 'string' || !/^0x[0-9a-f]{1,8}$/i.test(config.playerAddress)) throw new RangeError('Invalid record address');
  const address = Number.parseInt(config.playerAddress.slice(2), 16);
  if (address < 0x10000 || address > 0xfffff000 || address % 4 !== 0) throw new RangeError('Invalid record address');
  for (const name of [config.firstName, config.lastName]) {
    // Deliberately reject control characters from untrusted FM strings and filenames.
    // oxlint-disable-next-line no-control-regex
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
  const ceilings = profile.limits;
  const scan = { ...ceilings, ...limits };
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
  const nativeKind = Object.keys(nativeKinds).find(key => nativeKinds[key].decoratedName === candidate.decoratedName &&
    nativeKinds[key].personOffset === candidate.subobjectOffset);
  if (!nativeKind ||
      !Number.isSafeInteger(candidate.constructorDisplacement) || candidate.constructorDisplacement < 0 ||
      candidate.constructorDisplacement > 65536 || !Array.isArray(candidate.firstFunctionRvas) || candidate.firstFunctionRvas.length !== 3) {
    throw new RangeError('Unsupported native type proof');
  }
  if (config.nativeKind !== undefined && config.nativeKind !== nativeKind) throw new RangeError('Native kind/proof mismatch');
  for (const rva of [candidate.markerRva, candidate.locatorRva, candidate.typeDescriptorRva, candidate.hierarchyRva,
    ...candidate.firstFunctionRvas]) {
    if (!Number.isSafeInteger(rva) || rva < 4 || rva + 128 > fileProof.imageSize || rva % 4 !== 0) throw new RangeError('Invalid native type RVA');
  }
  const imageType = { imageSize: fileProof.imageSize, decoratedName: candidate.decoratedName, nativeKind,
    subobjectOffset: candidate.subobjectOffset, constructorDisplacement: candidate.constructorDisplacement,
    markerRva: candidate.markerRva, locatorRva: candidate.locatorRva, typeDescriptorRva: candidate.typeDescriptorRva,
    hierarchyRva: candidate.hierarchyRva, firstFunctionRvas: candidate.firstFunctionRvas };
  return `(${observeRecord.toString()})(${JSON.stringify({ ...target, imageType, scan: checkedScanLimits(limits) })});`;
}
