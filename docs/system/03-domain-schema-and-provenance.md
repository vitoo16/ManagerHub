# S03 — Canonical domain model and provenance

All records must include source edition/build where known, save lineage/snapshot ID, adapter version and missingness.

## Entities

The following is the full product target. The implemented provisional live-research subset is described separately below; it does not complete these entities.

GameSnapshot {id, sourceHash, edition?, build?, importedAt, saveDate?, adapterVersion, coverage}.
Club {nativeId, name, competitionId?, finances?}; Player {nativeId, careerId, name, dob?, positions[], foot?, attributes?, ca?, pa?, contractId?, fitness?}.
Attribute {name, value?, nativeScale, visibility, evidence}. Position {nativeName, familiarity?, phaseRoleCatalogVersion}.
Tactic {formation, inPossessionShape?, outPossessionShape?, assignedPlayers[], roles[], instructions, edition}.
MatchSample {opponent, competition, date, minutes, eventDefinition?, provenance}. Contract {wage, wageFrequency, currency, clauses?, expiry?}.
Score {metric, value?, confidence?, explanation[], modelVersion, weightedInputs[], coverage}; Scenario {lineup, modelVersion, objectives, constraints, alternativeCount}.
EditPatch {snapshotId, targetNativeId, fields, old/new, validation, backup?, auditState}.

## Field evidence
Source enum: decoded_save / live_game / game_export / verified_external / manual / derived_model / hypothetical. Verification enum: verified / provisional / unsupported. Missing reasons: not_present / not_decoded / not_verified / incompatible_build / redacted / not_applicable.
One display field includes value, unit, time, source, edition/build, and derivation if any. CA and PA are exact only with a verified decoder, eCA is derived. Never coerce null to 0.
Temporal matching uses **verified career lineage + nativeId** first. A manually declared career ID is not proof of that lineage. Matching names between unrelated saves is unreliable. Research snapshots use snapshot-scoped native keys until cross-snapshot identity is established.

## Realism Mode and Editor
Realism Mode filters hidden properties before scoring, search, aggregate, chart, export and AI summary, not just visible UI. Editor Mode can display verified hidden game properties; separate privilege is required to write.

## Implemented FM2013 live-research subset — 2026-11-01

[The strict live contract](../research/fmrte/20-fm2013-live-snapshot-contract.md) implements `GameSnapshot` in `packages/domain/src/live-snapshot.ts`, reusing `EvidenceField<T>` and one shared exact-build JSON profile. It is distinct from export-only `PlayerDataset`; source `live_game` never means an offline save was decoded.

The immutable snapshot includes declared source identity, edition/build, reader revision, caller-declared time, manual/provisional career ID, snapshot-scoped player IDs, per-pass coverage and nullable field evidence. Runtime image bytes are explicitly unauthenticated and roster completeness unverified. Source handling stays local; that policy is not capture authentication. `ready` denotes admission only; incomplete/empty/rejected states remain distinct.

The real capture normalizes 4,058 players with 49 ordinary rating fields, 15 familiarity fields and 3,730 source-qualified club links. Editor retains provisional ratings; Realism removes all exact numeric ratings before returning/serializing because `scoutingKnowledge:'not_decoded'`. CA/PA are always null, and wage/frequency/currency/expiry stay unknown. A club link preserves `player_team_pointer` or `primary_contract_team`, without asserting current employment. Familiarity zero remains valid; no position eligibility or role catalog is inferred.

[The subsequent biography extension](../research/fmrte/22-fm2013-biography-cohort.md) adds nullable `birthDate` and `primaryNation` evidence fields. Optional four-byte date input reuses the conservative calendar decoder; malformed data rejects and invalid calendars stay unknown. The primary-nation value retains native ID/name with relationship `person_primary_nation`. All4,058 observed records normalize these fields in Editor; Realism redacts supplied biography before serialization while visibility knowledge is undecoded. Older captures omit them and remain unknown. No age, ISO code, all-citizenship or national eligibility model is inferred. The additive research shape is not a claim of compatibility with future persisted product consumers.

The local Node CLI creates a fresh explicit JSON output with input SHA-256. Product desktop IPC, snapshot storage/projection/UI, authenticated source/career identity and other-career/build validation remain unfinished. No live snapshot is silently cast into the existing export library.

## Product-specific metrics
Actual CA, eCA, RCA-style budget estimate, Role Fit, Tactical Fit, collective cohesion and percentile are distinct typed metrics with definitions and scales. No probabilistic claims without calibration and held-out evaluation.

See [analytics glossary](../business/12-football-analytics-glossary.md), [Player Intelligence](08-player-intelligence-engine.md), [data UX](../product/02-design-system.md).
