import { createHash } from 'node:crypto';

const MAX_SAMPLES = 256;
const MAX_SAMPLE_BYTES = 256;
const ENVELOPE_BYTES = 8;

/**
 * Cohort diagnostics only. Input payloads are ephemeral, never returned.
 * Metadata must not be mistaken for codec recognition or a game record parser.
 */
export function summarizeByteCohort(samples) {
  if (!Array.isArray(samples) || samples.length < 2 || samples.length > MAX_SAMPLES ||
      samples.some(sample => !(sample instanceof Uint8Array) ||
        sample.byteLength < ENVELOPE_BYTES + 1 || sample.byteLength > MAX_SAMPLE_BYTES)) {
    throw new RangeError('Expected 2-256 bounded payload samples (9-256 bytes each).');
  }

  const size = samples[0].byteLength;
  if (samples.some(sample => sample.byteLength !== size)) {
    throw new RangeError('Byte-position comparison requires equal stored sizes.');
  }
  const signatures = new Set();
  const suffixHashes = new Set();
  let commonPrefixBytes = size;
  let fixedSuffixPositions = 0;
  let varyingSuffixPositions = 0;
  let suffixEntropySum = 0;

  for (const sample of samples) {
    signatures.add(Buffer.from(sample.subarray(0, ENVELOPE_BYTES)).toString('hex'));
    suffixHashes.add(createHash('sha256').update(sample.subarray(ENVELOPE_BYTES)).digest('hex'));
    let differing = false;
    for (let i = 0; i < commonPrefixBytes; i++) {
      if (sample[i] !== samples[0][i]) {
        commonPrefixBytes = i;
        differing = true;
        break;
      }
    }
    if (!differing && commonPrefixBytes < ENVELOPE_BYTES) break;
    const freq = new Uint16Array(256);
    for (let i = ENVELOPE_BYTES; i < sample.byteLength; i++) freq[sample[i]]++;
    const n = sample.byteLength - ENVELOPE_BYTES;
    let entropy = 0;
    for (const count of freq) {
      if (!count) continue;
      const p = count / n;
      entropy -= p * Math.log2(p);
    }
    suffixEntropySum += entropy;
  }

  for (let i = ENVELOPE_BYTES; i < size; i++) {
    const first = samples[0][i];
    if (samples.every(sample => sample[i] === first)) fixedSuffixPositions++;
    else varyingSuffixPositions++;
  }
  return {
    samples: samples.length,
    storedBytes: size,
    envelopeBytesChecked: ENVELOPE_BYTES,
    distinctEnvelopes: signatures.size,
    distinctSuffixPayloads: suffixHashes.size,
    sharedPrefixBytes: commonPrefixBytes,
    fixedSuffixPositions,
    varyingSuffixPositions,
    meanSuffixShannonBitsPerByte: Number((suffixEntropySum / samples.length).toFixed(3))
  };
}
