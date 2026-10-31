# Verification and reproducibility

Updated 2026-11-01. **This chronological record starts with static-only research and later adds real live reads, reference comparisons and local snapshot normalization. No writer or production adapter is certified.** Initial 2026-10-30 results follow; later sections supersede their missing-input observations.

| Executed command / operation | Actual outcome | Meaning |
|---|---|---|
| REA binary_session and artifact/member/boundary/view tools | PASS: MCP6.7.0, managed providerv1 | Actual connection and static inspection |
| Whole-assembly FMRTE13 members | UNAVAILABLE:67,108,864-byte representation budget | Tool budget; exact type selections subsequently succeeded |
| Selected REA13/26 types | PASS, producer-scoped coverage | File-backed CIL/metadata references, not runtime branch coverage |
| Native provider analysis | NOT RUN: Ghidra/IDA unconfigured | No native export/implementation verification |
| PowerShell static-tools fixture test | PASS after final output-safety revision | Own compiled DLL: hash/MVID, expected call, token-shaped constant exclusion, extended opcodes/switch, directory/overwrite/hardlink/junction/installation-short-name refusal, input unchanged |
| PE inventory on installed primary binaries | PASS | Read-only metadata and coordinates; raw supplement outside repo |
| CIL reference scan on FMRTE13 | PASS, zero decode issues | Complete file-backed CIL scan for requested tokens; important sites corroborated by focused REA |
| Ten existing Node script suites | PASS:50 tests | Synthetic bounded archive/codec helpers only |
| npm.cmd run check | PASS | Typecheck;90 Vitest tests/15 files;50 Node tests; production build and bundle budgets |
| git diff --check | PASS | Whitespace only |
| Final manifest/bundle/source-hash audit | PASS |47 method locators match canonical Evidence; analyzed installation files unchanged |

Node26.7.0/npm11.19.0. First sandbox dependency installation was interrupted after no progress. Authorized retry with lifecycle scripts disabled completed: npm.cmd install --package-lock=false --ignore-scripts --fetch-retries=0 --fetch-timeout=20000. No dependency manifest/lockfile was changed. npm run check emitted an experimental localStorage warning but exited0; no failed test was suppressed.

The fixture test's hardlink creation was denied by the execution sandbox. Running the test with the authorized sandbox override passed, using only our generated DLL and links in a new temporary directory. A further guard-only regression checks the installation's8.3 alias without writing it. No FMRTE/game binary was executed. The final successful test retained its own fixture at C:\Users\viett\AppData\Local\Temp\managerhub-static-test-dd6987a6d2b949cab0836f1b9ef51bad.

No UI changed, so Playwright/visual tests were not run. No Cargo/native backend exists here; Rust checks are not applicable. Existing synthetic save tests do not establish Football Manager compatibility.

## Reproduce

PowerShell7/.NET with System.Reflection.Metadata, from ManagerHub. Choose fresh output paths: the tools refuse existing files, input replacement, installation destinations and reparse-point output ancestors. Run the link-creation fixture test where the host permits NTFS links.

```powershell
& ./scripts/fmrte-static-tools.test.ps1
& ./scripts/fmrte-pe-inventory.ps1 `
  -Paths 'C:\BraCa Soft\FMRTE 13\FMRTE.exe' `
  -OutputPath "$env:TEMP\managerhub-fmrte13-metadata-new.json"
& ./scripts/fmrte-cil-xrefs.ps1 `
  -Path 'C:\BraCa Soft\FMRTE 13\FMRTE.exe' `
  -Tokens '0x06000986','0x06000987','0x06000988' `
  -OutputPath "$env:TEMP\managerhub-fmrte13-references-new.json"
