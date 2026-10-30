import { inspectLocalArchive } from './afe-batch-codec.mjs';

const [filePath] = process.argv.slice(2);
if (!filePath) {
  console.error('Usage: node scripts/afe-batch-codec-cli.mjs <local-save.fm>');
  process.exitCode = 2;
} else {
  inspectLocalArchive(filePath)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
