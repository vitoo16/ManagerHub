# Environment and separate binary inventories

Date: 2026-10-30, Asia/Bangkok. **REA MCP connectivity CONFIRMED** by an actual binary_session call and subsequent inspections. This is a static investigation with unresolved questions, not certification of a ManagerHub reader/editor.

## Workspace and controls

The user-selected ManagerHub directory was empty and not a Git checkout. Cloned the specified https://github.com/vitoo16/ManagerHub repository into that directory; baseline HEAD: 8f973b3c37c464f0331b58de45cfda2cbe530cc2. Read AGENTS.md, save-safety skill, architecture/compatibility/editor specs and actual domain/workers. The full 27-module delivery scope remains unchanged. See [adapter audit](06-managerhub-adapter-design.md).

Both installations were discovered under the supplied root before selecting files. **CONFIRMED** canonical roots: <FMRTE13_INSTALL_ROOT> and <FMRTE26_INSTALL_ROOT>. All targets were read-only. No installation, license, game process or save was changed; no target assembly was loaded/executed for inspection. No archive fallback was needed. A hash identifies the analyzed bytes; it does not authenticate vendor origin.

## REA identity and availability

- **CONFIRMED:** rea-agents / server 6.7.0; skill reverse-engineer-anything v42; MCP 2025-06-18; codex-mcp-client 0.166.0-alpha.5.1.
- Server command: <LOCAL_USER_PROFILE>\AppData\Local\npm-cache\_npx\a1722018f28f9df2\node_modules\rea-agents\scripts\rea.mjs.
- **CONFIRMED:** metadata/member/boundary provider rea-dotnet-static v1; views rea-analysis-view v1.
- **CONFIRMED:** Ghidra unavailable, GHIDRA_INSTALL_DIR unset; Java probe also lacks the required absolute executable path. IDA unavailable, REA_IDA_MCP_CONFIG unset. Hopper unsupported on Windows; Kuna unconfigured. No native analysis provider was bound or used.
- Actual successful operations: binary_session, inspect_managed_artifact, inspect_managed_members, inspect_managed_native_boundaries, inspect_analysis_view, project_managed_application_graph, export_evidence_bundle.
- The graph projection supplied boundary evidence only: 114 nodes / 113 edges, 20 P/Invoke declarations and 92 native/runtime implementation records; it contains no recovered native function addresses.
- Whole-assembly FMRTE13 member inspection exceeded REA's 67,108,864-byte representation budget. Exact type selections succeeded with complete coverage within their selected scope. This is a tool budget, not proof of encrypted or missing CIL.
- get_evidence_bundle with record filters plus complete detail was rejected by this installed server; no analysis claim relies on that rejected request. Exported canonical bundles preserve the real records.
- compare_managed_members was not used: unrelated major architectures do not establish code equivalence. import_managed_reconstruction was not used: no independently supplied reconstruction exists. verify_managed_native_boundaries was not used to manufacture verification without native export evidence. No setup/config repair was needed.

## FMRTE 13 inventory — primary

[Machine-readable inventory](inventory-13.json): **8 binary/configuration files**, with full resolved paths, sizes, file versions, SHA-256, PE machine, CLI presence/flags. Asset counts include 1,351 PNG, 45 XML, 2 XAML; resource payload bytes were not copied into the repository.

| Component | File / assembly version | Architecture / framework | SHA-256 | Responsibility / confidence |
|---|---|---|---|---|
| FMRTE.exe | 13.3.3.62 / 13.3.3.62 | x86 required; CIL; .NET Framework 4 Client | c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae | **CONFIRMED** WPF/game object/process access code by metadata and CIL |
| miniFMRTE.exe | 13.3.3.62 / 13.3.3.62 | AnyCPU CIL; .NET Framework 4 | 82b9b79847dee7a11d2ed748f2d66dea81619ea55cc1b75f847c3783c9350a30 | **CONFIRMED** small managed executable; behavior not traced |

