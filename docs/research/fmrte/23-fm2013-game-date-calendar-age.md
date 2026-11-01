# FM2013 game date and derived calendar age — 2026-11-01

The exact-build research capture now carries a native game date, read and repeated before and after both player passes. A fresh Football Manager screenshot matches that date. All4,058 observed players normalize with an explicitly derived calendar age in Editor; Realism redacts every age before returning or serializing it. This is a calendar model, not a newly decoded engine-age field or a reproduction of FMRTE's displayed-age algorithm.

## Static source and image-relative date

Source is `C:\BraCa Soft\FMRTE 13\FMRTE.exe`, version13.3.3.62, SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`. The native target remains FM2013 build13.3.3f359652. [The manifest](evidence-manifest.json) pins source coordinates and private evidence.

| Link | File-backed observation | Limit |
|---|---|---|
| Profile4bb | IL888 loads38,309,580 into0066e; IL899 obtains00659, IL905 obtains0066e, IL910 loads76, IL912 adds and IL913 calls8c4 | Statically associated exact-build descriptor, not an observed runtime FMRTE profile selection. |
| Descriptor property | 8c4 stores00618;8c3 returns00618 | Date offset is38,309,656. |
| Date getter e9 | Adds GameProcess.BaseAddress to00659's8c3 value, then calls42a | 1374 returns cached field009b2; assignment of that field to MainModule was not fully traced in this step. |
| Postaccept4c4 | Inspected direct field operations affect0065a rather than00659 | No direct date override in this method; not a guarantee against every runtime mutation. |

The original reader uses actual `Process.mainModule.base` plus38,309,656, bounded within the exact image size. A current-game UI match corroborates that candidate for this observed build; the property name alone does not prove FMRTE's cached-base ownership. The four date bytes use the established signed little-endian day-index/year representation. Invalid/sentinel/out-of-year values remain unknown.

A fresh static selection initially reported one unmatched nested full type name. Retrying with the supported simple inner name selected all four requested types. Both receipts remain retained; the unmatched query is not presented as complete coverage.

## Runtime experiment and lifecycle

The prior game PID was no longer present and attachment was refused. Inventory found a new game process and a new FMRTE process. This is an observed session reset; the agent did not kill or launch either process and its cause is unknown. Old player addresses were not reused: both native cohorts were recovered using the file-derived RTTI locator under the new PID.

The [game-date probe](../../../scripts/fm2013-game-date-probe.mjs) checks PID, image path, x86/four-byte pointers, exact image size and offset bounds before reading. It repeats the four bytes and retains explicit unauthenticated-image status. Standalone evidence `ev_0b6a422ba29e656c3d7fdc2eec9f56d37cbccb20623f5ce1193142fc83bdef76` establishes one stable candidate date; its REA runtime record has no artifact identity. Script hashes and host binary/profile identities bind the research separately and do not authenticate loaded image bytes.

Complete dated-cohort evidence `ev_c787c93a256355c0a7d56965e6f7046347e8b3fec66723cfbe547d67d7e70acd` recovers4,058 records. [The wire builder](../../../scripts/fm2013-live-wire.mjs) reads/repeats the date before both passes and again afterward. A changed endpoint rejects the capture before emission. Optional `gameDateBytes` extends the packet; old captures remain admissible with unknown date/age.

One fresh FM screenshot/visual-transcription receipt matches the decoded native date. An earlier receipt captured before the PID change remains historical evidence only. Screenshot dates, player dates/ages, names, IDs and runtime addresses remain private. No Continue, Save Changes or game-data edit was requested; owned Frida sessions were detached. Equal endpoints and repeated fields do not establish an atomic career snapshot, detect every intervening change or authenticate career lineage. Actual FMRTE runtime profile selection remains unobserved.

## Age models remain distinct

Person f82 uses a current-game-date tick difference, constructs a DateTime from that elapsed duration, then takes year-minus-one; nonpositive duration returns zero. Its repeated Born getters assume stable source values. This differs from completed calendar years around some anniversaries and leap boundaries.

A private original interpreter/comparator uses safe System.DateTime operations without loading or executing the target assembly. All995 synthetic CIL-formula comparisons match. On that deliberately selected boundary cohort,127 results differ from month/day calendar age and119 differ from an AddYears convention that clamps a leap-day anniversary to the last February day. These are selected test counts, not population error rates or FM-engine measurements.

[calculateCalendarAge](../../../packages/domain/src/fm2013-calendar-age.ts) independently implements `gregorian-month-day-v1`: completed years from strict Gregorian dates, with a leap-day anniversary on March1 in common years. It preserves newborn zero and returns unknown for malformed dates or a birth date later than the snapshot game date. It never uses the host clock or declared capture timestamp.

[The snapshot](../../../packages/domain/src/live-snapshot.ts) keeps `gameDate` as provisional `live_game` evidence. `calendarAge` has source `derived_model`, model version and `asOf:'snapshot_game_date'`. Editor calculates it only from valid birth/game dates. Missing inputs stay unknown; Realism always redacts the age before return/serialization. This is not ActualAge or a claim of FM-engine/FMRTE equivalence.

## Executed checks and limits

`npm.cmd run check` passes TypeScript,121 Vitest/87 Node tests (208 total), build and bundle budgets. Tests cover strict calendar/leap boundaries, future/missing dates, newborn zero, immutable model evidence, timestamp independence, legacy captures and privacy. Probe tests refuse wrong targets before memory access and reject inaccessible/changing dates. A VM wire test executes both RTTI passes with an empty synthetic cohort, observes16 stable date-byte reads and rejects an endpoint change.

Private `verify-fm13-dated-cohort.mjs` retains a passing fresh Editor/Realism replay:4,058 derived ages and4,058 age redactions, plus one fresh game-date screenshot match. Three computed ages match earlier retained FMRTE header ages. Four captured records differ between the computed reference-formula equivalent and the calendar model; these are computed disagreements, not four independently observed UI discrepancies. The private995-case CIL comparison was rerun successfully. Independent source review found no actionable probe/wire/domain defect. Canonical source/installation/save integrity is audited separately.

No browser process API, product IPC, offline decoder, writer or certified build is added. Broader reference/lifecycle/error cases, linked-object identity, manager/scouting visibility and a reviewed local consumer remain gates. The full27-module scope stays incomplete.
