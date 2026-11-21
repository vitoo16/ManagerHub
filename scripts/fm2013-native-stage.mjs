import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = resolve(root, 'native/ManagerHub.Fm2013Host/ManagerHub.Fm2013Host.csproj');
const assembly = resolve(root, 'native/ManagerHub.Fm2013Host/bin/Release/net10.0-windows/ManagerHub.Fm2013Host.dll');

if (process.platform !== 'win32') {
  console.error('Native host release gate requires actual Windows execution.');
  process.exit(1);
}
try {
  const version = execFileSync('dotnet', ['--version'], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true }).trim();
  const major = Number(version.split('.')[0]);
  if (!Number.isInteger(major) || major < 10) throw Error('Requires a supported .NET 10+ SDK.');
  console.log('Windows native host SDK version: ' + version);

  execFileSync('dotnet', ['build', project, '--configuration', 'Release', '--nologo', '--verbosity', 'minimal'], {
    cwd: root, stdio: 'inherit', timeout: 180000, windowsHide: true,
  });
  const output = execFileSync('dotnet', [assembly, '--self-test'], {
    cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true,
  }).trim();
  if (output !== 'NATIVE_SELF_TEST_PASS') throw Error('Native parser self-test failed.');
  console.log('Native Windows protocol parser self-test PASS (no game process attached).');
} catch {
  console.error('Native host build/self-test FAILED. Do not claim Release acceptance for this commit.');
  process.exitCode = 1;
}
