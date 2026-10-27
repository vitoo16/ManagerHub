# S01 — Functional and non-functional requirements

**Status:** specifications, not code. Authoritative feature IDs MH-01..MH-27 are in [full catalogue](../product/01-full-feature-catalog.md).

## Priorities and acceptance
P0 MH-01/05: read-only save import, edition/build report, per-domain coverage, immutable original. Unsupported versions must fail transparently.
P1 MH-02/06/07/09/11 plus reporting: verified player explorer; estimated CA with validated calibration or preliminary attribute index; role-fit breakdown; phase-specific tactical board; unique feasible starting XI.
P2 MH-08/12/14/25: explainable tactics, need-driven scouting and retraining alternatives, development tracker and What-if.
P3 MH-10/13/15/16/17/18/19/20/21/22/23/24/27: club and match management, financial and leadership scenarios, optional grounded AI.
P4 MH-03: certified edition/build save writer, draft diff, backup/reparse/in-game load, rollback. Not part of initial release.

## Platform
Local-first with optional hosted services explicitly opted into; desktop for file-local interoperability. Raw saves never auto-upload. Every score traces to inputs, model version and assumptions. Sensitivity analysis and data sufficiency matter more than superficial high numbers.

## Quality gates
- Keyboard and focus usable; desktop and responsive read flows; accessible alternatives for radar, pitch and charts.
- Missing/unknown/unsupported values never convert to zero.
- Realism Mode enforces hidden attribute restrictions throughout queries, AI and exports.
- Incompatible saves cannot edit, no future module claims feature implemented prematurely.
- Role catalogs versioned, especially FM26 separate in/out-possession structures.
- Finance uses explicit currency, wage frequency and unknown clauses.
- Player development requires stable career identity across snapshots.

See [product design](../product/02-design-system.md), [system architecture](02-architecture-and-deployment.md), [testing](09-security-privacy-and-testing.md).