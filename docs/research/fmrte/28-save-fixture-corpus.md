# Save-format fixture corpus and evidence status

**Updated:** 2026-11-05  
**Scope:** Phase 2 — B1 corpus/detection and B5 verification  
**Status:** portable synthetic regression coverage exists; the permissioned real-save compatibility corpus is still missing. This document is a test inventory, not a format-compatibility claim.

## Safety and provenance rules

- Tests must use explicitly synthetic bytes or a real sample whose use was authorized. Name synthetic fixtures accordingly.
- Do not commit, upload, or place private .fm files, game databases, memory captures, screenshots, or licensed binaries in GitHub.
- A synthetic fixture proves that our parser handles the bytes we constructed; it does **not** prove that the construction matches a real game build.
- A member name, directory entry, prefix, repeated marker, decompression success, or uncompressed-length match does not prove player-record decoding.
- Keep AFE and FMF as separate research families. A signature does not establish edition/build.
- The production SAVE_COMPATIBILITY_PROFILES registry must remain empty until an exact-build adapter has independently verified field values.

## Existing portable test inventory

| Test file | Synthetic/regression coverage | What it does not prove |
|---|---|---|
| packages/domain/src/save.test.ts | AFE/FMF/unknown signature recognition, read-only metadata, SHA-256 identity and no-hash record identity behavior (identity additions in PR #75) | Edition/build detection, archive decoding, player fields |
| packages/domain/src/archive.test.ts | Directory structure, nested groups, unique names, non-overlapping member extents, offset boundaries, 69-member synthetic catalogue, bounded prefix sampling, marker-heavy tails and malformed markers; PR #76 adds malformed UTF-16, invalid numeric boundaries, deterministic mutations, direct parser input caps, sparse-index rejection across parser/gap/codec/summary consumers, decompression-output cap and bounded-tail scan coverage; latest head c932a3e awaits runner revalidation | Real container layout across builds or member payload decoding |
| packages/domain/src/archive-codec.test.ts | Synthetic zlib, raw DEFLATE and gzip candidates; trailer/junk rejection, length mismatch, malformed input, output cap and oversized-member skip | A real AFE member codec or semantic decoding |
| packages/domain/src/archive-gaps.test.ts | Synthetic section markers, gap distances, oversized-gap skip and invalid boundary handling | Meaning of the marker or hidden record structure |
| packages/domain/src/save-library.test.ts | Persistence schema, hash/ID consistency, legacy metadata IDs, canonical archive-index bounds/overlap validation, ephemeral-data stripping; PR #75 adds file-size/family-signature binding, unsafe-label rejection, sparse-array rejection, uint32 bounds and pre-projection storage validation | Authenticity of IndexedDB contents or save compatibility |
| apps/web/src/inspect-save-in-worker.test.ts | Worker result admission, malformed/foreign replies, cancellation, timeout, worker termination and no main-thread fallback | Compromised same-origin code or native process behavior |
| packages/domain/src/save-compatibility.test.ts | Exact family/edition/build matching, ambiguous profile rejection, research-only coverage and unsupported domains | Any production-compatible profile; the registry is intentionally empty |
| scripts/afe-cross-save.test.mjs | Temporary synthetic AFE pairs, duplicate-input stop, stratified sample comparison and full-member hash comparison | General-purpose real-save equivalence or decoded member meaning |

## Coverage matrix

| Risk / behavior | Current evidence | Status |
|---|---|---|
| Unknown/recognized outer signatures | Synthetic unit tests | Covered at signature level |
| Truncated/malformed directory | Synthetic parser tests | Covered for tested cases |
| Duplicate names / overlapping extents | Parser and persistence tests | Covered for tested cases |
| Unsafe numeric boundaries / invalid UTF-16 / direct parser type and size bounds | PR #76 regression tests | Latest head c932a3e needs CI revalidation |
| Marker-heavy false positives | Synthetic tail fixture | Bounded candidate scan covered |
| Inflated-output cap and early output-limit handling | PR #76 synthetic decompression-bomb fixture and bounded codec trial | Latest head 774369b needs CI revalidation |
| Compressed-index input cap | Defensive 64 KiB check; real File candidates are already bounded by the 64 KiB tail scan | Not independently exercised; the oversized fixture verifies the candidate is outside the scan window |
| Shared archive-index validator and gap-observation contract | PR #75/#76 regression tests | Dense arrays, safe labels, unique names, member/file bounds, nested-group limits and non-overlapping extents are checked once and reused by parser, gap, codec and persistence consumers; ephemeral gap observations must match adjacent member extents, sample-size thresholds and marker-count bounds |
| Latest workflow execution | PR #75 squashed head `57e3f16` / run `42054204948`; PR #76 squashed head `c932a3e` / run `42054005159`; PR #77 docs head `8a962df` / run `42053612059` | All jobs terminate before runner allocation (`runner_id=0`, empty runner name, zero steps); job-log download returns `BlobNotFound`. No code-level test result exists. GitHub Status reported Actions operational/no Nov 5 incident; root cause is unresolved and may be isolated to account/repository runner provisioning. See [GitHub Status](https://www.githubstatus.com/).
| Member payload codec hypotheses | Synthetic codec trials only | Experimental; no real codec claim |
| Gap/prefix diagnostics | Synthetic fixtures and bounded reads | Structural only |
| Persisted identity / archive metadata validation | PR #75 tests, including family-signature binding, sparse-array guards and canonical archive metadata validation | Latest head 57e3f16 needs CI revalidation |
| Permissioned real saves across exact builds | No committed corpus | **Missing / blocker** |
| Same-build in-game player ID, attributes, Actual CA/PA ground truth | Separate live research only; not offline fixture validation | **Missing for offline decoder** |
| Verified offline player-record extraction | No decoder/profile registered | **Unsupported** |

## Next bounded work

1. Keep the synthetic suite deterministic and portable; add a regression only when it covers a specific parser or persistence invariant. Do not claim a pass until the exact head runs on a real GitHub-hosted runner.
2. Obtain explicit permission for any real sample before local analysis. Record source, exact game edition/build, file size and SHA-256 in a private evidence ledger; never add the raw save to Git.
3. For each permitted build, compare decoded fields against same-build in-game values and independent references. Track field-level coverage and unknowns; do not infer CA/PA from archive metadata.
4. Only register a compatibility profile after reproducible fixtures, exact-build identification, field-by-field verification, malformed-input tests and independent review.
5. Keep writer work separate. Read-only parser success does not authorize save mutation.

**PR merge order:** #76 is the parser/validator foundation; merge it before #75. PR #75 intentionally carries the same archive files as a stacked dependency so its Save Library validator uses exactly the same metadata contract. The latest code heads remain unverified because GitHub-hosted jobs never reached a runner.

**Acceptance decision:** B1 has a useful synthetic regression base but is not complete. B2 has no verified production adapter/profile. B5 remains open until the missing real-build evidence and full verification gates are met.
