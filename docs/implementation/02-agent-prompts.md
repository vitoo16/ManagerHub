# ManagerHub — Ready-to-Run Agent Prompts (FULL PRODUCT, no MVP)

**How to use:** Give the coding agent the **MASTER CONTRACT** once. Then copy a phase prompt (01→07) into the same working repository. Phase prompts instruct the agent to write code, run checks, commit clean slices and produce evidence — **not merely propose another plan**. Skills are conditional on being actually installed; if absent, read their referenced official documentation and use original project skills without falsely claiming invocation. Team cooperation uses narrow non-overlapping ownership; implement parallel substreams only when contracts are stable.

## MASTER CONTRACT — Run once before Phase 1

```text
You are the lead engineer + system architect + product design engineer of vitoo16/ManagerHub.
Goal: IMPLEMENT THE COMPLETE MANAGERHUB PRODUCT with all MH-01..MH-27 functions; DO NOT create an MVP, reduced demo, placeholder production UI, or only a planning document. Build sequentially in the 7 medium integration phases in docs/implementation/01-full-delivery-plan.md.

Mandatory before writing code:
- Read AGENTS.md; docs/implementation/00-execution-charter.md; 01-full-delivery-plan.md; 03-liquid-glass-motion-spec.md; 04-motion-skills-and-references.md; docs/product/01-full-feature-catalog.md; docs/product/02-design-system.md; docs/business/README.md; docs/system/README.md.
- Identify available installed agent skills; activate the relevant ones for the task: official Vercel, Impeccable, official GreenSock GSAP, ManagerHub-specific skills; use Taste v2 `references/app-screens.md` for dashboard/app screens, alongside Impeccable Operate and Vercel; its public website mode is separate.
- Read, understand and preserve existing repo structure; search for reusable code BEFORE authoring new code.
- Write small, clean, typed modules. Follow SOLID where helpful, KISS, DRY, YAGNI, separation of domain/view/IO, single source of truth, strict TS/Rust lint and type checks. No duplicated types/formulas/charts/role mappings/GSAP hooks. Reuse a shared package if the semantics truly match, do not overabstract.
- Never use fabricated player CA/PA/statistics/transfer fees/shot events in production. eCA must be calibrated with verified labels, otherwise call it attribute-strength index. Never write unknown .fm formats or corrupt the original save.
- Implement Apple-inspired Liquid Glass on NAVIGATION/CONTROLS/overlays, not everywhere. Use opaque surfaces for dense football tables/charts. GSAP for meaningful Flip/formation/split-panel transitions; CSS for simple hover. Respect reduced motion, contrast, focus, touch and keyboard.
- Every delivered feature must work end-to-end with honest empty/unsupported states. Do not leave TODO/FIXME debt, dead buttons, mock production values, disabled failing tests or 'temporary' duplicate components. Do not promise absolute zero future debt; enforce zero accepted known avoidable debt.
- Enforce formatter/linter/types/unit/integration/E2E/a11y checks. Report exact commands run, pass/fail and blockers. Never claim tests ran unless executed.
- Make ADR only for material technical choices. Commit atomic verified changes with coherent documentation. If a tool/permission/resource prevents writing, report it accurately without claiming success.
- No request for new user choices when enough context exists: choose supported defaults, document assumptions and proceed. If a binary format is unsupported, preserve truthful unsupported status and continue independent core features; do not fake compatibility.

For each phase: inspect current repo -> produce small file/ownership/task map -> implement production code (parallel independent lanes if possible) -> integrate -> test -> browser inspect and screenshot for UI -> review duplication/debt -> update docs/feature checklist -> concise completion report with evidence and remaining verified limitations. Continue work through the currently assigned phase instead of stopping at the task map.
```

---

## PROMPT 01 — Architecture, CI, Liquid Glass & GSAP foundations

**Applicable skills:** `impeccable` (shape/animate/critique), `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `managerhub-motion-glass`, `managerhub-data-ux`, `gsap-core`, `gsap-react`, `gsap-timeline`, `gsap-performance`. `design-taste-frontend` v2 app-screen mode for the analytical workspace; read `references/app-screens.md`.

```text
EXECUTE PHASE 1 of docs/implementation/01-full-delivery-plan.md NOW. Read Master Contract and all cited docs.

Create a production-quality pnpm/TypeScript workspace with one shared React UI for browser and Tauri desktop (record ADR if evidence requires a different choice). Establish domain contracts for SaveSnapshot, Field<T>/provenance, PlayerKey, EditionBuild, RoleCatalog, DerivedMetric, TacticalScenario, ModelVersion, errors and ChartData. Set up Rust parser crate and secure desktop bridge skeleton with tested error results, but don't fake an imported save.

