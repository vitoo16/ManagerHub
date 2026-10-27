# ManagerHub — 27-module implementation and acceptance ledger

**Status as of 2026-10-27:** all modules below **NOT IMPLEMENTED**. Do not change to Complete unless integrated code, tests, UI and an acceptance review are evidenced. This is a planning tracker, not claims of available features.

**Do not build an MVP:** all modules are in full-product scope. Each is assigned to the earliest phase where it becomes fully integrated; foundational work in earlier phases can be reused. Canonical [7-phase plan](01-full-delivery-plan.md), [agent prompts](02-agent-prompts.md).

| ID | Module | Integration phase | Dependency | End-to-end exit criterion | Initial status |
|---|---|---:|---|---|---|
| MH-01 | Save Manager/Reader | 2 | Parser, provenance | Import verified compatible save; explain unsupported and error; immutable original | Not implemented |
| MH-02 | Player Database/Explorer | 2–3 | MH-01, domain | Search/filter/compare/export with native field evidence and modes | Not implemented |
| MH-03 | Advanced Editor | 7 | Certified exact-build writer | CA/PA patch preview/backup/diff/reparse/game load/restore, unsupported disabled | Not implemented |
| MH-04 | Player Development History | 3 | Identity, snapshots | Cross-season attribute trend with edit/version markers | Not implemented |
| MH-05 | Data Integrity/Compatibility | 2 | Format test corpus | Coverage/corruption report + hashed original, no guessed fields | Not implemented |
| MH-06 | Player Intelligence/eCA | 3 | MH-02, labels | Explainable eCA or attribute index, roles, strengths, charts and confidence | Not implemented |
| MH-07 | Tactical Lab | 4 | Roles, MH-06 | Two-phase board where edition supports; keyboard, saving scenarios | Not implemented |
| MH-08 | AI Tactical Advisor | 4/6 | Rules, AI adapter | Grounded recommendations with impact/alternatives and safe unknowns | Not implemented |
| MH-09 | Role Intelligence | 4 | Role catalogs, scoring | Individual-vs-collective distinctions, partner conflicts and causes | Not implemented |
| MH-10 | Set Piece Intelligence | 7 | XI, match and roles | Corner/free kick/throw plans and matchup rules work end-to-end | Not implemented |
| MH-11 | Squad Planner 2.0 | 4 | Tactical optimizer | Best/rotation/coverage/opponent XI, no duplicated player slots | Not implemented |
| MH-12 | Recruitment & Scouting | 5 | MH-06/11 | Need-driven candidate compare and defensible Buy/Pass alternatives | Not implemented |
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
| MH-27 | Integration/Plugins/Personalize | 1–7 | App shell/services | Format plugins, private storage, settings, role weights and integration review | Not implemented |

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
