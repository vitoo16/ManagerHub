# FM2013 live snapshot contract and additional field research

**2026-11-01:** an original local pipeline now turns a complete REA live capture into immutable ManagerHub domain snapshots for 4,058 observed players. This is demonstrated research functionality for the exact local executable, not a certified product adapter. It preserves source uncertainty, restricts Realism data before returning it, and provides no game-memory or save-write operation.

## Actual capture and transport

REA/Frida evidence `ev_8d3ff8dc594e957ee64e49e8854652bf7addb367344ea021a27fb831ecb4275d` captures 4,036 normal Players and 22 dual PlayerStaff records. The passes report no rejected/duplicate candidates, read faults or quota stop. Each reports 806,587,543 attempted scan bytes, including overlap; elapsed times are 2,333 ms and 1,076 ms. Every record contains 49 signed ordinary-attribute bytes and 15 signed position bytes. This batch requests no CA/PA words.

There are 3,730 observed club links and 328 unknown relationships. The compact transport contains 527 dictionary entries keyed by ID, name and relationship; this is not a count of unique clubs. Missing links do not establish that the player has no club.

The first plain-array response, `ev_2fe1827761eb6d631c4369cf2900c5918664d07308c2327638efe02ab9a807df`, was truncated by the MCP representation budget, rejected and never admitted as a complete snapshot. The replacement packs signed bytes as bounded hexadecimal tuples and deduplicates club tuples. Its retained response explicitly reports `messages_truncated:false`. The extractor rejects truncation, errors, ambiguous envelopes, unknown encodings and invalid tuple/dictionary bounds.

The decoded address-free wire file is 1,434,825 characters, SHA-256 `7290120eda97cb4f5531001e8e896aa84c1386529181a3f0668c830b13fc96bc`. It and the complete evidence bundle remain private. Complete transport does not establish an atomic game snapshot or authenticate every loaded image byte.

## Shared profile and domain boundary

[fm2013-live-profile.json](../../../packages/domain/src/fm2013-live-profile.json) is the shared source for exact executable identity, native kinds, 49 ordinary definitions, 15 position definitions and resource limits. The existing ordinary-field module imports this catalogue rather than maintaining duplicate offsets.

[parseFm2013LiveCapture](../../../packages/domain/src/live-snapshot.ts) accepts only `fm2013-live-capture-v1` / `fm2013-live-research-1`, the exact path/hash, x86 and four-byte pointers. It validates unknown fields, numeric/text bounds, field counts, duplicate native IDs/kinds, scan counters and stop reasons. Addresses, ability words, extra contract data and claimed certification are rejected. Input is bounded to 12 million text characters and 10,000 records. Snapshots, fields, coverage and diagnostics are deeply frozen.

| Contract decision | Result |
|---|---|
| Source and verification | `live_game`, always `provisional`; input claims cannot certify fields. |
| Source identity | Executable SHA, PID, architecture, pointer size and reader/profile revision retained; `runtimeImageBytesAuthenticated:false` is explicit. |
| Career and time | Career identity is manual/user-declared; time is caller-declared. PID and names do not prove save lineage. |
| Player key | Snapshot ID plus native ID; no automatic cross-career merge. |
| Coverage | Per-pass declarations remain provisional. Faults, quotas, missing kinds, rejected or duplicate candidates produce `partial`; zero accepted rows produce `empty`. |
| `ready` | Payload admission succeeded; roster completeness remains `unverified`. This does not certify every field or the entire database. |
| Missingness | Unknown clubs/contracts remain null with a reason; zero familiarity is retained in Editor. |
| Privacy | Scouting knowledge is not decoded. Realism redacts all 49 exact ordinary ratings and 15 exact familiarity ratings before return/serialization. Editor preserves their provisional values. |
| CA/PA | Always null: `redacted` in Realism and `not_verified` in Editor. Three-record reference matches do not authorize batch publication. |

The implemented `GameSnapshot` remains separate from export-only `PlayerDataset`. No cast, export-library relaxation, browser process access, desktop IPC endpoint or product UI integration was added. Numeric field evidence is not a scouting/Fog of War model; an editor displaying a rating does not prove a manager may see its exact value.

## Position storage

File-backed REA evidence `ev_c930eb3599312385b31e3a78f437c5003e4c8a2b2c59f1df85302e206dbb5793`, `ev_097b85cd73490dc3787df82b427b0527944d5996985bd06e45b0caf2ff80cab3` and `ev_40efb82c66bf78a8fb0c29e2e1a9f8ab4ee06b0b3a12bfdd8f095b5ae6ddae12` establish signed-byte getters, shared Positions construction and profile 4bb →055a at IL117. A is the attributes pointer at complete-object base B+228 for both supported kinds.

