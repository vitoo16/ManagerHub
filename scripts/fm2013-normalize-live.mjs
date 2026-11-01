import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFm2013LiveCapture } from '../packages/domain/src/live-snapshot.ts';
import { readBoundedRegularFile } from './local-research-files.mjs';

/** Explicit file-in/file-out research CLI: no process access, upload or implicit persistence. */
export function buildFm2013NormalizedDocument(bytes, options) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 24_000_000) throw new Error('Input file is outside capture bounds');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const result = parseFm2013LiveCapture(text, { snapshotId: options.snapshotId, careerId: options.careerId,
    capturedAt: options.capturedAt, mode: options.mode });
  if (result.status === 'rejected') throw new Error(result.diagnostics.join(' '));
  return { schema: 'managerhub-research-live-snapshot-v1', inputSha256: createHash('sha256').update(bytes).digest('hex'), result };
}

export async function writeFm2013NormalizedDocument(output, document) {
  if (extname(output).toLowerCase() !== '.json') throw new Error('Choose a fresh JSON output path');
  const serialized = JSON.stringify(document);
  if (Buffer.byteLength(serialized) + 1 > 160 * 1024 * 1024) throw new Error('Normalized snapshot exceeds output bounds');
  await writeFile(output, serialized + '\n', { flag: 'wx' });
}

export async function normalizeLiveCaptureFile(options) {
  const input = resolve(options.input), output = resolve(options.output);
  if (input === output || extname(output).toLowerCase() !== '.json') throw new Error('Choose a fresh JSON output path');
  const document = buildFm2013NormalizedDocument(await readBoundedRegularFile(input, 24_000_000), options);
  await writeFm2013NormalizedDocument(output, document);
  const { result } = document;
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
