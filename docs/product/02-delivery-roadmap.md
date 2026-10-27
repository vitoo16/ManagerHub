# P02b — Sequenced Roadmap and Gates (not delivery time estimates)

| Phase | Modules | Exit criterion |
|---|---|---|
| P0 Foundation | MH-01, MH-05, domain schema, fixtures | One verifiably supported edition/build or honest unsupported result; original unchanged |
| P1 Read-only MVP | MH-02, MH-06, MH-07, MH-09, MH-11, MH-26 | Source-backed Player Report, eCA appropriately labeled, player-role comparisons, feasible XI, accessible charts |
| P2 Football Intelligence | MH-08, MH-12, MH-14, MH-25 | Explainable advice, recruitment vs squad comparison, multi-snapshot development, scenario changes |
| P3 Club/Match Operations | MH-10, MH-13, MH-15–24, MH-27 as needed | Coverage for relevant data, finance units and scenario assumptions; leadership clearly simulated |
| P4 Safe Editing | MH-03 | Certified writer, independent reparse, game-load validation, rollback proof |
| P5 Advanced AI | MH-24 (extended), model benchmarking, integrations | No invented player data, no hidden data leak, no autonomous editing |

Research order: versioned save reader → provenance → eCA calibration dataset → role definitions/constraints → squad solver → UI and charts → scouting and club operations → editing. Parallel UX direction can be prototyped with clearly fake/demo data but never disguised as imported save.

Product KPI candidates: import correctness/coverage; ability estimate held-out MAE and interval calibration; number of explainable roles; XI constraint pass rate; task completion for scouting verdict; keyboard a11y; user trust in provenance. Avoid claiming KPI values prior to measurement.

See [full catalogue](01-full-feature-catalog.md) and [agent research](../engineering/agent-skills-research.md).