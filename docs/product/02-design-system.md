> **2026-10-27 update:** Canonical visual and motion rules: [Apple-inspired Liquid Glass + GSAP](../implementation/03-liquid-glass-motion-spec.md). Taste v2 includes dashboard and analytics app-screen rules in `references/app-screens.md`; use them with Impeccable and Vercel. For application surfaces rely on Impeccable, Vercel guidelines and ManagerHub Motion/Data UX skills.

> **Taste v2 (verified upstream):** supports dashboards and app screens with dedicated `references/app-screens.md` and `library/app.json`. For ManagerHub apply its **app-screen workflow**, not marketing landing layouts. See `.agents/SKILLS-SOURCES.md`.

# P02 — ManagerHub Design System / UI-UX Product Brief

**Status:** target design contract for future implementation; no frontend code shipped yet. **Product type:** dense desktop-first football analytics workstation with responsive mobile read-only/secondary usage.

## Experience principle
ManagerHub should feel like a well-run football analysis department, **not** a marketing landing page or gambling dashboard. Optimize for scanning, comparing and making defensible decisions. Four priorities: (1) accurate labeled data, (2) tactical spatial context, (3) explainable recommendations, (4) fluid but restrained interactions.

Reference frameworks:
- Vercel Web Interface Guidelines for accessibility/interaction correctness.
- Taste v2 app-screen workflow for dashboard and analytics, using its dedicated rules and app inspector; public-page recipes are not for dense operational UI.
- Impeccable for deliberate shaping, critique, audit, hardening and final polish.
- Vercel React Performance & Composition Patterns for implementation.

## Navigation and task paths
- Workspace selector: career/save → club → edition/build → observation date.
- Main nav: Dashboard / Squad Planner / Players / Tactics / Scouting / Recruitment / Development / Match Analysis / Club & Finance / Dynasty / Editor (conditional) / Imports.
- Global tools: compare tray, scenario selector, field-source inspector, keyboard search, realism/editor mode and undo (UI state; game edits separate).
- Breadcrumbs and deep links across player, tactical slot, shortlist and squad gaps.
- **Do not** combine browser back behavior with arbitrary fallback; preserve origin and context when returning from drilldown.
- Responsive: desktop supports split views/compare; tablet stack panels; phone emphasizes report reading over precision formation drag/drop; keyboard alternatives mandatory.

## Interface patterns by workspace
### Player Intelligence
Hero identity + Actual CA (verified) + eCA range + Role Fit (product) + availability status. The three scores must never share unlabeled badges. Tabbed report: Overview / Abilities / Positions & Roles / Performance / Tactical Fit / Recruitment Verdict / Development / Compare / Evidence. For charts see [P04](04-player-intelligence-ux.md).

### Tactical Lab
Schematic football pitch with accessible slot labels, drag/drop plus keyboard position-picker; switch between In Possession and Out of Possession only when supported by current game edition. Adjacent panel displays role interactions, weak coverage zones, player candidates and reversible edits to the *scenario*. Pitch heatmaps must have numeric/table alternatives and legend.

### Squad Planner
Primary 11 with formation and role; adjacent depth chart and workload/contract strip. Four presets: Max Ability / Tactical Balance / Opposition / Rotation. Any player move recomputes alternative assignments, coverage and warnings. Expose tradeoffs and solver infeasibility instead of zero-state blank.

### Recruitment Hub
Start with squad gap and constraints, not a global stars leaderboard. Table filter by role/affordability/availability; compare up to four pinned candidates, same cohort metrics, budget projection and decision rationale. Strong buy/no-buy statements gated by data sufficiency.

### Dashboard / Boardroom
Outcome health summary without noisy oversized cards; priorities first, alerts second, progress/history third. Separate game facts from derived/simulated finance and club strategy values.

