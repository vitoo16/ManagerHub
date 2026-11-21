# FM2013 native read-only boundary — ADR candidate and executable contract

**Date:** 2026-11-21  
**Related:** [Phase 2 issue #81](https://github.com/vitoo16/ManagerHub/issues/81), [review #78](https://github.com/vitoo16/ManagerHub/issues/78), [FM27 reference](../fm27-editor/README.md).  
**Status:** *The strict in-process fake-host guard remains the canonical Player/PlayerStaff RTTI contract. A separate **experimental** .NET 10 Windows single-range read-only smoke worker and bounded broker are proposed in [draft PR #89](https://github.com/vitoo16/ManagerHub/pull/89). No production native reader, verified real RTTI/ABA, browser IPC or game attach has been certified.*

**Incremental native-side path (2026-11-21):** see [native host README](../../../native/README.md). That worker can only report a sanitized OS memory-read byte count after interactive research consent and exact on-disk image checks. It **does not** implement `inspectType`, cross to `GameSnapshot` or identify real FM2013 player objects. A browser/current-session adapter remains blocked until source-backed stable object identity, security architecture and actual Windows evidence exist.

## Decision under review

Keep the current npm workspaces + shared React/Vite web interface. For an eventual product live reader, prefer an **isolated, least-privilege Windows-native local sidecar** rather than putting memory access in the browser or replacing the existing app with Tauri immediately. C#/.NET with explicit Win32 read-only process-handle rights is the leading host candidate; no runtime dependency has been added and the language/packaging decision remains subject to review and local Windows evidence.

Alternatives:
- **Tauri/Rust desktop host:** can reuse React, but introduces a second runtime, signing/toolchain, migration and IPC policy surface before any exact-build reads are certified.
- **PowerShell/REA CLI:** preserves current research workflow but still requires manual attachment and cannot itself establish a product-grade permission or currentness boundary.
- **Native Node add-on:** new binary ABI/rebuild burden in every Node upgrade; cannot be mixed into browser renderer.
- **Windows sidecar:** isolates process permissions and failures from the UI, supports test doubles and versioned IPC without moving the web stack. Requires a signed/distributed host, lifetime controls, explicit permissions, packaging and security review.

No existing `Fm2013CaptureTicket` is reused as permission: that ticket is **historical endpoint admission only**, not a live authorization token.

## Implemented in this PR (not a product feature)

`scripts/fm2013-readonly-boundary.mjs` is a **native-side-only, injected-host read probe** with no OS calls and no permanent connection:

1. Reuses exported `validateFm2013ProcessIdentity` from `packages/domain/src/live-session.ts`, preserving the exact research build SHA, PID 1..0x7fffffff, Windows fm.exe path and opaque 100ns process creation identity.
2. Requires the injected host's explicit `confirmUserSelection` to return `true` **before** observing/opening. A host must supply genuine UI/user intent and cannot rely on a caller-supplied boolean or the historical ticket for security.
3. Calls host `observe(pid)` and checks instance identity before opening and around each read. A process exit, PID reuse or changed identity aborts with a fixed error, never another PID.
4. Calls host `openReadOnly(pid)` (the host alone must implement least-privilege OS access). This module never requests writes, memory allocation, injection or remote connections.
5. Bounds each request to an aligned 32-bit address between `0x10000` and `0x7fffffff`, 512 bytes per read, 16 requests, 4096 bytes total and an elapsed 5000ms budget. Address, length, type and duplicates are rejected **before** opening.
6. Demands host declarations for the separate `player` and `playerStaff` research RTTI class mappings, checks before **and** after each read, accepts exact-length `Uint8Array` copies only, discards failed partial results, attempts to close on every acquired-handle path and never returns raw private exception text. A failed close operation is itself a rejection and **does not prove that the OS handle was successfully released**; a real host must enforce cleanup independently.
7. Raw bytes and addresses stay **inside the native-side script result**. They are not included in `GameSnapshot`, IndexedDB, an HTTP API or browser IPC. No proof of real RTTI/vtable is implied by mocked host declarations.
8. The existing strict historical `parseFm2013LiveCapture` / Editor-Realism flows and CA/PA missing reasons remain unchanged. A `read_only_sample` status is not `verified`, `current`, `complete` or an authenticated career.

The 5000ms check is cooperative around each awaited host operation. A future OS backend **must** enforce its own hard read/open deadline and guaranteed handle cleanup even if a native operation hangs. OS memory page permissions, module-image-in-memory attestation, true RTTI verification, object lifetime/ABA changes and sample atomicity remain **unproven** until that backend exists. This contract intentionally declines to enable any product capability flag.

## Test evidence and release gates

`scripts/fm2013-readonly-boundary.test.mjs` uses an injected fake host with a forbidden writer method. It exercises:
- grant/deny before opening, exact-build/identity mismatch, observation unsupported;
- invalid/misaligned/overflow pointers and aggregate size/count/duplicate bounds;
- separate Player vs PlayerStaff type declarations, and type changing during a read;
- short/malformed reads, exit/PID reuse before and after, open/read/close failures;
- invalid handle cleanup, time budget, hostile input proxy/clock failure and copied bytes.

The test was run in isolation with Node 22.16.0, `node --experimental-strip-types --test scripts/fm2013-readonly-boundary.test.mjs`, **13/13 passed** against a working copy of the production `live-session.ts` with the exported validator and a reduced profile fixture carrying the same exact build hash/native class descriptors. The new script/test and modified validator Git blobs were compared with the committed PR files. This **does not** substitute for the full repository npm/Vitest/Playwright suite on Windows Node 24.

The test is appended to the **existing** `test:node:fm2013` command, which is already invoked by the same 6/8/9-stage Local CI. No stage or regression test was deleted.

**Before merging:** independent code/security review; clean exact-head Windows Node24 Local CI Quick 6/6 → Full 8/8 → Release 9/9, hash-bound `summary.json`, existing 112 desktop/mobile Playwright scenarios, and a confirmed absence of browser imports from `scripts/`. After merging, rerun the complete profile on the merge SHA.

**Next separate PR:** after acceptance of this native-side contract, implement a real Windows host only with explicit user permission and review of `PROCESS_QUERY_LIMITED_INFORMATION` / `PROCESS_VM_READ`, OS-level timeouts, non-injecting read-only open, in-memory executable proof and independent vtable/record identity verification. Test on the user's authorized exact FM2013 build and do not upload private game/capture artifacts. Only then consider a sanitized versioned IPC to existing `GameSnapshot` with Realism redaction **before** serialization; never send raw addresses or memory bytes to the UI.

**Explicitly disabled:** runtime writer, save writer, actual CA/PA exposure, native full roster/currentness and offline `.fm` decoder. This PR does not change the 0/27 module acceptance ledger.
