> **2026-10-27 update:** Canonical visual and motion rules: [Apple-inspired Liquid Glass + GSAP](../implementation/03-liquid-glass-motion-spec.md). Taste v2 includes dashboard and analytics app-screen rules in `references/app-screens.md`; use them with Impeccable and Vercel. For application surfaces rely on Impeccable, Vercel guidelines and ManagerHub Motion/Data UX skills.

> **Taste v2 (verified upstream):** supports dashboards and app screens with dedicated `references/app-screens.md` and `library/app.json`. For ManagerHub apply its **app-screen workflow**, not marketing landing layouts. See `.agents/SKILLS-SOURCES.md`.

# P02 — ManagerHub Design System / UI-UX Product Brief

**Status:** living target design contract; implementation and acceptance must be verified against current source and the feature acceptance ledger. **Product type:** dense desktop-first football analytics workstation with responsive mobile read-only/secondary usage.

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

## Typography — Be Vietnam Pro

The global UI uses a single `--font-ui` stack, inherited by controls and headings. Technical identifiers may retain the existing monospace styling. Tabular numerals are requested globally; browser rendering and actual glyph coverage must be validated before acceptance.

Self-hosted WOFF2 sources are copied without modification from [bettergui/BeVietnamPro at 804e62d81abbbcdcce5686069c69b41b8c245192](https://github.com/bettergui/BeVietnamPro/tree/804e62d81abbbcdcce5686069c69b41b8c245192/fonts/webfonts), with the original SIL OFL 1.1 notice shipped at `apps/web/public/licenses/be-vietnam-pro-OFL.txt`. The six faces cover the existing normal 400/500/600/700/800 weights plus 400 italic, with no Google Fonts CDN import. CSS uses `font-display: swap` and a system fallback; no font preload is forced. Exact source assets total 240048 bytes; a separate 256 KiB emitted WOFF2 budget is enforced without weakening the JS/CSS budgets.

| Face | Git blob SHA | Source bytes |
| --- | --- | ---: |
| 400 normal (Regular) | `a207d2c87c43cb680e5189fe18164a40aed15817` | 38064 |
| 500 normal (Medium) | `ddfb15dca96b24e321f9c9d2ff87c9418b7a5c49` | 40232 |
| 600 normal (SemiBold) | `8a59077b5358addf1941f60196eb2194316a4731` | 40464 |
| 700 normal (Bold) | `d9e974adc35e771dfad5363d552e12244d0e6d94` | 41212 |
| 800 normal (ExtraBold) | `b48f480f179d51adf96f4cc236bc041fdae09684` | 41312 |
| 400 italic (Italic) | `0f52df282628d475cc3a0240b2b9d2601c52481d` | 38764 |

The candidate includes a browser regression for local face loading with Vietnamese sample text and the shared computed family. Layout shift, numeric glyph widths, screenshots, font coverage and cross-workspace accessibility still require real runtime verification.

## Football Manager attribute magnitude — seven tiers

Use the shared `getAttributeTier` classifier and semantic `--attribute-*` tokens in `packages/ui`. This is a display scale, not football desirability.

| Range | Tier | Dark token | Light token |
| --- | --- | --- | --- |
| 0–6 | Very Low | #8993A0 | #46525e |
| 7–9 | Low | #B2BAC5 | #606a74 |
| 10–11 | Average | #C29B6A | #805522 |
| 12–14 | Above Average | #D9B34C | #79600c |
| 15–16 | Good | #F6DC63 | #6e5800 |
| 17–19 | Excellent | #55CE8A | #17683b |
| 20 | Maximum | #FF9D42 | #a64406 |

Zero belongs to the lowest tier only when the particular field's verified schema permits zero; absent/invalid values are not silently substituted. Keep the numeric value visible. Do not apply these colors to CA/PA/RCA, role fit, morale, financial values, or other distinct scales. A high value of injury proneness, for example, is not necessarily desirable.

Candidate integration: ranked Player Lab attributes, head-to-head attribute comparison, and visible/hidden/personality/staff attribute inputs in the offline editor. Player and staff attribute entry now use a shared feature-local property-row group with localized legends, compact numeric inputs, wrapped labels and disabled missing values. The player-visible groups use the canonical Technical, Mental, Physical and Goalkeeping schema; no new field or native writer capability is introduced. A synthetic browser regression covers group navigation, color, editing and undo/redo. Other applicable surfaces and browser-based contrast, theme, zoom, and visual verification remain pending; this does not certify global parity or FMRTE field ordering.

## Classic Editor record navigation (CE-01 / CE-03 candidate)

An entity edit opens a compact record workbench with a bounded, typed record switcher and search scoped to the active decoded save. Identity is `kind:uid` within the current save, never display name. Player, staff, club and stadium records share the existing root-owned transaction history; record switching or closing cannot commit, discard or duplicate draft data. The shell allows at most 12 open records and 24 results per nonblank search; users can search by name or exact UID. The existing modal boundary, Save As and Mass Edit tools remain in this slice. Closing the workbench or replacing the active source resets navigation; changing records resets the player section to Information. No additional database, storage, native writer or RCA capability. Keyboard-operable native controls, focus returns to the active record when switching or closing, and VI/EN labels; unit search/state and synthetic browser regression added, runtime/visual acceptance pending. A dedicated nonmodal route, persistent tabs across workspace navigation, complete FMRTE parity and keyboard/focus review are still outstanding.

## Table-first, bounded tabs and performance — mandatory

- Exact player/staff attributes, settings, contracts and editable properties use compact labeled numeric rows with shared seven-tier tokens. No chart/bar per attribute or redundant chart/card repeating the same values. Charts require a decision that benefits from visual encoding (trend, distribution, meaningful comparison, tactical spatial relationship), sufficient source coverage and an accessible exact-value equivalent.
- Each top-level tab serves a distinct job. Split unrelated or long sections into named subtabs, bounded groups or on-demand details; keep common identity/source context and do not repeat the same detailed analysis across tabs. Preserve access to supported fields/actions and explicit missingness. Verify keyboard, mobile and 200% zoom.
- Reuse canonical domain selectors, label registries, UI primitives and styles before adding abstractions. Lazy-load substantive inactive sections, bound rendered collections and defer/virtualize large searches when measurements justify it. No blanket memoization or new dependencies without evidence. Record production bundle, interaction/render measurements and visual/accessibility results before acceptance.
- Player Lab now uses a four-group mean/coverage table and a bounded attribute selector with exact numeric properties. Shared AttributePropertyGroup powers read-only attributes and draft inputs. Optional all-attribute ranking is paged at 14 rows. Overview retains only compact summaries; the full role list lives under Role fit, and Contract & positions and Personality & hidden traits have independent lazy panels for decoded saves. Shared hidden/personality field registry; unknown positional ratings remain missing. No new native data/write capability; runtime acceptance pending.

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

### Editor density follow-up
Player information, contract, exact attribute groups, hidden traits, personality, positions and presets now have independent sections. Staff ability and attributes, and club finances, facilities and presets are separately selectable. Player Lab and Editor reuse the same attribute group selector, sort/pagination and numeric property primitive. Shared SectionTabs provides native keyboard controls and labels a single active panel. Mass Edit roster filtering/sorting is scoped to Mass Edit; no inactive mass scan for normal records. Source changes only, pending runtime verification.

### Squad Planner bounded workbench
One shared A/B plan and formation control, followed by five task sections (XI, constraints, tactical editor, comparison, coverage). Only the active task renders initially. The tactical editor is lazy-loaded on first visit and then kept mounted but hidden when inactive to retain its local adjustment/undo state. This deliberately trades a bounded retained tactical subtree for correctness; measure actual memory/interaction costs before acceptance. No optimizer or plan persistence changes.

### Recruitment and explorer density follow-up
Shortlist candidates, role comparison and club-group recruitment use shared section navigation. Candidate list is paged at eight items; comparison/scenario modules load on first visit and retain local selection state while hidden. The database explorer filters/sorts only the active entity family; existing 50-row pagination and visibility checks remain unchanged. Filtered arrays are already new copies and are sorted directly rather than copied again. Source-level work reduction only; actual timing and browser acceptance pending.

### Editor source ownership
The modal is a session/transaction controller; four record-specific presentation components own their bounded views. Shared EditorRecordSections handles local navigation, and EditorNumberField handles clamping, native missingness and form markup. Native unknown numeric/date fields are blank and disabled instead of displaying fabricated fallback values. All actual mutations remain in the existing parent transaction callbacks. Runtime and exact native field compatibility verification remain pending.

### Classic Editor navigation
The dedicated `#/editor` workspace and Quick Edit dialog share one record list in the active application session and the existing transaction callbacks. Record UIDs and active selection persist while navigating workspaces; they are not persisted to browser storage and are cleared on a successful source replacement, active source removal or Realism switch. The workspace mounts only while visible, so record-local subsection/search UI resets on navigation. Quick Edit can transfer into the workspace; mass edit and Save As remain explicit dialogs. No extra decode, writer capability or new product module. Runtime acceptance pending.

Classic Editor capacity is checked by the same pure helper at search and Quick Edit entry points; a full list routes to the workbench and its limit message instead of opening an unrelated record. Save As diff preview uses 50-row pagination with all changes reachable (no silent 200-row truncation). The decoded base, overlay projection and per-workspace dataset memoization now depend only on their actual inputs, so changing one club filter does not regenerate the unrelated projection. Draft commits also reject stale save IDs and non-Editor mode. Source-level improvements pending consolidated runtime verification.

### Mass Edit safety and reuse
Single player/staff/club edits reuse existing domain mass-overlay builders (including canonical alias handling); stadium keeps its existing small patch. Mass Edit player controls live in their own component, accept only explicitly entered whole numbers in range, exclude unknown age when filtering, preview the first eight matching records and require explicit confirmation of exact field values and target count. Blank fields mean unchanged; no implicit morale or PA edits. Existing club presets remain available. Tests added; runtime verification pending.

### Tactical analysis density
The editable tactical pitch and phase/instruction controls remain available while analysis switches between shape diagnostics and role partnerships. Shared SectionTabs mounts only the selected report; the domain analysis is memoized against scenario/lineup and selected report. Diagnostic cards use responsive bounded columns, preserve reasons, limitations and reversible adjustments. Undo history remains parent-owned and survives analysis tab switches. Pointer movement within an unchanged grid cell skips the position update. Existing projection/CSV semantics unchanged; runtime measurement and tests pending.

### Comparison report density
Head-to-head comparison has distinct attribute and role panels. Every mutually observed exact attribute is reachable in 12-row pages ordered by absolute difference, instead of silently limiting results to the top 12. Native accessible table headers identify both players. Role scoring runs only on its panel. Comparison search stops after 30 matches and defers typing. Shortlist role ranking shares ReportPagination, retaining absolute rank across pages. No heuristic changes, missing-value fabrication or new dependencies. Runtime acceptance pending.

ReportPagination is shared across head-to-head attribute comparison, shortlist candidate list, shortlist rankings and Save As diff preview. The same clamped page range and visible count semantics apply to each; retained per-view page sizes reflect the respective task density. No duplicated page math in these views.

### Historical evidence workbench
Historical snapshots use separate player, capture-evidence and manual comparison sections. Roster rendering is fixed at 40 rows per page instead of accumulating DOM rows. Player and comparison evidence selectors use categories derived from the native historical capture profile, not export/save-decoder attribute names. Preserve exact source labels, zero, missing/redacted reason and provisional status. Manual pairing stays in its comparison panel and resets on leaving that panel or changing mode; no automatic identity or growth inference. Second-snapshot search stops at 30 matches, defers typing and disables stale candidate selection. Source-level implementation pending consolidated verification.

### Visualization review (implemented workspaces)
Player Lab ordinary attributes and player comparisons are exact-value tables. Role Fit ranking uses numeric /100 scores, explicit N/A, bounded 10-row pages and expandable input evidence tables rather than a filled bar for every role. Keep tactical pitches because spatial placement is the task. Historical observations remain grouped source-value tables (no implied development curve). Shortlist/lineup/coverage/finance reports remain numeric or textual. The Overview decorative radar rings are not a data visualization and are aria-hidden. Save decoding uses a native determinate/indeterminate progress control: no fabricated initial 10%, no minimum 5% fill, worker-reported progress clamped to 0–100. This is a source audit of the listed screens, not measured visual acceptance or a certification of every future module.

HistoricalWorkspace delegates snapshot list, capture coverage and player detail presentation to dedicated components, with common evidence/date/size formatters. The saved snapshot list also uses shared pagination (eight items) so long libraries do not grow indefinitely. Async import, privacy, cancellation and storage synchronization remain controller-owned. No change to the stored historical schema.

### Advanced numeric mass edit
Keep the existing player CA/morale quick tool. Add separate Player fields, Staff fields and Club fields panels with a shared typed single-field planner and UI. Reuse native domain validation and overlay builders, attribute/personality/position/staff registries; select a field group before choosing a field. New scopes default to none: require a search or explicit all-record opt-in. Only observed current values qualify; missing/no-op counts are explicit, all actual changes accessible in eight-row before/after pages, and confirmation identifies field/value/count. No automatic PA changes (PA is an explicit selectable field), no new native writer capability. Panel-local inputs reset on switching entity families. Runtime acceptance pending.

Quick CA/morale uses the same observed-value/no-op classification as advanced mass edit. No default all-clubs scope when managed club is absent; explicit scope required. A combined CA+morale patch excludes a record entirely if either requested value is unknown, rather than partially applying the patch. All eligible targets are accessible in eight-row preview pages. Existing quick filters and explicit confirmation remain.