## Information architecture / component set
AppShell, MainNav, SaveSwitcher, SourceBadge, ProvenancePopover, ComparisonTray, PlayerIdentityHeader, AbilityEstimateCard, AttributeDistribution, PercentileRadar, RoleFitBars, PositionPitch, FormTimeline, TacticalBoard, LineupSlot, TacticalConflictCard, DepthMatrix, ShortlistTable, ContractRunway, ScenarioCompare, RecommendationCard, EmptyState, PartialDataNotice, ErrorReport, ModelCard, CommandPalette.

All visualizations offer keyboard-readable equivalent and export of underlying values. Use virtualization for large player databases; sticky columns should not cover focus rings.

## Visual direction and tokens (PROPOSED, calibrate with screenshots)
- Near-black/slate/navy work canvas + subtle neutral surfaces; accent is restrained pitch green for football context, cool blue for selected analysis, amber for caution, red for verified critical conflicts. Do not use red/green alone as meaning.
- High legibility tabular numbers (CA/PA, money, timestamps), compact data tables, balanced body typography, hierarchy via weight and whitespace rather than glow/gradients.
- Spacing based on 4px multiples, e.g. dense table rows ~36–44px depending pointer modality; touch hit targets ≥44px mobile; minimum 24px pointer hit area per Vercel guideline. These are targets, not demonstrated implementation.
- Clear borders, coherent nested radius, quiet motion 120–220ms for small interactions (illustrative); animations respect prefers-reduced-motion and never delay critical analysis.
- Performance: prioritize instantaneous-looking search/filter, lazy chart tabs, skeletons with stable layout and responsive charts. Benchmark real saves.
- Themes: dark-first but implement light equivalent with contrast and color-meaning parity; never rely on pure color to signal data status.

## Chart contract and accuracy
Every chart displays source class, period/season, cohort and sample when relevant, units/axes, missingness and whether value is modelled. **Actual Game Field**, **Estimated**, **Scenario** are visually distinguishable at all times.
- Attribute radar: absolute attributes in their edition range, never label as performance percentile.
- Percentile radar: baseline cohort, position, league, season, minutes threshold; same axes for compare.
- Time series: per-player snapshots with version change markers; gaps are gaps, no interpolation by default.
- Pitch map: positions inferred by a tactical model must be explicitly labeled as projection; touches/shots/pass map need real event coordinates.
- Finance and recruitment: money units, wage frequency and market uncertainty.
- Recommendations show drivers, constraints, alternative choice and confidence.

## UX edge states (ship blockers)
No save; unsupported file; partial parse; no eCA calibration; missing PA; mode-restricted hidden attributes; no event data; empty shortlist; zero comparable cohorts; roster solver infeasible; stale snapshot; conflicting edits; upload denied; offline LLM; very long player names and currencies; keyboard navigation across pitch; 200% zoom; color blindness.

## Mandatory design loop for each new screen
1. Read product brief and task-specific business/system documentation.
2. Impeccable **shape** to define information hierarchy and user journey.
3. Impeccable Operate, Taste v2 app-screen guidance and ManagerHub motion/data UX for the analytical workspace.
4. Build with Vercel composition/performance principles and official GSAP React/Flip skills for meaningful motion.
5. Review via Vercel **web-design-guidelines** and Impeccable **critique/audit**.
6. Browser test keyboard, screen sizes, charts, missing states; capture screenshots.
7. Impeccable **harden** for overflow/errors/i18n, then **polish** for alignment/typography.
8. Re-run audit and attach before/after screenshots, known limitations and acceptance results.

## UX exit criteria
- A user can open a save, choose player, inspect estimate sources, compare a role, see tactical impact and produce a defensible scouting verdict.
- All interactions keyboard-operable, visible focus, chart equivalents, unambiguous unknown values and no hidden-CA leakage in Realism Mode.
- A dense dashboard stays calm and usable on standard laptop viewport; no decorative animation competing with tactical analysis.

Related: [features](01-full-feature-catalog.md) · [skills workflow](../engineering/agent-skills-research.md) · [save and analysis caveats](../system/08-player-intelligence-engine.md).
