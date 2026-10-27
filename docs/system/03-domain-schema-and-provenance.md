# S03 — Canonical domain model and provenance

All records must include source edition/build where known, save lineage/snapshot ID, adapter version and missingness.

## Entities
GameSnapshot {id, sourceHash, edition?, build?, importedAt, saveDate?, adapterVersion, coverage}.
Club {nativeId, name, competitionId?, finances?}; Player {nativeId, careerId, name, dob?, positions[], foot?, attributes?, ca?, pa?, contractId?, fitness?}.
Attribute {name, value?, nativeScale, visibility, evidence}. Position {nativeName, familiarity?, phaseRoleCatalogVersion}.
Tactic {formation, inPossessionShape?, outPossessionShape?, assignedPlayers[], roles[], instructions, edition}.
MatchSample {opponent, competition, date, minutes, eventDefinition?, provenance}. Contract {wage, wageFrequency, currency, clauses?, expiry?}.
Score {metric, value?, confidence?, explanation[], modelVersion, weightedInputs[], coverage}; Scenario {lineup, modelVersion, objectives, constraints, alternativeCount}.
EditPatch {snapshotId, targetNativeId, fields, old/new, validation, backup?, auditState}.

## Field evidence
Source enum: decoded_save / game_export / verified_external / manual / derived_model / hypothetical. Verification enum: verified / provisional / unsupported. Missing reasons: not_present / not_decoded / incompatible_build / redacted / not_applicable.
One display field includes value, unit, time, source, edition/build, and derivation if any. CA and PA are exact only with a verified decoder, eCA is derived. Never coerce null to 0.
Temporal player matching is **careerId + nativeId** first. Matching player names between unrelated saves is not reliable.

## Realism Mode and Editor
Realism Mode filters hidden properties before scoring, search, aggregate, chart, export and AI summary, not just visible UI. Editor Mode can display verified hidden game properties; separate privilege is required to write.

## Product-specific metrics
Actual CA, eCA, RCA-style budget estimate, Role Fit, Tactical Fit, collective cohesion and percentile are distinct typed metrics with definitions and scales. No probabilistic claims without calibration and held-out evaluation.

See [analytics glossary](../business/12-football-analytics-glossary.md), [Player Intelligence](08-player-intelligence-engine.md), [data UX](../product/02-design-system.md).