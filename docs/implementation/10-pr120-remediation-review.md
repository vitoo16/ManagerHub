# PR #120 — Phase A remediation and development verification

## Windows follow-up

The Windows review started from `b837d725f72b1892c21e3af4512a77b6320916d8`, 38 commits ahead of `23cecd4907ab6ad648bb947186bc8cd68872b258` and zero behind. The full PR had 141 changed files. The previous Windows Release receipt for `4acade4` passed all ten stages and all ten log digests matched. That receipt applies to its own commit.

The standards and specification reviewers identified malformed decoded manager and hidden-trait records, stale export activation, missing batch-preset confirmation, incorrect labels for draft CA/PA, and an overly broad experimental writer gate. The follow-up validates nested records and reattachment dates, orders asynchronous export loads relative to save selection, previews bulk presets before applying them, and labels CA/PA draft values in Editor. Advisory RCA remains scoped to Editor-facing entry points and scenario warnings use the evaluator's PA validity rules. Coaching stars are labeled as estimates.

The production browser exposes Save As preview. The experimental writer now has a separate development-only entry point. Experimental copy generation is restricted to local development on saves whose metadata identifies the exact `13.3.3f359652` build, with source authentication and an explicit download action. The validated read profiles and source files remain usable for read and draft workflows. This restriction establishes no field-specific writer certification.

Windows real-save browser checks exercised a verified-read `13.3.3` career save and a distinct authentic FM2013 tutorial save with a provisional game-db version. Desktop and mobile checks covered one decode on first open, workspace navigation, record browsing, a CA draft and its Player Lab projection, Undo/Redo, Realism transitions, Save As preview, cancellation during a second decode, switching saves and draft isolation. Both original SHA-256 digests remained stable. Source files and screenshots are stored privately. Real-game writer readback and field certification remain separate gates.

The sections below record the earlier Linux pass.

Date: 2026-11-28. Status: **implementation candidate; awaiting independent review and Windows acceptance**. This is an engineering review record, not certification, an independent reviewer approval, or a feature-acceptance ledger promotion.

## 1. Candidate provenance

