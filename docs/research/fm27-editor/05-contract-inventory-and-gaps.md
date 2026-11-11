# 05 — Concrete ManagerHub contract inventory and native-adapter gap review

**Inspected:** current ManagerHub `main` at `edad9fd637863f7f9c5da9381e6331792cc63c65` and FM27 pinned source `ef0842e005ed29c30c01bcd9cf8a2280810bf6bb`. **Date:** 2026-11-11. **Status:** static code review; no local native execution or game editing.

This report makes the [integration RFC](02-integration-rfc.md) actionable without adding a second set of types. Treat every proposed capability as unimplemented.

## Existing code already solving some of the problem

| Existing ManagerHub code / test | Actual existing contract | Integration implication |
|---|---|---|
| [`packages/domain/src/live-session.ts`](../../../packages/domain/src/live-session.ts) | `Fm2013ProcessIdentity` (PID, opaque FILETIME, image path, SHA256), `Fm2013CaptureTicket` (capture UUID, ten-minute time window), `Fm2013ProcessObservation`, `validateFm2013CaptureAdmission` | **REUSE / EXTEND.** Avoid defining competing `SessionKey`/identity validators; the current endpoint ticket is explicitly historical, not a live authorization token |
| [`packages/domain/src/fm2013-live-profile.json`](../../../packages/domain/src/fm2013-live-profile.json) | Exact `FM2013` build `13.3.3f359652`, hash, architecture-specific research metadata; `player` and `playerStaff` with different `personOffset` | **KEEP RESEARCH PROFILE DISTINCT FROM CERTIFIED RUNTIME CAPABILITY.** Add explicit per-profile verification and capability flags only after evidence |
| [`packages/domain/src/live-snapshot.ts`](../../../packages/domain/src/live-snapshot.ts) | `parseFm2013LiveCapture`, `LiveSnapshotContext`, `GameSnapshot`, `LiveCaptureCoverage`, `LiveNativeKind`, immutable address-free provenance, `ready/partial/empty/rejected` | **REUSE normalization.** `ready` means format admission, not current or verified; cannot expose raw pointers, native handles or actual CA/PA as populated |
| [`packages/domain/src/types.ts`](../../../packages/domain/src/types.ts) | `EvidenceField<T>`, `SourceKind`, `SourceStatus`, `MissingReason`, `MetricKind`, `CapabilityStatus` | Preserve existing field evidence/missing-reason definitions; do not invent competing score/provenance unions |
| [`packages/domain/src/historical-live-snapshot.ts`](../../../packages/domain/src/historical-live-snapshot.ts) | `HistoricalSnapshotRecord`, `HistoricalSnapshotMode`, `HISTORICAL_SNAPSHOT_SCHEMA`, schema version and bounded validation | Preserve manual historical import semantics and Editor/Realism mode-specific validation |
| [`packages/storage/src/historical-live-snapshots.ts`](../../../packages/storage/src/historical-live-snapshots.ts) | Existing local storage of historical projections | Reuse/extend after schema review. Do not save a genuinely live session as historical by coercion or change existing source flags |
| [`packages/domain/src/live-session.test.ts`](../../../packages/domain/src/live-session.test.ts), [`live-snapshot.test.ts`](../../../packages/domain/src/live-snapshot.test.ts) | Contract and negative tests exist | Expand tests instead of creating parallel validation fixtures |
| [`scripts/fm2013-local-session.mjs`](../../../scripts/fm2013-local-session.mjs), [`scripts/fm2013-process-observer.test.mjs`](../../../scripts/fm2013-process-observer.test.mjs) | Research-only lifecycle observation and file handoff | Keep research and product runtime separate until a native host/IPC ADR is approved |
| [`tests/e2e/historical-snapshots.spec.ts`](../../../tests/e2e/historical-snapshots.spec.ts) | Browser historical import acceptance scenarios | Must remain green after any native reader work |

## Precise gaps before a real native read session

**G1 — API and authority.** Current `Fm2013CaptureTicket` is an endpoint-admission consistency check, **not** a permission to attach or a proof of live currentness. A native service needs user-selected process authorization, least-privilege attach/read permission, abort/detach lifecycle, schema-versioned IPC and privacy controls. Do not reinterpret the historical ticket as an access token.

**G2 — Identity and atomicity.** PID + FILETIME + path + on-disk hash helps reject process reuse, but does not attest loaded executable bytes, in-process career lineage, player-object stability or a snapshot taken atomically. Publish a distinct currentness/authentication status only after evidence; no weakening of `runtimeImageBytesAuthenticated: false`.

**G3 — Profile and two native classes.** Confirm object RTTI/type discriminator separately for Player and PlayerStaff, 4-byte pointer constraints and per-class person offsets; an FM27 `game_plugin.dll` root vector or vtable must never be assumed to exist in FM2013.

**G4 — Exact fields and visibility.** `GameSnapshot` exposes `actualCa` / `potentialAbility` as `EvidenceField<number>`, but the current FM2013 canonical parser does **not** certify or populate hidden values. Remain null unless exact-build research, source matching and mode policies are independently validated. In Realism, redaction precedes browser serialization/persistence/analytics.

**G5 — Offline separation.** Neither FM27 Windows memory accessor nor ManagerHub REA script is a decoder of on-disk `.fm` files. Keep AFE parser and memory reader under different capability flags.

**G6 — Error/health contract.** A new service must map access denied, missing process, unsupported build, process disappeared, stale object, bounded-read fault and partial scan to explicit errors/coverage. Do not report one sampled healthy player as all fields or a complete live roster.

**G7 — Recovery and unsafe edits.** No native writer or memory allocation design is approved. A future journal needs exact session/record IDs as well as old/new bytes, not reusable address alone; the prior successful local session study is read-only.

## Specific cross-contract question (requires test, not speculative fix)

`live-session.ts` validates capture ticket PIDs in the signed 31-bit interval **1..0x7fffffff**, while `live-snapshot.ts` accepts `target.pid` in **1..0xffffffff**. A Windows PID is modeled as a 32-bit identifier in external Windows APIs; these contracts are not numerically identical. Decide whether intentionally restricting tickets is justified; test a high-bit PID in both paths and resolve or document it before a shared IPC session contract is certified. Do **not** quietly loosen validation in a docs-only PR.

## Narrow next PR proposal (subject to #78 and CI #80)

1. Add an ADR that chooses one local Windows-native read-only host based on security, testability and packaging evidence.
2. Define transport around existing `Fm2013ProcessIdentity`, `GameSnapshot` and `EvidenceField`. Document which values are claims vs OS-observed evidence; no native addresses cross the boundary.
3. Build synthetic/mock read session tests covering stale handles, process instance changes, two-class checks, bounds, negative input and privacy. Do not claim real FM2013 runtime verification from mocks.
4. Prove exact FM2013 build on Windows in a user-authorized session before raising any reader capability flag. Keep historical manual import working.

## Reviewer questions

- Is the current PID limit difference intentional and safe, or an unrecognized mismatch?
- Does a product service need a distinct ephemeral authorization/session token rather than reusing `Fm2013CaptureTicket`?
- How is current career lineage proven without relying on the process creation timestamp alone?
- Which fields may cross to Realism analytics and at what point is redaction guaranteed?
- How will no-runner CI [#80](https://github.com/vitoo16/ManagerHub/issues/80) be cleared before code work is accepted?

Give evidence and an explicit alternative in [review issue #78](https://github.com/vitoo16/ManagerHub/issues/78). Implementation ticket [#81](https://github.com/vitoo16/ManagerHub/issues/81) tracks the next bounded slice.
