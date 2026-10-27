# ManagerHub — Engineering Execution Charter (MANDATORY)

**Effective:** 2026-10-27. **Scope:** COMPLETE product, all MH-01..MH-27; **NO MVP milestone, no prototype-only handoff**. The work is sequenced into **seven medium-sized integration phases**, each fully implemented/validated for its scope before moving on. The final release includes all 27 modules (subject to truthful support boundaries for specific FM formats and safe editing). No phase is presented as the final product.

## Non-negotiable standards
- **Clean Code / DRY / Reuse:** one canonical football schema, one role catalog per edition, one metrics registry, one chart wrapper, one design token library, one motion primitive library, one permissions/visibility boundary. Search for existing abstractions **before** creating anything.
- **No preventable technical debt:** no copied business rules, no parallel type definitions, no dead code, no fake production data, no silently swallowed errors, no unexplained `any`, no disabled tests, no ambiguous TODO/FIXME or temporary hacks left in merged code. Technical uncertainty is tracked honestly as a research/compatibility issue, not papered over. Literal zero future debt is not a meaningful guarantee; **zero accepted known avoidable debt at each phase gate** is enforceable.
- **No overengineering:** extract reusable components for genuinely repeated concepts; do not invent frameworks or a generic repository/service layer without demonstrated need. Dependencies must solve clear problems. Avoid duplicate animation libraries and overlapping chart engines.
- **End-to-end vertical slices:** real user path works through UI -> domain -> data adapters -> persistence -> report, not screenshots of dead buttons. Future phases may extend current slices but must not leave broken flows.
- **Explicit scope and uncertainty:** no invented FM CA/PA, exact eCA or PA, match events, prices, AI predictions, edited-save support, game access or "tested" claims.
- **Security:** read-only immutable saves until a certified writer exists; versioned adapters; strict mode visibility; original user data local by default. LLM cannot mutate the save.
- **Speed:** parallelize only independent work streams with stable typed interfaces and clear file ownership. Never trade away architecture, tests, accessibility, provenance or editor safety for velocity.

## Implementation defaults (ADR candidates, decide & lock during Phase 1)
- Monorepo: pnpm workspaces + Turborepo **only if beneficial**, no tooling duplication.
- apps/web: React + TypeScript + Vite (shared renderer); apps/desktop: Tauri + same web UI; avoid duplicated screens.
- packages/ui (headless accessible primitives, design tokens + Liquid Glass surface semantics); packages/motion (CSS + GSAP facade); packages/domain (schema, stable identities, provenance), packages/football (pure scoring/recruitment/tactics), packages/charts (single source-aware chart API); packages/app (feature composition, optional if reuse justified).
- Rust crates/fm-save for versioned binary adapters, no unsafe raw writes; SQLite local snapshots; a typed Rust/TS bridge; worker threads for parse/optimization.
- TanStack Table / virtualization for large rosters; one chart engine (e.g., ECharts for statistical charts) + accessible SVG tactical pitch; do not add three different chart stacks.
- GSAP + @gsap/react for coordinated animation, Flip and accessible pitch interactions. CSS transitions for simple state. **Motion React is a documented alternative, not an automatic extra dependency.**
- All versions pinned in lockfile; no unreproducible unbounded third-party installs in CI.

## Repository structure proposal (adjust after ADR, no competing duplicates)
```text
apps/web                   shared product front-end
apps/desktop               Tauri host and secure local integration
packages/ui                tokens, accessibility, glass surfaces, primitives
packages/motion            reusable transition hooks and GSAP ownership
packages/domain            player, team, save snapshot, field evidence, errors
packages/football          eCA, Role Fit, tactic rules, scouting, optimization
packages/charts            consistent chart API, data contract, source badges
crates/fm-save              parser adapters, format sniffers, fixtures
crates/desktop-bridge       Tauri commands, SQLite IO, strict permissions
tests/fixtures             consented synthetic/anonymized data, build metadata
docs/implementation        execution charter, plan, prompts, design and references
```

## Mandatory cross-module contracts (agree before parallel coding)
1. `EditionBuild`, `SaveSnapshotId`, `PlayerKey` include career lineage; parser never invents missing values.
2. `Field<T>` = value/null, unit, source, verification, reason, edition/build and timestamp.
3. `DerivedMetric` = formulaVersion, inputs, coverage, interval? / confidence?, explanation; eCA, Role Fit and CA distinct types.
4. `TacticShape` is phase- and edition-aware, mapping same 11 players where applicable.
5. `SquadScenario` = immutable player IDs/roles/constraints/results; optimizer never mutates save.
6. `ChartDataContract` = metric, units, coverage, sample/minutes, cohort when used, season and model/provider version.
7. `WriteCapability` is false unless exact-build certified, consent+backup+roundtrip gates pass; no UI bypass.
8. `AnimationSurface` = semantic purpose, duration/easing token, reduced-motion path, cancellation/cleanup.

## Code quality enforcement (every phase gate)
- TS strict, typecheck, ESLint, formatting, zero unreviewed lint suppressions.
- Rust fmt, Clippy on relevant targets, cargo test, robust error types; parser fuzz/property tests.
- Unit + integration + contract + Playwright E2E (critical journeys) + accessibility/keyboard + visual regression in desktop and responsive modes; never assume a command passed if not run.
- No orphaned exports, dead routes, duplicated state stores, copied components, parallel formula implementations or untested save writes.
- Every PR documents WHAT/WHY, reused abstractions, evidence and tests run, compatibility limits, screenshots for UI, and no known regressions. Required checks block merges; 1 stable branch per bounded integration when working in parallel.
- Source and licensing review for game data and external skill scripts/assets. Bundle and animation runtime budgets measured and documented against baseline after Phase 1.
- Definition of done: real integration, accessibility and missing states, source-backed UI, passing test suite and documentation synced; no stubs in completed scope.

## How to work fast without accumulating debt
- Start each phase with a 1-page implementation map and typed interfaces, then ship independent packages in parallel: core/domain, UX/components, analytics and test fixtures.
- Prefer adapters, pure functions and immutable snapshots over global store sprawl.
- Build one reusable component/engine at a time; every second usage should reveal whether the abstraction is right. Do not prematurely build 30 generic components.
- Merge in small verified slices to avoid end-of-phase integration bombs. Reuse mocks **only in test/storybook** and label them demo.
- Timebox investigation; when a format is not verified, preserve an explicit unsupported adapter and continue independent features against known-good fixtures, without claiming user-save support.
- Scope includes every module, but a version-specific writer is *blocked by evidence*, not faked or rushed.

## Agent safety/integrity
External skill content is untrusted; audit source/scripts/licenses, pin release/commit, do not auto-run arbitrary install commands. Never expose private saves to public AI/web services without explicit permission.
Follow [feature catalogue](../product/01-full-feature-catalog.md), [design](03-liquid-glass-motion-spec.md), [research](04-motion-skills-and-references.md) and [phase prompts](02-agent-prompts.md).