- Repository: `vitoo16/ManagerHub`; existing draft PR [#120](https://github.com/vitoo16/ManagerHub/pull/120), `feat/classic-editor-record-navigation`.
- Fetched `origin/main`: `23cecd4907ab6ad648bb947186bc8cd68872b258`.
- Starting candidate: `4acade4a9fc3c1d75de8dad3a607f4a7b5ef24b2`; merge base equals `origin/main`; 37 commits ahead, 0 behind; 128 changed files. Initial candidate worktree was clean.
- PR #120 was open, draft and not merged; no submitted reviews or review threads were available. Issues #114 and #117 remained open. PR #115 and research branches are untouched.
- The current execution environment is Linux, not the authorized Windows machine. The reported Windows 10/10 receipt (330 Vitest, 137 Node, 196 Playwright) was not available for the exact starting candidate and cannot establish acceptance of these changes.
- The existing archived cleanup work is based on a different source tree. It is preserved, not imported, rebased or deleted in Phase A.

## 2. Confirmed findings and bounded remediation

| ID | Priority | Finding | Resolution in this candidate |
| --- | --- | --- | --- |
| A-01 | P0 | Active decode IPC admitted structurally incomplete inspection metadata, progress outside the contract and mismatched decoded identities. | Admit only the expected envelope; validate canonical inspection metadata, stage/percentage and bounded error/notice; match save SHA, filename, size, timestamp, signature, family, edition and build. Fail closed on malformed or contradictory replies. Add transport regression tests. |
| A-02 | P0 | Re-selecting original content for a cache-restored session could discard its existing draft and undo/redo stack; restored writable records were not compared with fresh native records before original bytes were reattached. | Distinguish same-content reattachment from different-save activation. Compare source profile and all writable entity rows on reattachment from cache. Keep the immutable base, draft and history on exact same-content reattachment; require confirmation before switching to distinct decoded content. Reject divergent cached records without granting writer access. |
| A-03 | P1 | Save-open progress/cancellation and errors were available only in Save Library, even when started globally. | Share an accessible, cancellable progress component with the active workspace; preserve current session on abort or failed decode and suppress stale completion. Explicitly report unsupported opens. |
| A-04 | P1 | Read projections could incorrectly label unverified FMF/build data as verified. The signing-key control could suggest write availability for an unsupported read profile. | Derive evidence labels from compatibility metadata in player/staff projections and workspace badges. Prevent authorization/download for unverified read profiles. No expanded writable field set or certification. |
| A-05 | P1 | Editor/Realism exit and source transitions did not consistently clear local signing/lookup state. Save As did not give cache-restored sessions a usable explanation for reattaching bytes. Preset/discard notices could claim success before an accepted transaction. | Clear signing key on hidden-mode transition and reset transient state on source changes. Expose Save As preview with a disabled download and explicit original-file requirement where applicable. Avoid premature success claims; retain the required explicit save-copy action. |
| A-06 | P1 | RCA foot diagnostics inferred two-footed/preferred-foot information from an unobserved foot. | Return unknown/null for the diagnostic when either foot is unobserved. Preserve advisory numeric regression vectors; add partial-foot test. Auto Match remains unavailable; no PA adjustment. |
| A-07 | P2 | Skip link changed the application's hash route instead of focusing main content; quick-navigation trigger could open while editor dialog was active. | Focus and scroll the actual main region without replacing the route; disable the competing dialog trigger. Add keyboard-navigation regression. |

### Architecture reviewed

The supported path remains file selection → bounded decoding worker → validated native database → immutable SaveSession base → transactional draft overlay → mode-aware projection → workspace consumers → explicit experimental Save As. Workspace navigation does not request a new decode. Cache restoration is read-only until explicitly reattaching matching original bytes. Different save activation, removal and export-source selection are guarded; stale requests cannot commit after cancellation or source revision changes. No additional data source, replacement state architecture, writer offset, new entity field or product module was introduced.

Original raw `.fm` files are not written in place. Cache write-source comparison is an admission safeguard, not independent field-specific writer validation. The existing native-copy path remains experimental. The `verified` projection label refers only to the configured readable-profile evidence, not write certification or game runtime acceptance. FMF/unverified profiles remain provisional. Realism continues to redact protected data. Scope is restricted to confirmed defects identified against the available source; this is not a claim that the entire PR is defect-free.

## 3. Development verification (Linux; not Release CI)

Node v24.22.3, npm 11.19.1. Dependency tree reused from the existing checkout with identical lockfile SHA-256 (`d435f40b1719101efb38d5fea0b74e60fae17c928064e631dcaa13541eeb9056`) because offline install could not fetch uncached tarballs. No dependency or CI configuration was changed. Developer checks were executed after implementation; the initial test run found an empty localization key, which was corrected and retested. The Windows Release runner was not invoked on Linux.

| Check | Observed result |
| --- | --- |
| Lint | PASS (0 warnings/errors) |
| Workspace manifest/config format check | PASS |
| Strict TypeScript | PASS |
| Vitest | 333/333, 47 files |
| Node AFE tests | 58/58 |
| Node FM2013/research tests | 76/76 (includes RCA admission/regression) |
| Node CI provenance tests | 3/3 |
| Production build and unchanged bundle budgets | PASS; initial 448.7 KiB raw / 139.7 KiB gzip-sum against 450 / 150 KiB limits; largest JS chunk 213.6 / 65.9 KiB against 400 / 145 KiB limits; fonts 234.4 / 256 KiB |
| Playwright registration | 202 cases, 4 files (desktop/mobile); **not executed** |
| `git diff --check` | PASS |

The initial raw bundle has only 1.3 KiB of reported headroom. Keep this budget enforced; consider small, separately justified reductions later. Regression test additions cover malformed IPC, cache source mismatch, provisional profile, partial-foot diagnostics, original-byte reattachment/undo-redo, save-switch decline, cross-workspace cancellation and skip-link route continuity. Browser scenarios are authored and registered, not browser-verified: browser download was blocked in this environment and the system Chromium wrapper lacked a browser executable. No real screenshot, contrast, zoom, or browser-runtime acceptance is claimed.

### RCA evidence

- Synthetic validation: `synthetic-only`, exact regression numeric output preserved; calibration 2 admitted of 5 synthetic inputs, holdout 5 admitted of 6 synthetic inputs. Result fixture updated only for changed model source fingerprint, not to change the evidence level.
- Empirical validation: `missing-corpus` (expected exit 2), no eligible real corpus, no empirical accuracy or native parity claim.
- Model source SHA-256: `b5c29dbdd56056ec077a971b56f2f050616ac7bb8053d267ed50c91776f22f42`.
- Existing weight/admission rules, exact-build requirements, CA advisory isolation, and no automatic native CA/PA writes remain unchanged. No acceptance promotion.

### Historical Release receipts inspected

The following receipts are from Linux and different commits, therefore **not acceptance eligible for PR #120**. They failed during `playwright-install`; the remaining stages did not run. All available stage-log SHA-256 values were recomputed and checked against their own receipt. They are retained only to distinguish historical evidence from the current candidate.

**9d3f649348fde3e65b6a816d6742d28d5e267948** — summary SHA-256 `affb818dbdab9a1efa32c88876872f12bd7d511ece8cb333eff5430d1cccc775`; success `false`, acceptance eligible `false`.

| Stage | Status | SHA-256 (recomputed) | Match |
| --- | --- | --- | --- |
| install | passed | `ba307c24b2cafefdb406539207ce675d9a1d4177c2c709d8b699d46a86e2e235` | yes |
| lint | passed | `ab2de0f85f9dd8122f207b603d5ee344cd7418267429b40ce144a08b87a63e46` | yes |
| format | passed | `bb878e7f6bbb7076df6a1c119ef4efc95282d5d29cbe19be52fe61889b7f5fe6` | yes |
| typecheck | passed | `05fcd2b5d7d05a23aab6976a8ca9f683ccd6c0dee64b1da33b11589e0817e437` | yes |
| unit-and-node | passed | `f4def3e4d24581c1fa9f014185cad0c7b81de046fdc1832bfbd6c8395cb64f17` | yes |
| build-budget | passed | `5d6e85cefa0ae78b1d593a73c1949a3b93996d7cfb295267c5725ee0aa19a7b8` | yes |
| playwright-install | failed | `44ab11e4602cd678b2da35ccfa1ac9730224a32d95a2c1e6ca9cf082c50086bb` | yes |

**c0d6d9cf265ef2d07931b6a71b1d4ddc7ddc9b82** — summary SHA-256 `481ed25191b899b37a4400805179595caff9e9ec11c88460ac549f3e0a7231d0`; success `false`, acceptance eligible `false`.

| Stage | Status | SHA-256 (recomputed) | Match |
| --- | --- | --- | --- |
| install | passed | `ba307c24b2cafefdb406539207ce675d9a1d4177c2c709d8b699d46a86e2e235` | yes |
| lint | passed | `ab2de0f85f9dd8122f207b603d5ee344cd7418267429b40ce144a08b87a63e46` | yes |
| format | passed | `bb878e7f6bbb7076df6a1c119ef4efc95282d5d29cbe19be52fe61889b7f5fe6` | yes |
| typecheck | passed | `05fcd2b5d7d05a23aab6976a8ca9f683ccd6c0dee64b1da33b11589e0817e437` | yes |
| unit-and-node | passed | `ea12eabc57587d8249c2e03a372f629fee08a7347eeb333adfe91c1dc6104956` | yes |
| build-budget | passed | `0441d3e1655c1f03f72e672e2973ea9414d56c453c643db1b44b934fe1c8c778` | yes |
| playwright-install | failed | `44ab11e4602cd678b2da35ccfa1ac9730224a32d95a2c1e6ca9cf082c50086bb` | yes |

**4222456bc6e2011e58489a3de1fd471bbfee7a44** — summary SHA-256 `86cf31a40a9e5857719b82e4defe7fe852d1a2251376597f1d59e04396a7b1d2`; success `false`, acceptance eligible `false`.

| Stage | Status | SHA-256 (recomputed) | Match |
| --- | --- | --- | --- |
| install | passed | `9fb77a57bbaafc3e67bc7af7833f98d0f7a6924b5c250b38d968708b3bd31f23` | yes |
| lint | passed | `ab2de0f85f9dd8122f207b603d5ee344cd7418267429b40ce144a08b87a63e46` | yes |
| format | passed | `bb878e7f6bbb7076df6a1c119ef4efc95282d5d29cbe19be52fe61889b7f5fe6` | yes |
| typecheck | passed | `05fcd2b5d7d05a23aab6976a8ca9f683ccd6c0dee64b1da33b11589e0817e437` | yes |
| unit-and-node | passed | `83deb45b1b45ab17fd273eeba15888a19719126122211caaa4158e6c26529a03` | yes |
| build-budget | passed | `b27db5e181e38066d0c81ce7411016bac9302daaac86cc329f735e4a683fd8b5` | yes |
| playwright-install | failed | `44ab11e4602cd678b2da35ccfa1ac9730224a32d95a2c1e6ca9cf082c50086bb` | yes |

**53e31a2ac16ace7fca57512a61fa71383a8d28cb** — summary SHA-256 `252c365df51ab2bf32fefe20c84debea6bdb91d52b6a8d2a75af5d88fa04eb79`; success `false`, acceptance eligible `false`.

| Stage | Status | SHA-256 (recomputed) | Match |
| --- | --- | --- | --- |
| install | passed | `ae88883c9df75858b64d134a5aae2ce8bb01fb7c1ea0d31afddff205f22994af` | yes |
| lint | passed | `ab2de0f85f9dd8122f207b603d5ee344cd7418267429b40ce144a08b87a63e46` | yes |
| format | passed | `bb878e7f6bbb7076df6a1c119ef4efc95282d5d29cbe19be52fe61889b7f5fe6` | yes |
| typecheck | passed | `05fcd2b5d7d05a23aab6976a8ca9f683ccd6c0dee64b1da33b11589e0817e437` | yes |
| unit-and-node | passed | `600b2adeb8ad8c953f96fdb8bba3ce4e4fe3333960f65eabb5b94a20491cbc25` | yes |
| build-budget | passed | `a3c4974b566039c3fa396a73654d11fbad8c6ab491fe5f82991cf25634245b16` | yes |
| playwright-install | failed | `44ab11e4602cd678b2da35ccfa1ac9730224a32d95a2c1e6ca9cf082c50086bb` | yes |

### Development log fingerprints

These are local developer-check logs, not a Release receipt.

| Log | SHA-256 |
| --- | --- |
| lint-final.log | `ab2de0f85f9dd8122f207b603d5ee344cd7418267429b40ce144a08b87a63e46` |
| format-check.log | `bb878e7f6bbb7076df6a1c119ef4efc95282d5d29cbe19be52fe61889b7f5fe6` |
| typecheck-final.log | `05fcd2b5d7d05a23aab6976a8ca9f683ccd6c0dee64b1da33b11589e0817e437` |
| test-final.log | `dcffb5216dd38894968d63eb93647a8d579c7e9021ee4945f5ff345b508be90e` |
| build-final.log | `974b76284c82ad3cefe20ea8d8ec59d4145951f2979cf0330eb4ecbe0fa00faf` |
| playwright-list.log | `ff53093f2eb4f42b65fd88c7c927aa7012df6578afc433fc48524e3102bb90ce` |

## 4. Remaining acceptance gates and phase boundary

1. Independent reviewer must inspect the final candidate and resolve any remaining P0/P1 findings. This implementation review is not independent approval.
2. Exercise unified save-session acceptance with at least two authorized **real** FM2013 saves, including decoder invocation count, draft consumers, cross-save isolation, cancellation, unmodified source hashes, and writer readback/game reload where supported. No such files are available in this environment.
3. Perform the actual desktop/mobile, VI/EN, theme, keyboard, 200% zoom, overflow, reduced-motion and contrast checks. Authored tests are not evidence of execution.
4. On the authorized Windows workspace, fetch the exact clean final candidate, verify its SHA and run `node scripts/local-ci.mjs --profile release` once at the implementation handoff. Require all ten unchanged stages, `success`, `acceptanceEligible`, `cleanAtStart`, `cleanAtEnd`, `sameGitHeadAtEnd` and `sameInputsAtEnd` true; verify every stage log hash. Do not replace this with Linux checks.
5. Keep PR #120 draft and do not merge or mark any acceptance ledger entries Complete until these gates and merge authorization are satisfied. Phase C and later branches require the accepted main base; they are not started on this unaccepted draft. PR #115 remains open.

## Appendix A — complete starting candidate changed-file inventory

```text
M	.gitattributes
M	AGENTS.md
M	apps/web/src/App.tsx
M	apps/web/src/SquadWorkspace.tsx
M	apps/web/src/app.css
A	apps/web/src/download-content.ts
A	apps/web/src/features/AbilityBudgetFields.tsx
A	apps/web/src/features/DevelopmentScenarioLibrary.tsx
A	apps/web/src/features/PlayerAttributeTable.tsx
A	apps/web/src/features/PlayerDevelopmentPanel.tsx
A	apps/web/src/features/ReportPagination.test.ts
A	apps/web/src/features/ReportPagination.tsx
A	apps/web/src/features/RoleTargetSelector.tsx
A	apps/web/src/features/historical-snapshots/HistoricalCoveragePanel.tsx
A	apps/web/src/features/historical-snapshots/HistoricalEvidenceSelector.tsx
M	apps/web/src/features/historical-snapshots/HistoricalObservationComparison.tsx
A	apps/web/src/features/historical-snapshots/HistoricalPlayerDetail.tsx
A	apps/web/src/features/historical-snapshots/HistoricalSnapshotList.tsx
M	apps/web/src/features/historical-snapshots/HistoricalWorkspace.tsx
A	apps/web/src/features/historical-snapshots/historical-format.ts
M	apps/web/src/features/historical-snapshots/historical-workspace.css
A	apps/web/src/features/player-attribute-fields.ts
A	apps/web/src/features/player-attribute-table.css
A	apps/web/src/features/player-development.css
D	apps/web/src/features/player-lab/components/AttributeRadar.tsx
A	apps/web/src/features/player-lab/components/FM2013RoleExplorer.tsx
A	apps/web/src/features/player-lab/components/PlayerAttributeSummary.tsx
M	apps/web/src/features/player-lab/components/PlayerCompare.tsx
A	apps/web/src/features/player-lab/components/PlayerContractProfile.tsx
M	apps/web/src/features/player-lab/components/PlayerDetails.tsx
A	apps/web/src/features/player-lab/components/PlayerHiddenProfile.tsx
M	apps/web/src/features/player-lab/components/PlayerReportTabs.tsx
D	apps/web/src/features/player-lab/components/RankedAttributes.tsx
A	apps/web/src/features/player-lab/components/RoleEvidence.tsx
M	apps/web/src/features/player-lab/components/RoleResults.tsx
M	apps/web/src/features/player-lab/components/ScoutRoleComparison.tsx
M	apps/web/src/features/player-lab/components/ScoutShortlistPanel.tsx
M	apps/web/src/features/save-library/SaveDatabaseExplorer.tsx
M	apps/web/src/features/save-library/SaveInspector.tsx
M	apps/web/src/features/save-library/save-database-explorer.css
A	apps/web/src/features/save-session/AdvancedMassEdit.tsx
A	apps/web/src/features/save-session/ClubEditorRecord.tsx
D	apps/web/src/features/save-session/EditorAttributeGroup.tsx
A	apps/web/src/features/save-session/EditorNumberField.tsx
A	apps/web/src/features/save-session/EditorRecordNavigator.tsx
A	apps/web/src/features/save-session/EditorRecordSections.tsx
A	apps/web/src/features/save-session/MassEditPlayerPanel.tsx
A	apps/web/src/features/save-session/NumericMassEditPanel.tsx
A	apps/web/src/features/save-session/PlayerEditorRecord.tsx
M	apps/web/src/features/save-session/SaveEntityEditorModal.tsx
A	apps/web/src/features/save-session/StadiumEditorRecord.tsx
A	apps/web/src/features/save-session/StaffEditorRecord.tsx
A	apps/web/src/features/save-session/editor-number.test.ts
A	apps/web/src/features/save-session/editor-number.ts
A	apps/web/src/features/save-session/editor-records.test.ts
A	apps/web/src/features/save-session/editor-records.ts
A	apps/web/src/features/save-session/mass-edit-plan.test.ts
A	apps/web/src/features/save-session/mass-edit-plan.ts
A	apps/web/src/features/save-session/numeric-mass-edit.test.ts
A	apps/web/src/features/save-session/numeric-mass-edit.ts
A	apps/web/src/features/save-session/numeric-mass-fields.ts
M	apps/web/src/features/save-session/save-session.css
A	apps/web/src/features/save-session/staff-attribute-fields.ts
A	apps/web/src/features/squad-planner/components/TacticalAnalysisPanels.tsx
M	apps/web/src/features/squad-planner/components/TacticalLab.tsx
M	apps/web/src/i18n/historical-vi.ts
M	apps/web/src/i18n/save-db-vi.ts
M	apps/web/src/i18n/vi.ts
M	apps/web/src/player-workspace.css
M	apps/web/src/squad-workspace.css
A	apps/web/src/useDialogFocus.ts
M	docs/domain/ca-pa-rca-research.md
M	docs/implementation/00-execution-charter.md
M	docs/implementation/05-feature-acceptance-ledger.md
M	docs/product/02-design-system.md
M	docs/product/04-player-intelligence-ux.md
M	docs/research/fmrte/25-fm2013-offline-save-decoder.md
M	docs/research/fmrte/26-fmrte13-complete-parity-matrix.md
A	docs/research/fmrte/FM2013-FM2026-COMPATIBILITY-MATRIX.md
A	docs/research/fmrte/FMRTE-FEATURE-PARITY-MATRIX.md
A	docs/research/fmrte/FMRTE26-REVERSE-ENGINEERING-REPORT.md
A	docs/research/fmrte/MANAGERHUB-RCA-IMPLEMENTATION-GUIDE.md
A	docs/research/fmrte/RCA-ATTRIBUTE-WEIGHTS.md
A	docs/research/fmrte/RCA-CALCULATION-SPECIFICATION.md
A	docs/research/fmrte/RCA-FOOT-ABILITY-RULES.md
A	docs/research/fmrte/RCA-POSITION-WEIGHTS.md
A	docs/research/fmrte/RCA-VALIDATION-REPORT.md
A	docs/research/fmrte/RCA-WRITER-EVIDENCE-AUDIT.md
M	docs/research/fmrte/README.md
A	docs/research/fmrte/RESEARCH-EVIDENCE-INDEX.md
A	docs/research/fmrte/fixtures/rca-empirical-manifest.json
A	docs/research/fmrte/fixtures/rca-synthetic-manifest.json
A	docs/research/fmrte/fixtures/rca-synthetic-results.json
M	docs/system/06-tactical-engine-role-fit.md
M	docs/system/08-recruitment-and-development.md
M	package.json
A	packages/domain/src/ability-budget.ts
A	packages/domain/src/development-scenario-library.test.ts
A	packages/domain/src/development-scenario-library.ts
M	packages/domain/src/fm2013-offline/projection.ts
M	packages/domain/src/fm2013-offline/writer.test.ts
A	packages/domain/src/football-role-registry.test.ts
A	packages/domain/src/football-role-registry.ts
M	packages/domain/src/historical-live-snapshot.test.ts
M	packages/domain/src/index.ts
M	packages/domain/src/live-snapshot.ts
A	packages/domain/src/local-content-hash.ts
M	packages/domain/src/player-analysis.ts
A	packages/domain/src/player-development.test.ts
A	packages/domain/src/player-development.ts
A	packages/domain/src/rca-diagnostics.ts
A	packages/domain/src/rca-editions.ts
A	packages/domain/src/rca-engine.test.ts
A	packages/domain/src/rca-engine.ts
A	packages/domain/src/rca-types.ts
A	packages/domain/src/rca-weights.ts
M	packages/domain/src/squad-plan-library.ts
A	packages/domain/src/staff-training.test.ts
A	packages/domain/src/staff-training.ts
M	packages/domain/src/types.ts
M	packages/ui/src/index.tsx
M	packages/ui/src/styles.css
A	scripts/rca-validation.mjs
A	scripts/rca-validation.test.mjs
M	tests/e2e/accessibility.spec.ts
M	tests/e2e/historical-snapshots.spec.ts
M	tests/e2e/offline-save-decoder.spec.ts
M	tests/e2e/shell.spec.ts
```

## Appendix B — remediation paths

```text
 M apps/web/src/App.tsx
 M apps/web/src/PlayerWorkspace.tsx
 M apps/web/src/decode-save-in-worker.test.ts
 M apps/web/src/decode-save-in-worker.ts
 M apps/web/src/features/player-lab/components/PlayerAbilitySummary.tsx
 M apps/web/src/features/player-lab/components/PlayerDatasetSummary.tsx
 M apps/web/src/features/player-lab/components/PlayerDetails.tsx
 M apps/web/src/features/player-lab/components/PlayerHiddenProfile.tsx
 M apps/web/src/features/save-library/SaveDatabaseExplorer.tsx
 M apps/web/src/features/save-library/SaveInspector.tsx
 M apps/web/src/features/save-library/save-database-explorer.css
 M apps/web/src/features/save-session/ActiveSaveToolbar.tsx
 M apps/web/src/features/save-session/PlayerEditorRecord.tsx
 M apps/web/src/features/save-session/SaveEntityEditorModal.tsx
 M apps/web/src/i18n/save-db-vi.ts
 M docs/research/fmrte/fixtures/rca-synthetic-results.json
 M packages/domain/src/fm2013-offline/fm2013-offline.test.ts
 M packages/domain/src/fm2013-offline/projection.ts
 M packages/domain/src/fm2013-offline/validation.ts
 M packages/domain/src/fm2013-offline/writer.test.ts
 M packages/domain/src/fm2013-offline/writer.ts
 M packages/domain/src/player-import.ts
 M packages/domain/src/rca-diagnostics.ts
 M packages/domain/src/rca-engine.test.ts
 M packages/domain/src/rca-types.ts
 M packages/domain/src/rca-weights.ts
 M tests/e2e/accessibility.spec.ts
 M tests/e2e/offline-save-decoder.spec.ts
?? apps/web/src/features/save-session/SaveDecodeProgress.tsx
?? apps/web/src/features/save-session/save-decode-progress.css
?? docs/implementation/10-pr120-remediation-review.md
```
