import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceScript = fileURLToPath(new URL('./local-ci.mjs', import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fixtureEnv = { ...process.env };
const localGitVariables = execFileSync('git', ['rev-parse', '--local-env-vars'], {
  encoding: 'utf8', windowsHide: true,
}).trim().split(/\r?\n/u);
for (const name of localGitVariables) delete fixtureEnv[name];
const git = (root, args) => execFileSync('git', args, {
  cwd: root, encoding: 'utf8', windowsHide: true, env: fixtureEnv,
}).trim();

function fixture(run, stageCommand = 'node --version') {
  const root = mkdtempSync(join(tmpdir(), 'managerhub-ci-provenance-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'ci'));
    writeFileSync(join(root, 'scripts', 'local-ci.mjs'), readFileSync(sourceScript));
    writeFileSync(join(root, 'tracked.txt'), 'initial\n');
    writeFileSync(join(root, '.gitignore'), '.local-ci/\n');
    writeFileSync(join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
    const config = { repository: 'fixture/managerhub', nodeMajor: Number(process.versions.node.split('.')[0]),
      stages: [{ id: 'fixture-stage', command: stageCommand }],
      profiles: { quick: ['fixture-stage'], release: ['fixture-stage'] } };
    writeFileSync(join(root, 'ci', 'local-pipeline.json'), JSON.stringify(config) + '\n');
    git(root, ['init', '-q']);
    git(root, ['add', '.']);
    git(root, ['-c', 'user.email=ci@example.invalid', '-c', 'user.name=CI Fixture', 'commit', '-qm', 'fixture']);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const latest = (root, profile) => {
  const paths = readdirSync(join(root, '.local-ci', 'runs')).filter(name => name.endsWith('-' + profile));
  assert.equal(paths.length, 1);
  const runDir = join(root, '.local-ci', 'runs', paths[0]);
  return { runDir, summary: JSON.parse(readFileSync(join(runDir, 'summary.json'), 'utf8')) };
};
const launch = (root, profile) => spawnSync(process.execPath, [join(root, 'scripts', 'local-ci.mjs'), '--profile', profile],
  { cwd: root, encoding: 'utf8', windowsHide: true, env: fixtureEnv });

test('clean Local CI embeds exact commit, lockfile/profile hashes and stage log checksum', () => fixture(root => {
  const head = git(root, ['rev-parse', 'HEAD']);
  const result = launch(root, 'quick');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const { runDir, summary } = latest(root, 'quick');
  assert.equal(summary.success, true);
  assert.equal(summary.acceptanceEligible, true);
  assert.equal(summary.source.gitHead, head);
  assert.equal(summary.source.cleanAtStart, true);
  assert.equal(summary.source.cleanAtEnd, true);
  assert.equal(summary.source.sameGitHeadAtEnd, true);
  assert.equal(summary.source.sameBranchAtEnd, true);
  assert.equal(summary.source.sameInputsAtEnd, true);
  assert.equal(summary.source.ciConfigSha256, sha(readFileSync(join(root, 'ci', 'local-pipeline.json'))));
  assert.equal(summary.source.packageLockSha256, sha(readFileSync(join(root, 'package-lock.json'))));
  assert.equal(summary.stages[0].status, 'passed');
  assert.equal(summary.stages[0].logSha256, sha(readFileSync(join(runDir, summary.stages[0].logfile))));
}));

test('dirty Quick can diagnose but is explicitly ineligible; dirty Release refuses before stages', () => fixture(root => {
  writeFileSync(join(root, 'tracked.txt'), 'modified\n');
  const quick = launch(root, 'quick');
  assert.equal(quick.status, 0, quick.stderr || quick.stdout);
  const { summary } = latest(root, 'quick');
  assert.equal(summary.success, true);
  assert.equal(summary.source.cleanAtStart, false);
  assert.equal(summary.acceptanceEligible, false);
  const release = launch(root, 'release');
  assert.equal(release.status, 2);
  assert.match(release.stderr, /Refusing Release on a dirty worktree/u);
  const runs = readdirSync(join(root, '.local-ci', 'runs'));
  assert.equal(runs.length, 1);
}));

test('moving HEAD during a passing stage makes overall CI fail closed', () => fixture(root => {
  const result = launch(root, 'quick');
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const { summary } = latest(root, 'quick');
  assert.equal(summary.stages[0].status, 'passed');
  assert.equal(summary.source.sameGitHeadAtEnd, false);
  assert.equal(summary.success, false);
  assert.equal(summary.acceptanceEligible, false);
}, 'git -c user.email=ci@example.invalid -c user.name=CI commit -q --allow-empty -m moved-during-ci'));
