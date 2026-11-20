# 01 — FM27 Editor pinned source audit

**Scope and method:** Static review of public source at commit [`ef0842e`](https://github.com/Jackhamerp24/Football-Manager-27-Editor/tree/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb); not a running FM27/FMRTE test. Upstream project is an independent FM27 **in-game process editor**, not the official FMRTE program and **not proof of direct offline .fm decoding/editing**.

## Source-to-behavior trace

| Layer / source (pin commit to links) | Source observation | Transferable design lesson | Boundary |
|---|---|---|---|
| [IProcessMemory.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Memory/IProcessMemory.cs) | Interface exposes TryRead/TryWrite and extensions | Isolate OS memory IO behind testable interface | Interface semantics are reusable, code copying subject to GPL |
| [WindowsProcessMemory.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Memory/WindowsProcessMemory.cs) | Windows process APIs for address read/write and memory protections | Dedicated native OS boundary, least privilege, explicit failure | Remote allocation/thread creation are high risk, **not** adoption targets |
| [GameProcess.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Game/GameProcess.cs) | Process selection, game_plugin.dll module discovery | Exact process-instance/module identity and lifecycle | FM2013 executable layout differs |
| [GameSession.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Game/GameSession.cs) | Read-only attachment first, profile resolution, writable path gated by profile support | Mode-separated session state; never silently enable write | Profile matching is necessary, not sufficient proof |
| [OffsetProfile.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Offsets/OffsetProfile.cs) and [offsets/](https://github.com/Jackhamerp24/Football-Manager-27-Editor/tree/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/offsets) | Version/platform-specific root RVAs, offsets, vtables, type sizes, field scaling | Data-driven, exact-build, per-platform profile | **Never use FM27 profile values for FM2013** |
| [PlayerRepository.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Players/PlayerRepository.cs) | Root vector begin/end, pointer-table reads, size/alignment bounds, vtable checks | Strict bounds before dereference, validate object identity | FM2013 discovery uses its own RTTI/two classes |
| [PlayerReader.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Players/PlayerReader.cs) | Decodes attributes, names, positions, relationships, contract data and CA/PA | Separate raw memory decoding from user-facing canonical snapshot | The numeric/scaling/CA encoding differs by edition |
| [PlayerWriter.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Players/PlayerWriter.cs) | Validates field ranges, object vtable, ID, expected prewrite bytes; performs write + readback | Compare-before-write, stale-object refusal, explicit successful readback | Not an atomic multi-field transaction; stale PID/address remains a risk |
| [ChangeJournal.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/History/ChangeJournal.cs) | Records before/after bytes; guarded undo | Transaction intent, user-facing audit and conditional undo | Journal must bind process instance/object identity, not address alone |
| [ProfileHealth.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Offsets/ProfileHealth.cs) | Sanity checks name/ID/ability and layout clues | Separate health diagnostics from verified capabilities | Sample health != full database certification |
| [OffsetFinder.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Discovery/OffsetFinder.cs) | Heuristic discovery based on known player traits | Research support, diagnostic candidate generation | Not a production proof / no arbitrary scan by default |
| [PointerListFinder.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/src/Fm27Editor.Core/Memory/PointerListFinder.cs) | Checks pointer-vector hypotheses with type markers | Validate discovery hypotheses using invariants | FM2013 exact-build roots must be independently observed |
| [PlayerWriterTests.cs](https://github.com/Jackhamerp24/Football-Manager-27-Editor/blob/ef0842e005ed29c30c01bcd9cf8a2280810bf6bb/tests/Fm27Editor.Core.Tests/PlayerWriterTests.cs) | Fake memory tests reject stale object/value and invalid ranges | Hermetic positive and negative test fixtures first | Unit tests do not certify running FM2013 edits |

## Exact-version differences — prohibition on copy/paste

FM27 profile examples explicitly target a different module/build (Steam vs Game Pass). FM2013 local research instead targets **PE32/x86 (4-byte pointers), build 13.3.3f359652**; its player populations include **Player and PlayerStaff** native layouts. The [reference comparison](../fmrte/19-fm2013-reference-comparison.md) documents 4,036 + 22 observed identities and a limited 3-record UI cross-check, not a certified production population reader.

FM27's CA/PA writer stores direct signed 16-bit values under that FM27 layout. For FM2013 the [field-transform study](../fmrte/14-fmrte13-field-transforms.md) reports address-sensitive 16-bit obfuscation and specific inverse modes. **Direct FM27-style Int16 writes would risk corrupting FM2013 values.** Distinguish in-memory hidden exact CA/PA from derived/eCA estimates.

FM27 has Windows live memory handling; this does not provide, validate or advance the separate [offline save decoder](../fmrte/05-offline-save-format.md).

## Security, compliance and license uncertainties

- Memory writing can alter or crash a game. Disallow it without precise build, instance, object/field validity, explicit user authorization and isolated test evidence.
- No remote allocator/injection, code patching, thread creation or generic scanner is approved in this proposal; minimize target privileges.
- The upstream repository reports GPL-3.0-or-later. This document links to source; no source code has been copied. Any substantive derivative implementation needs license review, provenance/attribution strategy and distribution decision.
- Do not store private .fm files, raw process memory, proprietary disassemblies or personal machine paths in Git. Commit only public links, summarized findings and safe synthetic fixtures.
- All source claims here are **confirmed static observations**, not executed integration tests, and upstream may change after pinning.

## Open questions

1. Reliable exact-build hash/image identity and module relocation across FM2013 restart?
2. Unambiguous current career lineage vs historical capture identity?
3. Production-grade 4,058 cohort completeness and reference-wide value checks?
4. Which remaining FM2013 fields can be read without unsupported guesses?
5. Which native runtime gives the narrowest auditable permissions with current npm/React code?
6. Can any write satisfy stale-object/session/readback/reload certification without needing unsafe remote allocation?