npm.cmd run check
```

Utilities use PEReader/MetadataReader, never Assembly.Load. Output is created atomically with FileMode.CreateNew, so existing hardlinks are not replaced. They report CIL decoding issues/partial coverage explicitly; they are research tools, not FM adapters. Reparse checks are ordinary local output safeguards, not isolation against a hostile concurrent filesystem attacker.

Independent review found and corrected output-path alias risks (existing hardlinks/junctions and the local installation's8.3 name). Final audit command: `node C:\Users\viett\.codex\visualizations\2026\10\30\01a18c2c-5b30-7ac2-841d-290449543b12\check-fmrte-evidence.cjs`. It verified47 discoveries against 62 unique canonical records, both bundle digests, 423 unchanged binary/configuration files and all report links/Evidence IDs. This audit script stays with the local evidence artifacts.

For REA, select exact type names, request inspect_managed_members(detail:summary), then inspect_analysis_view on the returned canonical parent Evidence ID. Retain signature, SHA/MVID/token/RVA/IL and coverage. Do not repeat the full-assembly request that exceeded its budget. Root and comparative agents exported separate session ledgers; Evidence IDs alone are insufficient without those bundles.

## Initially unexecuted real-data experiments

At the initial stage, NOT RUN: FM2013 Load Game, known player/CA/PA/attribute consistency, edits, persistence, restoration and offline player decoding. Later sections document actual Load Game/read/reference results; edit/persistence/restoration and offline decoding remain unexecuted. No real-game result is inferred from a synthetic memory fixture. No source save was modified.

## Executable-path follow-up

REA `inspect_pe_resources` and `inspect_managed_artifact(detail:summary)` on the supplied `fm.exe` passed: resource-tree inventory and PE32/x86/no-CLI classification respectively. `binary_session` confirmed responsive MCP6.7.0 and still-unavailable native providers. The existing PowerShell PE inventory tool independently agreed on size/hash/I386/no metadata. A read-only RT_VERSION literal check matched its REA payload digest. None of these tools executed the target or validated FM player data. The fresh evidence bundle and executable inventory are linked in the manifest; no application code changed, so prior application test results are historical and were not rerun for this metadata/documentation update.

## Real-save follow-up checks

`inspectLocalArchive` passed its bounded experimental directory checks on the selected private snapshot and two shipped tutorials (774/773/772 members). All 16 selected member payload trials per file remained unsupported. `compareLocalAfeSaves` compared snapshot/tutorial metadata: 752 shared names, 26 equal-size candidates compared, all 26 complete stored-member hashes differ. Source hashes before/after agree. Private raw outputs remain outside Git; source-module hashes, bounds, exact counts and limitations are in the sample report/local metadata. No .fm player-read success is inferred. The final audit covers 47 method discoveries, 2 executable observations, 65 unique REA records, 3 bundle hashes and 424 unchanged inventoried executable/configuration files, separately from save snapshot hash checks.

## Deep field/catalog follow-up

The historical counts above describe earlier runs. The new [arithmetic report](14-fmrte13-field-transforms.md) records 99,328 successful comparisons against an independent bounded interpreter of raw CIL, with mocked memory helpers. Public tests retain 90 synthetic oracle vectors, reject malformed/unresolved inputs, and verify all 6,291,456 full-word round trips. Target assembly code was never loaded or executed. Numeric results do not validate a native player record or safe writer.

Executed after adding the module to the standard test command: `npm.cmd run check` **PASS** — TypeScript check, 90 Vitest tests across 15 files, 55 Node tests (including 5 new arithmetic tests), production build and bundle budgets. A non-failing Node localStorage experimental warning remains from the existing test environment. No UI changed; browser/E2E/a11y screenshots were not run for this isolated numeric research change. No Rust backend exists to test.

The final deep bundle, canonical method coordinates and helper/oracle hashes are in the manifest. Re-run `node --test scripts/fmrte13-field-math.test.mjs` for portable numeric tests. The CIL interpreter/dumper and raw instruction files remain in the manifest's external local evidence directory; reproducing that comparison requires the exact installed binary and those local scripts. `Get-Process -Name fm,FMRTE` found no matching process during this follow-up; runtime player reads and write/reload tests remain NOT RUN.

The final evidence audit passed: 93 method discoveries, 2 executable observations, 96 unique canonical REA records, 4 bundle digests, 424 unchanged inventoried installation files and 3 unchanged save samples. All research report links and referenced Evidence IDs resolve. Numeric verification is an independent code-versus-CIL comparison, not an independent game-runtime review.

## User-named live-record experiment

[The later runtime report](16-fm2013-live-readonly-record.md) supersedes earlier NOT RUN entries for process attachment and a single candidate record read. REA/Frida actually attached to the user-opened game, discovered both supplied names through bounded reads, repeated identity/raw-field observations and successfully executed the reusable guarded probe. The generated script was run again after adding concurrent-field checks; both sessions were detached. Hidden abilities and independently displayed fields remain unverified, and no write occurred.

`npm.cmd run check` passed after the new suite:90 Vitest tests plus 60 Node tests, TypeScript and production build/bundle budgets. The external replay audit verifies exact source and binary hashes, probe output stability and explicit unverified flags. Private runtime values and session addresses stay outside Git. Screenshot comparison failed with the documented minimized/no-target errors; no visual verification is claimed.

The user's subsequent text confirmation matches all three displayed fields (ID, Passing and Pace) in the final retained REA observation. A local comparison script passed exact equality and recorded a hashed private receipt. This is one record with user-reported screen values, without screenshot/blinded comparison; Actual CA/PA remains unverified. This documentation/provenance update changes no executable code, so the application suite was not rerun. Evidence/receipt integrity and report links were checked.

## Bounded multi-record follow-up

The shared probe now also builds an anchor-derived scanner. Ten focused synthetic tests pass, including multi-record validation, exclusion of hidden ability reads, partial limits, failed chunks, chunk-boundary markers and duplicate IDs. `npm.cmd run check` passed TypeScript, 90 Vitest tests, 65 Node tests and production build/bundle budgets. [The live report](17-fm2013-bounded-player-discovery.md) records two real4,036-candidate scans with identical identities/addresses/tested attributes and a second user-text three-field comparison. The same-process repeats do not validate restart recovery, hidden abilities or whole-database completeness. Raw evidence stays outside Git; the Frida session was detached without killing the target.

## File-relative discovery and real restart — 2026-10-31

[The next report](18-fm2013-file-relative-discovery.md) executes a file-derived RTTI scan without input player addresses. All4,036 heap record addresses change after a user-driven process restart; identities and two tested attributes remain equal. Real wrong-locator rejection and a64KiB partial result are retained. Independent file-backed decoding identifies the local-version profile/mode declaration; runtime FMRTE selection remains unobserved.

`npm.cmd run check` passes 90 Vitest tests, 72 Node tests, TypeScript and build/bundle budgets. Independent agent source review finds no actionable issue and reproduces17 focused tests. Final evidence audit passes 128 method coordinates, 150 unique canonical records, eight bundle hashes, 424 unchanged inventoried installation files, three unchanged save samples and every report link/Evidence ID. Separate replay verifies generated-script hashes, native type metadata, the restart comparison and retained unverified flags. All raw player data remains outside Git; both owned Frida sessions are detached.

## Running FMRTE reference and two-class coverage

After explicit user approval, [the reference comparison](19-fm2013-reference-comparison.md) uses installed FMRTE13's Load Game/search/profile UI without editing data. Two native scans find4,036 Player plus 22 PlayerStaff records, 4,058 distinct IDs matching the displayed reference count. An opt-in49-field pass reads/repeats198,842 candidate cells. Three reference identities match 147 ordinary values and six decoded CA/PA values. Both a new image base and stale-PID refusal are observed.

`npm.cmd run check` passes 90 Vitest/74 Node tests, TypeScript and build/bundle budgets. Independent review reproduces19 focused tests; its dual-class stale-fixture gap is fixed and the affected19-test suite passes again. Private replay passes screenshot/receipt/source hashes, all 153 numeric comparisons, two-class uniqueness and capture-flag immutability. Final evidence audit passes 187 method discoveries, 165 unique canonical records, 11 bundle digests, 424 unchanged inventoried installation files, three unchanged save samples and all report links/Evidence IDs. Frida sessions are detached; FMRTE remains open for review. Reference matching does not enable production Actual CA/PA or writing.

## Complete capture and snapshot normalization — 2026-11-01

[Report 20](20-fm2013-live-snapshot-contract.md) records a complete compact REA capture of 4,058 players, 49 ordinary fields and 15 position fields per row, plus 3,730 source-qualified club links and 328 unknown relationships. The earlier plain response was truncated and explicitly rejected. Complete transport is required before normalization; preview data is never accepted as a full capture.

`npm.cmd run check` passes TypeScript, 106 Vitest tests, 81 Node tests (187 total), production build and bundle budgets. Focused coverage includes exact-build/unknown-field rejection, duplicate IDs, immutable provenance/coverage, scan quotas, signed bytes, zero familiarity, changed fields, dual-contract Person binding, unknown club handling, compact transport failure and fresh-output/source-preservation checks. Realism tests verify all 49 ordinary ratings and 15 familiarity ratings are redacted before serialization; Editor retains provisional decoded values. Both modes keep CA/PA and contract fields null.

Independent source review identified and resolved an unbounded CLI `readFile` allocation between stat calls and missing evidence for exact ratings' manager visibility. The CLI now uses bounded reads through one opened handle, final size/mtime checks and strict UTF-8; Realism conservatively redacts every exact numeric rating while `scoutingKnowledge` is `not_decoded`. This is not a claim of atomic game capture or complete filesystem race isolation.

The complete real wire file was normalized into fresh Editor and Realism outputs, each `ready` with 4,058 provisional records. Private `verify-fm13-live-snapshot-final.mjs` passes and retains `fm13-live-snapshot-final-verification.json`:198,842 Editor ordinary cells and 60,870 position cells, with corresponding Realism redactions;3,730 club links and 328 unknown relationships;15 position UI comparisons, two contract-date comparisons and one displayed-club-name match. No zero position cell occurs in this real cohort; zero preservation is tested synthetically. Capture, source, CLI and output hashes are pinned. `ready` still means admission, not authenticated source/career identity or roster certification. The expanded manifest audit is separate from this replay.

The expanded evidence audit passes 270 method discoveries, two artifact observations, 185 unique canonical REA records, 14 bundle hashes and every research link/Evidence ID. All 424 inventoried installation files and three save samples retain their recorded hashes. The previous 187 discovery entries remain unchanged; 83 new method anchors are added. Two supplemental file-backed methods have no matching canonical REA record and are explicitly listed rather than presented as canonical anchors.

One dual-class Positions page matches 15 native values. A valid active FMRTE contract screenshot/UI Automation receipt supports two normally valid calendar-date matches and a wage/base ratio of 1.15. The ratio is inferred from one pair; configured currency/rate was not read, so normalized Money/contract fields remain unknown. An earlier occluded screenshot showed a different foreground surface while its accessibility text referred to FMRTE; it was not retained as the reference. FMRTE was activated and a matching image/tree recaptured. No field editing, Save Changes or activation control was used.

No product UI or browser/native bridge changed, so product Playwright/visual checks were not needed for this isolated pipeline. No Rust backend exists to check. Real wrong-build/access-denied/process-exit behavior, other careers, manager/scouting knowledge, offline player extraction, writing and persistence remain open. All owned Frida sessions were detached.
