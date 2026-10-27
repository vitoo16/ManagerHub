# ManagerHub — Full-Product Delivery Plan (7 integrated phases, NO MVP)

**Product requirement:** ALL 27 feature IDs in [catalogue](../product/01-full-feature-catalog.md). **No MVP or demo-only phase**, no artificial short feature list. Every phase is a medium-size set of production-grade vertical slices with a complete acceptance gate. Do not claim delivery dates without actual team and benchmark data. All phases share [execution charter](00-execution-charter.md), [Glass/Motion spec](03-liquid-glass-motion-spec.md), [agent prompts](02-agent-prompts.md), [agent skills](04-motion-skills-and-references.md).

## Whole program — architecture and dependency plan
```text
Phase 1: Architecture, CI, foundations, Liquid Glass Design System, Motion
        |
Phase 2: Format-safe save adapters, snapshots, domain, explorer
        |
Phase 3: Player Intelligence, calibrated eCA, football charts, role analysis
        |
Phase 4: Tactics, in/out phase board, Squad Planner and optimizer
        |
Phase 5: Recruitment, transfer/contract/finance, youth/training/development
        |
Phase 6: Match & opposition, Club DNA, leadership/boardroom/dynasty, AI staff
        |
Phase 7: Set-pieces, advanced editing if certified, all 27 integration,
         full release QA / interoperability / packaging / performance
```
Overlapping **approved independent** work may start earlier: e.g. Phase 3 role math alongside Phase 2 parser (using versioned known-good fixtures), Phase 4 pitch UI alongside Phase 3 models. Never depend on invented save data in production to make concurrency appear complete.

## Phase 1 — Foundation & Visual Identity (MH-27 platform basis; all modules depend on it)

**Goal:** Create the shared production workspace, typed boundaries, original Apple-inspired Liquid Glass UI and GSAP motion infrastructure, with real test/quality automation.

Work packages:
- A1 Repository: pnpm workspace, apps/web+desktop, packages/ui/domain/football/charts/motion, Rust save crates, baseline scripts, pinned lockfiles and ADRs for tooling, runtime and data storage. Prefer a **single shared React UI** used by web and Tauri.
- A2 Architecture contracts: stable PlayerKey, Snapshot, Field provenance, model version, role catalog interface, explicit error taxonomy, adapter capabilities; no duplicate schemas in UI/Rust/TS; define serialization and code generation/contract tests where cross-language boundaries exist.
- A3 Liquid Glass system: dark/light/high-contrast tokens, semantic GlassSurface/Navigation/Menu, opaque data panels, typography and icons, nav/sidebar/command palette, save selector, app shell, overlay stacking/focus.
- A4 Motion system: CSS vs GSAP ownership, useGSAP lifecycle, safe timeline facade, Flip, formation animation prototype with keyboard alternative, reduced motion and glass-off preference, no unnecessary ScrollTrigger.
- A5 Quality baseline: Vitest, Playwright, axe/a11y, lint/typecheck/format, Rust fmt/clippy/test, precommit and CI workflows, screenshots baseline, logging/errors, testing fixtures & privacy checklist.
- A6 Integrate first genuine navigation and empty/error/loading/unsupported states (NOT a fake player explorer; demos isolated).

**Parallel lanes:** [workspace/contracts], [design tokens/components], [quality/test tooling] after stable interface review. Deliverables: bootable app shell desktop & web, reusable story/examples, robust working CI, motion guidelines, ADRs and acceptance screenshots.

**Gate:** no duplicated app UI; 100% interactive shell flows keyboard; reduced-motion/glass-off; clean build checks; robust empty states; no unreviewed lint warnings; no code added merely to satisfy screenshots.

## Phase 2 — Data & Save Compatibility (MH-01, MH-02 foundation, MH-04 snapshot, MH-05)

**Goal:** Safely import compatible saves, determine what can be read, and expose a reliable football domain without invented CA/PA. Sample `afe.` and independent `fmf.` are separate **unverified research lines**.

Work packages:
- B1 Corpus + detection: permissioned version/build test fixtures; hash, size, encoding, container header; known/unknown/corrupt classification; prevent decompression bombs and offset overflow.
- B2 Rust adapter framework: family/build registry, bounded workers, diagnostics, capability/coverage matrix, field-level provenance; per-domain player/team/tactic/match/contract/finance extraction when verified. An unsupported family does not equal a broken product but must be explicit.
- B3 Immutable local snapshot store, identity/lineage across seasons and saves, optional manual import data contract, migrations.
- B4 Player Explorer (advanced filters, comparisons, source chips, export), multi-save selector, import management and data coverage report.
- B5 Verification fixtures matching in-game actual player IDs/attributes/CA/PA, schema and unit tests, performance tests, fuzzing. Record field unsupported for unmapped domains; do not represent raw string scans as parser success.

