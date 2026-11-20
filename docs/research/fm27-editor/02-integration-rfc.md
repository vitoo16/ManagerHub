# 02 — Integration RFC: reference architecture and alternatives

**Status:** Proposed design; **no code or runtime replacement authorized by this document**. Discussion: [#78](https://github.com/vitoo16/ManagerHub/issues/78).

## One-way research adoption

```text
FM2013 running game (owned, user-authorized)
  -> exact process-instance + build + 32-bit module identity [native only]
  -> read-only memory accessor / bounded validated player discovery [native only]
  -> FM2013-specific layout + signed/obfuscated field decoder [native only]
  -> schema-validation, evidence/coverage, versioned current-session snapshot
  -> narrow authenticated local IPC contract (proposed, not implemented)
  -> canonical source-aware domain boundary
  -> Editor/Realism privacy projection (Realism must not ingest hidden fields)
  -> existing React UI + local historical snapshot persistence

Offline .fm file -> independent, versioned AFE/family adapter -> immutable snapshot
  (UNVERIFIED; never use live process pipeline as a fake offline parser)
```

### Contracts to agree before implementation

- **BuildKey:** game edition, semantic/build version, executable hash where possible, architecture, module image/metadata, profile schema version and profile provenance. A version string alone is insufficient for write.
- **SessionKey:** PID plus opaque OS process creation identity, executable identity and nonce/generation; expire on exit/restart/reuse, check before each sensitive read/write. Never expose raw native pointers in browser domain/UI.
- **RecordKey:** exact edition/career/session and native ID with native type discriminator; address is a short-lived implementation detail, not persistent identity.
- **FieldEvidence:** value/null, field type/unit, source adapter + version, capturedAt, verification level and explicit unsupported reason. Separate raw value from displayed normalized rating.
- **ReadResponse:** strict bounded snapshot, source coverage, completeness caveats, stale-session error or unsupported-build error. A successful read does not imply full coverage.
- **WriteCapability:** disabled by default; design for separate per-field exact-build allowlist, user consent, live identity/expected-value checks, readback and auditable outcome. Only later enable via dedicated certification.
- **Privacy:** hidden CA/PA/ordinary exact attrs only within explicitly permitted Editor flow; Realism redaction must happen **before** persistence/IPC of the Realism projection. Never treat actual CA as estimated CA.

These are proposed interfaces, not new duplicated runtime types; map to existing `packages/domain` schema, `live-snapshot.ts` and current tests before adding anything.

## ADR options and requested agent discussion

**A (recommended candidate):** retain React web and add a narrowly scoped Windows-native local service/bridge. Default read-only, with in-memory session state and typed IPC. Favor smallest dependency cost and explicit executable privilege boundary. Do not assume Tauri/Rust is already present.

**B:** Tauri/Rust desktop host if integration with the existing code and security model demonstrably justifies runtime, bundling and migration costs. Requires separate ADR, build pipeline, signing, IPC permission review and acceptance testing.

**C:** C#/.NET sidecar or CLI for Windows OS interoperability, inspired by patterns but written independently and cleanly; review licensing, packaging, event lifecycle, IPC and testability. Do not insert GPL source without licensing decision.

**D:** continue manual, file-based REA/historical imports as fallback. It is safe and already supported, but is not live/currentness-certified and does not satisfy a full product native integration target.

**Trade-off discussion required:** runtime dependencies, platform support, test harness, process permission principle, user consent, crash isolation, source provenance, lifecycle refresh, privacy, CI evidence and rollback. Do not replace the project package manager or adopt a desktop stack by aspiration.

## Write path (design only; capability remains false)

```text
explicit UI edit intent -> permission/capability check -> exact build/session gate
  -> record ID + discriminator + vtable/layout + expected field bytes gate
  -> FM2013-specific encode (only after independently validated)
  -> conservative single-field write -> readback + semantic decode
  -> audit (session key, record key, field, original/after, result)
  -> user saves game to disposable test career -> restart/reload revalidation
```

Multi-field edits need a separate atomicity/partial-failure plan. An in-memory 'undo' is not a save-file rollback, and PID/address may be recycled. Immediate automatic rollback after an uncertain write could compound corruption; define safe fail-closed recovery. No remote allocation/injection is proposed.

## Interaction with existing product

- Follow [system save compatibility](../../system/04-save-reader-compatibility.md), [player editor spec](../../system/05-player-editor-ca-pa.md), [live contract](../fmrte/20-fm2013-live-snapshot-contract.md), and [adapter design](../fmrte/06-managerhub-adapter-design.md).
- The current historical snapshot browser and IndexedDB Editor/Realism separation must remain fully functional and covered by regression tests.
- This RFC neither changes 27-module scope nor seven delivery phases. Any implementation plan must identify MH-01/MH-02/MH-05 (and other genuinely affected IDs) and update ledger *on actual verified delivery only*.
- Public source reference and source links are allowed in documentation; code transposition and GPL-distribution obligations require explicit review.

## ADR questions requiring recorded decision

1. Native host: A, B or C, and why? Evidence includes proof-of-concept performance, packaging and security.
2. Session identity: which OS observations reliably disambiguate process reuse and process exit?
3. Product snapshot lifecycle: how to express historical, candidate-current and verified-current without leaking real-time claims?
4. Read scope: what is safe, bounded and exact-build-certified before UI integration?
5. Writer: can single-field writes be certified independently of bulk/transfer/contract features?
