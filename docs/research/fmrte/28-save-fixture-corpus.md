# Save-format fixture corpus and evidence status

**Updated:** 2026-11-21  
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
| packages/domain/src/save.test.ts | AFE/FMF/unknown signature recognition, read-only metadata, SHA-256 identity and no-hash record identity behavior (identity hardening merged in PR #75) | Edition/build detection, archive decoding, player fields |
| packages/domain/src/archive.test.ts | Directory structure, nested groups, unique names, non-overlapping member extents, offset boundaries, 69-member synthetic catalogue, bounded prefix sampling, marker-heavy tails and malformed markers; hardening initially developed in PR #76 was subsumed by merged PR #75, covering malformed UTF-16, invalid numeric boundaries, deterministic mutations, direct parser input caps, sparse-index rejection and decompression/output bounds; PR #75 head efde1c4 passed owner-reported Windows Local CI Quick/Full/Release | Real container layout across builds or member payload decoding |
| packages/domain/src/archive-codec.test.ts | Synthetic zlib, raw DEFLATE and gzip candidates; trailer/junk rejection, length mismatch, malformed input, output cap and oversized-member skip | A real AFE member codec or semantic decoding |
| packages/domain/src/archive-gaps.test.ts | Synthetic section markers, gap distances, oversized-gap skip and invalid boundary handling | Meaning of the marker or hidden record structure |
| packages/domain/src/save-library.test.ts | Persistence schema, hash/ID consistency, legacy metadata IDs, canonical archive-index bounds/overlap validation, ephemeral-data stripping; merged PR #75 includes file-size/family-signature binding, unsafe-label rejection, sparse-array rejection, uint32 bounds, pre-projection storage validation, strict ephemeral-key rejection (including undefined-valued worker diagnostics), and separate persisted/worker TypeScript contracts | Authenticity of IndexedDB contents or save compatibility |
| apps/web/src/inspect-save-in-worker.test.ts | Worker result admission, malformed/foreign replies, cancellation, timeout, worker termination and no main-thread fallback | Compromised same-origin code or native process behavior |
| tests/e2e/shell.spec.ts | Save Library opt-in metadata persistence, no raw `.fm` bytes, individual-removal confirmation, incompatible-catalogue confirmation dismissal/acceptance, and preservation of player exports plus Editor/Realism historical snapshots | Real save-format compatibility or decoder correctness |
| packages/domain/src/save-compatibility.test.ts | Exact family/edition/build matching, ambiguous profile rejection, research-only coverage and unsupported domains | Any production-compatible profile; the registry is intentionally empty |
| scripts/afe-cross-save.test.mjs | Temporary synthetic AFE pairs, duplicate-input stop, stratified sample comparison and full-member hash comparison | General-purpose real-save equivalence or decoded member meaning |

## Coverage matrix

| Risk / behavior | Current evidence | Status |
|---|---|---|
| Unknown/recognized outer signatures | Synthetic unit tests | Covered at signature level |
| Truncated/malformed directory | Synthetic parser tests | Covered for tested cases |
| Duplicate names / overlapping extents | Parser and persistence tests | Covered for tested cases |
| Unsafe numeric boundaries / invalid UTF-16 / direct parser type and size bounds | Tests integrated via #75 (superseding #76) | Windows Local CI 9/9 Release reported on #75 exact head efde1c4; separate merged-main rerun still required |
| Marker-heavy false positives | Synthetic tail fixture | Bounded candidate scan covered |
| Inflated-output cap and early output-limit handling | Synthetic decompression-bomb fixture and bounded codec trials merged via #75 | Tested under PR #75 Windows Local CI, not real AFE codec certification |
| Compressed-index input cap | Defensive 64 KiB check; real File candidates are already bounded by the 64 KiB tail scan | Not independently exercised; the oversized fixture verifies the candidate is outside the scan window |
| Shared archive-index validator and gap-observation contract | merged PR #75 regression tests | Dense arrays, safe labels, unique names, member/file bounds, nested-group limits and non-overlapping extents are checked once and reused by parser, gap, codec and persistence consumers; ephemeral gap observations must match adjacent member extents, sample-size thresholds and marker-count bounds |
| Latest confirmed integration evidence | PR #85 head `724be37` and PR #75 head `efde1c4` merged; main after #82/#77/#79 at `0d8fac2` | Owner-reported Windows Local CI Quick 6/6, Full 8/8, Release 9/9, Playwright 112/112 for each PR head; SHA/log checks documented in PR comments. Raw logs retained locally; merged-main Release is **not separately reverified**. Hosted Actions zero-runner failures historically tracked in Issue #80. |
| Member payload codec hypotheses | Synthetic codec trials only | Experimental; no real codec claim |
| Gap/prefix diagnostics | Synthetic fixtures and bounded reads | Structural only |
| Persisted identity / archive metadata validation | Merged #75 tests for family-signature binding, sparse arrays and canonical metadata | PR #75 exact head passed owner-reported Windows Release; no real-save decoding claim |
| Permissioned real saves across exact builds | No committed corpus | **Missing / blocker** |
| Same-build in-game player ID, attributes, Actual CA/PA ground truth | Separate live research only; not offline fixture validation | **Missing for offline decoder** |
| Verified offline player-record extraction | No decoder/profile registered | **Unsupported** |

## Next bounded work

1. Keep the synthetic suite deterministic and portable; add a regression only when it covers a specific parser or persistence invariant. Record a pass only when the exact commit has run the configured Node24 Local CI (and preserve `summary.json` plus log hashes); do not require an unrelated hosted runner.
2. Obtain explicit permission for any real sample before local analysis. Record source, exact game edition/build, file size and SHA-256 in a private evidence ledger; never add the raw save to Git.
3. For each permitted build, compare decoded fields against same-build in-game values and independent references. Track field-level coverage and unknowns; do not infer CA/PA from archive metadata.
4. Only register a compatibility profile after reproducible fixtures, exact-build identification, field-by-field verification, malformed-input tests and independent review.
5. Keep writer work separate. Read-only parser success does not authorize save mutation.

**PR status (21/11/2026):** #76 closed, fully superseded by #75; #85 (Local CI) and #75 (Save Library) merged in order, followed by #82 (PID boundary tests), #77 (handoff) and #79 (FM27 research). Do **not** repeat the stale #76→#75 merge sequence. Current Phase 2 research continues under [Issue #81](https://github.com/vitoo16/ManagerHub/issues/81) and [PR #86](https://github.com/vitoo16/ManagerHub/pull/86), which is a fake-host-tested native-side read-only guard, **not** a product live reader. Mainline Local CI evidence must be generated on its own exact SHA.

**Acceptance decision:** B1 has a useful synthetic regression base but is not complete. B2 has no verified production adapter/profile. B5 remains open until the missing real-build evidence and full verification gates are met.

## Offline-first corpus follow-up (#114)

The user requires a complete disk-only save-to-database workflow, not a CSV or native memory prerequisite. Historical Genie Scout 13 author testimony ([2013 thread](https://community.sports-interactive.com/forums/topic/281021-fm-genie-scout-13-final-version/)) reports encrypted saves and a switch to memory reading; this is a research lead, not verified codec evidence. Confirm the exact FM2013 save family locally before applying AFE research. FM26/27 parsers are not interchangeable.

The existing cross-save comparator skipped stored members above 8 MiB even in full catalogue mode. Explicit research opt-in for large members:

```powershell
node scripts/afe-cross-save.mjs "same-state-A.fm" "same-state-B.fm" --all-members --include-large-members
```

This compares complete stored bytes via chunked SHA-256 for same-name, same-size indexed members within the existing 256 MiB per-file cap; rechecks both input fingerprints after the comparison. It reports only equality and coverage, never actual digests or payload bytes. It does not guarantee atomic reads against concurrent adversarial mutation; close the game and keep fixtures immutable during analysis. Unequal-size and unindexed extents remain separate research work. The default 8 MiB cap and default sampling mode are unchanged. Synthetic large-member regression added; exact candidate CI and authentic-save evidence must be recorded separately. No codec or semantic decoder has been certified by this change.
