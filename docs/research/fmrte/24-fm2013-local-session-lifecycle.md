# FM2013 local capture tickets and process lifecycle — 2026-11-01

The connected research workflow now prepares a local process-instance ticket before REA capture and checks it before publishing an explicit historical snapshot. Real default Windows observation, script preparation, complete REA capture and Editor/Realism finalization succeed on4,058 observed players. This is lifecycle consistency for local research, not a live watcher, product IPC or authenticated capture.

## Implemented contract and workflow

[live-session.ts](../../../packages/domain/src/live-session.ts) defines immutable exact-profile identities and ten-minute capture tickets. Identity combines PID, opaque Windows creation FILETIME, canonical executable path and binary SHA-256. FILETIME remains a string with all100ns digits; JavaScript-number conversion can erase differences between process instances. Neither PID nor creation time proves career lineage.

[fm2013-local-session.mjs](../../../scripts/fm2013-local-session.mjs) connects that contract to the existing scanner and normalizer:

| Step | Executed behavior | Limit |
|---|---|---|
| `prepare` | Observe process identity, issue random capture UUID/window, hash the selected observed image, derive both RTTI proofs, build guarded read-only script, reobserve identity, write fresh script/request. | Does not attach, launch FM, edit game data or authenticate loaded image bytes. |
| REA handoff | Explicitly load the prepared script through MCP; its outer envelope carries the UUID. | No automatic execution of an arbitrary supplied script. |
| `finalize` | Check the unique selected Evidence record, `load_frida_script`, prepared-script SHA, UUID/PID and complete transport; observe the process before and after shared normalization. | Caller-controlled ticket/Evidence hashes are consistency checks, not signed execution attestation. |
| Publication | Fresh bounded JSON with `session.decision:'same_process_at_endpoints'`, `availability:'historical_capture'`, `currentness:'unverified'`, `captureAuthenticated:false`. | Never promotes the snapshot to currently live or certified data. |

The strict parser rejects unknown claims, incompatible profiles, malformed UUID/timestamps and widened windows. Changed process creation time, wrong token/PID, expiry, clock rollback, process loss/access failure and unsupported builds reject before output. No automatic retargeting, one-use token semantics or replay prevention is implemented. A save can change within one process, so matching endpoints do not prove atomic capture or loaded-career identity.

The clock check rejects a supplied current time before issuance; this stateless wall-clock window does not detect every clock adjustment inside the window. The original real request was also retried after its actual ten-minute deadline: it rejected with `ticket_expired` and created no output. Synthetic tests separately exercise expiry during normalization before publication.

The optional output `session` wrapper retains these observations separately from the immutable `GameSnapshot`. `ready` still means payload admission. The older file-only CLI remains usable without process queries and makes no live-currentness guarantee. No live snapshot is cast into the export-only library.

The embedded prepared-script path must be an absolute `.js` path and cannot have an explicit UNC/device prefix. This prevents a selected request from redirecting the follow-up read through such a path. It does not authenticate mapped drives, junctions or storage locality.

Run `npm run research:fm2013:session -- prepare` with explicit `--pid`, `--ticket` and `--script`. After the authorized REA handoff/export, `finalize` requires `--ticket`, `--evidence`, `--evidence-id`, `--output`, `--snapshot-id`, `--career-id`, `--captured-at` and `--mode`. Source/output paths are explicit; preparation cannot silently attach and finalization cannot silently pick the latest Evidence record. The capture timestamp remains caller-declared.

## Windows observation and actual evidence

[The observer](../../../scripts/fm2013-process-observer.mjs) queries process start identity/path, hashes the selected executable and checks its exact-build SHA-256 through bounded Node I/O, then queries identity again. It resolves an absolute Windows PowerShell path rather than searching executable PATH; this is not a separate executable-authentication claim. Query time/output are bounded and the helper window is hidden. Absent, denied, failed and unsupported outcomes remain explicit; a PID alone is never substituted for a successful identity query.

The first real sandbox observation reported `process_not_found` although REA inventory saw the process. Private `fm13-process-observer-real-v1.json` preserves that failure. No start time was fabricated. Read-only host execution was approved, and the default observer obtained the actual OS creation time and matching image hash. This verifies the tested host context, not equivalent visibility in every sandbox or deployment environment.

REA `ev_093f4b59d744225b26c91dc03364eae4cf561713dbcad4401624ee9a4df128fc` contains the complete, untruncated4,058-record result of the prepared script. Its retained source SHA and outer UUID match the local request. The owned Frida session was detached. Both real host-visible finalizations succeed with the default OS observer/hash, not injected synthetic identities. No game/save value, Continue, Save Changes or activation operation was requested.

Private request, script, Evidence and fresh Editor/Realism outputs remain outside Git. All observations stay provisional. Realism redacts exact ratings, familiarity, supplied biography and derived age before writing; CA/PA and contracts remain null. No player names/IDs, dates, creation times or UUID values are published here. Actual process exit during capture and real PID reuse were not exercised by this run; synthetic tests cover their rejection paths.

## Bounds and executed checks

[local-research-files.mjs](../../../scripts/local-research-files.mjs) extracts the existing opened-file reader for reuse. It validates regular files, allocates checked length plus one byte, bounds reads, rechecks size/mtime and decodes UTF-8 strictly. It does not promise isolation from every same-size concurrent mutation.

| Resource | Byte bound |
|---|---:|
| Plain wire input |24,000,000 |
| Canonical Evidence JSON / executable |64MiB each |
| Prepared script |1MiB |
| Ticket/request wrapper |64KiB |
| Serialized output including newline |160MiB |

Outputs use `wx`, refuse existing paths and perform no automatic deletion/replacement. I/O failure may leave a partial fresh artifact; atomic filesystem publication is not promised. A consumer must not treat incomplete output as an admitted snapshot.

`npm.cmd run check` passes128 Vitest/98 Node tests (226 total), TypeScript, build and bundle budgets. New cases cover ticket structure/FILETIME precision, PID reuse, token/hash/script changes, expiry/rollback, process loss/denial, malformed/truncated Evidence, bounded I/O, source preservation and Realism serialization. Independent source review reproduces18 focused Node tests with no actionable defect, then reruns the same18 after absolute executable-path hardening, including all four observer cases. Current review source hashes are pinned separately; the final canonical integrity audit is not inferred from these tests.

Product IPC/UI/storage, sustained lifecycle/error coverage, manager/scouting knowledge, career lineage and wider-build certification remain unfinished. Offline player decoding and independently validated writing are separate gates. No full module or delivery phase is complete.
