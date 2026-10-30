# Offline `.fm` investigation

Investigation date: 2026-10-30 (Asia/Bangkok). **Result: UNKNOWN format mapping; no validated offline player reader or writer.** This report separates local observations, historical repository notes and future experiments.

## Input and observation boundary

| Item | Classification | Observation and source |
|---|---|---|
| FM2013 save samples in this workspace | CONFIRMED, bounded negative result | No `.fm` file was found in the working tree during this investigation. This does not establish that no private save exists elsewhere on the computer. |
| Earlier `afe.` sample | CONFIRMED as a historical documentation entry, not revalidated bytes | `docs/references.md` records a 29,319,864-byte sample with prefix `02 01 61 66 65 2e`. The sample was not available here for a new hash, header inspection or comparison. Its edition/build remain UNKNOWN. |
| Normal game-location discovery | CONFIRMED, bounded negative result | The checked default Steam location exposed manifests `228980` and `3551340`; checked Sports Interactive document folders exposed Football Manager 2017 and Football Manager 26. No FM2013 installation/save was identified by those checks. No unrelated private directories were scanned. |
| Additional normal-location check | CONFIRMED, bounded negative result | Steam's library metadata also points to `D:\SteamLibrary`; that library's manifests and the explicit Football Manager 2013 directory candidate did not identify FM2013. Standard Windows uninstall keys did not identify FM2013. These checks do not establish absence elsewhere. |
| User-supplied installation/save follow-up | CONFIRMED static identities and bounded container study | [The supplied directory](10-local-fm2013-executable.md) contains native `fm.exe` metadata `13.3.3f359652`; corrected JSON inventory finds 63 shipped tutorial `.fm` files. After the user confirmed a save now exists, `Untitled Game.fm` was found in the default games folder. [Three selected samples](11-fm2013-save-samples.md) have recognized experimental AFE directories, but member payloads/player fields remain undecoded. |
| Same-player before/after snapshots | UNKNOWN | No controlled same-career pair with exact build and trusted field values was available. The later independent user/tutorial byte comparison is structural only and cannot identify a changed player field. |
| ManagerHub file inspection | CONFIRMED in source | `packages/domain/src/save.ts` detects `afe.` or `fmf.` at bytes 2–5, inspects bounded archive metadata for `afe.`, and returns `edition:null`, `build:null`. It explicitly reports that player records and CA/PA have not been decoded. |
| Codec/cross-save tests | CONFIRMED in source | The repository has synthetic archive/codec tests. For example, `scripts/afe-cross-save.test.mjs` explicitly constructs synthetic bytes. Such tests validate helper behavior, not Football Manager compatibility. |

No real save hashes, player lists, private save contents or memory dumps are included in this report.

## New real-sample container evidence

**CONFIRMED:** the user save is 19,724,442 bytes with prefix `02 01 61 66 65 2e`. An unchanged private analysis copy yields an experimental directory of 69 primary plus 705 `rgman` members (774 total). Two selected shipped tutorials yield 773 and 772 members. The directory zlib streams satisfy the existing helper's bounded/full-consumption checks. All 16 selected small-member payload trials in each file remain `unsupported_codec`; no player, actual CA/PA or producing game build was decoded.

A structural comparison of user snapshot versus scouting tutorial finds 752 shared names, 26 equal-size members, all 26 with differing complete stored-member hashes. These are different careers/states, not a controlled one-field pair. This does not map fields or prove encryption. Full private source hashes and byte metadata remain outside Git; [the sample report](11-fm2013-save-samples.md) records tools, limits, counts, source stability and the corrected installation-file inventory.

## What the FMRTE evidence establishes

**CONFIRMED:** the FMRTE 13 static analysis finds process-memory read/write declarations and a recovered data-access path; see [load pipeline](01-fmrte13-load-pipeline.md), [write pipeline](02-fmrte13-write-pipeline.md) and [boundaries](03-managed-native-boundaries.md) for artifact hashes and REA locators.

**CONFIRMED, limited to the recovered calls:** a stream-reading alternative exists beside the process-memory reading path. **UNKNOWN:** the stream's complete format, origin, supported file extension and relationship to ordinary Football Manager `.fm` saves. A `Stream.Read`, `FileStream` constructor or method containing “save” does not establish an offline save parser. Those APIs may serve other data or captured representations; this investigation has not established which.

**UNKNOWN:** whether the analyzed FMRTE versions independently decode and rewrite an ordinary `.fm` without a running game. Absence of a recovered offline path is not proof that such a path cannot exist. FMRTE 26 observations must be assessed independently in its version-specific reports.

**UNSUPPORTED by current evidence:** treating FMRTE live-memory access as a specification for the on-disk save format; treating `afe.` and `fmf.` as interchangeable; assigning FM2013 provenance from filename, extension or signature alone; assigning CA/PA offsets from a coincidental binary match.

## Unresolved format questions

| Question | Status | Evidence needed |
|---|---|---|
| Container and version encoding for an FM2013 save | UNKNOWN | Immutable sample plus exact producing executable/build, structural inspection and repeat samples. |
| Compression and integrity checks | UNKNOWN | Bounded decoding with exact consumption and independently checked payload/integrity behavior. A missing compression signature alone is insufficient. |
| Player record boundaries and native IDs | UNKNOWN | Repeated extraction of known players and IDs from the same save/build, validated against trusted observations. |
| CA/PA and attribute field encoding | UNKNOWN | Known values, validated entity identity, supported schema and independent repeat reads. |
| Serialization invariants and write roundtrip | UNKNOWN | Original backup, temporary new output, independent reparse, semantic diff, actual game reload and restoration. |
| Production offline writer availability | UNSUPPORTED | No such writer has been demonstrated or enabled by this work. |

## Next reproducible experiment

This is an **INFERRED research design**, not an executed test:

1. Select an authorized disposable FM2013 career and record the precise `fm.exe` version/hash and platform. Preserve a read-only original and a separate backup.
2. Save snapshot A under a new filename. Record its size, SHA-256, header and known player IDs, attributes, CA/PA where legitimately observable, and game date.
3. Through an authorized functioning reference tool, change exactly one known test field on one identified player. Save snapshot B from Football Manager under a different filename. Preserve the running-state observations separately from the resulting file observations.
4. Compare containers and decoded structures under resource limits. Account for timestamps, compression, serialization order and unrelated game changes. A file diff is a candidate locator, not a field map.
5. Independently extract the original and changed values from both snapshots; repeat reads. Only then consider any offline writer work, under the separate [editing gates](../../system/05-player-editor-ca-pa.md).

No offline parser support or successful reload is claimed until those checks have real outcomes. The full ManagerHub product scope remains unchanged.
