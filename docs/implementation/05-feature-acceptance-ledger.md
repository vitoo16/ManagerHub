# ManagerHub — 27-module implementation and acceptance ledger

**2026-11-03 — verified integration status, not release acceptance:** PRs #58–#66 are merged and the latest matching main run is [#41570701716](https://github.com/vitoo16/ManagerHub/actions/runs/41570701716) (TypeScript, unit/Node, build and browser jobs succeeded). Historical Snapshots supports a **manual** read-only REA-to-file handoff, browser worker import, separate Editor/Realism IndexedDB projections, cross-tab invalidation and async selection guards; it is not a native live reader. PR #66 provides explicit, cancellable confirmation for shared-projection deletion and whole-history recovery; its PR and main CI runs passed. This does not demonstrate successful restore from an irrecoverably corrupt record. Do not promote any MH-01..MH-27 module to Complete from these tests alone.

**Foundation quality gates:** PR #67 merged a generated npm v3 lockfile and migrated both CI jobs to `npm ci`. Its PR CI passed ([#41610824362](https://github.com/vitoo16/ManagerHub/actions/runs/41610824362)), and main CI passed ([#41611127818](https://github.com/vitoo16/ManagerHub/actions/runs/41611127818)). The next bounded lint/format change is in review: `typescript-eslint@8.72.1` cannot be installed normally against repository TypeScript `7.0.2` (declared peer `>=4.8.4 <6.1.0`); this is an observed npm ERESOLVE from [#41611333008](https://github.com/vitoo16/ManagerHub/actions/runs/41611333008), not a reason to force unsupported peer resolution or downgrade TypeScript silently. An isolated bootstrap ([#41611535697](https://github.com/vitoo16/ManagerHub/actions/runs/41611535697)) resolved exactly pinned `oxlint@1.90.0` and `prettier@3.9.10`. Proposed CI lint covers first-party app/packages/tests/scripts; Prettier currently checks workspace JSON/config only. Whole-source formatting and an ESLint-compatible TS7 parser are *still open quality gaps*; do not claim they are complete. Desktop/native process bridge and certified binary decoding/writing remain separately blocked by evidence.

**Acceptance summary (per module rows below):** 0/27 modules marked Complete; 7 have in-progress implementations (MH-01, 02, 05, 06, 11, 12, 27); the remainder are Not implemented. This count is based on the acceptance ledger, not a substitute for full manual product verification. The current CI checks TypeScript, Vitest, Node tests, production bundle and Chromium Playwright desktop/mobile; it does not certify native Windows process handling, Rust/Tauri integration, full WCAG audit or gameplay/CA/PA writing.


