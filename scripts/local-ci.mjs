#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = (filename) => createHash('sha256').update(readFileSync(join(root, filename))).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const gitState = () => ({ head: git(['rev-parse', '--verify', 'HEAD']), branch: git(['branch', '--show-current']),
  clean: git(['status', '--porcelain=v1', '--untracked-files=normal']) === '' });
const config = JSON.parse(readFileSync(join(root, 'ci/local-pipeline.json'), 'utf8'));
const args = process.argv.slice(2);
const index = args.indexOf('--profile');
const profile = index >= 0 ? args[index + 1] : 'full';
if (!Object.hasOwn(config.profiles, profile)) {
  console.error('Unknown profile. Available: ' + Object.keys(config.profiles).join(', '));
  process.exit(2);
}
const stages = config.profiles[profile].map((id) => {
  const stage = config.stages.find((item) => item.id === id);
  if (!stage) throw new Error('Undefined stage: ' + id);
  return stage;
});
if (args.includes('--list')) {
  console.log(profile + ': ' + stages.map((item) => item.id).join(' -> '));
  process.exit(0);
}
if (Number(process.versions.node.split('.')[0]) !== config.nodeMajor) {
  console.error('Requires Node ' + config.nodeMajor + '.x, found ' + process.version);
  process.exit(2);
}
let startingGit;
try { startingGit = gitState(); } catch {
  console.error('Unable to resolve Git source identity. Run Local CI inside a committed repository.');
  process.exit(2);
}
if (profile === 'release' && !startingGit.clean) {
  console.error('Refusing Release on a dirty worktree. Commit or restore changes before acceptance.');
  process.exit(2);
}
const initialConfigSha256 = digest('ci/local-pipeline.json');
const initialLockSha256 = digest('package-lock.json');
const directory = join(root, '.local-ci');
const lock = join(directory, 'running.lock');
mkdirSync(directory, { recursive: true });
try { mkdirSync(lock); } catch {
  console.error('Another run may be active; inspect .local-ci/running.lock.');
  process.exit(2);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(directory, 'runs', stamp + '-' + profile);
mkdirSync(runDir, { recursive: true });
const report = {
  repository: config.repository, profile, startedAt: new Date().toISOString(),
  finishedAt: null, success: false, acceptanceEligible: false, node: process.version,
  source: { gitHead: startingGit.head, branch: startingGit.branch, cleanAtStart: startingGit.clean,
    cleanAtEnd: null, sameGitHeadAtEnd: null, sameBranchAtEnd: null,
    ciConfigSha256: initialConfigSha256, packageLockSha256: initialLockSha256,
    sameInputsAtEnd: null },
  stages: stages.map((stage) => ({ id: stage.id, status: 'not-run' })),
};
const save = () => writeFileSync(join(runDir, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
function runStage(stage, number) {
  return new Promise((done) => {
    const logfile = String(number + 1).padStart(2, '0') + '-' + stage.id + '.log';
    const file = createWriteStream(join(runDir, logfile));
    const logHash = createHash('sha256');
    const write = (data) => { logHash.update(data); file.write(data); };
    const env = { ...process.env, CI: '1', ...config.env, ...stage.env };
    if (stage.id === 'desktop-mobile-e2e') delete env.NO_COLOR;
    console.log('\n>>> ' + stage.id + ': ' + stage.command);
    const child = spawn(stage.command, {
      cwd: resolve(root, stage.cwd ?? '.'), env, shell: true, windowsHide: true,
    });
    let settled = false;
    const finish = (code, error) => {
      if (settled) return;
      settled = true;
      if (error) write(String(error) + '\n');
      file.end(() => done({ code, error: error ? String(error) : null, logfile,
        logSha256: logHash.digest('hex') }));
    };
    child.stdout?.on('data', (buffer) => { process.stdout.write(buffer); write(buffer); });
    child.stderr?.on('data', (buffer) => { process.stderr.write(buffer); write(buffer); });
    child.on('error', (error) => finish(1, error));
    child.on('close', (code) => finish(code ?? 1, null));
  });
}
async function main() {
  let failed = false;
  try {
    for (let i = 0; i < stages.length; i++) {
      const startedAt = new Date().toISOString();
      report.stages[i] = { id: stages[i].id, status: 'running', startedAt };
      save();
      const result = await runStage(stages[i], i);
      report.stages[i] = {
        id: stages[i].id, status: result.code === 0 ? 'passed' : 'failed',
        startedAt, finishedAt: new Date().toISOString(),
        exitCode: result.code, logfile: result.logfile, logSha256: result.logSha256, error: result.error,
      };
      save();
      if (result.code !== 0) { failed = true; break; }
    }
  } catch (error) {
    failed = true;
    report.error = String(error);
  } finally {
    for (const command of config.cleanup ?? []) {
      console.log('\n>>> cleanup: ' + command);
      const result = await runStage({ id: 'cleanup', command }, stages.length);
      if (result.code !== 0) { failed = true; report.cleanupError = command; }
    }
    try {
      const endingGit = gitState();
      report.source.cleanAtEnd = endingGit.clean;
      report.source.sameGitHeadAtEnd = endingGit.head === startingGit.head;
      report.source.sameBranchAtEnd = endingGit.branch === startingGit.branch;
      report.source.sameInputsAtEnd = digest('ci/local-pipeline.json') === initialConfigSha256 &&
        digest('package-lock.json') === initialLockSha256;
    } catch {
      report.sourceError = 'Git or input identity unavailable after execution';
      failed = true;
    }
    if (report.source.sameGitHeadAtEnd === false || report.source.sameBranchAtEnd === false ||
        report.source.sameInputsAtEnd === false) failed = true;
    report.finishedAt = new Date().toISOString();
    report.success = !failed && report.stages.every((stage) => stage.status === 'passed');
    report.acceptanceEligible = report.success && report.source.cleanAtStart && report.source.cleanAtEnd &&
      report.source.sameGitHeadAtEnd && report.source.sameBranchAtEnd && report.source.sameInputsAtEnd;
    save();
    rmSync(lock, { recursive: true, force: true });
    console.log('\nLocal CI ' + (report.success ? 'PASSED' : 'FAILED') +
      (report.acceptanceEligible ? ' (clean-source evidence)' : ' (NOT eligible as clean-source acceptance)') +
      '. Evidence: ' + join(runDir, 'summary.json'));
    if (!report.success) process.exitCode = 1;
  }
}
await main();
