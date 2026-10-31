import { createHash } from 'node:crypto';

/** File-only MSVC x86 RTTI research, with no assembly loading or target execution. */
export function findPe32RttiVtables(bytes, { decoratedName, subobjectOffset }) {
  const fail = code => { throw new RangeError(code); };
  if (!Buffer.isBuffer(bytes) || bytes.length < 64 || bytes.length > 64 * 1024 * 1024) fail('invalid_file_size');
  if (typeof decoratedName !== 'string' || decoratedName.length > 96 || !/^\.\?AV[A-Za-z0-9_@$]+@@$/u.test(decoratedName) ||
      !Number.isSafeInteger(subobjectOffset) || subobjectOffset < 0 || subobjectOffset > 65536) fail('invalid_type_selection');
  function bounds(offset, size) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + size > bytes.length) fail('truncated_pe');
    return offset;
  }
  const u16 = offset => bytes.readUInt16LE(bounds(offset, 2));
  const u32 = offset => bytes.readUInt32LE(bounds(offset, 4));
  const pe = u32(0x3c);
  if (u16(0) !== 0x5a4d || u32(pe) !== 0x4550 || u16(pe + 4) !== 0x14c) fail('unsupported_pe');
  const count = u16(pe + 6), optionalSize = u16(pe + 20), optional = pe + 24;
  if (count < 1 || count > 96 || optionalSize < 96 || u16(optional) !== 0x10b) fail('unsupported_pe32');
  bounds(optional, optionalSize + count * 40);
  const preferredImageBase = u32(optional + 28), imageSize = u32(optional + 56);
  if (preferredImageBase < 0x10000 || preferredImageBase % 65536 !== 0 || imageSize < 4096 ||
      imageSize > 512 * 1024 * 1024 || preferredImageBase + imageSize > 0x100000000) fail('invalid_image_bounds');
  const sections = [];
  for (let i = 0; i < count; i++) {
    const p = optional + optionalSize + i * 40;
    const section = { rva: u32(p + 12), virtualSize: u32(p + 8), rawSize: u32(p + 16),
      rawOffset: u32(p + 20), flags: u32(p + 36) };
    bounds(section.rawOffset, section.rawSize);
    if (section.rva + Math.max(section.rawSize, section.virtualSize) > imageSize) fail('section_outside_image');
    for (const previous of sections) {
      if (section.rawSize && previous.rawSize && section.rawOffset < previous.rawOffset + previous.rawSize &&
          previous.rawOffset < section.rawOffset + section.rawSize) fail('overlapping_raw_sections');
      if (section.rva < previous.rva + Math.max(previous.rawSize, previous.virtualSize) &&
          previous.rva < section.rva + Math.max(section.rawSize, section.virtualSize)) fail('overlapping_virtual_sections');
    }
    sections.push(section);
  }
  function mapped(rva, size = 4) {
    const section = sections.find(s => rva >= s.rva && rva + size <= s.rva + s.rawSize);
    if (!section) fail('unmapped_rtti_rva');
    return { offset: section.rawOffset + rva - section.rva, section };
  }
  const at = rva => u32(mapped(rva).offset);
  const readonly = sections.filter(s => (s.flags & 0x40000000) && !(s.flags & 0xa0000000));
  const needle = Buffer.from(decoratedName + '\0', 'ascii'), descriptors = new Set();
  for (const section of sections.filter(s => (s.flags & 0x40000000) && !(s.flags & 0x20000000))) {
    const raw = bytes.subarray(section.rawOffset, section.rawOffset + section.rawSize);
    for (let position = raw.indexOf(needle); position !== -1; position = raw.indexOf(needle, position + 1)) {
      if (position < 8 || (section.rva + position - 8) % 4 !== 0) continue;
      descriptors.add(section.rva + position - 8);
      if (descriptors.size > 64) fail('type_descriptor_limit');
    }
  }
  const locators = new Map();
  for (const section of readonly) {
    for (let relative = 12; relative + 8 <= section.rawSize; relative += 4) {
      const p = section.rawOffset + relative, typeDescriptorRva = u32(p) - preferredImageBase;
      if (!descriptors.has(typeDescriptorRva) || u32(p - 12) !== 0 || u32(p - 8) !== subobjectOffset) continue;
      try {
        const hierarchyRva = u32(p + 4) - preferredImageBase;
        if (at(hierarchyRva) !== 0 || at(hierarchyRva + 4) > 7) continue;
        const baseCount = at(hierarchyRva + 8);
        if (baseCount < 1 || baseCount > 128) continue;
        const baseArray = at(hierarchyRva + 12) - preferredImageBase;
        mapped(baseArray, baseCount * 4);
        const selfBase = at(baseArray) - preferredImageBase;
        if (at(selfBase) !== typeDescriptorRva + preferredImageBase) continue;
        const locatorRva = section.rva + relative - 12;
        locators.set(locatorRva + preferredImageBase, { locatorRva, typeDescriptorRva,
          hierarchyRva, constructorDisplacement: u32(p - 4) });
        if (locators.size > 64) fail('locator_limit');
      } catch (error) {
        if (error.message === 'locator_limit') throw error;
        // A word resembling a TypeDescriptor reference is not necessarily RTTI.
      }
    }
  }
  const candidates = [];
  for (const section of readonly) {
    for (let relative = 0; relative + 16 <= section.rawSize; relative += 4) {
      const p = section.rawOffset + relative, locator = locators.get(u32(p));
      if (!locator) continue;
      const firstFunctionRvas = [4, 8, 12].map(offset => u32(p + offset) - preferredImageBase);
      try {
        if (!firstFunctionRvas.every(rva => (mapped(rva, 1).section.flags & 0x20000000) !== 0)) continue;
      } catch { continue; }
      candidates.push({ decoratedName, subobjectOffset, ...locator, markerRva: section.rva + relative + 4,
        markerFileOffset: p + 4, firstFunctionRvas });
      if (candidates.length > 64) fail('vtable_limit');
    }
  }
  return { fileSha256: createHash('sha256').update(bytes).digest('hex'), fileBytes: bytes.length,
    preferredImageBase, imageSize, typeDescriptorCount: descriptors.size, locatorCount: locators.size,
    candidates, scope: 'file-backed-pe32-msvc-rtti-only', runtimeVerified: false };
}
