# S09 — Security, privacy, verification and release gates

Untrusted input: malformed FM save bytes, compressed data bombs, offset/length overflow, pathological object counts, unknown builds, spoofed file suffix. Parse in limited worker with strict bounds, cancellation, capped memory/time and fuzz tests. Original save stays byte-for-byte immutable on read; store SHA256 and coverage report, no save bytes in Git.

Privacy: local-first; imported names/identifiers/finances remain on user's device by default. No automatic sync/telemetry. Cloud AI only after explicit opt-in and content minimization; avoid exposure of hidden editor-only attributes in Realism Mode. Logging strips raw save data, filesystem paths and private identifiers.

Writer threat: unsupported or stale build, referential changes, checksum errors and half-written files. Gate via certifying exact edition/build, backup, temp write, independent reparse and game-load validation with rollback.

Test pyramid: unit for model math, null handling and slot uniqueness; property/fuzz tests for parser; fixtures tied to actual edition/build verified in game; integration import→domain→role→solver→UI; browser/a11y tests; model evaluation with expert tactical examples, out-of-sample eCA MAE and subgroup error; error-state/UI tests; editor full write-roundtrip. Keep scenario fixtures anonymized.

Quality gate: no fake data; role score explanation; hard constraints respected; charts based on valid source and cohort; keyboard and reduced motion; optional AI grounded; future writer cannot be enabled without game-load tests. Report actual measured performance instead of invented targets. See [design](../product/02-design-system.md), [skills](../engineering/agent-skills-research.md).