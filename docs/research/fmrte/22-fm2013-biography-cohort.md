# FM2013 biography cohort and snapshot admission — 2026-11-01

The exact-build research reader now captures birth-date bytes and primary-nation links for all 4,058 observed player records. Both fields survive complete transport and local Editor normalization; Realism redacts them before returning or serializing the snapshot. Three DOB values and three primary-nation names match previously retained reference UI receipts. This supersedes report21's static-only nationality and disconnected-biography stage. Production integration, other-career/build support and writing remain unfinished.

## Actual runtime evidence

REA/Frida evidence `ev_5ccc5c00f65002b6f303993368cf23d253ba35a2619869ed094320646f28dbf0` contains the complete compact capture with `messages_truncated:false`. The shared exact-build profile and file-derived RTTI checks identify the two already established native player kinds.

| Observed pass | Records | Attempted scan bytes, including overlap | Elapsed |
|---|---:|---:|---:|
| Player | 4,036 | 807,337,144 | 2,658ms |
| PlayerStaff | 22 | 807,337,144 | 1,361ms |

Both passes report no faults, rejected/duplicate candidates or quota stop. All 4,058 records carry date bytes and primary-nation observations; all dates decode within the conservative calendar subset. The nation dictionary contains 127 distinct ID/name tuples. Dictionary coverage does not establish global nationality completeness or authenticate the native Nation objects.

The [previous field investigation](21-fm2013-biography-fields.md) supplies the source-bound layout: date bytes at Person+80 and primary-nation pointer at Person+108. The optional biography reader repeats date bytes and nation pointer/ID/name, alongside the existing record identity and ordinary-field checks. A missing or faulty optional field remains unknown with a private diagnostic; it does not manufacture a date or a no-nation interpretation. The observed zero-fault result is specific to this cohort.

No raw pointer or diagnostic string enters the normalized wire packet. Source captures, scripts, receipts and complete snapshots remain private. The script requests no game-data writes, hooks, game calls or ability-word reads. Owned Frida sessions were detached without killing the game.

## Transport and normalization

[The wire module](../../../scripts/fm2013-live-wire.mjs) now emits `hex-i8-tuples-v2`. It retains six columns per player, combining the position bytes, optional four date bytes and nation-dictionary reference in one bounded string. Nation tuples contain only native ID/name. This keeps the representation compact without admitting truncated previews as complete records.

The extractor still accepts `hex-i8-tuples-v1`. Schema/profile remain version1 with registered optional `birthDateBytes` and `primaryNation` fields; older captures remain admissible with unknown biography. Unknown encodings, malformed tuples/references and incompatible decoded fields reject. Transport compatibility is separate from build compatibility or source authentication.

[The domain parser](../../../packages/domain/src/live-snapshot.ts) adds nullable evidence fields:

| Field | Editor | Realism | Meaning and limit |
|---|---|---|---|
| `birthDate` | Provisional ISO calendar date when four valid bytes decode | Supplied field redacted before return | No age is derived. Invalid/sentinel/out-of-year dates stay unknown. |
| `primaryNation` | Provisional native ID/name with `person_primary_nation` relationship | Supplied link redacted before return | Does not assert all citizenships, ISO codes, represented national team or eligibility. |
| Omitted biography | `not_decoded` | `not_decoded` | Omission never means the player has no date or nation. |

The conservative [date decoder](../../../packages/domain/src/fm2013-date.ts) is reused. It honors signed little-endian day/year, Gregorian leap rules, byte-view offsets and UTC conversion, and does not publish the reference tool's fallback/overflow dates. Structurally malformed arrays or foreign nested fields reject even if the selected mode would redact them.

All evidence remains `live_game` and provisional. `ready` still denotes payload admission; runtime image bytes, atomic career identity and roster completeness remain unauthenticated/unverified. Existing source-qualified club relationships are preserved. Realism also redacts all49 ordinary numeric ratings and15 familiarity ratings. CA/PA and all contract fields remain null in both modes. No product IPC, storage projection or browser process API is added.

## Real replay and reference comparison

Private `verify-fm13-biography-cohort.mjs` passes and retains `fm13-biography-cohort-verification.json`. It verifies complete wire extraction, explicit fresh-output CLI normalization and 4,058 records in each mode. All4,058 Editor dates and primary-nation links are present; corresponding Realism fields are redacted before serialization. The complete private outputs and source hashes are pinned separately in the manifest.

Three date values and three nation names match the previous retained UI receipts for the same identified ordinary/dual records. These are exact sampled comparisons against the reference application, not fresh UI observations, blinded tests or an official game-engine oracle. Native nation IDs are not independently validated by those displayed-name comparisons. Private record values and names are not committed.

Focused independent review reproduces25 Node tests and23 domain/date tests with no actionable defect. These tests cover malformed/optional data, changed fields, bounded dictionaries and legacy transport, date boundaries, unknown missingness, immutability and Realism serialization. Synthetic guards do not replace real wrong-build/access-denied/process-exit or other-career validation. Full repository checks and canonical evidence integrity are recorded in [verification](07-verification-and-tests.md).

The full `npm.cmd run check` passes TypeScript,113 Vitest/84 Node tests (197 total), production build and bundle budgets. No UI was added; no claim is made of an exercised product snapshot persistence consumer.

## Remaining gates

Player native RTTI admission does not validate Team/Nation object RTTI. Further independent object identity, broader career/build/reference coverage, manager/scouting knowledge, stable current-game date and tested lifecycle/error behavior remain required. A primary-nation link does not establish citizenship or eligibility. The reader derives no age from the host clock. Offline save decoding and independent writer/persistence certification remain separate gates; no full module or delivery phase is marked complete.
