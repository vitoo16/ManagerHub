# P03 — Requirement Traceability, Priorities and Risks

**Document state:** product spec; no product code shipped. `MH-xx` is the stable feature ID in [catalogue](01-full-feature-catalog.md).

| Business evidence | Feature family | Technical design | Validation |
|---|---|---|---|
| B01 Club Philosophy | MH-19/21/23 | S06/S07/S08 | Philosophy constraints clear and manager override |
| B02/B13 Player Assessment | MH-02/06/12 | S03/S08 Player Intelligence | CA vs eCA vs Role Fit labels, held-out eCA validation |
| B03 Tactics | MH-07/08/09/10 | S06 Tactics | Role synergy scenarios, phases edition-aware |
| B04 Squad Construction | MH-11/23/25 | S07 Optimizer | Unique lineup, reassign recomputes all slots |
| B05 Recruitment | MH-12/13 | S08 Recruitment | Price/role/urgency alternative comparisons |
| B06 Youth | MH-04/14 | S08 Recruitment & Development | Snapshot identity, unknown PA never invented |
| B07 Training & Recovery | MH-15 | S07/S09 | Workload is not medical certainty |
| B08 Matchday | MH-16/17/18 | S10 Workflows | Only observed opponent/event stats |
| B09 Leadership | MH-20 | S03 Domain & S10 | Human simulation labeled |
| B10 Finance/Board | MH-21/22 | S03/S08 | Currency, pay frequency and missing clauses |
| B11 Long-term Planning | MH-23 | S07 | 1/3/5-season tradeoff comparisons |
| B12 Metrics | All charts/reports | S03/S09 | Provenance/cohorts/units and evidence |

## Decisions
D01 Local-first default; users choose save files and cloud opt-in.
D02 Format reader and writer are separate security domains.
D03 No pseudo-accurate match-winning score or unvalidated eCA.
D04 Accessible football workbench UI instead of overdecorated SaaS landing page.
D05 Impeccable Shape + Taste app workflow + Vercel audit/React patterns as primary external design skills.

## Risks and mitigations
- R01 Incompatible binary formats → exact edition/build adapters; fixture-driven validation; unsupported mode.
- R02 CA reverse-estimation mismatch → holdout testing and intervals; attribute-index fallback before model calibration.
- R03 Save corruption → writer disabled until certified temp copy, independent reparse and actual game-load test.
- R04 Tactical pseudoscience → transparent heuristics, coverage, sensitivity and domain expert tests.
- R05 Misleading football charts → never draw event maps without events; define percentile cohorts and minutes.
- R06 Hidden-field leakage → Realism Mode at data access boundary and downstream exports/AI.
- R07 Agent skill supply chain → review upstream scripts, licenses, source/pinning before local install.
- R08 Overly flashy design harms analyst workflow → data-first design contract and keyboard/chart audits.

## Open questions
Which FM release and build produced the user's afe. sample? What CA/PA fields can be validated? What game statistics/events survive the save? How is a safe writer proven on test fixtures? How many labeled players support eCA holdout calibration? Which competition-specific squad registration rules are accessible? Which front-end stack/Tauri version is chosen?

## Contribution requirement
For new feature: business question -> MH-ID -> detailed domain contract -> UI states -> acceptance tests -> evidence/provenance. When external tools change versions update [skills research](../engineering/agent-skills-research.md) before expecting agent consistency.
