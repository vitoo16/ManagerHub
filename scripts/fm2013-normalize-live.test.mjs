import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };

async function cleanup(directory) {
  const target = resolve(directory);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.match(basename(target), /^fm13-live-(cli|reject)-[A-Za-z0-9]+$/u);
  await rm(target, { recursive: true, force: true });
}

function fixture() {
  return { schema: profile.schema, profileVersion: profile.profileVersion,
    target: { pid: 100, arch: 'ia32', pointerSize: 4, imagePath: profile.imagePath, binarySha256: profile.binarySha256 },
    passes: ['player', 'playerStaff'].map((nativeKind, index) => ({ nativeKind, imageTypeMetadataVerified: true,
      coverage: { bytesScanned: 4096, matches: 1, rejected: 0, duplicates: 0, faultCount: 0, stopReason: null, selectedMappingsExhausted: true, elapsedMs: 10 },
      records: [{ nativeId: index + 1, firstName: 'Synthetic', lastName: 'Fixture', attributeBytes: profile.attributes.map(() => 75),
        positionBytes: profile.positions.map(() => 0) }] })) };
}
function run(input, output, mode = 'realism') {
  return spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/fm2013-normalize-live.mjs', '--input', input,
    '--output', output, '--snapshot-id', 'synthetic-capture', '--career-id', 'declared-fixture', '--captured-at', '2026-11-01T00:00:00Z', '--mode', mode], { encoding: 'utf8' });
}
test('file CLI normalizes local data with provenance and redaction, preserves input and refuses overwrite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fm13-live-cli-'));
  try {
    const input = join(directory, 'input.json'), output = join(directory, 'snapshot.json'), text = JSON.stringify(fixture());
    await writeFile(input, text);
    const result = run(input, output); assert.equal(result.status, 0, result.stderr);
    const document = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(document.result.snapshot.source, 'live_game');
    assert.equal(document.result.snapshot.verification, 'provisional');
    assert.equal(document.result.snapshot.players[0].positions.goalkeeper.missingReason, 'redacted');
    assert.equal(document.result.snapshot.players[0].actualCa.value, null);
    assert.equal((await readFile(input, 'utf8')), text);
    const originalOutput = await readFile(output, 'utf8');
    assert.notEqual(run(input, output, 'editor').status, 0);
    assert.equal(await readFile(output, 'utf8'), originalOutput);
    assert.notEqual(run(input, input).status, 0);
  } finally { await cleanup(directory); }
});
test('file CLI rejects hidden data, malformed UTF-8 and oversized files before creating output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fm13-live-reject-'));
  try {
    const input = join(directory, 'bad.json'), output = join(directory, 'snapshot.json'), value = fixture();
    value.passes[0].records[0].actualCa = 200;
    await writeFile(input, JSON.stringify(value));
    assert.notEqual(run(input, output).status, 0);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
    const malformed = Buffer.from(JSON.stringify(fixture()));
    const nameIndex = malformed.indexOf('Synthetic'); assert.ok(nameIndex > 0);
    malformed[nameIndex] = 255;
    await writeFile(input, malformed);
    assert.notEqual(run(input, output).status, 0);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
    const handle = await open(input, 'w');
    try { await handle.truncate(24_000_001); } finally { await handle.close(); }
    assert.notEqual(run(input, output).status, 0);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
  } finally { await cleanup(directory); }
});
