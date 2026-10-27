# AGENTS.md — ManagerHub development policy

> **Taste v2 (verified upstream):** supports dashboards and app screens with dedicated `references/app-screens.md` and `library/app.json`. For ManagerHub apply its **app-screen workflow**, not marketing landing layouts. See `.agents/SKILLS-SOURCES.md`.

## Current status and objective
ManagerHub now contains product/domain/system docs **plus initial React/Vite application source and experimental read-only local save inspection**. It is NOT a completed/shipped product or validated Football Manager player-data reader. Implement the **entire 27-module scope (MH-01..MH-27)**; user explicitly rejects any MVP milestone. Work in **7 medium integration phases**, each production-grade and tested. No dead UI and no invented FM data. Phase and copy-paste agent prompts:
- [Mandatory execution charter](docs/implementation/00-execution-charter.md)
- [Full 7-phase build plan](docs/implementation/01-full-delivery-plan.md)
- [Prewritten execution prompts](docs/implementation/02-agent-prompts.md)
- [Apple-inspired Liquid Glass and GSAP motion spec](docs/implementation/03-liquid-glass-motion-spec.md)
- [Researched agent skills and references](docs/implementation/04-motion-skills-and-references.md)

Read also [full feature catalogue](docs/product/01-full-feature-catalog.md), [data-first UI rules](docs/product/02-design-system.md), [football domain](docs/business/README.md), [system specs](docs/system/README.md). Source field/provenance constraints in [Player Intelligence Engine](docs/system/08-player-intelligence-engine.md).

## Skills — activate relevant skills if actually installed
- For **app UI and dashboard**: Impeccable (shape/operate/animate/critique/audit/harden/polish), Vercel web-design-guidelines, vercel-react-best-practices, vercel-composition-patterns, original `managerhub-data-ux` & `managerhub-motion-glass`.
- **Taste Skill (`design-taste-frontend`)**: the pinned v2 explicitly supports dashboard, admin and analytics screens. Read its vendored `references/app-screens.md` and use the app-screen workflow, combined with Impeccable Operate and Vercel guidelines. The public marketing-page workflow is separate.
- **Motion/GSAP**: official GreenSock skills `gsap-core`, `gsap-react`, `gsap-timeline`, `gsap-plugins` (Flip/Draggable), `gsap-performance`, optionally `gsap-scrolltrigger` only on justified tutorial scroll experiences.
- **Save reader / data editing**: original `managerhub-save-safety`.
- **CA/eCA/role/scouting/tactics**: original `managerhub-football-intelligence`.
- **Charts/scouting dashboard**: original `managerhub-data-ux`; chart event requirements are mandatory.
- Optional external tools must be reviewed for source, license, version, permissions and skill overlap before installation. This repo vendors 4 original skills and pinned external Vercel, Taste, Impeccable and GSAP skills in `.agents/skills/`. Optional engine and provider-specific hooks may need additional reviewed local setup.

## Engineering non-negotiables
1. **Clean Code / reuse / DRY:** single canonical domain schema, role version catalog, source-aware metric registry, format adapter interface, money formatter, chart wrapper, shared components, animation facade; use existing code first. Extract abstractions from real repeated semantics, not speculative frameworks.
2. **Zero accepted known avoidable technical debt per phase:** strict TS/Rust, no unjustified any, suppressed lint, orphan components, duplicated calculations, fake production values, bypassed tests or hidden error state. Record genuine research blockers honestly. No guarantee of literal zero future debt.
3. **One shared browser/desktop UI** where feasible, React/Tauri architecture unless ADR documents alternate. Boundary-safe local-first and no automatic save uploads.
4. **Actual CA/PA** only verified original game values; **eCA** derived and must show error/confidence or use preliminary attribute-strength index if not calibrated. RCA-style budget/Role Fit/Tactical Fit are distinct models. PA cannot be exactly inferred from attributes.
5. Roles and in/out possession game shape depend on FM edition/build; don't port old FM24 duties to new FM26 roles silently.
6. Best XI uses each player once, respects validated eligibility, recomputes whole squad after moves, and offers explainable alternatives.
7. Shot maps/pass networks/touch heatmaps require true event XY data; per-90/percentile requires minutes/cohort; no invented match or wage values.
8. **Read-only import** until certified writer is independently validated. Writer requires exact build, user consent, immutable original, backup, temp copy, diff, reparse, actual game load and rollback.
9. Realism Mode restricts hidden fields at data/query/AI/export level; editor mode visibility is explicit. LLM may not trigger editing automatically.
10. Fictional Ferguson interview text is not authentic quotations.

## Apple-inspired Liquid Glass (web/Tauri)
- Navigation controls, toolbars, floating menus/inspectors may use bounded translucent glass.
- Player tables, numbers, radar/xG plots, match stats and tactical pitch use opaque/high-contrast materials. Apple native Liquid Glass is not literally CSS `backdrop-filter`.
- Dark/light/high-contrast/glass-off modes, keyboard/focus, 200% zoom, touch, reduced-motion, unsupported backdrop-filter fallback.
- GSAP + @gsap/react for meaningful Flip shared-element and formation position shifts; CSS for trivial press/hover. Every animation cleans up, can be interrupted, respects reduced motion, and never becomes football state truth.
- Don't install two motion libraries to animate the same DOM property. Avoid animation debt and fullscreen blur; benchmark actual app.

## Delivery and independent review
Before editing: inspect repo, identify existing reuse, define a small interface/task map and assign non-overlapping work packages. Implement, verify and commit real connected functionality; don't stop at an architectural plan when execution is requested. Test relevant TS lint/typecheck/unit/integration/Playwright/a11y and Rust fmt/clippy/fuzz/roundtrip, report actual commands/results. Visual work requires browser screenshots of desktop/mobile/reduced-motion, keyboard paths and source badges. Update feature completion ledger and compat matrix with honest limits.

All 27 modules must have traceable business rules, data contracts, UI states, tests, documentation and acceptance. Never claim support for an unverified FM save or a completed future phase.
