# FM2013 biography fields — 2026-11-01

Three guarded live date-of-birth observations match the three previously retained FMRTE13 Information-page `txtBorn` receipts. Primary-nation storage is recovered statically but has no runtime/reference comparison. The live snapshot schema and production capability flags are unchanged.

## Exact-artifact findings

Source is `C:\BraCa Soft\FMRTE 13\FMRTE.exe`, version13.3.3.62, SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`. Method coordinates and canonical evidence are in the [manifest](evidence-manifest.json).

| Finding | Source | Established scope |
|---|---|---|
| Birth date | Person f80, RVA446976/file439296; field001ef →7c8 →42a | Four date bytes at Person+80. |
| Offset assignment | Profile4bb →24e; IL59 assigns001ef, IL131 assigns001f1 | Born80 / primary Nation108. |
| Offset dispatch | 7c6 constructs7c5; constructor stores the argument in both4e4/4e5;7c8 selects by type | Same offsets for Player/PlayerStaff, relative to their established Person bases. |
| Primary nation | Person f86, RVA447528/file439848; f88 constructs Nation | Pointer at Person+108; not all citizenships or national eligibility. |
| Nation identity/name | Nation inherits AbstractClub; bdd/bc5 use00121/00122 | Signed ID at N+20; name-header pointer at N+32. Runtime validity unverified here. |
| Displayed age | Person f82, RVA447088/file439408 | Game-date helper e9, tick difference, DateTime construction and year-minus-one; no host-clock/calendar-age equivalence established. |

Canonical Person/Nation parent is `ev_0c0f4f9b8513558c9b50607e832766610d3f5347a7eb93404242c359a36ac8b0`. Nine source IL hashes match canonical nationality/offset metadata. Private proofs and raw bodies remain outside Git.

## Runtime comparison and original code

Evidence `ev_5a9f785772bacf957b12a62305f7092e0677ac2c441ec3b80e216621fbaba751` contains three complete, untruncated observations. The private script checks PID, architecture/pointer size, image path, pointer bounds and previously observed ID/name before reading, then repeats identity/date words. Supplied Person addresses are session-local inputs, not a new locator. No ability words, hooks, game calls or data writes are requested by this script. The owned Frida session was detached without killing the game.

Private replay verifies the source hash, record identity and exact equality with three earlier UI date strings. This is a non-blinded sampled comparison against FMRTE, not an official game-engine oracle or fresh UI capture. Names, IDs, dates and pointers stay private. Raw observations retain `verified:false`.

[decodeFm2013Date](../../../packages/domain/src/fm2013-date.ts) independently decodes exactly four bytes: signed little-endian zero-based day index and year. It honors byte-view offsets, uses UTC, accepts years1001..2999 and days strictly within that Gregorian year. Sentinel/invalid/out-of-year values return explicit unknown. It does not publish the reference tool's fallback date or reproduce its previously documented same-year overflow quirk.

The immutable result asserts no source verification. The helper is exported for reuse but is not connected to the live envelope, product UI or age calculations. Broad cohort capture and field missingness/visibility checks remain required before that integration.

`npm.cmd run check` passes TypeScript,109 Vitest/81 Node tests (190 total), build and bundle budgets. Three new tests cover leap-century boundaries, zero day, malformed sizes, signed invalid fields, out-of-year rejection, subarray offsets, input preservation and immutable results. Independent review reproduces3/3 focused tests with no actionable issue. Private replay passes three DOB reference comparisons. Installation/save integrity and canonical coordinates are audited separately.

Next evidence: bounded full-cohort biography capture with diagnostics, fresh primary-nation reference comparisons and stable current-game date before age publication. No writer or offline save decoder is enabled; the full27-module scope remains incomplete.
