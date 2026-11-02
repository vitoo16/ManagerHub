# FM2013 bounded discovery of player candidates

REA MCP6.7.0 / Frida17.23.2 executed the original research scanner twice against the user-opened FM2013 process. Both runs returned **4,036 distinct candidate IDs**, with identical identities, addresses and tested ordinary attributes. The user independently supplied ID, Passing and Pace for a second named player; all three matched. Together with the earlier comparison, this establishes six field comparisons across two records. It does not certify whole-database coverage, Actual CA/PA, a production adapter or an offline save parser.

## Static discovery path

The FMRTE13 artifact remains `<FMRTE13_INSTALL_ROOT>\FMRTE.exe`, version13.3.3.62, SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`. New canonical static evidence is `ev_ee3b373fb1514a3e7c7e761fc13f69770d0c5e2d5de5a08e8aca853408337c57` (profile/descriptors) and `ev_dcdc817da7d2a760dfbc94ed93d764b721274d5d620d8c9a6759262231d9c7cf` (generic discovery/scanner/catalog entry). Exact method coordinates and hashes are in [the manifest](evidence-manifest.json).

The [previous catalog trace](15-fmrte13-player-catalog.md) already established `e8 -> 1bb -> 1b1`. Further CIL inspection identifies an additional, profile-dependent preparation path:

| Build-local method | Observed static role |
|---|---|
| `0x060001bb`, RVA67396 | Calls descriptor virtual `91a` at IL119 before catalog routine `1b1` at IL154 on its discovery branch. |
| `0x06000519`, RVA182056 | Candidate nested profile override of `91a`; calls generic discovery method `15` at IL12. |
| `0x06000015`, RVA11628 | Clears descriptor state, requests scanner indexing through `141`, examines grouped addresses and constructs/validates candidate objects before assigning type markers. |
| `0x06000141`, RVA42780 | Initializes scanner dictionaries/callback state and calls shared scan routine `14b`. This is not itself a fixed native player-list root. |
| `0x06000014`, RVA10152 | A separate generic preparation path reached through nested override `518`; do not merge the two paths. |

The inspected candidate profile's override `517` returns true. Its version validator `50d` compares version-description strings, normalizes a description and dispatches descriptor initialization `91e`. Override `51c` replaces two descriptor constants; address helpers `8cb/8cc` conditionally add `GameProcess.BaseAddress`, and `8cd` packs the resulting pair into an Int64. These constants must not be reported as observed native object roots. Their version-string contents and the exact profile selected by a running FMRTE instance remain unresolved. FMRTE was not executed.

In `1b1`, the descriptor's alternate discovery branch combines scanner results for multiple profile markers. Its Player branch validates a marker, subtracts the mutable Person-to-Player displacement and constructs Player. Thus the static evidence includes a scan/group path as well as a pointer-table path. The original scanner below uses an observed same-session marker; it does not reproduce FMRTE's complete profile resolver or claim a recovered native global table. The UI-worker scheduling gap remains open.

## Executed original implementation

The existing [read-only probe](../../../scripts/fm2013-readonly-record-probe.mjs) now also exports `buildFm2013ReadOnlyPlayerScan`. Single-record and scan modes share target guards, bounded name decoding, identity reads, attribute reads and repeated-field checks. The caller supplies the selected executable hash, same-session anchor address, PID, expected ID and both names. The target must match the expected path, ia32 architecture and four-byte pointer width before any memory read.

The scanner reads the anchor's native Person marker, requires it to point inside the main image, and scans only snapshotted anonymous writable mappings. The marker is an observed classification candidate, not a universal FM signature. Each matching address is aligned/checked, shifted back by the recovered356-byte displacement and validated through matching positive ID/ID2, nonnegative SID, bounded names and repeated identity/pointer/attribute reads. Rejected candidates, duplicate IDs, failed chunks, missing anchor and partial coverage remain explicit.

Hard ceilings are1GiB of attempted scan bytes,20seconds,10,000 accepted records and20,000 distinct pattern matches. Scans use64KiB chunks with three-byte overlap, count failed attempts and overlap against the byte budget, and check elapsed time between chunks and candidates. These are cooperative limits around bounded synchronous reads, not a process-wide memory/time reservation. A native `scanSync` result can include a full chunk's matches before the match limit is checked. Individual reads do not form an atomic snapshot.

Batch mode does **not** read raw ability words. Every output retains candidate provenance, `actualAbilityVerified:false`, `independentGroundTruthVerified:false` and `databaseCompletenessVerified:false`. No player snapshots are inserted into the application. No hooks, game-function calls, instruction patches, gameplay-data writes or save writes were issued.

## Runtime evidence and comparisons

The selected `fm.exe` remains metadata build `13.3.3f359652`, file SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871`. Runtime path/architecture are correlated with the file; loaded image bytes are not authenticated. Both scans used the same running process, so they do not test restart relocation.