| Position | GK | SW | DL | DC | DR | DM | ML | MC | MR | AML | AMC | AMR | ST | WBL | WBR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Offset from A |32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|

These values have no ordinary-attribute scaling; zero is preserved rather than treated as missing. Repeated native reads recover all 15 on three selected records; one dual-class reference Positions page matches all 15. The full cohort contains no zero position cells, so zero preservation is verified synthetically rather than claimed as a real-data observation. Private screenshot/receipt remain outside Git. UI CIL evidence `ev_fb8ac3d9014e1ce9de77b2af5efa225bb184a00c7df63216856b7c73be953670` shows editor increments and inconsistent display thresholds. Those conventions do not establish game eligibility. The snapshot derives no eligible positions or tactical roles.

## Club and contract relationships

Static proof follows the exact-profile Player, PlayerStaff, Team, Club and Contract initializers. Normal Player's team pointer is at B+664. The dual class's direct team slot is zero in the selected initializer and is not used as a team relationship.

For dual players, the first contract comes from the pointer-vector header at B+608. The probe validates bounds/count and requires contract.Person at K+4 to equal Person B+452. Contract.Team is K+8. Team.Club is T+32; Club ID is signed 32-bitC+20 and name-header pointer is C+32. Header/length and UTF-16 text are checked; links, ID and name are reread. The normal contract-vector header, investigated statically but not used for its batch club source, isB+512.

Normalized relationships remain `player_team_pointer` or `primary_contract_team`; neither proves current employment or loan status. A malformed/changing optional link is omitted with a private diagnostic while independently stable ordinary fields remain usable. No fabricated club is substituted.

Static research identifies signed wage K+16, start-date bytes K+32 and expiry bytes K+40. FMRTE applies configured frequency/currency conversion; its date routines contain validation, sentinel and out-of-year quirks. One dual-class contract reference matches two normally valid calendar dates. The displayed wage and raw base agree with an inferred ratio of 1.15, but configured currency/rate was not read. Raw integers cannot become Money values without effective unit/currency evidence, and a first contract cannot establish current employment/loan classification. All normalized contract fields remain `not_decoded`; no completed wage/expiry importer is claimed.

Runtime evidence `ev_b14262a1993ebfad5a1ead27f5e9adddf1f5fb02c48fda545c7a42af7627277b` reads selected positions and link/contract structures without modification. Private static proofs retain tokens, IL hashes, exact-profile assignments and conversion comparisons. The manifest links canonical bundles; no proprietary CIL body or private player record is committed.

## Local file normalization

[fm2013-live-wire.mjs](../../../scripts/fm2013-live-wire.mjs) builds both guarded passes from unique file-bound RTTI proofs and extracts the compact envelope. [fm2013-normalize-live.mjs](../../../scripts/fm2013-normalize-live.mjs) performs explicit file-in/file-out normalization through the shared TypeScript parser, without attaching to a process or uploading data.

The CLI requires input, fresh `.json` output, snapshot ID, declared career ID, timestamp and explicit mode. It checks a regular input against 24,000,000 bytes, reads at most its checked size plus one byte through the same opened handle, checks size/mtime again and decodes UTF-8 strictly. Output is bounded to 160 MiB and created with `wx`; source and existing outputs are not overwritten. These are bounded local-file safeguards, not transactional isolation against every hostile concurrent mutation.

```powershell
node --experimental-strip-types scripts/fm2013-normalize-live.mjs `
  --input 'C:\private-evidence\complete-live-capture.json' `
  --output 'C:\private-evidence\new-editor-snapshot.json' `
  --snapshot-id 'locally-declared-capture' `
  --career-id 'locally-declared-career' `
  --captured-at '2026-11-01T00:00:00Z' `
  --mode editor
```

These paths/IDs/time are usage examples. The actual complete capture was normalized for both modes into fresh outputs, admitting4,058 provisional records as `ready`. Private replay verifies 198,842 Editor ordinary cells and 60,870 position cells with corresponding Realism redactions, link/missing counts, reference comparisons and pinned source/output hashes. `npm.cmd run check` passes TypeScript, 106 Vitest / 81 Node tests (187 total), build and bundle budgets. Details and evidence integrity checks are in [verification](07-verification-and-tests.md).

## Limits and next evidence

Independent review found an initially unbounded CLI read between stat calls and missing evidence for manager visibility. The code was tightened to bounded opened-handle reads and conservative Realism redaction before delivery. Synthetic tests verify safeguards; real captures separately establish reading of the tested game state. No game/save data was edited, and owned Frida sessions were detached.

Required next evidence includes another career/reference cohort, manager/scouting knowledge, real access-denied/wrong-build/process-exit coverage, reviewed desktop IPC/storage/UI integration and independent offline payload research. Writer semantics/persistence remain unknown. The full 27-module scope is unchanged.
