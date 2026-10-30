# Implementation status — code started 2026-10-27

**Actual work:** a React/Vite TypeScript workspace was committed to GitHub, separate from earlier specifications and agent skills. This does NOT mean the full seven-phase plan is complete.

## Implemented source paths
- `apps/web`: React application, keyboard route navigation, project command panel, theme and glass controls, overview, 27-module directory, local Save Library, evidence explanation.
- `packages/ui`: reusable SVG icon, button, status, surfaces, semantic styling with bounded Liquid Glass, light/dark and forced-color fallback.
- `packages/domain`: typed source evidence and future metric contracts, 27-feature catalogue, read-only AFE/FMF header detection and local SHA-256 for files up to 64 MiB.
- `packages/motion`: single scoped GSAP React transition with reduced-motion support.
- `tests/e2e`: Playwright flows for navigation, signature detection, theme and keyboard command.
- `packages/domain/src/save.test.ts`: format classifier and explicit no-decoder tests.
- `.github/workflows/ci.yml`: Node install, TS checks, Vitest, Vite build, Playwright desktop/mobile.

## Honest current limitations
- File import is *signature inspection only*, not version-specific save parsing. No player records, Actual CA/PA, eCA calibration, tactics or game editing.
- Save Library can explicitly persist validated inspection metadata in IndexedDB schema v2 and restore it after reload. The separate save-inspections store contains metadata only; original .fm bytes are not saved or uploaded. This still does not decode player records, identify an exact edition/build or validate CA/PA.
- Tauri native host and Rust parser are **not implemented yet**. Do not claim the native desktop app is available.
- Production components do not synthesize FM player statistics, financial data or match events.
- Dependency install/build/browser runs need a Node environment with npm registry access and a browser. A commit of tests is not evidence they passed; check CI run status.
- Full-product 27-feature scope is unchanged; Phase 1 frontend foundation is **in progress**, not complete.

