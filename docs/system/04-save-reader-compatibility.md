# S04 — Save Reader and FM compatibility research

[Local capture-session admission](../research/fmrte/24-fm2013-local-session-lifecycle.md) now succeeds with actual host process queries, prepared-script/UUID binding, complete REA capture and fresh historical Editor/Realism outputs on4,058 records. The initial sandbox observation failed despite REA visibility and was preserved; no identity fallback was fabricated. PID/creation time/path/hash consistency and expiry checks do not certify loaded image bytes, currentness, career lineage or atomicity. No offline decoder, product watcher/IPC or writer capability is enabled.

**Status: no validated format decoder committed.** The earlier sample `Untitled Game (v03).fm` was 29,319,864 bytes; header began `02 01 61 66 65 2e` (ASCII segment `afe.`). These observations **do not prove which edition generated it, or that player CA/PA was extracted**. Do not commit sample save data or speculate on fields.

**2026-11-01 live-research status:** [the exact-build local pipeline](../research/fmrte/20-fm2013-live-snapshot-contract.md) now normalizes a complete running-game capture into 4,058 provisional immutable records. This is separate from offline `.fm` decoding and product compatibility. The browser has no memory bridge; production native reader/editor capability flags remain disabled.

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

The user's follow-up identifies [local fm.exe metadata](../research/fmrte/10-local-fm2013-executable.md) as `13.3.3f359652`, with a recorded executable hash. At that stage no known-player/runtime read was validated; reports 16–20 below supersede that gap. A controlled same-career save pair, offline extraction and writing remain open. No product CA/PA capability is enabled.

[A subsequent three-sample study](../research/fmrte/11-fm2013-save-samples.md) recognizes experimental AFE directories in the new user save and two shipped tutorials; selected member payload decoding still fails its codec checks. This validates bounded structural inspection on those inputs, not edition/build detection, player extraction or writer support.

[Deep REA field research](../research/fmrte/14-fmrte13-field-transforms.md) adds independently implemented, numerically checked FMRTE13 transforms. Native address/profile gaps at that stage were subsequently narrowed by live discovery and file-relative RTTI. Numeric encode functions have no I/O; they are not a writer.

[The later live experiment](../research/fmrte/16-fm2013-live-readonly-record.md) recovers and repeatedly reads a single user-named record candidate through REA/Frida, with identity, pointer and concurrent-field checks in reusable research code. This resolves the lack of any live read experiment; independent visible/hidden-field ground truth, general profile/catalog support and offline decoding remain open. Production capability flags stay disabled.

Subsequent user-reported screen values match ID, Passing and Pace on that same record. The manifest records this field-limited confirmation separately from immutable raw REA output. Hidden CA/PA ground truth and general adapter certification remain unresolved; production capability flags stay disabled.

[Bounded discovery](../research/fmrte/17-fm2013-bounded-player-discovery.md) extends that research to two repeated scans of 4,036 candidate IDs and matching user-text ID/Passing/Pace on a second record. The original scanner shares probe guards and reports quotas/faults/partial coverage, without batch ability-word reads. Whole-database coverage, exact profile/restart recovery, hidden abilities, offline parsing and production adapter certification remain unverified.

[File-relative discovery](../research/fmrte/18-fm2013-file-relative-discovery.md),2026-10-31, derives a unique native marker from executable RTTI and verifies it at runtime, removing supplied heap addresses. One real restart recovers4,036 changed record addresses with stable identity/two-attribute values. FMRTE's local-version profile/mode relationship is established statically. Wider native coverage, hidden-ability reference checks, actual FMRTE runtime selection, offline parsing and writing remain open; production capabilities stay disabled.

[Running-reference validation](../research/fmrte/19-fm2013-reference-comparison.md) subsequently reads 4,058 distinct normal/dual-class players and 49 attributes per record. FMRTE UI count agrees;147 attributes and six CA/PA values match on three records, including a dual class. This is a field-limited exact-build reference comparison, not a certified product adapter or official game-engine oracle. All-record hidden-value verification, other careers/builds, remaining domain fields, reviewed IPC ingestion, offline parsing and writing remain open. Production capability flags stay disabled.

## Live snapshot admission and privacy

[Report 20](../research/fmrte/20-fm2013-live-snapshot-contract.md) implements a shared exact-build profile, strict address-free capture parser and explicit fresh-output Node CLI. The real complete capture contains 49 ordinary bytes and 15 position bytes per player, 3,730 observed club links and 328 unknown relationships. A prior truncated MCP response was rejected; only complete compact transport was admitted.

Observed live fields remain provisional; subsequent calendar-age evidence is explicitly `derived_model`. The declared binary hash/PID/profile, manual career ID and capture time do not authenticate the source or loaded career; roster completeness remains unverified. Per-pass faults/limits/rejected candidates are retained and produce partial results. `ready` means valid payload admission.

Editor retains provisional ordinary/familiarity ratings. Realism redacts all exact numeric ratings before return/serialization while manager/scouting knowledge is undecoded. Both modes keep CA/PA and contract Money/date fields null. Club links preserve source relationships without asserting employer/loan status; position bytes derive no eligibility. Product IPC/storage/UI integration, broad source/error-state checks, offline parsing and writer validation remain separate gates.

[Initial biography research](../research/fmrte/21-fm2013-biography-fields.md) established three sampled DOB reference matches and a tested conservative calendar helper. [The later cohort capture](../research/fmrte/22-fm2013-biography-cohort.md) supersedes its static-only nationality stage: all4,058 observed records carry DOB and primary-nation evidence through complete transport/CLI normalization, with three date and three nation-name matches against earlier UI receipts. Editor fields remain provisional; Realism redacts supplied biography. Legacy captures remain admissible with unknown fields. Native Nation RTTI, whole-career/source authentication and eligibility remain unverified; no supported build or production capability is enabled.

[The dated-cohort extension](../research/fmrte/23-fm2013-game-date-calendar-age.md) reads an exact-profile image-relative date, matches one fresh FM screenshot, recovers4,058 records under a new PID and rejects changed capture date endpoints. It adds provisional `gameDate` and explicitly modeled `calendarAge` in Editor; Realism redacts age. Prior captures without date bytes retain unknown age. Endpoint stability does not establish atomic career identity or loaded-image authentication, and the calendar model is not ActualAge or FMRTE duration-formula equivalence. Product integration and other-career/error-state certification remain unfinished.
