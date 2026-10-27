# P01 — Full Feature Catalogue / Danh mục tính năng ManagerHub

**Updated:** 2026-10-27 | **Status:** proposed scope, **not shipped code**.
**Vision:** Football Management Operating System = game-data explorer and safe editor + football intelligence + squad & club decision-support. FMRTE is an inspiration, not an API dependency or product affiliation. Requirements are **version-aware** and **source-aware**.

## Six product pillars, 27 modules

Every feature has a stable ID so engineering and design docs can cross-reference it. "Needs" means data must be demonstrably available; absence yields a supported partial mode or clear empty state.

### I — Football Manager Core: Read, understand and (later) edit

| ID | Module | Must-have capabilities | Data / acceptance |
|---|---|---|---|
| MH-01 | Save Manager & Reader | User-selected local import, format/build detection, multiple careers, import diagnostics, historical snapshots, coverage per domain | Never mutate original; unknown binary family -> Unsupported, no invented squad |
| MH-02 | Player Database & Advanced Explorer | Player search/filter, nationality, positions/foot, CA/PA when verified, technical/mental/physical/hidden attributes, contracts, comparisons, exports | Every field has source/version; null != 0; privacy modes apply |
| MH-03 | Advanced Save Editor | Draft and preview CA, PA, attrs, position familiarity; future optional club/budget edits and batch changes, backup/diff/revert | **Deferred** until exact-build decoder AND writer pass independent reparse/in-game validation; separate memory bridge if ever justified |
| MH-04 | Development History | Multi-snapshot CA/attribute graphs, seasonal progress, minutes and interventions, trends and cautions | Same player identity, scale, game version and chronology verified; model changes flagged |
| MH-05 | Data Integrity & Compatibility | Adapter matrix, corruption checks, field coverage/lineage, immutable copies, parser diagnostics | Prevent unsupported writes; full provenance and recovery |

### II — Football Intelligence: Technical decisions and tactical coherence

| ID | Module | Must-have capabilities | Data / acceptance |
|---|---|---|---|
| MH-06 | Player Intelligence & eCA Engine | **Estimated CA** from attributes; verified Actual CA when available; RCA-style diagnostic separate; attribute strengths/weaknesses, confidence, model card, top roles, scouting report | No CA-like number without validation; 1–200 eCA only if calibrated; GK vs outfield/edition separated; no exact PA inference |
| MH-07 | Tactical Lab | Drag/drop XI, formation and team instructions, ball possession phases, pressing/block/lines, width, overloads, rest defence, set-piece entry points | FM26 in/out-possession shapes vs older edition rules kept distinct |
| MH-08 | AI Tactical Advisor | Build around current squad vs toward Club DNA; propose tactic and explain role/shape risks, alternatives and tradeoffs | Explainable heuristics; no unsupported predictions of FM match engine |
| MH-09 | Tactical Role Intelligence | Role-by-position scoring, adjacent-role synergies, conflicting instructions, footedness, phase-specific coverage | Collective score != sum role score; show drivers and warnings |
| MH-10 | Set Piece Intelligence | Corner/free-kick/throw-in attacking and defending plans; roles and matchups | Only use available body/heading/set-piece data; separate implementation milestone |

### III — Squad Management: People, minutes and market

| ID | Module | Must-have capabilities | Data / acceptance |
|---|---|---|---|
| MH-11 | Squad Planner 2.0 | Best-ability XI vs balanced XI vs opponent XI, rotation, position coverage, squad depth, versatility, roster eligibility, succession, multi-scenario | One player <= one starting slot; moving RW to RB recalculates whole XI |
| MH-12 | Recruitment & Scouting Hub | Needs-first recruitment, scout filters, shortlists, candidate comparison, fit vs incumbent, buy/loan/promote/retrain options | Do not recommend simply by CA/PA; include financial uncertainty |
| MH-13 | Transfer & Contract Planner | Sell/keep/renew/loan, expiration alerts, affordability, wage runway, transfer scenario and consequences | All currency, wages, instalments and unknowns explicitly labeled |
| MH-14 | Youth Development Centre | Prospect pipeline, mentoring context, retraining, expected minutes, loan vs keep, age/role/succession pathways | PA not guaranteed CA growth; no fake trajectory |
| MH-15 | Training & Performance Centre | Team/individual priorities, rest vs training, rotation/load flags, condition, availability and injury history | Do not advertise medical injury predictions; clear sample limits |

### IV — Match Intelligence: Before, during and after the match

