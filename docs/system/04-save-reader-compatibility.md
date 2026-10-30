# S04 — Save Reader and FM compatibility research

**Status: no validated format decoder committed.** The earlier sample `Untitled Game (v03).fm` was 29,319,864 bytes; header began `02 01 61 66 65 2e` (ASCII segment `afe.`). These observations **do not prove which edition generated it, or that player CA/PA was extracted**. Do not commit sample save data or speculate on fields.

A different independent FM26 `fmf.` save-reader research line exists (see [references](../references.md)). Extension `.fm` is not proof of format compatibility. Separate version-specific adapters.

## Reader contract
detect(bytes) -> edition?, build?, family?, confidence, capabilities, diagnostics.
read(bytes) -> immutable canonical snapshot + per-domain coverage + warnings or typed error.
Domains: player identity, attributes, CA/PA, positions, clubs, contracts, tactics, match stats, finance. Coverage: verified / partial / unsupported / unknown. Errors: unsupported, corrupt, unknown build, unavailable data, failure; keep distinct.

Input safety: file-picker consent, maximum byte lengths, offset checks, bounded decompression, structured error recovery, fuzzing and time/memory quotas. No save mutation on read path. Validate interpreted fields against same-build in-game observation and repeatable fixtures.

## Compatibility matrix (initial)
| Family | Read | Write |
|---|---|---|
| Uploaded afe. sample | Research only; not validated | Unsupported |
| FM26 independent fmf. research | Third-party experiments; not ManagerHub support | Unsupported |
| Other Football Manager releases | Unverified until fixtures | Unsupported |

## Milestones
Fixture corpus -> format detection -> catalog/container decoding -> entity extraction -> CA/PA cross-validation -> contracts/tactics/events coverage -> performance and abuse tests -> optional certified writer in a separate release.

See [editor safeguards](05-player-editor-ca-pa.md), [system provenance](03-domain-schema-and-provenance.md).

## FMRTE investigation — 2026-10-30

[REA research and evidence ledger](../research/fmrte/README.md) independently examines local FMRTE13 13.3.3.62 and FMRTE26 26.3.2.42. FMRTE13 static CIL reaches process-memory read/write declarations through actual call sites; its alternate stream branch has no validated `.fm` mapping. FMRTE26's recovered UI path stops at unresolved delegate bindings. These are external-tool findings, not ManagerHub format support.

The user's follow-up identifies [local fm.exe metadata](../research/fmrte/10-local-fm2013-executable.md) as `13.3.3f359652`, with a recorded executable hash. No known-player record, disposable same-build save pair or runtime read was validated. Live read/write and offline player parsing/writing remain unverified/unsupported independently. No CA/PA capability is enabled. Exact inventories, hashes, function coordinates, missing edges and executed tests are in the linked report.

[A subsequent three-sample study](../research/fmrte/11-fm2013-save-samples.md) recognizes experimental AFE directories in the new user save and two shipped tutorials; selected member payload decoding still fails its codec checks. This validates bounded structural inspection on those inputs, not edition/build detection, player extraction or writer support.

[Deep REA field research](../research/fmrte/14-fmrte13-field-transforms.md) adds independently implemented, numerically checked FMRTE13 CA/PA/attribute transforms in an isolated research module. The required native record address and exact-build profile remain unresolved. Its numeric encode functions have no I/O; no production reader/editor capability is enabled.

[The later live experiment](../research/fmrte/16-fm2013-live-readonly-record.md) recovers and repeatedly reads a single user-named record candidate through REA/Frida, with identity, pointer and concurrent-field checks in reusable research code. This resolves the lack of any live read experiment; independent visible/hidden-field ground truth, general profile/catalog support and offline decoding remain open. Production capability flags stay disabled.

Subsequent user-reported screen values match ID, Passing and Pace on that same record. The manifest records this field-limited confirmation separately from immutable raw REA output. Hidden CA/PA ground truth and general adapter certification remain unresolved; production capability flags stay disabled.

[Bounded discovery](../research/fmrte/17-fm2013-bounded-player-discovery.md) extends that research to two repeated scans of4,036 candidate IDs and matching user-text ID/Passing/Pace on a second record. The original scanner shares probe guards and reports quotas/faults/partial coverage, without batch ability-word reads. Whole-database coverage, exact profile/restart recovery, hidden abilities, offline parsing and production adapter certification remain unverified.
