# FM2013 historical snapshot consumer

**Implementation status:** integrated on feat/fm2013-historical-consumer; CI run #41489241321 passed TypeScript, unit tests, production build/bundle budgets and Playwright desktop/mobile acceptance. Awaiting PR #58 merge. The FMRTE/FM2013 research baseline was merged into main in merge commit 1cd994c.

## Scope

This workspace consumes the already-defined address-free fm2013-live-capture-v1 wire contract. It is a historical, read-only consumer. It does not attach to FM, inspect process memory, decode offline .fm saves, edit player data or write a save.

## User flow

1. The user selects an address-free JSON capture.
2. The user supplies a career label and capture timestamp. Both are caller-declared and remain provisional.
3. The browser transfers the file to a dedicated Web Worker. The worker enforces a 48 MB file bound, strict UTF-8 decoding, SHA-256, parser admission and a 45-second caller timeout/cancellation boundary.
4. The existing parseFm2013LiveCapture parser validates the exact FM2013 build and returns ready, partial, empty or rejected. Rejected inputs are not persisted.
5. The workspace shows source/build, declared capture time, import time, source hash, pass coverage, diagnostics, unknown reasons and a snapshot-local searchable player list.
6. Saving is an explicit user action. Raw wire JSON is never stored.
7. A saved snapshot can be opened after reload and explicitly removed.

## Privacy boundary

Historical records have a separate versioned schema. They are not cast to PlayerDataset and are not merged into Player Lab, Squad Planner, role scoring or eCA.

IndexedDB version 4 adds four dedicated object stores and repairs missing stores/indexes in existing v3 libraries:
- historical-editor-snapshots
- historical-editor-summaries
- historical-realism-snapshots
- historical-realism-summaries

Editor imports create two separately validated projections. The Editor projection is stored only in the Editor stores; the separately redacted Realism projection is stored only in the Realism stores. A Realism-only import never creates an Editor projection. Queries and reloads open only the selected mode's stores. Switching mode clears the prior in-memory record before loading the other projection. Deleting a snapshot removes both projections atomically.

Realism validation rejects exact ordinary attributes, position familiarity, supplied birth date, primary-nation link and derived age. Optional biography/position fields absent from legacy captures remain not_decoded, not fabricated as redacted or zero. Club links remain source-qualified observations; primary nation is not citizenship. CA, PA and contract fields remain unknown.

The source file itself is not persisted. Metadata contains only a safe basename, byte size, SHA-256, import time and the parser-produced snapshot. Editor and Realism data are never placed in the same object store or summary query.

## Storage safety

- IndexedDB is used for cohorts that may be many MiB; localStorage is not used.
- Every stored record is schema/version validated on reload and deeply frozen after validation.
- A source-hash index detects duplicate imports.
- Editor + Realism projections are written in one four-store transaction; transaction failure aborts both.
- Each mode is capped at ten snapshots. Quota errors are surfaced without overwriting an older record.
- Removal clears the matching ID from all four historical stores.
- An explicit recovery action clears only historical stores; Player Lab and Save Library stores are preserved.

## Evidence and limitations

live_game identifies the source category; it does not mean a game is currently connected. Capture time and career label are caller-declared. PID and executable hash in the parser snapshot do not prove loaded-image authentication, currentness, career lineage or roster completeness. All observed fields remain provisional.

Calendar age is explicitly a derived model based on the captured game date, not ActualAge or FMRTE-engine equivalence. Unknown values remain null with missing reasons. Position familiarity is not converted into eligibility or tactical roles. No citizenship, current employment, loan, CA/PA, contract or writer claims are made.

## Verification plan

The branch adds:
- Domain tests for Editor/Realism schema separation, strict field keys, exact build identity, optional legacy biography, zero-vs-unknown, partial/empty state and invalid metadata.
- Playwright coverage for import → browse → save → reload → mode switch, Realism-only privacy, malformed input, v1/v2-to-v4 IndexedDB migration and v3 partial-schema repair.
- Existing AFE and FM2013 test suites remain in the root npm run test command.

Acceptance passed in CI run #41489241321 (TypeScript, unit tests, build/bundle budget, desktop/mobile E2E). Do not mark MH-01, MH-03, MH-05 or the 27-module delivery phase complete from this consumer alone.