Design ManagerHub as a premium Apple-inspired Liquid Glass football workstation: dark/light, solid/opaque content and charts, selectively glass sidebar/header/menus/command palette, well-labeled numeric/contrast scales, responsive navigation, empty/partial/error/import states. Implement tokens and reusable GlassSurface/navigation controls exactly once. Study Apple HIG and Impeccable Operate. Build keyboard navigation, focus management and high-contrast/glass-off mode.

Build shared motion infrastructure using GSAP + @gsap/react with useGSAP context cleanup; CSS for trivial transitions. Create primitives for route/inspector transition, Flip layout, player-token movement and motion preference. Ensure reduced-motion and action interruption; no cinematic route delays or app-wide blur.

Set up formatting/lint/TS strict/Vitest/Playwright/axe/Cargo fmt+Clippy+tests/CI and a component preview with real state variants. Measure an initial performance baseline on real browser once app runs; fix all issues. Keep no duplicate UI trees or duplicate state stores. Stage commits in reviewable independent slices and run checks.

Deliver: runnable web+desktop shells if environment permits, shared design system/motion package, documentation, screenshots from actual app, passing quality gates. If Tauri toolchain/build unavailable, implement and test web/shared code, explicitly identify unmet desktop validation; do NOT claim Tauri ran. No MVP shortcut.
```

## PROMPT 02 — Verified Save Reader, Prove Coverage & Player Explorer

**Applicable skills:** `managerhub-save-safety`, `managerhub-data-ux`, `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`; Impeccable harden/critique for explorer UI.

```text
EXECUTE PHASE 2 from docs/implementation/01-full-delivery-plan.md with the Master Contract. Inspect Phase 1 app/contracts and reuse them.

Build the real save ingestion system, no writable parser: family/edition/build detection, adapter registry, bounded Rust decoder workers, typed diagnostics, field coverage, immutable source hash and local SQLite snapshots. Investigate the user's documented afe. header as an unknown research family and independent FM26 fmf. format only with verified fixtures and primary sources. NEVER assume .fm suffix means compatibility. Build fixture corpus with version/build and game-verified player IDs/CA/PA/attrs; no private saves committed, no fake extraction.

Implement Save Manager UI: select local save, progress/partial/unsupported/corrupt outcomes, import coverage report, multiple saves and snapshots. Implement full Player Database Explorer with search, sorting, filters, multi-player compare, career identity, readable missingness and exports. All Field<T> metadata flows from decoder to UI; unknown is null not 0. No editing actions.

Run parser property/fuzz and malformed-input tests; compare extracted fields with actual known-good game values; test complete/partial/unsupported import workflows through Playwright. Keep original save byte-for-byte identical. UI must use shared Liquid Glass controls but opaque readable tables. Record exact supported versions and unsupported fields. Commit integrated code and acceptance evidence.
```

## PROMPT 03 — Player Intelligence, eCA, full scouting charts & explanations

**Applicable skills:** `managerhub-football-intelligence`, `managerhub-data-ux`, `impeccable` (shape/critique/harden/animate), `vercel-react-best-practices`, `web-design-guidelines`, `gsap-react`, `gsap-performance`.

```text
EXECUTE PHASE 3 fully, after reading the Master Contract, Player Intelligence system spec docs/system/08-player-intelligence-engine.md and product page docs/product/04-player-intelligence-ux.md.

Build integrated player profile tabs Overview/Abilities/Positions & Roles/Performance/Tactical Fit/Development/Compare/Evidence and 3 strengths/3 weaknesses based on actual attributes and current role. Implement an explainable attribute strength baseline; train/test an eCA estimator on real verified same-edition CA labels ONLY if a sufficiently reliable corpus exists. Report MAE, holdout calibration, GK/outfield and positional errors and intervals. Otherwise label an attribute index; do NOT invent 1–200 eCA or exact PA.

Implement version-specific role requirements, position familiarity vs role fit vs tactical fit; change selected role recomputes strengths/weaknesses without changing Actual CA. Build a reusable Chart/Data registry and components for attribute radar, bars, role fits, position map, longitudinal change and valid percentile comparisons. Event-based shot maps/pass networks/touch heatmaps only when match-event positions exist; never synthesize them from attributes.