| Measurement | First anchor | Second anchor |
|---|---:|---:|
| Canonical evidence | `ev_31bca470589810638fb66355c428390ee4352c25ffafd481e907785cab38b8fe` | `ev_a068e86c61857321138fbe668a808db1578c36c5416a7a522bcdb999d5eb4d38` |
| Attempted scan bytes, including overlap | 835,703,273 | 835,727,852 |
| Candidate records / distinct IDs | 4,036 | 4,036 |
| Rejected / duplicate IDs / chunk faults | 0 / 0 / 0 | 0 / 0 / 0 |
| Elapsed milliseconds | 1,588 | 1,575 |
| Anchor found / selected mappings exhausted | yes / yes | yes / yes |

All4,036 identities, addresses and two ordinary attributes compare identically after sorting by ID. The differing scanned byte totals reflect live mapping changes; no immutable process snapshot is claimed. Exhausting these selected mappings for one marker does not enumerate other native types, PlayerStaff variants, inactive/unloaded data or the entire career database.

The user's second record confirmation arrived before its read result was reported. It matches ID and scale5 Passing/Pace in both retained scans; this includes a non-multiple-of-five raw attribute, extending the earlier exact-multiple examples. The combined two-record comparison is user text, without screenshots or a controlled blinded protocol. Private record values, addresses, full emitted records and the user-text receipt stay outside Git in hashed evidence artifacts. Immutable REA output keeps its original unverified flags; later field-limited confirmations are separate observations.

The preliminary direct marker scan also returned4,036 candidates (`ev_1bcf51f675c55055f5b5b12d023bc239cded93175d02e610ce3af7fc4bf7d25c`). An earlier back-reference scan reached its128-hit cap and is partial; its pointer hits were not promoted to a catalog root. The Frida session was detached after capture without killing the game; REA reports final target state as unknown.

## Checks and remaining gates

Ten meaningful synthetic tests cover the shared probe plus multiple records, hidden-word read exclusion, wrong anchors/targets, file-mapping exclusion, chunk-boundary markers, duplicate IDs, invalid candidates, failed reads, byte/record/match/time limits and malformed limits. `npm.cmd run check` passed TypeScript,90 Vitest tests,65 Node tests and production build/bundle budgets. UI/E2E and Rust checks do not apply to this isolated research module. The existing Node localStorage warning remains non-failing.

The external evidence replay audit passed six bundle digests,119 method coordinates,131 unique canonical REA records and all report links/Evidence IDs. All424 inventoried installation files and three save samples retain their recorded hashes. A separate replay verifies both generated-script hashes, all4,036 repeated candidate tuples, six user-text field comparisons, absent batch ability words and unchanged unverified flags. The private verification receipt and verifier script hashes are recorded in the manifest.

Required next evidence: exact profile/version resolution, restart-safe rediscovery, independent hidden-ability ground truth and broader native-type coverage. Offline AFE member decoding and certified writing/save/reload remain separate unresolved work. [Compatibility](04-fm2013-compatibility.md) and the feature ledger retain disabled production capabilities.

**Later follow-up:** [file-relative discovery](18-fm2013-file-relative-discovery.md) removes the supplied-anchor requirement, recovers4,036 relocated records after an actual game restart and statically identifies the13.3.3 descriptor/mode relationship. The candidate503/50d discussed above instead declares13.3.2 versions. Hidden abilities, other native types, database completeness, offline parsing and writer acceptance remain unresolved.
