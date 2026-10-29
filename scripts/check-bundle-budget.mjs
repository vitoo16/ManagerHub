import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'apps/web/dist');
const assets = path.join(dist, 'assets');
const manifestPath = path.join(dist, '.vite/manifest.json');
const KiB = 1024;
const budgets = {
  entryRaw: 450 * KiB,
  entryGzip: 150 * KiB,
  chunkRaw: 400 * KiB,
  chunkGzip: 145 * KiB
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entries = Object.entries(manifest);
// Start from the JavaScript application entry, not index.html: the HTML manifest
// record may list preload candidates that include lazy workspace chunks.
const appEntry = entries.find(([key, item]) => item.isEntry && (key.endsWith('main.tsx') || item.src?.endsWith('main.tsx')))
  ?? entries.find(([key, item]) => key === 'index.html' || item.src === 'index.html');
if (!appEntry) throw new Error('Bundle budget: the app entry was not found in the Vite build manifest.');

const visited = new Set();
// Some Vite/Rolldown manifest versions also surface dynamic-import targets in
// preload-oriented import lists. Exclude those chunks from the initial closure;
// they are measured separately by the per-chunk budget below.
const dynamicTargets = new Set(entries.flatMap(([, item]) => item.dynamicImports ?? []));
function visit(key) {
  if (visited.has(key) || dynamicTargets.has(key)) return;
  visited.add(key);
  const item = manifest[key];
  if (!item) throw new Error(`Bundle budget: manifest import "${key}" is missing.`);
  for (const imported of item.imports ?? []) {
    if (!dynamicTargets.has(imported)) visit(imported);
  }
}
visit(appEntry[0]);

const readAsset = async file => {
  const fullPath = path.join(dist, file);
  const bytes = await readFile(fullPath);
  return { file, bytes, raw: bytes.byteLength, gzip: gzipSync(bytes).byteLength };
};
const initialFiles = [...new Set([...visited].flatMap(key => {
  const item = manifest[key];
  return [item.file, ...(item.css ?? [])].filter(file => /\.(?:js|css)$/.test(file));
}))];
const initial = await Promise.all(initialFiles.map(readAsset));
const initialRaw = initial.reduce((sum, item) => sum + item.raw, 0);
const initialGzip = initial.reduce((sum, item) => sum + item.gzip, 0);

console.log('Initial static asset budget (JS + CSS; gzip is the sum of per-file gzip sizes):');
for (const item of initial) console.log(`  ${item.file}: ${(item.raw / KiB).toFixed(1)} KiB raw, ${(item.gzip / KiB).toFixed(1)} KiB gzip`);
console.log(`  TOTAL: ${(initialRaw / KiB).toFixed(1)} KiB raw, ${(initialGzip / KiB).toFixed(1)} KiB gzip`);

const jsFiles = (await readdir(assets)).filter(file => file.endsWith('.js'));
if (jsFiles.length === 0) throw new Error('Bundle budget: no JavaScript chunks were emitted.');
const chunks = await Promise.all(jsFiles.map(file => readAsset(path.join('assets', file))));
chunks.sort((left, right) => right.raw - left.raw);
console.log('All JavaScript chunks (largest first):');
for (const item of chunks) {
  console.log(`  ${item.file}: ${(item.raw / KiB).toFixed(1)} KiB raw, ${(item.gzip / KiB).toFixed(1)} KiB gzip`);
}
const oversized = chunks.filter(item => item.raw > budgets.chunkRaw || item.gzip > budgets.chunkGzip);
if (initialRaw > budgets.entryRaw || initialGzip > budgets.entryGzip || oversized.length > 0) {
  const problems = [];
  if (initialRaw > budgets.entryRaw) problems.push(`initial static assets exceed ${budgets.entryRaw / KiB} KiB raw`);
  if (initialGzip > budgets.entryGzip) problems.push(`initial static assets exceed ${budgets.entryGzip / KiB} KiB gzip-sum`);
  for (const item of oversized) problems.push(`${item.file} exceeds the per-chunk budget (${(item.raw / KiB).toFixed(1)} KiB raw / ${(item.gzip / KiB).toFixed(1)} KiB gzip)`);
  throw new Error('Bundle budget failed: ' + problems.join('; '));
}
console.log(`Bundle budgets passed: initial assets ≤ ${budgets.entryRaw / KiB} KiB raw / ${budgets.entryGzip / KiB} KiB gzip-sum; each JS chunk ≤ ${budgets.chunkRaw / KiB} KiB raw / ${budgets.chunkGzip / KiB} KiB gzip.`);