| ID | Module | Must-have capabilities | Data / acceptance |
|---|---|---|---|
| MH-16 | Opposition Intelligence | Opponent formation/tendencies/matchups, key threats, adjustments, opponent dossier | Show only observed tactics/statistics; unknown opponent data = no invented scouting |
| MH-17 | Matchday Manager | Pre-match lineups A/B/C, substitutes, fatigue/eligibility, game-state changes, contingency plan | Planning tool, not guaranteed live-game automation |
| MH-18 | Post-Match Analysis | Actual vs intended plan, chance creation, goal risk, transitions, role output, learning notes | xG, PPDA, event maps require reliable model/provider/event data |

### V — Realistic Club Management: Beyond editing a game

| ID | Module | Must-have capabilities | Data / acceptance |
|---|---|---|---|
| MH-19 | Club DNA & Philosophy | Identity, non-negotiables, game model, recruiting rules, short/medium/long-term strategic alignment | Distinguish preference from hard constraint, manager override |
| MH-20 | Dressing Room & Leadership | Captain selection, hierarchy, morale, veteran exit, individual management notes, simulated relationships | Human behavior conjecture always labeled simulation |
| MH-21 | Boardroom & Club Strategy | Multi-objective goals: results, style, academy, financial health, board expectations | Model scores are configurable, not actual FM board algorithm |
| MH-22 | Football Finance | Wages, contracts, transfer/cash outlay, squad value, multi-season budget scenarios | Financial fields/units provenance; unknown is not zero |
| MH-23 | Dynasty & Succession | 1/3/5-year rebuild planning, incumbent/backup/replacement pipeline, vulnerability timeline | Multi-snapshot review, tradeoffs and scenario audit |

### VI — AI & Platform: A usable operating system

| ID | Module | Must-have capabilities | Data / acceptance |
|---|---|---|---|
| MH-24 | AI Sporting Director & Coaching Staff | Assistant Manager, Head Scout, Development Coach, Sporting Director personas; explain, challenge and compare plans | AI cannot present guesses as verified game values, cannot write without consent |
| MH-25 | What-if Scenario Simulator | Buy/sell, tactical shift, position retraining, budget changes, injury absences and youth minutes | Model scenario, not actual match engine; assumptions and uncertainties visible |
| MH-26 | Management Dashboard & Reports | Roster health, tactics, recruitment, contracts, finance, goals, season review, export | Every chart/table source-backed, accessible and comparable |
| MH-27 | Integrations, Plugins & Personalization | Game edition plugins, imports/exports, role catalog, scoring weights, theme, privacy, optional local/cloud AI | Version compatibility, least privilege, user-owned data |

## Cross-cutting supermodule MH-06: Player Intelligence & Advanced Scouting page

This is **not** just numbers. At minimum:
- Overview: player identity, position, foot, age, contract, Actual CA / eCA / PA distinct, source chips, "three strengths / three weaknesses".
- Ability and eCA: model explanation, estimated interval, verified actual when available, attributes bar chart, radar; report incompleteness.
- Position/Role Intelligence: top natural position and top *attribute-fit* role (including retraining possibility), in/out-possession requirements, midfield/wing role comparisons.
- Football Performance: percentile radar with role/league/season cohort, trend, per90 with minutes, event-based shot map/heatmap/passing network only when events and coordinates exist.
- Tactical Fit: impact of player joining the selected XI, partner-role synergy and fit to Club DNA.
- Scouting Decision: Buy / Shortlist / Loan / Internal Alternative / Pass / Insufficient Data with cost, fit delta, availability, alternatives and reasoning.
- Compare: versus incumbent and pinned recruits on matching scales, samples and competition context.
- Evidence: source/version/uncertainty and human scout annotations.

See [technical engine](../system/08-player-intelligence-engine.md) and [UI spec](04-player-intelligence-ux.md).

## Operating modes
**Realistic Manager:** hides verifiable hidden game fields where restricted, filters AI context, uses scouted uncertainties. **Advanced Editor:** may show exact hidden game fields if supported, with a separate gated editing action.

## Release dependency and phases
P0: MH-01/05 ingestion + trust. P1: MH-02/06/07/09/11 and MH-26 basic overview. P2: MH-08/12/14/25. P3: MH-13/15/16/17/18/19/20/21/22/23/24 and MH-10. P4: MH-03 only after writer safety; MH-27 progresses across all phases. This is dependency ordering, not delivery-time promise.

## Global acceptance
G1 no fake exact CA/PA or invented performance data; G2 role fit never mislabeled Actual CA; G3 all recommendations show assumptions and reasons; G4 XI players unique and eligibility respected; G5 keyboard accessible UI, reduced-motion support and missing-data states; G6 immutable original save unless user explicitly authorizes certified writer; G7 every module supports partial data with honest capability status.

## Related
[Business interview index](../business/README.md), [References](../references.md), [Design system](02-design-system.md), [Agent skills research](../engineering/agent-skills-research.md).
