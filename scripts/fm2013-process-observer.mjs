import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { win32 } from 'node:path';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { readBoundedRegularFile } from './local-research-files.mjs';

const runProcess = promisify(execFile);
const systemRoot = win32.isAbsolute(process.env.SystemRoot ?? '') ? process.env.SystemRoot : 'C:\\Windows';
const powerShellExecutable = win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const failed = reason => ({ status: 'observation_failed', reason });
const samePath = value => typeof value === 'string' && value.toLowerCase() === profile.imagePath.toLowerCase();

function command(pid) {
  return `$ErrorActionPreference='Stop';try{$p=Get-Process -Id ${pid} -ErrorAction Stop;$s=$p.StartTime.ToFileTimeUtc().ToString();$f=$p.Path;if([string]::IsNullOrWhiteSpace($f)){@{status='access_denied'}|ConvertTo-Json -Compress}else{@{status='observed';pid=$p.Id;startedAtFileTime=$s;imagePath=$f}|ConvertTo-Json -Compress}}catch{if($_.FullyQualifiedErrorId -like 'NoProcessFoundForGivenId*'){@{status='process_not_found'}|ConvertTo-Json -Compress}elseif($_.Exception -is [System.UnauthorizedAccessException] -or $_.Exception.NativeErrorCode -eq 5 -or $_.Exception.InnerException.NativeErrorCode -eq 5){@{status='access_denied'}|ConvertTo-Json -Compress}else{@{status='observation_failed'}|ConvertTo-Json -Compress}}`;
}

async function query(pid, run) {
  let result;
  try {
    result = await run(powerShellExecutable, ['-NoProfile', '-NonInteractive', '-Command', command(pid)],
      { encoding: 'utf8', windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024 });
  } catch { return failed('query_failed'); }
  try {
    if (typeof result?.stdout !== 'string' || Buffer.byteLength(result.stdout) > 64 * 1024) return failed('invalid_response');
    const value = JSON.parse(result.stdout.replace(/^\uFEFF/u, ''));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return failed('invalid_response');
    if (['process_not_found', 'access_denied', 'observation_failed'].includes(value.status)) {
      if (Object.keys(value).length !== 1) return failed('invalid_response');
      return { status: value.status };
    }
    if (value.status !== 'observed' || Object.keys(value).length !== 4 ||
        !['status', 'pid', 'startedAtFileTime', 'imagePath'].every(key => Object.hasOwn(value, key)) || value.pid !== pid ||
        typeof value.startedAtFileTime !== 'string' || !/^[1-9][0-9]{17,19}$/u.test(value.startedAtFileTime) ||
        BigInt(value.startedAtFileTime) > 18446744073709551615n ||
        typeof value.imagePath !== 'string' || value.imagePath.length > 1024) return failed('invalid_response');
    return value;
  } catch { return failed('invalid_response'); }
}

async function hashImage(file) {
  const bytes = await readBoundedRegularFile(file, 64 * 1024 * 1024);
  return createHash('sha256').update(bytes).digest('hex');
}

/** Read-only OS identity observation; it neither attaches to nor launches Football Manager. */
export async function observeFm2013Process(pid, options = {}) {
  if (!Number.isSafeInteger(pid) || pid < 1 || pid > 0x7fffffff) return failed('invalid_pid');
  if (process.platform !== 'win32' && !options.run) return failed('unsupported_platform');
  const run = options.run ?? runProcess, digestImage = options.hashImage ?? hashImage;
  const before = await query(pid, run);
  if (before.status !== 'observed') return before;
  if (!samePath(before.imagePath)) return { status: 'unsupported_build' };
  let digest;
  try { digest = await digestImage(profile.imagePath); } catch { return failed('image_hash_failed'); }
  if (digest !== profile.binarySha256) return { status: 'unsupported_build' };
  const after = await query(pid, run);
  if (after.status !== 'observed') return after;
  if (!samePath(after.imagePath)) return failed('identity_changed');
  if (before.pid !== after.pid || before.startedAtFileTime !== after.startedAtFileTime ||
      before.imagePath.toLowerCase() !== after.imagePath.toLowerCase()) return failed('identity_changed');
  return { status: 'observed', process: { pid, startedAtFileTime: after.startedAtFileTime,
    imagePath: profile.imagePath, binarySha256: digest } };
}
