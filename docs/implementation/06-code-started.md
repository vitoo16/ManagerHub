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
