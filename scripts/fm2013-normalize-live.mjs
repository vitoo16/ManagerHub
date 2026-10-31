import { lstat, open, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFm2013LiveCapture } from '../packages/domain/src/live-snapshot.ts';

/** Explicit file-in/file-out research CLI: no process access, upload or implicit persistence. */
export async function normalizeLiveCaptureFile(options) {
  const input = resolve(options.input), output = resolve(options.output);
  if (input === output || extname(output).toLowerCase() !== '.json') throw new Error('Choose a fresh JSON output path');
  const info = await lstat(input);
  if (!info.isFile() || info.size < 1 || info.size > 24_000_000) throw new Error('Input file is outside capture bounds');
  const handle = await open(input, 'r');
  let bytes;
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size < 1 || opened.size > 24_000_000) throw new Error('Input file is outside capture bounds');
    const buffer = Buffer.alloc(opened.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const after = await handle.stat();
    if (length !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) throw new Error('Input file changed while reading');
    bytes = buffer.subarray(0, length);
  } finally { await handle.close(); }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const result = parseFm2013LiveCapture(text, { snapshotId: options.snapshotId, careerId: options.careerId,
    capturedAt: options.capturedAt, mode: options.mode });
  if (result.status === 'rejected') throw new Error(result.diagnostics.join(' '));
  const document = { schema: 'managerhub-research-live-snapshot-v1', inputSha256: createHash('sha256').update(bytes).digest('hex'), result };
  const serialized = JSON.stringify(document);
  if (Buffer.byteLength(serialized) > 160 * 1024 * 1024) throw new Error('Normalized snapshot exceeds output bounds');
  await writeFile(output, serialized + '\n', { flag: 'wx' });
  return { status: result.status, playerCount: result.snapshot.players.length, mode: result.snapshot.mode,
    source: result.snapshot.source, verification: result.snapshot.verification, output, inputSha256: document.inputSha256 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const keys = new Map([['--input', 'input'], ['--output', 'output'], ['--snapshot-id', 'snapshotId'], ['--career-id', 'careerId'],
      ['--captured-at', 'capturedAt'], ['--mode', 'mode']]);
    const options = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = keys.get(process.argv[i]), value = process.argv[i + 1];
      if (!key || !value || Object.hasOwn(options, key)) throw new Error('Use each required named capture argument once');
      options[key] = value;
    }
    if (Object.keys(options).length !== keys.size) throw new Error('Required: --input --output --snapshot-id --career-id --captured-at --mode');
    console.log(JSON.stringify(await normalizeLiveCaptureFile(options)));
  } catch (error) { console.error(error.message || String(error)); process.exitCode = 1; }
}