Implement comparable candidate panels, bookmarks, source evidence and export, with Realism Mode permission boundary also in backend and AI retrieval. Make charts accessible with tabular equivalents and cohort/sample/units. Use restrained GSAP only for meaningful report/compare state; avoid animation that falsifies chart interpretation.

Run tests for unknown CA/PA, coverage, eCA data leakage, GK/outfield, role weighting and chart missingness. Browser-audit screens at desktop/tablet/mobile and reduced motion with actual screenshots. No placeholder production data or duplicated scoring algorithms. Commit the complete Phase 3 integration.
```

## PROMPT 04 — Tactical Lab, role interactions, Squad Planner 2.0

**Applicable skills:** `managerhub-football-intelligence`, `managerhub-data-ux`, `managerhub-motion-glass`, `gsap-core`, `gsap-react`, `gsap-plugins` (Flip/Draggable), `gsap-performance`, `vercel-react-best-practices`, `impeccable` (animate/critique/harden).

```text
EXECUTE PHASE 4 and Master Contract, reuse the same canonical PlayerKey/RoleCatalog/DerivedMetric/SquadScenario types and shared components.

Implement a version-aware Tactical Lab for in/out-possession shapes (when supported), pressing/block/defensive lines, build-up, final-third, transition and rest-defence rules; interpret tactics using transparent football heuristics, not FM match-engine internals. Make an accessible tactical pitch with drag-drop, keyboard alternative, phase switch, roles and lineup variants. Use scoped GSAP Flip to animate the SAME players between possession/defensive shapes and Draggable only if compatible with accessibility; properly revert on unmount, interrupt and reduced-motion.

Build an actual constraint-based XI optimizer: exactly 11 eligible unique players, phase-specific slot suitability, partner interactions, warnings, registration/availability when known. Provide Best-Ability / Balanced / Rotation / Opponent-if-data alternatives, depth charts, position coverage, youth opportunities and succession. Reassigning player RW->RB recomputes RW and the entire XI; no ghost occupancy.

Implement tactical recommendation/explanation and scenario save/compare, linked directly to Player Intelligence. Prepare functional set-piece model/roles without false final editor UI. Keep all football algorithms pure and testable, no duplicated role scoring in components.

Test conflict examples (two attacking fullbacks, exposed high line), unique lineup and solver infeasibility, FM edition isolation, keyboard and GSAP cleanup under rapid toggling. Deliver all Phase 4 features integrated and visually refined according to Liquid Glass controls/opaque pitch. Commit evidence and tests.
```

## PROMPT 05 — Recruitment, Contracts, Finance, Youth, Training

**Applicable skills:** `managerhub-football-intelligence`, `managerhub-data-ux`, `vercel-react-best-practices`, `impeccable` operate/critique, `web-design-guidelines`; use GSAP only for real state transitions.

```text
EXECUTE PHASE 5, read Master Contract and docs/business B05-B07/B10, reuse Phase 3-4 engines; DO NOT implement new duplicate position-fit formulas.

Complete Recruitment Hub using current squad functional gaps: role needs, shortlist, candidate/incumbent comparisons, affordability, option Buy/Shortlist/Loan/Internal/Pass/Insufficient Data, uncertainty and reasons. Build Transfer+Contract planner with currency/wage-frequency/fees/instalment unknown handling, registration constraints where verified, contract runway and scenario cost. Build Youth Development with verified snapshot histories, role retraining, loan vs first-team minutes and succession. Build Training/Performance with workload/availability and fixtures, but no unsupported injury probability.

Integrate Football Finance with budgets, wage structure, forecast assumptions, sell/keep/renew choices, and What-if scenario engine. Changing player/cost/role should recalculate team allocation, roster gaps and budget, preserve scenario audit and never change original save.

Use shared currency formatter, metric definitions, data tables and charts. Test under-priced/missing fee, different wage periods, two-positional player opportunity cost, differing save patch versions and unknown finance. Run accessibility/visual/performance tests and finish all Phase 5 routes with nondecorative transitions. Commit verified work; do not ship placeholders.
```

## PROMPT 06 — Match Management, Club, Dynasty & AI Sporting Staff

**Applicable skills:** `managerhub-football-intelligence`, `managerhub-data-ux`, `impeccable` shape/operate/harden, `vercel-react-best-practices`, `web-design-guidelines`, `managerhub-motion-glass`.

```text
EXECUTE PHASE 6 and Master Contract. Build an integrated complete football-club management system using the same snapshots/scenarios/metrics.

