import { lstat, open } from 'node:fs/promises';

/** One bounded opened-file read; this does not promise atomic isolation from hostile mutation. */
export async function readBoundedRegularFile(file, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1_073_741_824) throw new RangeError('Invalid file byte limit');
  const valid = info => info.isFile() && info.size >= 1 && info.size <= maxBytes;
  if (!valid(await lstat(file))) throw new Error('Input file is outside bounds');
  const handle = await open(file, 'r');
  try {
    const before = await handle.stat();
    if (!valid(before)) throw new Error('Input file is outside bounds');
    const buffer = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const after = await handle.stat();
    if (length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error('Input file changed while reading');
    return buffer.subarray(0, length);
  } finally { await handle.close(); }
}

export async function readBoundedUtf8File(file, maxBytes) {
  const bytes = await readBoundedRegularFile(file, maxBytes);
  return { bytes, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}
