# FM2013 Windows native **read-only smoke probe** — Phase 2 (#88)

**Scope (2026-11-21):** A narrow Windows-native worker using **.NET 10 LTS** plus a Node.js process-isolated broker and an **interactive-only** manual CLI. This is a practical OS-boundary milestone, **not** a certified FM2013 player reader, RTTI validator, UI IPC service or live data adapter.

.NET 8/9 are out of Microsoft support as of 2026-11-10; target framework `net10.0-windows` is intentional.

## Components and security boundary

- `native/ManagerHub.Fm2013Host/Program.cs`: Windows x64 worker, JSON v1 over **private process stdin/stdout only**. Uses `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ)`, `QueryFullProcessImageNameW`, `GetProcessTimes`, PE32/x86 header checks, and SHA256 of the exact supported **on-disk** `fm.exe`. The sole read is an operator-selected aligned 32-bit address / 1–512-byte span. Never returns or logs the address, path, memory bytes or game identity; reports only fixed status and count. The data buffer is zeroed and `SafeProcessHandle` disposed on completion.
- `scripts/fm2013-native-worker-broker.mjs`: spawns isolated worker with 5-second maximum response deadline, strict max request/response payload size, no shell, explicit response schema/status allowlist, never logs native stderr and attempts hard child-process termination on deadline.
- `scripts/fm2013-native-probe-cli.mjs`: **manual research entry** on a genuine Windows interactive terminal only. User supplies PID and one probe address, types `READ ONLY <pid>`; the existing `observeFm2013Process` then verifies the exact research image and creation FILETIME. The native worker repeats independent same-handle identity and on-disk hash checks.
- Existing `scripts/fm2013-readonly-boundary.mjs` and its `inspectType` mock contract remain unchanged. The smoke worker **does not yet implement RTTI/vtable or stable player identity**. Its result must **not** be coerced into the mock boundary's `read_only_sample`, `GameSnapshot`, Editor/Realism or web IPC. A "smoke pass" means only that the OS read returned the exact requested byte count.

**Not an authenticated production service:** Anyone already running programs under a user's account could invoke the private `--worker` endpoint directly. The interactive console prompt is a *manual research consent* gate, not a secure peer-authenticated browser API. Do not expose this endpoint via public sockets, browser workers, HTTP or named pipes without a reviewed local authorization protocol.

**Timeout truth:** Broker returns `time_limit` after at most 5000ms and attempts to kill its isolated child. Windows process termination or cancellation of a kernel I/O request may still be delayed; neither `CancelSynchronousIo` nor `child.kill` guarantees synchronous kernel cancellation or a handle-release receipt. No in-process cooperative timer is used to certify an OS read. A future production supervisor requires process tree/job-object containment, watchdog testing and resource-leak measurements.

## Build and check on Windows

Prerequisites: Windows 11, Node 24, **.NET 10 SDK and runtime**, an isolated clean Git worktree. No admin elevation or debug privilege enablement is required or attempted; access can be denied by Windows.

```powershell
dotnet build native/ManagerHub.Fm2013Host/ManagerHub.Fm2013Host.csproj --configuration Release
dotnet native/ManagerHub.Fm2013Host/bin/Release/net10.0-windows/ManagerHub.Fm2013Host.dll --self-test
node --test scripts/fm2013-native-worker-broker.test.mjs
node scripts/local-ci.mjs --profile quick
node scripts/local-ci.mjs --profile full
node scripts/local-ci.mjs --profile release
```

The native build/self-test becomes the **additional** `native-windows` stage for Full and Release. Existing stage commands are retained. Stage counts in this branch: **Quick 6, Full 9, Release 10**.

Only with explicit owner authorization and an owned, running FM2013 exact build should an interactive smoke probe be attempted:

```powershell
node --experimental-strip-types scripts/fm2013-native-probe-cli.mjs --pid <PID> --address 0x<KNOWN_SAFE_RESEARCH_ADDRESS> --bytes 4
```

The prompt requires typing `READ ONLY <PID>`. An unknown, arbitrary, unsupported or misaligned address should be expected to reject; **do not experiment with guessed pointers**. No save-file write or game-memory write path is implemented.

## Architecture/acceptance limitations

1. Identity: on-disk SHA256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` and PE32/x86 verified on the worker, plus creation FILETIME and Win32 image path on the same handle. On-disk identity is **not loaded image attestation**, career lineage or player identity.
2. Rights: no `VirtualQueryEx` (requires additional `PROCESS_QUERY_INFORMATION`), `PROCESS_VM_WRITE`, `PROCESS_VM_OPERATION`, `PROCESS_CREATE_THREAD`, injection, `SeDebugPrivilege`, or native save editing.
3. No RTTI validation yet: real profile symbols remain `.?AVACTUAL_PLAYER@@` (person offset 356) and `.?AVACTUAL_PLAYER_AND_NON_PLAYER@@` (person offset 452). Pre/post RTTI checks alone are not enough to defeat same-class ABA/recycled objects.
4. No binary, screenshot, raw game save, memory dump or private probe address should be committed or posted to GitHub. Native worker stderr/private OS exceptions are never sent to renderer/PR logs.
5. This source was authored outside the owner's Windows machine. **Windows .NET compilation, actual worker verification and Local CI 6/9/10 are NOT YET EXECUTED in this implementation session.** Passing Node mock subprocess tests cannot substitute for a real Windows .NET build or a real FM2013 test.

## Next PR after native smoke is certified

Review host threat model/consent and integrate real **FM2013-native class RTTI/vtable/record identity verification**, snapshot-level source provenance and **sanitized, authenticated, versioned local IPC**. Only after same-build field cross-check + Editor/Realism privacy tests may a live reader capability be considered. Actual CA/PA writer and offline `.fm` save decoder remain disabled/unsupported, with 0/27 modules certified Complete.

Related: [Native host implementation issue #88](https://github.com/vitoo16/ManagerHub/issues/88), [read-only Phase 2 gate #81](https://github.com/vitoo16/ManagerHub/issues/81), [FM27 architecture review #78](https://github.com/vitoo16/ManagerHub/issues/78), [existing boundary ADR](../docs/research/fmrte/29-native-readonly-boundary-adr.md).


## Stacked RTTI file proof + stdio v2 research (separate draft PR)

The next branch adds an exact-build, two-class **offline** MSVC RTTI proof and private `managerhub-native-probe-v2` request/response correlation. See [RTTI and IPC v2 design/limits](../docs/research/fmrte/30-native-rtti-evidence-ipc-v2.md). Its `requestId` is **not** an access token, peer authentication, proof of consent or a guarantee against same-user malicious software. It only binds a worker reply to the current invocation; old v1 responses are refused. The broker refuses non-absolute native host executable paths; the research CLI looks for `dotnet.exe` in the system Program Files installation rather than PATH.

File-backed vtable candidate RVAs are not runtime vtable validation, loaded image attestation or a same-class ABA defense. Do not return them to web/IndexedDB. The local Windows build and full Local CI must be rerun at the new head after this change; the old #89 10/10 PASS is **not inherited**.
