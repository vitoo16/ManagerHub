# FM2013 exact-build RTTI evidence and native stdio v2 — 2026-11-21

**Scope:** Research-only file-backed RTTI corroboration and per-invocation stdio correlation for [#89](https://github.com/vitoo16/ManagerHub/pull/89) and [#88](https://github.com/vitoo16/ManagerHub/issues/88). This change is stacked on the **Draft** Windows read-only smoke host; it cannot be merged to `main` without that host's separate review. Do not mark any of the 27 product modules Complete.

## Offline dual-class RTTI proof

`scripts/fm2013-rtti-evidence.mjs` delegates to **existing** `findPe32RttiVtables` rather than implementing another PE parser. The real entry point `inspectPinnedFm2013FileRtti` pins the exact file SHA-256 and both descriptors from `fm2013-live-profile.json`. It refuses image hash mismatches, missing/invalid PE RTTI chains, conflicting marker RVAs, unexpected names or offsets and failure to recover **both** class kinds:

| Native kind | Exact MSVC decorated name | Complete-object Person offset |
| --- | --- | ---: |
| `player` | `.?AVACTUAL_PLAYER@@` | 356 |
| `playerStaff` | `.?AVACTUAL_PLAYER_AND_NON_PLAYER@@` | 452 |

Candidate **RVAs** are relative to the PE file, *not* absolute process addresses. Multiple valid candidates are surfaced as `ambiguous:true` rather than selecting the first. Returned status is `file_rtti_candidates`, **always** `runtimeVerified:false`. The helper's synthetic-expectation overload exists for tests, **not** game authorization. Only the pinned wrapper is used by the real CLI.

Local file-only research command (no game attach, no writable handle, no save mutation):

```powershell
node --experimental-strip-types scripts/fm2013-rtti-file-cli.mjs "C:\\Games\\Football Manager 2013\\fm.exe"
```

The CLI only prints allowed class names/counts and ambiguity; it does not print file contents, absolute paths or marker RVAs. Do not commit actual installed game binaries or console logs containing private user environment details. The operator must provide a genuine supported `fm.exe`; tests use synthetic PE bytes.

**Still unimplemented:** proof that a live pointer equals a relocated candidate vtable in this exact running `fm.exe`; runtime image/module base attestation; stable record identity and same-class ABA defense; player-field extraction; atomic career/roster snapshot. Disk hash and synthetic PE tests cannot establish any of these.

## IPC v2: correlation, bounded stdout, no browser exposure

The private Node subprocess broker and C# `--worker` now use `managerhub-native-probe-v2`. The **broker alone** generates a fresh random 128-bit `requestId` per invocation; the native worker echoes it in its fixed-status/bytes-read response. The broker rejects mismatches, absent/extra properties, v1 or replayed responses, oversized stdout and raw memory fields. The broker requires an absolute executable path; the Windows research CLI resolves `dotnet.exe` under `%ProgramFiles%\\dotnet` and refuses missing/symlinked host and DLL files instead of using PATH.

**Security interpretation:** the requestId is a **correlation nonce, not authentication, consent, a signed capability or caller attestation**. A malicious executable that receives the request can echo the nonce. The native `--worker` remains callable by same-user programs and MUST NOT be exposed directly to the browser, LAN, HTTP server, named pipe or third-party clients. A future product host requires reviewed process-launch identity, user-granted authority, OS ACL/peer identity policy, expiry/replay protections, per-field Realism redaction **before** serialization, bounded schema, and independent security review. No native memory, pointer, CA/PA or PlayerStaff data is returned in IPC v2.

The manual `READ ONLY <pid>` console confirmation in #89 is still a limited research workflow; it does not authorize unattended reads or a renderer.

## Regression/acceptance

The new `fm2013-rtti-evidence.test.mjs` uses synthetic PE32 fixtures modeling **both exact real class names/offsets** and tests image pinning, non-canonical names, wrong displacement, missing RTTI and multiple vtable markers. The existing broker tests now exercise matching requestId, mismatched/missing/stale v1 IDs, input spoofing and PATH hijack prevention. Both are appended to the existing `test:node:fm2013` command without removing any stage or old test.

```powershell
node --experimental-strip-types --test scripts/pe32-rtti-vtables.test.mjs scripts/fm2013-rtti-evidence.test.mjs scripts/fm2013-native-worker-broker.test.mjs
dotnet build native/ManagerHub.Fm2013Host/ManagerHub.Fm2013Host.csproj --configuration Release
dotnet native/ManagerHub.Fm2013Host/bin/Release/net10.0-windows/ManagerHub.Fm2013Host.dll --self-test
node scripts/local-ci.mjs --profile quick
node scripts/local-ci.mjs --profile full
node scripts/local-ci.mjs --profile release
```

**Expected configured stage counts:** Quick 6, Full 9, Release 10 (unchanged from #89). All CI evidence must target the **new PR head**, not `3c94324` tested for #89. Verify `summary.json`, clean source, exact HEAD and stage log SHA-256. Rerun on the merged SHA if/when both PRs are approved.

**Actual execution status at authoring:** file/tree readback and synthetic PE fixture marker geometry checked in a non-Windows analysis environment. **Windows .NET compilation, exact committed Node regression suite, Local CI and real game RTTI have NOT been executed for this new head.** Never describe this as live RTTI verification or authenticated product IPC.
