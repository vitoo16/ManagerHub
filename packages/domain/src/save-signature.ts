export type SaveFamily = 'afe' | 'fmf' | null;

export function detectSaveFamily(bytes: Uint8Array): SaveFamily {
  if (bytes.length < 6) return null;
  const magic = bytes.subarray(2, 6);
  if (magic[0] === 0x61 && magic[1] === 0x66 && magic[2] === 0x65 && magic[3] === 0x2e) return 'afe';
  if (magic[0] === 0x66 && magic[1] === 0x6d && magic[2] === 0x66 && magic[3] === 0x2e) return 'fmf';
  return null;
}

/** Resolve the same family rule from the persisted uppercase/lowercase hex signature. */
export function detectSaveFamilyFromSignature(signature: string): SaveFamily {
  const parts = signature.split(' ');
  const firstSix = parts.slice(0, 6);
  if (firstSix.length !== 6 || !firstSix.every(part => /^[0-9a-f]{2}$/i.test(part))) return null;
  const bytes = Uint8Array.from(firstSix, part => Number.parseInt(part, 16));
  return detectSaveFamily(bytes);
}