**Parallel lanes:** parser+fixtures, snapshot/data persistence, player explorer UI built against **explicit fixture-only** typed contracts. Deliverable: end-to-end import→explore→compare→export for supported fixtures, truthful unsupported experience for other files.

**Gate:** imported fields match known-good game values, originals unchanged, version coverage visible, no unsupported editing, fuzz/property tests pass.

## Phase 3 — Player Intelligence & Scouting Analytics (MH-06, MH-02 complete, MH-04 trends, MH-26 reporting)

**Goal:** Turn raw numbers into a trustworthy football scouting report with full charts and estimated ability.

Work packages:
- C1 Player report tabs: overview/abilities/positions/roles/performance/tactical fit/development/compare/evidence; technical/mental/physical/hidden (authorized) fields; narrative strengths/weaknesses.
- C2 eCA: explainable attribute-strength baseline; supervised model **only when same-edition labeled CA corpus available**, held-out validation, GK vs outfield, positional uncertainty, MAE and prediction intervals, model card. No exact PA estimation.
- C3 Role Fit: versioned role demand tables, weighting, missingness policy, top role vs natural position vs retraining candidate, footedness/weak-foot constraints; direct Actual CA and product eCA/RoleFit never visually conflated.
- C4 Chart framework: shared metrics registry; attributes radar/bars, role bars, positional suitability map, trend graphs, percentile radar with cohort/minutes. Event-level shot/pass/heatmap ONLY when data sufficient; chart manifests hide absent data and expose reasons.
- C5 Comparison cockpit: multiple candidates with consistent axes/cohorts, ability vs role fit vs cost (where available); save watchlist and analyst notes; reports and export preserving data source and uncertainty.
- C6 Validate scoring with soccer counterexamples, blind review, distribution checks and eCA subgroup holdouts; chart a11y and snapshots.

**Parallel lanes:** [eCA training and evaluation], [role model], [chart platform + screen], [evaluation corpus]. Integrate through canonical derived-metric schema.

**Gate:** real fixture player report complete with proper unknown handling; no phantom shot maps; estimated CA scale only when validated; role switching changes assessments not Actual CA; compare data honest.

## Phase 4 — Tactical Lab & Squad Intelligence (MH-07, MH-08, MH-09, MH-10 baseline, MH-11, MH-25 tactics)

**Goal:** Functionally connect player decisions to a complete XI and real tactical constraints.

Work packages:
- D1 Football tactical model: possession/out-possession formation and versioned role catalogs; four phases plus set-piece slots; pitch-lanes, progressions, rest-defence checks; data source and model version.
- D2 Tactical Lab: accessible football pitch drag/drop and keyboard move, side-by-side phase toggles, role selector, saved formations, tactical adjustments. GSAP Flip animates players between phases; no source save mutation.
- D3 Constraints-first Squad Optimizer: unique player allocation, availability/registration where verified, role fit and partner chemistry, penalties for vulnerabilities; best ability/balanced/opponent/rotation variants and infeasible explanation.
- D4 Squad Planner 2.0: depth chart, overlapping role coverage, rotation minutes, succession flags, scenario compare, dynamic recomputation when utility players move.
- D5 Tactical Advisor: deterministic engine for why-this-tactic / conflicts / alternatives; optional LLM narratives grounded in engine results. No exact performance probability.
- D6 Set-piece framework: declarative routine/role model in engine to be completed in Phase 7; don't ship dead control.

**Parallel lanes:** tactical rules/catalogues, optimizer solver, interactive board/motion, analytics explanation/test. Deliver end-to-end scenario from Player Report → slot assignment → optimization → tactical issues → saved plan/report.

**Gate:** unique eligible XI; no double assigned versatile players; FM26/older role compatibility tested; GSAP animations cancel cleanly and keyboard alternatives work; every warning tied to rule.

## Phase 5 — Sporting Department & Financial Operations (MH-12, MH-13, MH-14, MH-15, MH-22, MH-25 transfers)

**Goal:** Make recruitment, training, contracts and finances work as one integrated decision system.

Work packages:
- E1 Recruitment: functional squad-gap → candidate filters → role comparison → scenario solve → verdict (Buy/Shortlist/Loan/Develop/Pass/Insufficient); confidence, unknown price handling, affordability alternatives.
- E2 Transfer and contracts: expiry, renew/loan/sell, wages, bonuses/installments if decoded, registration rules by league, currency/wage-frequency normalization and cost sensitivity.
- E3 Youth: training/retraining and age pathways, loans, academy funnel, minutes allocation and opportunity cost, succession readiness.
- E4 Performance Centre: period minutes, fixture congestion, condition/availability, injury timeline and rest plans; no clinical risk claim.
- E5 Finance cockpit: multi-season contract runway, wage concentration, forecast scenarios based on known data, clearly modeled assumptions.
- E6 What-if: compare sell vs keep, buy vs internal promotion, future squad economics; independent repeatable scenario snapshots.

