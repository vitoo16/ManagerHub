# Managed/native boundaries and evidence quality

**CONFIRMED environment:** REA MCP 6.7.0 works; managed provider v1 works. No configured native Ghidra/IDA/Kuna provider. All source identities are in [inventory](00-environment-and-inventory.md) and [manifest](evidence-manifest.json).

## FMRTE 13

Boundary Evidence B13: ev_f6833f0e33bc70ec47da48762a36ae2cdf5f9019b7c77653d1ea0c774ff75259; assembly SHA-256 c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae; MVID3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6.

| Method token | Managed declaration | Relevant direct call evidence | Classification |
|---|---|---|---|
| 0x06000982 | kernel32!VirtualQueryEx | Declaration inventoried; callers not traced | CONFIRMED declaration only |
| 0x06000983 | kernel32!CloseHandle | Declaration inventoried; lifetime correctness not tested | CONFIRMED declaration only |
| 0x06000984 / 985 | user32!FindWindow / GetWindowThreadProcessId | No direct CIL references found by supplementary full file-backed scan; dynamic/reflection use not excluded | CONFIRMED declarations; UNKNOWN actual use |
| 0x06000986 | kernel32!OpenProcess | D13 0x06000567 IL502 | CONFIRMED static call site |
| 0x06000987 | kernel32!ReadProcessMemory | M13 0x06000425 and 427 | CONFIRMED static call sites |
| 0x06000988 | kernel32!WriteProcessMemory | M13 0x06000448 IL205 | CONFIRMED static call site |

B13 contains 20 P/Invokes across six ModuleRefs (case variants included) and 92 nonordinary implementation records. Runtime delegate .ctor/Invoke entries are not proof of separate native helper libraries. CIL IL-only and x86-required flags are present; no ReadyToRun/native header. **UNKNOWN:** actual resolved DLL exports/thunks/native instructions and runtime destinations.

M13 methods read a GameProcess pointer and contain calls to native declarations. That is stronger than an import-only inference, but remains static. Alternate Stream.Seek/Read must not be silently excluded or labeled .fm parsing.

The project_managed_application_graph result ev_c6f80ff3324a2fd0bd9ae0f556ad9c3ba5691a48bf0df9c8add4aaa9f697d244 is a boundary-only projection. Its “complete-within-inputs” status does not mean full-application or native execution coverage.

## FMRTE 26

**CONFIRMED:** FmrteAvalonia.dll (SHA-256 c763b9614e98f13a16f1b49b4a14ad191fc585627919fbac165970938d425ecf) declares LoadLibrary/GetProcAddress; Evidence ev_ee75015b533bdbc0b4ca2202c1c9f87ae75a0f1fe1b8ebe5c93200b505a44cc6. Its actual LoadGame/SaveChanges paths use obfuscated static delegate wrappers with runtime Invoke methods (RVA0).

**UNKNOWN:** wrapper binding targets, indirect memory APIs, framework bodies and native destination. Runtime-provided Invoke is not a verified native game-access API. Framework assembly references and opaque resources do not recover the implementation. See separate [load](01-fmrte26-load-pipeline.md) and [write](02-fmrte26-write-pipeline.md) reports.

## Unresolved transitions

| Question | Status / next admissible evidence |
|---|---|
| FMRTE13 absolute/relative offsets or signatures by exact FM build | UNKNOWN; inspect applicable static layout selection then validate on known authorized build |
| Actual API arguments/results and repeat-read/write effects | UNKNOWN; controlled runtime trace, no protection bypass |
| FMRTE26 delegate-to-framework mapping | UNKNOWN; legitimately available analyzable module/interface or permitted observation |
| Native semantics of Windows imports | UNKNOWN within this investigation; native provider evidence not supplied |
| .fm file parser/writer equivalence to process memory | UNSUPPORTED assumption; separate format and roundtrip validation needed |

verify_managed_native_boundaries was deliberately not used as a substitute for missing native-export evidence. No reconstructed C# or proprietary native code is published; reports expose only necessary coordinates and original summaries.
