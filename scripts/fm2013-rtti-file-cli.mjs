import { win32 } from 'node:path';
import { readBoundedRegularFile } from './local-research-files.mjs';
import { isSupportedFm2013ImagePath } from '../packages/domain/src/live-session.ts';
import { inspectPinnedFm2013FileRtti } from './fm2013-rtti-evidence.mjs';

/** Local exact-build file inspection only. Never attaches to a process. */
const refuse = reason => ({ status: 'rejected', reason, runtimeVerified: false });
async function main() {
  if (process.argv.length !== 3) return refuse('invalid_request');
  const file = process.argv[2];
  if (typeof file !== 'string' || !win32.isAbsolute(file) ||
    !isSupportedFm2013ImagePath(file)) return refuse('invalid_image');
  try {
    const bytes = await readBoundedRegularFile(file, 64 * 1024 * 1024);
    const proof = inspectPinnedFm2013FileRtti(bytes);
    if (proof.status !== 'file_rtti_candidates') return refuse(proof.reason);
    // No raw executable bytes, runtime addresses, source path or private memory.
    return {
      status: 'file_rtti_candidates', reason: null, runtimeVerified: false,
      kinds: proof.kinds.map(x => ({
        nativeKind: x.nativeKind, candidateCount: x.markerRvas.length,
        ambiguous: x.ambiguous,
      })),
    };
  } catch {
    return refuse('file_unavailable');
  }
}
console.log(JSON.stringify(await main()));
