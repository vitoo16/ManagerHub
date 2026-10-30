import { inflateSync, inflateRawSync, gunzipSync } from 'node:zlib';

const MAX_STORED_BYTES = 256 * 1024;
const MAX_DECODED_BYTES = 2 * 1024 * 1024;
const OBSERVED_ENVELOPE = Buffer.from([16, 0, 0, 0, 16, 0, 0, 0]);
const CODECS = [
  ['zlib', inflateSync],
  ['raw-deflate', inflateRawSync],
  ['gzip', gunzipSync]
];
const SKIPS = [0, 8, 16, 24, 32];

/**
 * Returns decoded bytes only for streams with full input consumption AND an
 * exact declared decoded length. This is a controlled codec experiment, not
 * proof of football data semantics. Caller must never persist private bytes.
 */
export function decodeValidatedMemberPayload(stored, reportedDecodedBytes) {
  if (!(stored instanceof Uint8Array) || stored.byteLength < 1 ||
      stored.byteLength > MAX_STORED_BYTES ||
      !Number.isSafeInteger(reportedDecodedBytes) ||
      reportedDecodedBytes < 1 || reportedDecodedBytes > MAX_DECODED_BYTES) {
    throw new RangeError('AFE codec experiment exceeds bounded limits.');
  }
  const envelopeMatches = stored.byteLength >= OBSERVED_ENVELOPE.length &&
    Buffer.from(stored.subarray(0, 8)).equals(OBSERVED_ENVELOPE);
  if (!envelopeMatches) {
    return { status: 'invalid_envelope', envelopeMatches: false, candidates: [] };
  }
  const candidates = [];
  for (const skip of SKIPS) {
    if (skip >= stored.byteLength) continue;
    const input = Buffer.from(stored.subarray(skip));
    for (const [codec, decompress] of CODECS) {
      try {
        const { buffer, engine } = decompress(input, {
          info: true,
          // Abort as soon as decoded output exceeds its declared length;
          // do not allocate up to the global 2 MiB cap for tiny members.
          maxOutputLength: reportedDecodedBytes
        });
        if (engine.bytesWritten === input.byteLength &&
            buffer.byteLength === reportedDecodedBytes) {
          candidates.push({ codec, skip, payload: buffer });
        }
      } catch {
        // Not a proven match; no speculative fallback.
      }
    }
  }
  if (candidates.length === 0) return {
    status: 'unsupported_codec', envelopeMatches, candidates: []
  };
  if (candidates.length > 1) return {
    status: 'ambiguous_codec', envelopeMatches,
    candidates: candidates.map(({ codec, skip }) => ({ codec, skip }))
  };
  const [{ codec, skip, payload }] = candidates;
  return {
    status: 'validated_stream', envelopeMatches, codec, skip,
    decodedBytes: payload.length, payload
  };
}

/** Strip all decoded bytes for safe JSON/CLI research reporting. */
export function summarizeValidatedMemberDecode(result) {
  if (!result || typeof result !== 'object') throw new TypeError('Invalid decoder result.');
  if (result.status === 'validated_stream') {
    return { status: result.status, envelopeMatches: result.envelopeMatches,
      codec: result.codec, skip: result.skip, decodedBytes: result.decodedBytes };
  }
  if (result.status === 'ambiguous_codec') {
    return { status: result.status, envelopeMatches: result.envelopeMatches,
      candidates: result.candidates };
  }
  return { status: result.status === 'invalid_envelope' ? 'invalid_envelope' : 'unsupported_codec',
    envelopeMatches: result.envelopeMatches };
}
