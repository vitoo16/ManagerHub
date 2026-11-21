import { createHash } from 'node:crypto';
import profile from '../packages/domain/src/fm2013-live-profile.json' with { type: 'json' };
import { findPe32RttiVtables } from './pe32-rtti-vtables.mjs';

const refuse = reason => Object.freeze({
  status: 'rejected', reason, kinds: [], runtimeVerified: false,
});
const expectedKinds = Object.freeze(['player', 'playerStaff']);

/**
 * Offline-only PE32 MSVC RTTI evidence. Never call this from a browser or send
 * marker RVAs through product IPC; these are file-relative research candidates.
 * The expectations parameter permits synthetic PE fixtures in tests. Only the
 * pinned wrapper below may be used for real FM2013 admission.
 */
export function inspectOfflinePe32RttiPairs(bytes, expectations) {
  if (!Buffer.isBuffer(bytes) || bytes.byteLength < 64 ||
    bytes.byteLength > 64 * 1024 * 1024) return refuse('invalid_image');
  if (!expectations || typeof expectations !== 'object' ||
    !/^[a-f0-9]{64}$/u.test(expectations.sha256 ?? '') ||
    !expectations.nativeKinds || typeof expectations.nativeKinds !== 'object')
    return refuse('invalid_profile');

  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== expectations.sha256) return refuse('image_hash_mismatch');
  const typeNames = new Set(), markers = new Set(), kinds = [];
  let imageSize = null, preferredImageBase = null;
  try {
    for (const kind of expectedKinds) {
      const value = expectations.nativeKinds[kind];
      if (!value || !/^\.\?AV[A-Za-z0-9_@$]+@@$/u.test(value.decoratedName ?? '') ||
        !Number.isSafeInteger(value.personOffset) || value.personOffset < 0 ||
        value.personOffset > 65536 || typeNames.has(value.decoratedName))
        return refuse('invalid_profile');
      typeNames.add(value.decoratedName);

      const found = findPe32RttiVtables(bytes, {
        decoratedName: value.decoratedName, subobjectOffset: value.personOffset,
      });
      if (found.fileSha256 !== sha || found.runtimeVerified !== false ||
        found.scope !== 'file-backed-pe32-msvc-rtti-only') return refuse('invalid_proof');
      if (found.candidates.length < 1) return refuse('rtti_missing');
      if (imageSize === null) {
        imageSize = found.imageSize;
        preferredImageBase = found.preferredImageBase;
      } else if (found.imageSize !== imageSize ||
        found.preferredImageBase !== preferredImageBase) return refuse('invalid_proof');

      const markerRvas = [];
      for (const candidate of found.candidates) {
        if (candidate.decoratedName !== value.decoratedName ||
          candidate.subobjectOffset !== value.personOffset ||
          !Number.isSafeInteger(candidate.markerRva) ||
          candidate.markerRva < 4096 || candidate.markerRva + 12 > imageSize ||
          markers.has(candidate.markerRva)) return refuse('invalid_proof');
        markers.add(candidate.markerRva);
        markerRvas.push(candidate.markerRva);
      }
      markerRvas.sort((a, b) => a - b);
      kinds.push(Object.freeze({
        nativeKind: kind, decoratedName: value.decoratedName,
        personOffset: value.personOffset,
        markerRvas: Object.freeze(markerRvas),
        ambiguous: markerRvas.length !== 1,
      }));
    }
  } catch { return refuse('invalid_proof'); }
  return Object.freeze({
    status: 'file_rtti_candidates', reason: null, fileSha256: sha,
    imageSize, preferredImageBase, kinds: Object.freeze(kinds),
    scope: 'offline_pe32_only', runtimeVerified: false,
  });
}

/** Real FM2013 entry point: neither hash nor RTTI classes are caller-controlled. */
export function inspectPinnedFm2013FileRtti(bytes) {
  return inspectOfflinePe32RttiPairs(bytes, {
    sha256: profile.binarySha256,
    nativeKinds: profile.nativeKinds,
  });
}
