import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, lstat, mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { readBoundedRegularFile, readBoundedUtf8File } from './local-research-files.mjs';

const options = {
  source: { type: 'string' },
  executable: { type: 'string' },
  receipt: { type: 'string' },
  trace: { type: 'string' },
  player: { type: 'string' },
  ca: { type: 'string' },
  output: { type: 'string' },
  confirm: { type: 'string' }
};
const { values } = parseArgs({ options });
for (const key of ['source', 'executable', 'receipt', 'trace', 'player', 'ca', 'output']) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function hashRegularFile(path) {
  if (!(await lstat(path)).isFile()) throw new Error('Hash input must be a regular file.');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function publishVerifiedCopy(path, bytes, verify) {
  const scratch = await mkdtemp(join(dirname(path), '.managerhub-ca-'));
  const staged = join(scratch, 'copy.fm');
  try {
    await writeFile(staged, bytes, { flag: 'wx', flush: true });
    await verify(staged);
    await link(staged, path);
  } finally {
    await rm(staged, { force: true });
    await rmdir(scratch);
  }
}

const sourcePath = resolve(values.source);
const outputPath = resolve(values.output);
const uid = Number(values.player);
const after = Number(values.ca);
if (!/^\d+$/u.test(values.player) || !Number.isSafeInteger(uid) || uid < 1 ||
    !/^\d+$/u.test(values.ca) || !Number.isInteger(after) || after < 1 || after > 200 ||
    !outputPath.toLowerCase().endsWith('.fm')) {
  throw new Error('Provide a numeric player UID, CA within 1–200 and a new .fm destination.');
}

const receiptPath = resolve(values.receipt);
const [{ bytes: receiptBytes, text: receiptText }, source, executable] = await Promise.all([
  readBoundedUtf8File(receiptPath, 64 * 1024),
  readBoundedRegularFile(sourcePath, 256 * 1024 * 1024),
  readBoundedRegularFile(values.executable, 128 * 1024 * 1024)
]);
const receipt = JSON.parse(receiptText);
const sourceSha256 = sha256(source);
if (receipt?.provider !== 'Windows Kernel/FileIO' ||
    receipt.writerDirectRecorded !== true || receipt.allRequestOffsetsCoverSave !== true ||
    receipt.eventLoss !== 0 || !Number.isSafeInteger(receipt.matchedSuccessfulCompletions) ||
    receipt.matchedSuccessfulCompletions <= 0 || receipt.exeVersion !== '13.3.3f359652' ||
    receipt.storedVersion !== '13.3.3' || receipt.gameDbVersion !== '0x774' ||
    receipt.gameDbHmac !== 'verified_hmac_sha512' || receipt.bytes !== source.byteLength ||
    receipt.sourceSha256 !== sourceSha256 || receipt.exeSha256 !== sha256(executable) ||
    receipt.traceSha256 !== await hashRegularFile(values.trace)) {
  throw new Error('Source, executable or ETW trace does not match the reviewed provenance receipt.');
}

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { decodeFm2013Save } = await server.ssrLoadModule('/packages/domain/src/fm2013-offline/index.ts');
  const { deriveFm2013SigningKeyFromExecutable, writeFm2013CaCertificationCopy } =
    await server.ssrLoadModule('/packages/domain/src/fm2013-offline/writer.ts');
  const key = await deriveFm2013SigningKeyFromExecutable(new Uint8Array(executable));
  try {
    const beforeDb = await decodeFm2013Save(new Uint8Array(source), { signingKey: key });
    const player = beforeDb.players.find(record => record.uid === uid);
    if (!player || player.actualCa < 1 || player.actualCa > 200 || player.actualCa === after ||
        beforeDb.source.build !== receipt.storedVersion || beforeDb.source.gameDbVersionHex !== receipt.gameDbVersion ||
        beforeDb.source.checksumStatus !== 'verified_hmac_sha512') {
      throw new Error('The decoded baseline or requested CA is outside the reviewed test scope.');
    }
    const plan = {
      sourceSha256, receiptSha256: sha256(receiptBytes), outputPath,
      target: { uid, before: player.actualCa, after },
      expectedUnchanged: { pa: player.potentialAbility, marketValueGbp: player.marketValueGbp }
    };
    const confirmation = sha256(JSON.stringify(plan));
    if (!values.confirm) {
      console.log(JSON.stringify({ preview: true, ...plan, name: player.displayName, confirmation }, null, 2));
    } else {
      if (values.confirm !== confirmation) throw new Error('Confirm the exact preview digest before publishing a copy.');
      const backupPath = join(dirname(receiptPath), `source-${sourceSha256}.fm`);
      async function verifyBackup(path) {
        if (await hashRegularFile(path) !== sourceSha256) throw new Error('Private backup SHA-256 differs from source.');
      }
      try { await publishVerifiedCopy(backupPath, source, verifyBackup); }
      catch (err) {
        if (err?.code !== 'EEXIST') throw err;
        await verifyBackup(backupPath);
      }

      const result = await writeFm2013CaCertificationCopy(new Uint8Array(source), new Uint8Array(executable), {
        reviewedSourceSha256: sourceSha256, outputFileName: basename(outputPath), target: plan.target
      });
      await publishVerifiedCopy(outputPath, result.bytes, async staged => {
        const reread = await readBoundedRegularFile(staged, 256 * 1024 * 1024);
        const afterDb = await decodeFm2013Save(new Uint8Array(reread), { signingKey: key });
        const updated = afterDb.players.find(record => record.uid === uid);
        if (result.patchedFieldCount !== 1 || sha256(reread) !== result.sha256 ||
            updated?.actualCa !== after || updated.potentialAbility !== player.potentialAbility ||
            updated.marketValueGbp !== player.marketValueGbp || await hashRegularFile(sourcePath) !== sourceSha256) {
          throw new Error('Post-write field, source or staged copy checks failed.');
        }
      });

      console.log(JSON.stringify({ ...plan, backupPath, outputSha256: result.sha256, certified: false }, null, 2));
    }
  } finally {
    key.fill(0);
  }
} finally {
  await server.close();
}
