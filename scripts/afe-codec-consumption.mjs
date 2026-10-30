import { readFile } from 'node:fs/promises';
import { inflateSync, inflateRawSync, gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const MAX_INPUT = 256 * 1024;
const MAX_OUTPUT = 2 * 1024 * 1024;
const CODECS = Object.freeze({ deflate: inflateSync, 'deflate-raw': inflateRawSync, gzip: gunzipSync });
const SKIP = [0, 8, 16];

/**
 * Local-only research: unlike browser DecompressionStream, Node zlib's
 * info.engine.bytesWritten reports input bytes consumed by the inflater.
 * Never return output contents or infer any Football Manager record.
 */
export function probeCodecConsumption(member, expectedBytes) {
  if (!(member instanceof Uint8Array) || member.byteLength < 1 ||
      member.byteLength > MAX_INPUT || !Number.isSafeInteger(expectedBytes) ||
      expectedBytes < 1 || expectedBytes > MAX_OUTPUT) {
    throw new RangeError('Member or expected decoded size exceeds bounded research limits.');
  }
  const trials = [];
  for (const skip of SKIP) {
    if (skip >= member.byteLength) continue;
    const input = Buffer.from(member.subarray(skip));
    for (const [codec, inflate] of Object.entries(CODECS)) {
      try {
        const { buffer, engine } = inflate(input, { info: true, maxOutputLength: MAX_OUTPUT });
        const consumedBytes = engine.bytesWritten;
        const outputBytes = buffer.byteLength;
        const fullInputConsumed = consumedBytes === input.byteLength;
        trials.push({
          codec, skip, inputBytes: input.byteLength, consumedBytes, outputBytes,
          result: !fullInputConsumed ? 'trailing_input' :
            outputBytes !== expectedBytes ? 'size_mismatch' : 'candidate_only'
        });
      } catch {
        trials.push({ codec, skip, inputBytes: input.byteLength,
          consumedBytes: null, outputBytes: null, result: 'invalid_or_limit' });
      }
    }
  }
  return trials;
}

/** Local CLI accepts a file plus exact member byte extent; it emits JSON metadata only. */
export async function inspectLocalMember(filePath, offset, storedBytes, expectedBytes) {
  if (!Number.isSafeInteger(offset) || offset < 0 ||
      !Number.isSafeInteger(storedBytes) || storedBytes < 1 || storedBytes > MAX_INPUT) {
    throw new RangeError('Invalid input offset or size.');
  }
  const stat = await import('node:fs/promises').then(fs => fs.stat(filePath));
  if (offset > stat.size || storedBytes > stat.size - offset) {
    throw new RangeError('Member range exceeds file bounds.');
  }
  const { open } = await import('node:fs/promises');
  const handle = await open(filePath, 'r');
  try {
    const bytes = Buffer.alloc(storedBytes);
    const { bytesRead } = await handle.read(bytes, 0, storedBytes, offset);
    if (bytesRead !== storedBytes) throw new Error('Incomplete local member read.');
    return probeCodecConsumption(bytes, expectedBytes);
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, offset, stored, expected] = process.argv.slice(2);
  if (!file || !/^\d+$/.test(offset ?? '') || !/^\d+$/.test(stored ?? '') ||
      !/^\d+$/.test(expected ?? '')) {
    console.error('Usage: node scripts/afe-codec-consumption.mjs <local-save.fm> <absolute-offset> <stored-bytes> <reported-output-bytes>');
    process.exitCode = 2;
  } else {
    inspectLocalMember(file, Number(offset), Number(stored), Number(expected))
      .then(trials => console.log(JSON.stringify(trials, null, 2)))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