**Parallel lanes:** recruitment/scenarios, finance/contracts, youth/training, UI/reporting; shared Player, Contract and Budget schema only.

**Gate:** changing transfer target recomputes XI and budget; unknown wages not free; internal youth can be compared to purchases; contracts show correct time/currency; no duplicated calculations across panels.

## Phase 6 — Football Operations, Governance & AI Staff (MH-16, MH-17, MH-18, MH-19, MH-20, MH-21, MH-23, MH-24, MH-26)

**Goal:** Full real-world-inspired management from opposition dossier to boardroom and long-term rebuild.

Work packages:
- F1 Match Intelligence: opponent dossiers from observed data, pre-match lineups/substitution contingency, post-match planned-vs-actual with defensible xG/PPDA only when available, season review.
- F2 Club DNA and Boardroom: values/playing identity constraints, board goals, style and finance objectives, conflicts and annual review.
- F3 Leadership: captain/hierarchy/morale when supported; any synthetic dressing-room model visibly labeled simulation, no false personal claims.
- F4 Dynasty planner: 1/3/5 seasons, incumbent successors, squad/contract risk timeline, age curve, financial risk and narrative report.
- F5 AI Staff: Assistant Manager, Scout, Development Coach, Sporting Director with role-specific retrieval of domain results, refusal to invent source values and blocked access to editor tools. Offline deterministic fallback.
- F6 Unified dashboard/reports/export and decision journal across all modules.

**Parallel lanes:** match and opponent, club governance, dynasty/boardroom, AI adapter/retrieval, reporting UX; integrate against common scenario snapshots and provenance.

**Gate:** full task flows between roster/tactics/market/board; AI advice source-linked and permission-aware; honest absence of event data; career planning changes audited; accessible reports.

## Phase 7 — Full Feature Integration, Set Pieces, Certified Editing & Release (MH-03, MH-10 complete, MH-27 integration + all feature closure)

**Goal:** Complete remaining high-risk capabilities and ship a single cohesive full-scope product, not a stitched set of module demos.

Work packages:
- G1 Set Piece Studio: real routine selection, attacking/defending roles, opposition matchup and per-set-piece constraints; linked to squad/tactical data.
- G2 Advanced Editor gated: only exact proven version/build supports native writes; preview CA/PA/attributes/eligible club fields, batch edits, semantic diff, validation, backup, independent reparse, actual game-load roundtrip, restore. If format not certifiable, disabled-with-reason is a safety requirement, not a fabricated delivery claim.
- G3 Optional local game bridge research behind explicit capability toggle, protocol/version handshake, least privileges; never quietly memory patch.
- G4 Finish external imports, settings, privacy/export workflows, plugins/edition catalogs, role customization and all module cross-navigation.
- G5 Whole-product E2E journeys, parser fuzzing, AI red team, strong mode isolation, keyboard/contrast/reduced motion, user-supplied long names and localization edge cases.
- G6 Profile large databases and animated formation transitions on low-power devices; remove jank, bundle bloat, duplicated logic and unused dependencies. Release packaging for web + desktop with signed builds if platform credentials available.
- G7 Produce compatibility matrix, honest limitations, setup guide, changelog, evidence of tests, release/checklist and maintainability audit.

**Gate:** all MH-01..MH-27 have acceptance records (complete vs verified-incompatible limited support), test suites green, user original never damaged; no undocumented stubs, fake data or known avoidable debt, signed release where permitted. Never call unsupported editor integration complete; report limitation transparently and continue research rather than bypass validation.

## Parallelization for maximum safe speed
- Fixed stream ownership each phase: (1) Rust/parser & fixtures; (2) domain rules/solver; (3) UI/motion/a11y; (4) tests/QA/reviews. Parallelize by package ownership with contract tests; integration agent cherry-picks only passing branches.
- Phase N+1 design and test-fixture prep can begin while Phase N implementation closes; **merge** gated by contracts.
- Shared foundations once: Field<T>, DerivedMetric, RoleCatalog, GlassSurface, GSAP animation service, ChartWrapper and save edition registry. All feature teams consume them, never fork copy.
- Daily CI and code review: fast checks on every PR, long tests nightly; don't skip security, save-write or eCA validity checks.
- Stage gates are quality-driven, not arbitrary deadlines. Preserve velocity via reuse, explicit unsupported paths, stable interfaces, and continuously runnable app.

## Completion ledger
Every MH module needs: business rules, UI flow, data capability, service implementation, test suite, missing-data policy, docs and reviewed acceptance. [Traceability](../product/03-traceability-and-decisions.md) records each.

**Copy-paste implementation prompts:** [02-agent-prompts.md](02-agent-prompts.md).

- [27-module acceptance ledger and status](05-feature-acceptance-ledger.md)
