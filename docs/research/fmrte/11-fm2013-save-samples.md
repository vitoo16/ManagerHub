# FM2013 save samples — bounded read-only inspection

Date: 2026-10-30, Asia/Bangkok. Following the user's message that a test save now exists, the default games folder contains `Untitled Game.fm`. **Its AFE-family directory is recognized experimentally; player records, CA/PA and a writer remain unverified.**

## Selected sources and privacy

| Sample ID | Source context | Bytes | Header prefix | Primary / nested / total indexed members |
|---|---|---:|---|---|
| FM13-LOCAL-01 | User's new `Untitled Game.fm` in the FM2013 Documents games folder | 19,724,442 | `02 01 61 66 65 2e` | 69 / 705 / 774 |
| FM13-TUTORIAL-BASE | Installed `data\tutorial\basics.fm` | 19,494,130 | Same AFE prefix | 69 / 704 / 773 |
| FM13-TUTORIAL-1333 | Installed `data\updates\update-1333\tutorial\scouting.fm` | 19,735,514 | Same AFE prefix | 69 / 703 / 772 |

**CONFIRMED:** the installed game directory contains 63 tutorial `.fm` files, 7 under `data\tutorial` and 56 under update directories, totaling 1,256,816,413 bytes by file-size inventory. Only the two selected tutorials above were probed. A previous statement that the installation contained no `.fm` was incorrect: mixed PowerShell objects were displayed in a table whose first object's columns hid subsequent filenames. This follow-up uses explicit JSON and supersedes that negative claim.

The user's source was hashed, copied to a fresh private analysis snapshot, and checked against hashes before/after copying and after inspection. Hashes agree; the source was not modified. Its full SHA-256, original path, snapshot path and raw metadata stay outside Git at `C:\Users\viett\.codex\visualizations\2026\10\30\01a18c2c-5b30-7ac2-841d-290449543b12\fm2013-user-save-probe.json`. No save bytes, decoded payloads or full private-save fingerprint are committed.

Tutorial source hashes (not private saves): basics `0e56596ac2a9caa0bae5441bfcdc7cde3b5e15792b9696d65524f36d54565aca`; scouting `db4f818f9daa9318e3178097b16a72d403942b6e73343005af4071b63cafc6c3`. Both before/after hashes agree. Raw tutorial metadata is in the same local evidence directory as `fm2013-tutorial-probes.json`, output SHA-256 `a4ff56fed7867473021d3ee7ee26f370d15bdcc866570fbfa6848febccf5fef6`.

Source selection is FM2013 context. **UNKNOWN:** producing edition/build decoded independently from each save's bytes. The separate `fm.exe` metadata `13.3.3f359652` and an update directory name do not certify that a particular save was produced by those bytes.

## Executed inspection and bounds

These are **ManagerHub Node-script observations**, not REA's decoding of `.fm`. REA was used for executable/FMRTE evidence; no advertised REA FM save parser was assumed.

Existing `scripts/afe-batch-codec.mjs::inspectLocalArchive` and its bounded helpers were reused without application-code changes. They search the final 64 KiB, try at most 32 directory candidates, limit directory output to 512 KiB, validate named ranges/non-overlap, and require complete zlib input consumption for an accepted directory. They admit at most 4,096 indexed members. Codec trials select at most 16 small members, 256 KiB stored/2 MiB reported output each, with exact consumption/output-length gates. Private sample size was below the 256 MiB inspection limit.

| Confirmed structural result | User save | basics | scouting |
|---|---:|---:|---:|
| Directory file offset | 19,715,374 | 19,485,302 | 19,726,571 |
| Parsed directory bytes | 43,286 | 43,260 | 43,202 |
| Permitted zero trailer bytes | 4 | 4 | 4 |
| Indexed envelopes matching `10 00 00 00 10 00 00 00` | 774/774 | 773/773 | 772/772 |
| Small members probed | 16 | 16 | 16 |
| Validated member payload decodes | 0 | 0 | 0 |
| One unindexed gap, bytes | 120,561 | 121,293 | 120,418 |

**CONFIRMED within the probes:** all selected small-member payloads, including `game_info.dat` and `save_game_summary.dat`, report `unsupported_codec`. The accepted directory's zlib coding does not identify member coding. A few framed `zlib_header_candidate` matches fail to establish validated member streams. **UNKNOWN:** member encoding/compression/encryption, contents of the gap, entity boundaries and field semantics. High entropy or failed DEFLATE trials do not prove encryption.

## Cross-sample comparison

Existing `scripts/afe-cross-save.mjs::compareLocalAfeSaves` compared the private analysis snapshot against the selected scouting tutorial. **CONFIRMED:** different files; 752 shared indexed names; 726 shared names with differing stored sizes; 26 equal-size candidate members all compared under the helper's bounds; all 26 have different complete stored-member hashes. Left-only/right-only counts are 22/20. No compared set of sampled regions is entirely identical.

This is **not a controlled same-career, one-field before/after pair**. The differences do not identify CA/PA, prove a codec, establish randomness/encryption or validate matching player identities. Full metadata remains outside Git in `fm2013-user-vs-tutorial-comparison.json`.

## Capabilities and next evidence

- CONFIRMED: read-only header/hash capture, experimental directory recognition on three selected local files, bounded payload trial failures and structural comparison.
- UNKNOWN: player IDs/names/club linkage, actual CA/PA/attributes, exact producing build, stable native field mapping, full save serialization and checksums.
- UNSUPPORTED: ManagerHub player reader/editor capability based on index recognition alone. No native memory operation, game launch or write trial was performed.

The sample-location blocker is resolved. Next resolve member encoding or the FMRTE13 exact-build live layout using appropriate available analysis, obtain trusted same-player ground truth, and verify read-only extraction. A controlled paired save is still required before attributing a byte difference to a field. Native-provider setup and any writer remain separate gated work.