## Getting started
```bash
git clone https://github.com/vitoo16/ManagerHub.git
cd ManagerHub
npm install
npm run dev
# http://127.0.0.1:4173/
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

The repo uses npm workspaces for now; `package-lock.json` should be generated and committed by a CI-capable developer after dependency resolution. Do not claim reproducible installs without that lock. No use of `npm ci` until present.

## Next engineering work
Verify the UI with browser screenshots and tests, validate the metadata-only IndexedDB migration, obtain permissioned and game-verified save fixtures, then build safe versioned Rust save adapters and Tauri local persistence according to [seven-phase roadmap](01-full-delivery-plan.md).

**Related:** [execution charter](00-execution-charter.md), [agent skills](04-motion-skills-and-references.md), [full feature ledger](05-feature-acceptance-ledger.md).

## Updated: read-only internal archive index prototype
- `packages/domain/src/archive.ts` implements strictly bounded deflate-based inspection of a candidate trailing FMF index, with UTF-16LE member names, offsets, sizes and an explicit experimental evidence flag.
- The user-provided real save has an **AFE outer signature** and a trailing marker matching the experimental FMF index pattern. The observed catalogue contains 69 entries, including `game_info.dat`, `game_db.dat` and `tactics_man.dat`. Its bytes remain private and are not committed.
- Keep outer container detection (`afe`) distinct from the internal trailing index candidate (`fmf-index-candidate`); the latter does not imply the save is an FMF-family container.
- `apps/web` lists member metadata only when the directory passes structural validation. This is NOT proof of member decompression, player extraction, edition/build identification, CA/PA decoding or a safe writer.
- Synthetic tests cover the 69-member catalogue shape and an AFE outer signature coexisting with the trailing FMF index marker. CI run [#156](https://github.com/vitoo16/ManagerHub/actions/runs/40888143543) passed TypeScript strict checks, unit tests, production build and desktop/mobile Playwright.


## Updated: observed AFE member-envelope measurements (single private fixture)

The real save was inspected locally and read-only. Only aggregate measurements are recorded here; the save bytes and member payloads are not committed.

- File size: 29,319,864 bytes. Outer signature bytes: `02 01 61 66 65 2e` (`afe.` at byte offset 2).
- Trailing directory marker begins at byte offset 29,310,371. Its zlib stream expands to 44,430 bytes and contains 69 entries.
- The maximum declared member extent is 29,310,353 relative to the member-data region, leaving an 18-byte gap before the trailing directory marker in this observed file.
- Member data appears to begin at absolute file offset 18. All 69 member starts in this one save share the same first eight bytes: `10 00 00 00 10 00 00 00`. This is a repeatable byte observation in this fixture only; it may be a common envelope/header, but its field boundaries and semantics are unknown.
- Example catalogue measurements (stored bytes / directory-reported uncompressed bytes): `game_info.dat` 2,702 / 2,651; `save_game_summary.dat` 141 / 170; `game_db.dat` 22,282,254 / 88,272,180; `humans.dat` 352 / 1,261; `news.dat` 317,107 / 1,805,887.
- Direct zlib attempts at the start of these member payloads did not yield valid streams in the tested offsets. This does not establish encryption: the member envelope, codec, transform and block layout remain unknown.

### Next reader research gates

1. The bounded read-only member-envelope probe is implemented in `packages/domain/src/archive.ts` and surfaced in Save Library; its signature labels remain candidates only.
2. Investigate the shared eight-byte prefix without assuming it is a length, codec marker, or encryption indicator. Test hypotheses against several small members and require exact output-size agreement before accepting a decoder.
3. Obtain a second independently sourced, game-verified save for cross-checking offsets and envelope assumptions before generalizing the 18-byte base or eight-byte prefix.
4. Only after member decoding is validated, investigate typed records and cross-check player identifiers/attributes against in-game exports. Never label a field CA/PA without source evidence.

These observations are from one file and are not a compatibility guarantee for other Football Manager versions/builds.


## Updated: format-family gate and member entropy observations

### Do not reuse modern FMF readers blindly

Public reverse-engineering notes for modern saves describe a different outer layout: the [Gilet FM26 save format notes](https://github.com/fifteen15-labs/gilet/blob/main/docs/SAVE_FORMAT.md) report the signature `02 01 "fmf."`, a 26-byte header and consecutive Zstandard frames. The inspected private fixture starts `02 01 "afe."` and has a trailing zlib-compressed directory. This is evidence that the current fixture must not be fed into an FM26 parser based on those notes without a separately validated compatibility path. It does not by itself identify the exact Football Manager edition or build.

The [FM SaveLens 24 format notes](https://github.com/MSalman5230/FM-SaveLens-24/blob/master/docs/FORMAT.md) also document a specific FM24 header and compression gate. Treat each public implementation as a format-specific reference, not a universal FM save specification.

### Bounded statistical observations

A read-only local probe sampled up to 4 KiB after the observed eight-byte member prefix. Shannon byte entropy for sample windows was approximately:
- `game_info.dat`: 7.93 bits/byte
- `game_db.dat`: 7.95 bits/byte
- `news.dat`: 7.95 bits/byte
- `save_game_summary.dat`: 6.58 bits/byte

These values are consistent with byte distributions that look noise-like in the sampled windows, but entropy alone cannot distinguish compression, encryption, or a custom transform. The samples did not produce valid zlib streams at the tested offsets. No codec or encryption conclusion is made.

### Updated research order

1. Keep the AFE fixture behind its own explicit experimental format gate.
2. Use small members to test header hypotheses and candidate codecs, recording both successful and failed tests reproducibly.
3. Cross-check with a second save from a known edition/build before treating the eight-byte prefix or 18-byte base as a general rule.
4. Only then investigate typed player records and validate any CA/PA fields against a known in-game reference or independent export.

## Earlier independent AFE reverse-engineering note (2019)

A 2019 [Reverse Engineering Stack Exchange investigation](https://reverseengineering.stackexchange.com/questions/20614/x64dbg-locating-where-data-is-initially-written) of Football Manager tactic FMF files reports both `02 01 61 66 65` and the repeated `10 00 00 00 10 00 00 00` section separator. These match byte patterns independently observed in the private ManagerHub AFE save, but the question concerns tactic files, not a proven save-game decoder. Its author hypothesized compression/encryption and observed non-identical content after repeated saves; no working codec or key was established there. Do not extrapolate format compatibility from the signature alone.

The domain now exposes `summarizeMemberConsistency()` to count contiguous, gapped or overlapping member extents and repeated sampled eight-byte prefixes. This is a diagnostic aggregate, not an FM edition detector or verified codec.

### Observed catalogue continuity (same single fixture)

The 69 member extents yield **66 contiguous adjacent pairs, 2 positive gaps, and 0 overlaps** when sorted by declared offset. The gaps are 1,350,855 bytes between `game_db.dat` and `humans.dat`, and 178,694 bytes between `tactics_man.dat` and `edit_session_man.dat`. The bytes in these gaps have not been identified; they may be unindexed data or other container regions. Never assume that all members are contiguous or that all non-member bytes are padding. All 69 sampled member starts share the observed eight-byte prefix.

### Follow-up: repeated delimiters inside unindexed gaps

A further read-only byte scan of the two gaps found the exact eight-byte sequence `10 00 00 00 10 00 00 00` at **724 positions** in the 1,350,855-byte `game_db.dat` → `humans.dat` gap (including its first byte), and **1 position** in the 178,694-byte `tactics_man.dat` → `edit_session_man.dat` gap (at its first byte). These are exact pattern counts in this single save, not a validated count of records or a proven container structure. A repeated delimiter may identify internal sub-blocks, but the intervening bytes have not been decoded and their semantics remain unknown. The original data is not committed.

### Corrected finding: nested `rgman` archive catalogue (2026-10-30)

Earlier notes described 40,100 bytes after the first 69 catalogue entries as "opaque". Examination of the private AFE fixture **confirmed a second structured table**, not an undecoded blob:

- Main table: 69 members, 4,330 parsed bytes.
- Subsequent `u32(1)`: one named group, UTF-16LE group name `rgman`.
- Following `u32(724)`: exactly 724 additional entries with the same UTF-16LE name, offset, stored bytes, reported unpacked bytes structure.
- Nested table parses to decompressed-directory position **44,426** of 44,430. The last **four bytes are zero**, consistent with an observed terminator.
- The 724 indexed member extents are contiguous, occupy **1,350,855 bytes**, and exactly fill the previously unexplained `game_db.dat` to `humans.dat` region.
- Across both tables, the observed catalogue now covers **793 uniquely named members**, without overlapping extents. A second **178,694-byte gap** between `tactics_man.dat` and `edit_session_man.dat` remains unexplained.

This supersedes the earlier "40,100 opaque bytes" characterization; do not infer this subtable decodes player attributes or confirms any member codec. The underlying private save is not committed.

### AFE equal-size gap comparison (2026-10-30)

The observed unindexed gap after `tactics_man.dat` is **still unindexed**. Do not mistake the equal stored lengths for membership: `regeneration_manager.dat` is a separate indexed member **after** `edit_session_man.dat`:

| Extent | Relative offset | Stored size | Exclusive end |
| --- | ---: | ---: | ---: |
| `tactics_man.dat` | 24,965,249 | 131,060 | 25,096,309 |
| Unindexed gap | 25,096,309 | 178,694 | 25,275,003 |
| `edit_session_man.dat` | 25,275,003 | 57 | 25,275,060 |
| `regeneration_manager.dat` | 25,275,060 | 178,694 | 25,453,754 |

Both the unindexed gap and `regeneration_manager.dat` begin with `10 00 00 00 10 00 00 00`, yet **only 670 of 178,694 byte positions are equal**. They are not duplicate byte ranges and this comparison does not show a shared codec. The local research CLI now compares same-size gaps with bounded indexed candidates and reports equality statistics only (no raw payload).

### Format-family boundary: AFE vs modern FMF (2026-10-30)

Do **not** apply an FM26 Zstandard save decoder to an observed AFE-family save just because both contain the bytes `fmf.`:

- Private AFE fixture: begins `02 01 61 66 65 2e` (`afe.`); member payloads have observed envelope `10 00 00 00 10 00 00 00`; trailing `fmf.` directory decompresses with zlib and describes primary and nested archive members.
- Public FM26 reverse-engineering notes describe **different** `02 01 66 6d 66 2e` (`fmf.`) container and back-to-back **Zstandard frames starting at offset 26**, with no comparable trailing directory; this is not evidence of AFE member codec. See [gilet format research](https://github.com/fifteen15-labs/gilet/blob/main/docs/SAVE_FORMAT.md) and the [fmsave reader](https://github.com/rhiever/fmsave) (FM26 support).
- On the private AFE fixture, 793/793 indexed member extents were inspected at offsets 0, 8, 16, 24 and 32: **no** Zstandard frame (`28 b5 2f fd`), LZ4 frame (`04 22 4d 18`), gzip, xz, bzip2, or valid zlib CMF/FLG header at these exact sampled positions. This does **not** rule out an unframed stream, encrypted stream, alternate offset, or unsupported codec.
- `scripts/afe-frame-signatures.mjs` repeats these bounded signature checks and labels all results **signature-only**, not decompression success. It returns counts, not raw save data.

A correct AFE decoder still requires independently confirmed payload framing, full input consumption, expected output length, and semantic validation of at least one record before exposing player/CA/PA data.

### Independent AFE envelope report and cross-save validation (2026-10-30)

A February 2019 reverse-engineering question independently reported exactly the `02 01 61 66 65 2e` AFE header and `10 00 00 00 10 00 00 00` section delimiter in an FM tactics `.fmf` file, as seen in this project's AFE save sample. Its author reported that re-saving the *same tactic* changed the payload bytes. This is a **third-party observation** for a related AFE-family file, *not proof* of which encryption/compression mechanism the save uses: [Reverse Engineering Stack Exchange — x64dbg: locating where data is initially written](https://reverseengineering.stackexchange.com/questions/20614/x64dbg-locating-where-data-is-initially-written).

The two local private sample paths `Untitled Game (v03).fm` and `Untitled Game (v03)_2.fm` were confirmed byte-identical (same SHA-256 and size). They **cannot** establish a re-save randomization property. No digest or private bytes are committed to the repository.

`node scripts/afe-cross-save.mjs <first-local.fm> <second-local.fm>` is a new read-only bounded research utility. It rejects identical inputs before any payload inspection; otherwise validates each AFE index, compares at most 32 same-named member pairs using at most 64 bytes per member, and returns equality counts without payload bytes or hashes. Two distinct saves may contain different actual *game data*, so byte differences alone still cannot distinguish compression from encryption or randomization. The strongest future controlled experiment is to save the **same unchanged in-game state twice** to different files and then run this tool.

### Cross-save evidence: stratified sampling (2026-10-30)

The initial cross-save comparator read only the first 64 bytes per member. This was insufficient: two members can share the same prefix and differ later. The comparator now samples at most **64 bytes at each of the start, midpoint, and end** (192 bytes per paired member per file), deduplicating overlapping windows for short members. It reports per-region agreement and marks every comparison `evidence: sample_only`. Even when all sampled windows agree, **full member equality is not established**. File-wide duplicate detection still uses complete SHA-256 before any archive inspection. For a controlled experiment, save exactly the same game state twice, without advancing time or changing game data, and use two independently generated files.

### Complete bounded member digest evidence (2026-10-30)

The three-region (start/middle/end) 64-byte sample is intentionally **insufficient** to prove that two indexed member payloads match: changes can occur between windows. The cross-save comparator now computes full SHA-256 digests of each same-named, same-stored-size member selected for comparison, **only if each member is at most 8 MiB**. Bytes are read in 64-KiB chunks and the digests remain local to the comparison; the JSON output exposes only `completeMemberHashMatch: true | false | null` and the algorithm name. `null` means lengths differ or the size cap prevents full comparison. A SHA-256 match is strong full-payload equality evidence (with the standard cryptographic collision caveat), **not** evidence that the game state or decoded records are semantically identical. The cross-save tool still caps comparisons at 32 matched names and refuses byte-identical whole files.

### Cross-save pair selection and evidence coverage (2026-10-30)

Comparison pairs must have the same **indexed name and stored byte count**. Previously, members of unequal lengths could be compared using unrelated relative sample windows, and the 32-smallest-entry selection could omit `game_info.dat` and `save_game_summary.dat`. The local comparator now prioritizes those two names, then chooses smallest equal-size candidates deterministically. It reports total common names, unequal-size pairs (excluded from content comparison), selected pairs, omitted eligible pairs, and names unique to either save. The reported results apply **only to selected pairs**, not all 793 observed entries. Byte equality remains storage-level evidence, not player or game-state validation.

### Index-only inspection for cross-save research (2026-10-30)

Cross-save comparison needs only the archive directory's validated offsets, lengths and names. Previous comparisons called the full experimental inspector **twice**, triggering an envelope census, frame signature census, gap audit, size cohort sampling and codec probes for each file before performing any pair comparison. `inspectLocalArchive(path, { indexOnly: true, includeMemberIndex: true })` now stops immediately after validating the trailing compressed directory and its member extents. The full inspector's default behaviour is unchanged. In index-only mode, member extents are still omitted from results unless explicitly opted in with `includeMemberIndex: true`. This saves redundant reads without changing the byte-level evidence or claiming payload decoding.

### Strict experimental AFE member decoder (2026-10-30)

`scripts/afe-validated-decode.mjs` is a **read-only experimental decoder boundary**. For a bounded member payload (up to 256 KiB), it tries zlib, raw DEFLATE and gzip at offsets 0, 8, 16, 24 and 32. It **only returns decoded bytes internally** when a candidate consumes all supplied compressed input *and* exactly matches the catalogue's reported decoded byte count; if none pass, it returns `unsupported_codec`. If more than one candidate passes, it returns `ambiguous_codec` with no decoded bytes. It is **not** a validated AFE algorithm or a semantic game record parser. The local batch research JSON includes only candidate status/codec/offset/byte counts, never the decoded payload.

In synthetic AFE archive regression fixtures, the decoder correctly returns the original bytes when an eight-byte envelope wraps a standard zlib stream. The private real AFE sample still has **no confirmed decodable player or CA/PA payload**. The small raw member examples (e.g., stored 57 bytes, directory-declared 9 or 17 bytes) underscore that a shared 8-byte header does not establish a codec. Never expose synthetic success as proof of real-file support; no file mutation or save editing is implemented.

### AFE decoder acceptance and decompression budget (2026-10-30)

The experimental member decoder now requires the **observed eight-byte AFE member envelope** (`10 00 00 00 10 00 00 00`) before trying any codec. A valid standalone zlib/gzip stream without that envelope is not misclassified as a compatible AFE member; it returns `invalid_envelope`. This is a scoped observation from the available save family, **not** a general AFE specification. The decompressor's `maxOutputLength` is now the member's declared decoded byte count, not the broad global 2 MiB limit, so tiny members fail promptly when candidate output exceeds the declared limit. Full input consumption, exact output length, single candidate and a matching envelope remain prerequisites for any `validated_stream` result. None of this claims decoding success on the private authentic AFE fixture; the unknown codec remains the primary blocker.