FMRTE.exe MVID: 3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6. Entry token 0x060006cb; 938 TypeDefs, 9,618 MethodDefs, 18 AssemblyRefs, 3 embedded resources. Metadata and boundary coverage complete. P/Invoke names survive even where managed names are obfuscated.

**CONFIRMED** dependencies include WPF PresentationFramework/PresentationCore/WindowsBase, System.* 4.0, Newtonsoft.Json 4.5.0.0, WPFToolkit.Extended 1.5.0.0 and BouncyCastle.Crypto 1.7.4114.6375. Presence does not establish a dependency's role in game parsing. Supplemental EXE/DLL identities are in the JSON; updater/uninstaller were not launched.

Embedded resources (artifact evidence, resources collection): tokens 0x28000001–03, lengths 418498 / 109268 / 14507; payload digests respectively 478d18f16526e3d911d164f99bee12535fcba38a055ddf6d583475624d6b706d, 95f3fe0508f8f01451416a348bde88c4baf7d10ca38d0620099d1b821282a0d6, 371164a1ca7e59e01f7adbd28f52c46b635e950e8b4ff73cd99c1d1fa593a12a. **UNKNOWN** contents beyond opaque resource metadata; no embedded assembly identity is inferred from a hash-like name.

## FMRTE 26 inventory — comparison

[Machine-readable inventory](inventory-26.json): **415 binary/configuration files** recursively, excluding package archives. Includes current runtime/vendor libraries and language resource assemblies; this is inventory, not analysis of every library.

| Component (relative to root) | File / assembly version | Architecture / framework | SHA-256 | Confidence |
|---|---|---|---|---|
| current\FMRTE.dll | 26.3.2.42 / 26.3.2.0 | x64 CIL / .NET 9 | 29122b04bde4d77b5860423544d93f6bbef5b2e9c65b9a5749bd388c2be4b89e | **CONFIRMED** startup/resource-resolution code |
| current\FmrteAvalonia.dll | 26.3.2.42 / 26.3.2.0 | AnyCPU CIL / .NET 9 | c763b9614e98f13a16f1b49b4a14ad191fc585627919fbac165970938d425ecf | **CONFIRMED** Avalonia ViewModel/handler CIL |

The root FMRTE.exe launcher and current\FMRTE.exe have file version 26.3.2.42; exact hashes/PE classification are in inventory-26.json. They are not substitutes for the above managed modules. Fmrte.Framework / .IO / Mvvm 26.3.2.0 are **CONFIRMED assembly references**, not independently recovered framework implementations. Opaque resources and delegate binding gaps are detailed in the [load report](01-fmrte26-load-pipeline.md).

## Evidence preservation

Machine-readable [manifest](evidence-manifest.json) binds discoveries to installation path, source version, SHA-256, MVID, token/RVA/IL and canonical REA Evidence IDs. Raw bundles live outside the tracked checkout at the absolute paths in the manifest; they contain proprietary analysis and must not be committed. Reports retain only selected metadata/references and original explanations. PowerShell supplements use System.Reflection.Metadata.PEReader, not Assembly.Load.

PE machine I386 alone is not proof of x86 runtime: CLI flags distinguish FMRTE13 x86 from miniFMRTE/Avalonia AnyCPU. Tokens are build-local metadata coordinates, never FM memory offsets.

## User-supplied FM2013 executable follow-up

The later supplied directory `C:\Program Files (x86)\Football Manager 2013` contains `fm.exe`: metadata ProductVersion `13.3.3f359652`, FileVersion `13.3.3`, PE32/I386 with no CLI directory, 40,848,024 bytes, SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` (**CONFIRMED static identity**). See [executable evidence](10-local-fm2013-executable.md) and [its own inventory](inventory-fm2013.json). This native executable is distinct from the two FMRTE evidence sets. Its version metadata is not proof of original vendor bytes or working compatibility. [A subsequent save study](11-fm2013-save-samples.md) identifies the new user save and 63 shipped tutorials, probing three selected files read-only. No player/game-reload validation was executed. A fresh MCP session status still reports no native provider.
