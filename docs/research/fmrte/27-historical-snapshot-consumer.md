# FM2013 historical snapshot consumer

**Implementation status:** historical consumer merged into main in PR #58 (merge commit d918a68); CI passed TypeScript, unit tests, production build/bundle budgets and desktop/mobile Playwright. The portable local capture-to-wire handoff was merged in PR #59 (merge commit ed668cb); the Historical Snapshots interface now includes a bilingual, keyboard-accessible manual capture guide. This remains a historical, read-only path; no product IPC or live-session capability is enabled.

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

## Local capture to browser-import handoff

The Windows research CLI now supports a direct address-free wire export for this workspace. The exact FM2013 build is identified by SHA-256, not by one machine-specific install path. The process observer accepts only an absolute local Windows path ending in `fm.exe`, hashes the executable found from the selected PID, and requires the exact profile hash. The prepare step reads that observed path again and rechecks the bytes before generating RTTI proofs and the read-only script. UNC/network, relative, traversal and non-`fm.exe` paths are rejected.

On the Windows host, from a clean ManagerHub checkout:

```powershell
npm run research:fm2013:session -- prepare --pid 1234 --ticket "$env:TEMP\fm2013-ticket.json" --script "$env:TEMP\fm2013-capture.js"
```

Load the generated script through the explicitly selected REA process and export the **complete** evidence bundle locally. Then produce the file consumed by the browser:

```powershell
npm run research:fm2013:session -- export-wire --ticket "$env:TEMP\fm2013-ticket.json" --evidence "$env:TEMP\rea-evidence.json" --evidence-id ev_REPLACE_WITH_64_HEX --output "$env:TEMP\fm2013-wire.json"
```

The CLI requires one exact evidence ID, an unchanged prepared script, a valid unexpired ticket, matching capture/PID bindings and successful process observations at both endpoints. It rejects truncated/ambiguous evidence and writes a fresh JSON file with create-new semantics. The output is the unprojected `fm2013-live-capture-v1` source wire; its SHA-256 is printed for comparison with the browser import hash. `finalize` remains the normalized research-document output and is not the browser import format.

**Privacy:** wire export is address-free, not value-redacted. It can contain exact observed ratings and biography. Keep the source file and REA evidence local/private; do not commit or share them. The Historical Snapshots workspace applies Editor/Realism projection before display and persistence. Choosing Realism in the browser does not sanitize the original wire file on disk. The CLI's internal parser validation uses a discarded Editor document only to validate the source schema; its summary is labelled `unprojected_source` and does not claim a Realism projection.

This closes the file handoff only. REA remains an explicit manual step; there is no desktop IPC, automatic process discovery, watcher, loaded-image authentication, currentness proof or career-lineage proof. Captures remain historical and provisional.


## In-app manual workflow

The historical import form contains a native HTML disclosure titled **How to create a capture file** (VI/EN). It explains the existing Windows research-only `prepare` → authorized manual REA capture → `export-wire` → browser import sequence with selectable PowerShell commands, PID/evidence placeholders, expiry, SHA-256 comparison and source-file privacy warnings. The guide never initiates process access from the browser. It stays collapsed by default so it does not obscure the regular import flow. A desktop/mobile Playwright test exercises disclosure, English/Vietnamese copy and keyboard close.

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
- A source-hash index detects duplicate imports before enforcing the ten-record limit; reimporting an already-saved capture does not consume capacity or overwrite records.
- An Editor reimport of a source previously saved only in Realism adds the missing Editor projection atomically under the existing snapshot ID; the stored Realism record remains byte-for-byte unchanged. The original user-declared career label, captured-at time, file metadata and import time take precedence over later declarations for the same source SHA-256. Both modes then reopen and delete together by ID. This is an explicit mode upgrade, not new evidence that the career label or timestamp was verified.
- A duplicate in the selected mode remains a no-write duplicate, while genuinely new projections still enforce the ten-record limit. A Realism store already at ten entries does not block adding a missing Editor projection for its existing source.
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

Acceptance passed in CI run #41490068166 (TypeScript, unit tests, build/bundle budget, desktop/mobile E2E). Do not mark MH-01, MH-03, MH-05 or the 27-module delivery phase complete from this consumer alone.
