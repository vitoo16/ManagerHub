# Verification and reproducibility

Date: 2026-10-30. **Static research/tooling checks passed; no real-game reader/editor validation was performed.**

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

Independent review found and corrected output-path alias risks (existing hardlinks/junctions and the local installation's8.3 name). Final audit command: `node C:\Users\viett\.codex\visualizations\2026\10\30\01a18c2c-5b30-7ac2-841d-290449543b12\check-fmrte-evidence.cjs`. It verified47 discoveries against62 unique canonical records, both bundle digests,423 unchanged binary/configuration files and all report links/Evidence IDs. This audit script stays with the local evidence artifacts.

For REA, select exact type names, request inspect_managed_members(detail:summary), then inspect_analysis_view on the returned canonical parent Evidence ID. Retain signature, SHA/MVID/token/RVA/IL and coverage. Do not repeat the full-assembly request that exceeded its budget. Root and comparative agents exported separate session ledgers; Evidence IDs alone are insufficient without those bundles.

## Unexecuted real-data experiments

All are UNKNOWN / NOT RUN: FM2013 Load Game; known player/CA/PA/attribute consistency; one-field edit; FM save/reload persistence; restoration after write; offline .fm header/diff/decode/roundtrip. Exact FM2013 executable/build, disposable career and trusted same-player observations were not available in the checked locations. No user's main save was touched. [Next actions](08-next-actions.md) list the evidence needed.