2026-11-03: the FMRTE/FM2013 research baseline is in main; the historical snapshot consumer is implemented on feat/fm2013-historical-consumer (PR #58). Bounded worker import, strict historical schema, separate Editor/Realism projections, local search/browse and persistence are covered by CI run #41490068166: TypeScript, unit tests, production build/bundle budget and desktop/mobile Playwright all passed. IndexedDB schema v4 also repairs incomplete v3 stores/indexes. This does not complete MH-01/03/05 or any delivery phase; no native reader, offline decoder, CA/PA or writer capability is certified.

2026-11-01: [local session lifecycle research](../research/fmrte/24-fm2013-local-session-lifecycle.md) connects actual host process identity, generated read-only script, REA capture and fresh Editor/Realism normalization for4,058 observed records. Historical-only output, opaque creation-time checks, expiry/token/script consistency and synthetic failure tests pass; full checks pass226 tests/build. Product watcher/IPC, trusted current availability, career identity, full source coverage and writer certification remain unfinished. No module or delivery phase is marked complete.

**Status as of 2026-11-01:** some modules have **partial production code** plus isolated live-reader research; the full 27-module scope remains incomplete. Do not change to Complete without integrated code, tests, UI and acceptance evidence. This is a planning tracker, not claims of available features.

[Dated-cohort research](../research/fmrte/23-fm2013-game-date-calendar-age.md) adds repeat-bracketed native game date and4,058 explicitly derived calendar ages in Editor, with Realism age redaction. One fresh FM date screenshot and three earlier FMRTE age headers match selected results. Four computed cohort formula/model disagreements are not four UI comparisons. Full checks pass208 tests/build; no module/phase or production capability is marked complete. Manager visibility, atomic career identity, lifecycle coverage and reviewed local product ingestion remain open.

**Do not build an MVP:** all modules are in full-product scope. Each is assigned to the earliest phase where it becomes fully integrated; foundational work in earlier phases can be reused. Canonical [7-phase plan](01-full-delivery-plan.md), [agent prompts](02-agent-prompts.md).

| ID | Module | Integration phase | Dependency | End-to-end exit criterion | Initial status |
|---|---|---:|---|---|---|
| MH-01 | Save Manager/Reader | 2 | Parser, provenance | Import verified compatible save; explain unsupported and error; immutable original | **In progress:** bounded signature/archive index plus opt-in metadata-only IndexedDB persistence (schema v2); version-specific player decode remains unimplemented |
| MH-02 | Player Database/Explorer | 2–3 | MH-01, domain | Search/filter/compare/export with native field evidence and modes | **In progress:** HTML/CSV/TSV player list and source-backed attribute display; no native save database decode |
| MH-03 | Advanced Editor | 7 | Certified exact-build writer | CA/PA patch preview/backup/diff/reparse/game load/restore, unsupported disabled | Not implemented |
| MH-04 | Player Development History | 3 | Identity, snapshots | Cross-season attribute trend with edit/version markers | Not implemented |
| MH-05 | Data Integrity/Compatibility | 2 | Format test corpus | Coverage/corruption report + hashed original, no guessed fields | **In progress:** SHA-256, signatures, bounded archive index, metadata validation and explicit local persistence; exact-build verification corpus remains open |
| MH-06 | Player Intelligence/eCA | 3 | MH-02, labels | Explainable eCA or attribute index, roles, strengths, charts and confidence | **In progress:** attributes radar, strength index and role heuristic; eCA not calibrated |
| MH-07 | Tactical Lab | 4 | Roles, MH-06 | Two-phase board where edition supports; keyboard, saving scenarios | Not implemented |
| MH-08 | AI Tactical Advisor | 4/6 | Rules, AI adapter | Grounded recommendations with impact/alternatives and safe unknowns | Not implemented |
| MH-09 | Role Intelligence | 4 | Role catalogs, scoring | Individual-vs-collective distinctions, partner conflicts and causes | Not implemented |
| MH-10 | Set Piece Intelligence | 7 | XI, match and roles | Corner/free kick/throw plans and matchup rules work end-to-end | Not implemented |
| MH-11 | Squad Planner 2.0 | 4 | Tactical optimizer | Best/rotation/coverage/opponent XI, no duplicated player slots | **In progress:** 4-3-3 / 4-2-3-1 unique-player role-fit assignments, strict eligibility, pin/exclusion constraints and A/B comparison; tactical and match constraints pending |
| MH-12 | Recruitment & Scouting | 5 | MH-06/11 | Need-driven candidate compare and defensible Buy/Pass alternatives | **Early integration in progress:** same-export sensitivity preview compares best-fit XI with/without a selected player; no verified club gap, fees, wages, contract, registration or transfer verdict yet |
| MH-13 | Transfer/Contracts | 5 | Finance/contract fields | Transfer and wage scenarios, renewal/loan/sell alternatives | Not implemented |
| MH-14 | Youth Development | 5 | MH-04/11 | Development path, loan/retraining/succession linked to team | Not implemented |
| MH-15 | Training/Performance Centre | 5 | Match+fitness data | Workload/rotation and availability, no false medical prediction | Not implemented |
| MH-16 | Opposition Intelligence | 6 | Match data/tactics | Opponent dossier based on observed data and unknown handling | Not implemented |
| MH-17 | Matchday Manager | 6 | Squad/tactics | Plans A/B/C, subs, availability and contingency linked to scenario | Not implemented |
| MH-18 | Post-Match Analysis | 6 | Event coverage | Plan-vs-actual report, source-backed metrics, no invented xG maps | Not implemented |
| MH-19 | Club DNA/Philosophy | 6 (schema in 4) | Tactics, board | Preferences/constraints affect scenario and plans | Not implemented |
| MH-20 | Dressing Room/Leadership | 6 | Players, club | Captain/hierarchy context, modeled reactions clearly labeled | Not implemented |
| MH-21 | Boardroom/Strategy | 6 | MH-19/22 | Goal tradeoffs, club objectives and progress scenarios | Not implemented |
| MH-22 | Football Finance | 5–6 | Contract + club | Wage/cash/cost forecasts with units and uncertainty | Not implemented |
| MH-23 | Dynasty/Succession | 6 | MH-11/13/14 | 1/3/5-year continuity, successor and cost scenarios | Not implemented |
| MH-24 | AI Sporting Director/Staff | 6 | Domain + permissions | Four evidence-grounded perspectives and offline fallback; no writes | Not implemented |
| MH-25 | What-if Simulator | 4–5 | Optimizer/finance | Buy/sell/retrain/shape changes recompute whole system | Not implemented |
| MH-26 | Dashboard/Reports | 3–6 | All analytics | Complete data-source-aware overview, export, season review | Not implemented |
| MH-27 | Integration/Plugins/Personalize | 1–7 | App shell/services | Format plugins, private storage, settings, role weights and integration review | **In progress:** opt-in IndexedDB player exports and save-inspection metadata (schema v2); desktop/plugin architecture pending |

## How to update
Per module record:
- status: Not implemented / In progress / Needs verification / Complete / Blocked by compatibility;
- commit/PR and exact code paths;
- supported editions/builds and coverage;
- business rules, input/output contracts and missing-state UI;
- test commands, result IDs, browser screenshots if visual, security/a11y review;
- source of model/metrics and known limits;
- quality reviewer and date.

A format-specific capability may be **Blocked by compatibility** even while other functionality is completed. **Blocked must never be mislabeled Complete**. Full release requires a truthful capability matrix and tested coverage, not claims that every FM binary format is editable.

## Shared checklists for every module
- [ ] Reuses canonical types and existing shared components; no duplicate business rules.
- [ ] Fully integrated, no dead buttons/stub routes or fake production football data.
- [ ] Handles no-save, partial, missing field, corruption, unsupported edition, offline, mode and stale scenario.
- [ ] Valid tests: unit/contract/integration/E2E/a11y as applicable, actual commands logged.
- [ ] Visual motion/glass bounded; reduced-motion and keyboard equivalents.
- [ ] Original save untouched unless a certified, user-confirmed writer.
- [ ] Docs updated, evidence recorded, code review and no accepted known avoidable technical debt.

**Skill routing:** [skills research](04-motion-skills-and-references.md), [master execution prompt](02-agent-prompts.md), [charter](00-execution-charter.md).

## Actual implementation proof

2026-11-01: [the live snapshot contract](../research/fmrte/20-fm2013-live-snapshot-contract.md) adds a shared exact-build profile, guarded position/club reads, complete compact transport, strict immutable domain parser and fresh-output local Node CLI. The real capture normalizes 4,058 provisional players, 49 ordinary / 15 familiarity fields per row and 3,730 qualified club links. Realism redacts all exact ratings while manager/scouting knowledge remains unknown; CA/PA and contracts stay null. `npm.cmd run check` passes TypeScript, 106 Vitest / 81 Node tests (187 total), build and bundle budgets. MH-01/02/05 gain demonstrated research foundations, not product native support; MH-03 remains unimplemented. Product IPC/storage/projection/UI, broader career/build validation, offline decoding and writing remain unfinished. No module is promoted to Complete.

Initial 2026-10-30 stage: [FMRTE REA investigation](../research/fmrte/README.md) added source-identified static read/write evidence, separate13/26 inventories and read-only metadata/CIL tooling. No product native player-data, Actual CA/PA or writer support was enabled. Later live research narrows the read-validation gap; game-save write/roundtrip remains open. Module statuses remain unchanged.

The early user-path follow-up identified [local executable metadata/hash](../research/fmrte/10-local-fm2013-executable.md) as `13.3.3f359652`. [Real save samples](../research/fmrte/11-fm2013-save-samples.md) verified experimental AFE indexing, not member/player decoding. Later reports add runtime/known-player research; offline decoding and write roundtrip remain open. No native product capability is promoted.

Deep REA follow-up adds [isolated field arithmetic](../research/fmrte/14-fmrte13-field-transforms.md): 99,328 comparisons against a separate file-backed CIL interpreter and 6,291,456 exhaustive word round trips pass. Mutable profile slots and read-only alternate stream semantics are traced. This fulfills a research implementation step; MH-01/03/05 native reader/Actual CA/PA/editor acceptance remains open pending real entity/build validation.

[A subsequent REA live experiment](../research/fmrte/16-fm2013-live-readonly-record.md) reads a user-named player candidate repeatedly and executes the new identity/stale-checking read-only research probe. Independent displayed-field and hidden-ability comparisons remain pending. No native reader/editor module is marked complete or supported.

The user's later in-game text confirmation matches ID, Passing and Pace for that record. This establishes a three-field acceptance subset on one named player; hidden CA/PA, broader record/profile coverage and all writer acceptance remain open. No full module or future phase is marked complete.

[Bounded REA discovery](../research/fmrte/17-fm2013-bounded-player-discovery.md) adds a second three-field user-text comparison and two identical4,036-candidate scans from different anchors in the same process. Shared research code now has byte/time/record/match ceilings and explicit partial/fault handling;10 focused tests pass, alongside the standard155-test check/build. This advances research acceptance only: MH-01/03/05 remain incomplete, with hidden abilities, restart-safe discovery, full database coverage and writing unresolved.

2026-10-31: [file-derived RTTI discovery](../research/fmrte/18-fm2013-file-relative-discovery.md) removes supplied player addresses and passes one actual restart comparison across4,036 relocated records. Exact local-version profile strings/mode assignments are reproduced statically. Standard TypeScript/tests/build pass (162 tests); independent source review and 17 focused tests pass. This resolves a research restart requirement, not MH-01/03/05 completion: hidden-ability ground truth, full field/type coverage, offline parsing and certified writing remain open.

[Authorized reference comparison](../research/fmrte/19-fm2013-reference-comparison.md) extends live research to 4,058 unique Player/PlayerStaff records matching FMRTE's displayed count, 198,842 ordinary cells read/repeated, and 153 numeric values matching three UI reference records. The shared reader gains typed dual-class support and an opt-in49-field source-era catalogue. Full check passes 164 tests/build;19 focused tests and independent review pass. This resolves the lack of any running-reference CA/PA comparison. MH-01/03/05 remain incomplete pending broader coverage, remaining domain contracts, reviewed ingestion, offline decoding and writing certification; no full module/phase is marked complete.

[Player Lab HTML/CSV/TSV import, attributes, roles and limitations](07-player-lab-and-export-import.md). Real import data remains local and user-supplied. Full CA/PA save decoding, role/position fit calibration and recruitment financial assessment remain open requirements.

Additional integration evidence: [opt-in local storage + role-fit lineup planner](08-local-library-and-squad-planner.md).


## Cross-cutting performance architecture

| Area | Status | Evidence / acceptance |
|---|---|---|
| Workspace code splitting | Implemented; CI passed (run #125, #41490068166) | Overview, Save Library, Player Lab, Historical snapshots, Squad Planner, Systems and Data & Trust use lazy imports with a translated loading fallback. Historical Vietnamese copy loads with its lazy workspace. |
| Feature component boundaries | Implemented; CI passed (run #125) | Player report/recruitment and Squad Planner presentation/editor components live in feature-scoped files. |
| Bounded large-roster rendering | Implemented; CI passed (run #125) | Player Lab uses a fixed-height virtual window and incremental loading; Playwright includes a 511-player regression case. |
| Main-thread workload | Implemented; CI passed (run #125) | CSV/TSV parsing and save inspection run in Web Workers. HTML import stays on the main thread because the current hardened parser relies on DOMParser. |
| Derived work and solver reuse | Implemented; CI passed (run #125) | Deferred search, normalized search indexes, memoized result components, per-plan optimizer memoization, repeated role-score reuse and WeakMap caching of unconstrained baselines. |
| Bundle regression guard | Implemented; CI passed (run #125) | Production build emits a Vite manifest and checks initial static asset and per-JS-chunk size budgets. |
| Measured runtime improvement | **Needs verification** | Do not claim a percentage improvement until CI passes and representative browser profiles are recorded. |


Initial2026-11-01 biography research: three guarded DOB reads matched earlier FMRTE receipts, while primary-nation layout was static-only. Original conservative date decoder passed3 focused tests; full check passed190 tests/build. See docs/research/fmrte/21-fm2013-biography-fields.md.

The [subsequent biography cohort](../research/fmrte/22-fm2013-biography-cohort.md) admits DOB/primary-nation evidence for all4,058 observed records through complete transport and fresh local Editor/Realism normalization. Three date/three nation-name values match previous UI receipts; native objects and broader career coverage remain uncertified. Realism redacts supplied biography; Editor fields stay provisional, no age/eligibility is derived and CA/PA/contracts stay null. Optional input preserves legacy captures; product IPC/storage/UI integration remains unfinished. Full check passes113 Vitest/84 Node tests (197), TypeScript, build and bundle budgets. No module or full phase is marked complete.
