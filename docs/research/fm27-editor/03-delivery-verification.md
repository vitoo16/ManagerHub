# 03 — Execution, validation and evidence gates

**Work item:** [#78](https://github.com/vitoo16/ManagerHub/issues/78). This is *not* a new MVP or new project roadmap. These are bounded work packages within the existing seven phases.

| Order | Work package | Deliverable | Acceptance evidence | Capability truth |
|---|---|---|---|---|
| 0 | Adopt source study + ADR review | Version-pinned audit, alternatives, agent feedback, licensing decision | Review comments with links and resolved decisions | Documentation only |
| 1 | Read-only native session design | Process identity, exact-build registry proposal, bounded OS access contract | Fake memory tests; stale PID/build/malformed pointer negative tests; architecture approval | No product reader yet |
| 2 | FM2013 read-only adapter | FM2013 32-bit Player + PlayerStaff discovery using own validated evidence | Cross-restart and reference cross-check; no invented fields; tested bounded failures | Experimental until field-level certification |
| 3 | Current-session snapshot handoff | Narrow local IPC / file handoff, schemas, Editor/Realism boundaries, graceful disconnect | ABI/schema contract tests, consistency and privacy tests, regression of historical import | 'Current' only when session/live proof holds |
| 4 | Independent write research | FM2013 encode/decode inversion, one-field fake-memory writer and guards | Unit/property tests, stale identity + expected old value, negative cases | Write capability false |
| 5 | Controlled writer certification | Opt-in single-field test with disposable career, expected bytes, readback, restart/save/reload verification, crash/partial failure handling | Explicit owner approval; reproducible redacted evidence; separate review/PR | Only whitelisted certified fields/builds |
| 6 | Further editors | Contracts, finances, transfers or bulk edits only after independent field-by-field gates | Independent fixtures, game load/reload evidence and integration tests | Separate feature capability flags |
| Parallel | Offline AFE/FMF decoding | Real format decoder and immutable parser | Cross-save fixtures, fingerprint, roundtrip, in-game checks | Never inferred from live-memory success |

## Required negative-test matrix

- Unsupported version/hash, wrong architecture (FM27 64-bit vs FM2013 x86), missing module and insufficient process permission.
- PID reuse, process exit between reads, process restart, invalid/stale session token, stale pointer and recycled address.
- Wrong type discriminator/vtable, two-class object confusion, duplicate or missing player ID, overflow/unaligned pointer count, unbounded Unicode/string or heap read, invalid address and partial read.
- Zero/invalid ability and outside allowed domain ranges, FM2013 CA/PA encoding mismatch, unsigned vs signed conversion, incorrect attribute scaling; observable null/unknown must not become zero.
- No current session, source population incomplete, unknown club/contract relationship, current/historical identity confusion.
- Realism must not persist or expose exact hidden CA/PA or other restricted native fields; Editor snapshot lifetime and lineage must not leak across saves/careers.
- For **later certified write only:** expected-old mismatch, write count short/failed, readback mismatch, out-of-date record identity, process death between check and write, duplicate request, retry/undo after session expiry, partial transaction and disk save failure.

## Evidence standards

Attach per-PR: source commit/hashes; exact target build architecture; pseudonymized fixture provenance; tests and exact commands/results; known gaps; related ADR/issues; release capability flags; a rollback/stop plan. Do not post proprietary binaries, private saves or raw memory.

Quality gates: current npm typecheck/unit/test/build, format/lint, selected Playwright (desktop/mobile), plus native-specific unit/integration tests **if those targets actually exist**. Do not claim Rust/Tauri/Windows CI exists until it does. Never describe a static analysis as a successful live-game test.

## Definition of done per stage

- Source-specific correctness and negative cases validated on exact build.
- Lifecycle is safe under detach/restart and unsupported build.
- Source/coverage/provenance and Editor/Realism restrictions preserved.
- Regression tests and documentation match actual state.
- Issue/PR contains one explicit review conclusion: accepted, revised, blocked or needs more evidence.
- Only after tests and evidence should [the acceptance ledger](../../implementation/05-feature-acceptance-ledger.md) be updated as implemented/certified.

## Stop conditions

Stop and log an Issue/PR blocker if executable identity is unverifiable, a field cannot be cross-checked, process identity changes mid-operation, privacy classification is uncertain, a write is not safely reversible/testable, licensing is unresolved for code reuse, or an agent suggests transposing FM27 profile offsets into FM2013.
