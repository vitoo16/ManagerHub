const MAX_INPUT = 256 * 1024;
const MAX_OUTPUT = 2 * 1024 * 1024;
const ENVELOPE = Uint8Array.from([16, 0, 0, 0, 16, 0, 0, 0]);
const SKIPS = [8, 16, 24, 32];

/**
 * Decode a standard unframed LZ4 block with exact end-of-input and output
 * accounting. Throws on truncated lengths, malformed match offsets, or
 * output lengths exceeding the declared size. Research only.
 */
export function decodeRawLz4Block(input, expectedBytes) {
  if (!(input instanceof Uint8Array) || input.length < 1 ||
      input.length > MAX_INPUT || !Number.isSafeInteger(expectedBytes) ||
      expectedBytes < 1 || expectedBytes > MAX_OUTPUT) {
    throw new RangeError('Raw LZ4 research limits exceeded.');
  }
  const out = Buffer.alloc(expectedBytes);
  let cursor = 0, written = 0;
  const readExtendedLength = initial => {
    let total = initial;
    if (initial !== 15) return total;
    while (true) {
      if (cursor >= input.length) throw new Error('Truncated LZ4 length.');
      const byte = input[cursor++];
      total += byte;
      if (total > expectedBytes) throw new RangeError('LZ4 length exceeds output budget.');
      if (byte !== 255) break;
    }
    return total;
  };
  while (cursor < input.length) {
    const token = input[cursor++];
    const literals = readExtendedLength(token >>> 4);
    if (literals > expectedBytes - written ||
        literals > input.length - cursor) throw new Error('Invalid LZ4 literal extent.');
    out.set(input.subarray(cursor, cursor + literals), written);
    cursor += literals;
    written += literals;
    if (cursor === input.length) {
      if (written !== expectedBytes) throw new Error('LZ4 output size mismatch.');
      return out;
    }
    if (cursor + 2 > input.length) throw new Error('Truncated LZ4 match offset.');
    const offset = input[cursor] | (input[cursor + 1] << 8);
    cursor += 2;
    if (offset === 0 || offset > written) throw new Error('Invalid LZ4 match distance.');
    const matchLength = readExtendedLength(token & 15) + 4;
    if (matchLength > expectedBytes - written) throw new Error('LZ4 match exceeds output.');
    // Forward copy is essential: LZ4 matches can overlap the output tail.
    for (let i = 0; i < matchLength; i++) out[written + i] = out[written + i - offset];
    written += matchLength;
  }
  throw new Error('Missing final LZ4 literal sequence.');
}

/**
 * Experimental check for authentic AFE member framing. Only expose metadata,
 * never payloads, and never call a matching block a decoded game record.
 */
export function probeAfeRawLz4(stored, reportedBytes) {
  if (!(stored instanceof Uint8Array) || stored.length > MAX_INPUT ||
      !Number.isSafeInteger(reportedBytes) || reportedBytes < 1 || reportedBytes > MAX_OUTPUT)
    throw new RangeError('Bounded AFE LZ4 probe inputs required.');
  const envelopeMatches = stored.length >= ENVELOPE.length &&
    ENVELOPE.every((value, i) => value === stored[i]);
  if (!envelopeMatches) return { status: 'invalid_envelope', envelopeMatches: false, matches: [] };
  const matches = [];
  for (const skip of SKIPS) {
    if (skip >= stored.length) continue;
    try {
      decodeRawLz4Block(stored.subarray(skip), reportedBytes);
      matches.push({ skip });
    } catch { /* Negative candidate. */ }
  }
  return {
    status: matches.length === 0 ? 'unsupported_codec' :
      matches.length === 1 ? 'size_consistent_candidate' : 'ambiguous_candidates',
    envelopeMatches, matches
  };
}
