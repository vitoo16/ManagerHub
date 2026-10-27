# S10 — Workflow and service contract examples

**Conceptual API only; endpoints are not implemented.**

## Import
Select local file -> detect -> sandbox inspect -> decode -> normalize -> validate -> ready/partial/unsupported/corrupt. Include save hash, adapter ID, edition/build, field coverage, diagnostics and immutable snapshot ID. Import must not trigger writer.
Example typed result: ImportResult {status:"ready"|"partial"|"unsupported"|"corrupt", snapshotId?, family?, edition?, build?, confidence, coverageByDomain, diagnostics[]}.

## Player Report
Request {snapshotId, playerId, analysisMode, roleId?, tacticId?, selectedCohort?}. Result contains verified fields, nullable Actual CA/PA, eCA estimate with interval/model version/coverage, attributes and source, role fits, chart manifest with availability/reasons, strengths/weaknesses and conditional verdict.

## Tactical scenario
Request {snapshotId, tactic, phase, constraints, scoringWeights, personnelOverrides}. Result {feasible, reasonIfNot, lineup, roleContributions, collectiveRiskFlags, alternativeScenarios, modelVersion, dataCoverage}. Single-player role switch recomputes all positions.

## Scouting scenario
Request {targetPlayerId, incumbentPlayers[], roleNeed, budgetParams, timeHorizon}. Result {verdict, confidence, improvementDelta, affordabilityState, knownCosts, unknownCosts, internalAlternatives, evidenceRefs}. No unconditional verdict where key cost is unknown.

## Editor (future)
Request must include certified adapter/build, source hash, explicit field patch, user approval; response contains diff preview, new *copy* path, backup path, independent parser validation and rollback proof. Unsupported writer always returns disabled.

## User journeys and states
- Read save then inspect player then change roles then compare incumbent then save scenario/report; no source mutation.
- User in Realism Mode cannot see or infer hidden CA/PA via sorting/AI/export.
- Corrupt/unsupported saves report actionable error and allow retry without making data.
- Infeasible XI surfaces constraint conflicts and possible relaxations only after user approves.

Use provenance schema in [S03](03-domain-schema-and-provenance.md); test data edge states in [S09](09-security-privacy-and-testing.md).