Deliver Opposition Intelligence based on real observed opponents, pre-match Matchday Manager with XI/substitution/contingency plans, and Post-Match Analysis comparing plan to events; suppress xG/PPDA/shot maps if provider/event data unavailable. Add Club DNA, realistic strategic constraints, captain/leadership and dressing-room analysis (mark simulated behavior clearly), Boardroom goals, financial vs sporting tradeoffs, and Dynasty/Succession 1/3/5-season planner.

Build four optional evidence-grounded AI staff perspectives (Assistant Manager, Head Scout, Development Coach, Sporting Director) on a provider-neutral, local-first interface: tools are read-only analysis only; no raw hidden data to Realism Mode, no phantom facts, no direct save edit. UI gracefully degrades to deterministic non-LLM analysis offline. Add global dashboard, reports, longitudinal decision journal and deep navigation.

Use shared role/team/financial models, avoid parallel AI-specific copies and fake results. Test AI mode leakage, off-line fallback, opposition unknown, reporting source, budget and squad plan consistency; run browser screenshots and reduced-motion audit. Finish Phase 6 routes and commit all integrated behavior with documented limitations.
```

## PROMPT 07 — Set Pieces, Safe Editor, Integration & Full Release

**Applicable skills:** `managerhub-save-safety`, `managerhub-football-intelligence`, `managerhub-data-ux`, `managerhub-motion-glass`, all core Vercel/GSAP/Impeccable review skills.

```text
EXECUTE PHASE 7 as a FULL-PRODUCT release and audit of MH-01..MH-27, NOT an MVP, using Master Contract and full catalogue.

Complete accessible Set Piece Studio with role positioning and routine variants integrated into squad/tactical system. Build Advanced CA/PA/attribute editor ONLY for independently certified exact-build save formats: patch preview, explicit confirmation, immutable backup, temporary copy, independent reparse and semantic diff, actual in-game load proof and rollback. Batch editor inherits every safeguard. Uncertifiable binary families remain blocked with clear explanation, not fake edit success. Optional local game bridge only after separate version/protocol/permission certification.

Finish settings, version adapters, reports/export and plugins, consistent navigation across 27 modules, desktop/web packaging and release docs. Audit all source-backed player values, score intervals, Role Fit, money units, event-only charts, Realism vs Editor permissions, cross-scenario recomputation, data corruption handling. Run entire test suite (TS strict/lint/unit/contract/E2E/a11y/visual/Rust fuzz and roundtrip where supported), large save performance and GSAP stress tests on actual devices where available. Fix all known avoidable technical debt, duplication, orphan components, dead routes, poor keyboard flows, jank and visual regressions. Build signed installers if signing material/environment is provided; otherwise report blocker, do not invent release success.

Produce a feature-by-feature MH-01..MH-27 acceptance ledger and evidence, compatibility matrix and truthful restrictions, install/restore docs, real test commands/results and release artifacts. Do not declare full release if a key module remains nonfunctional; separate blocked capabilities with reasons and continue all feasible work to completion.
```

## Optional coordination prompt — parallel agents with strict file ownership

```text
Act as ManagerHub integration lead for the currently assigned phase. Read 00-execution-charter.md and 01-full-delivery-plan.md. Split only independent work into 3–4 agents with EXPLICIT non-overlapping package/path ownership and frozen typed data contracts. Lane A Rust+fixtures, Lane B domain+optimizer, Lane C React+UI/motion, Lane D tests/a11y/validation. Each lane produces tests and a PR; an integration owner reviews cross-boundary types, rejects duplicate logic, runs full CI and merges in small slices. Do not have multiple agents modify the same root config/AGENTS.md or shared model without integration ownership. Identify bottleneck and critical path, and minimize waiting by letting UI use versioned fixtures in tests only while parser matures. Never trade correctness/data integrity for parallelism. Report actual verified merged state vs planned.
```

## Optional final audit prompt — clean code / no avoidable debt

```text
Act as independent senior reviewer, not the feature implementer. Read ManagerHub charter and catalogue. Audit source for duplicated types/business rules/role weighting/formatters/chart wrappers/motion handlers, deep circular dependencies, hidden mode leakage, stale snapshots, malformed save exploit paths, hard-coded fake production data, unused deps, React rerenders, GSAP cleanup, keyboard/focus/contrast and accessibility. Prioritize actionable file:line findings with severity. Fix issues in small tested commits; do not refactor healthy code only for aesthetics. Run available lint/typecheck/unit/integration/E2E/Rust checks and report exact results, remaining risks and limitations. No claim of absolute debt-free future, but refuse known unreviewed preventable debt.
```
