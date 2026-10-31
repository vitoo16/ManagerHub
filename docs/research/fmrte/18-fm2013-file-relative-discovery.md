# FM2013 file-relative native player discovery

**2026-10-31:** an original file-only RTTI locator now derives the native player marker from the selected executable. REA executed the resulting bounded scanner without any supplied player address, ID or name and recovered the same 4,036 candidates. A separate static resource decode identifies the FMRTE13 profile declaring the local version string and its mode3 assignments. These are research results; Actual CA/PA, complete database coverage, offline parsing and writing remain uncertified.

## Deriving a marker from the executable

The exact `fm.exe` remains metadata build `13.3.3f359652`, SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871`, 40,848,024 bytes. The original [PE32 RTTI locator](../../../scripts/pe32-rtti-vtables.mjs) reads file bytes without loading or executing the target. It searches for a selected decorated type name, validates TypeDescriptor references through CompleteObjectLocator/class-hierarchy/self-base metadata, then requires three virtual-function pointers into executable sections. It returns all candidates rather than selecting an ambiguous first result.

For `.?AVACTUAL_PLAYER@@` at subobject offset356, this file contains one validated candidate:

| File-derived coordinate | RVA | File offset where applicable |
|---|---:|---:|
| TypeDescriptor | 38,067,368 | — |
| CompleteObjectLocator | 36,248,192 | — |
| Class hierarchy | 36,248,044 | — |
| Person-subobject vtable / marker | 34,118,796 | 34,114,188 |
| First three virtual functions | 20,032,064 / 7,038,208 / 20,034,528 | — |

The locator records subobject offset356 and constructor displacement4. This independently supports the Person-to-Player displacement used in the earlier FMRTE CIL trace and live records. Constructor displacement is a separate RTTI field, not another player-field offset. This does not prove other native classes or all field layouts.

REA runtime evidence `ev_a3a75246e940aac9a28bb8868c2604d018dcc776e6d64138e5e65c0eae76f423` observes the same decorated name, locator fields and virtual-function RVAs; the first functions occupy executable mappings. Runtime absolute addresses are computed from the current module base. Full loaded-image authentication is not claimed.

The parser caps input at64MiB,96 sections,64 matching descriptors/locators/vtables and128 hierarchy bases per candidate. It rejects truncated headers, wrong architecture, overlapping raw/virtual sections, out-of-image and out-of-file mappings. Names have bounded length. A file containing self-consistent RTTI is still only a file observation; matching a type name alone does not certify a live layout.

## Reusing the guarded scanner

[The existing research module](../../../scripts/fm2013-readonly-record-probe.mjs) adds `buildFm2013ImageRelativePlayerScan(target, fileProof, limits)`. Unlike the earlier anchor builder, its inputs contain no heap address or expected player identity. It requires the exact selected file hash and a unique supported native-type proof. At runtime it checks PID, path, ia32/four-byte pointers, image size, locator address/fields, type name, hierarchy pointer, three relocated function pointers and executable protections before scanning.

The scan then reuses the existing candidate reader and byte/time/record/match limits. It reads no batch CA/PA words. `imageTypeMetadataVerified:true` means these narrow RTTI checks passed; `runtimeImageBytesAuthenticated`, `actualAbilityVerified`, `independentGroundTruthVerified` and `databaseCompletenessVerified` remain false. `anchorFound:null` reflects that this mode accepts no record anchor.

REA evidence `ev_e08c13b9f543af992d7a3102678e8c3599f1e29119ba49534ebd110605e124fc` records 4,036 distinct candidates, 835,719,663 attempted bytes including overlap, zero rejected/duplicate/fault counts and1,577 milliseconds. Selected mappings were exhausted. The two previously user-confirmed ID/Passing/Pace records are present. One native class and selected anonymous writable mappings do not cover an entire career database.

Two negative/partial cases also ran against the real process:

- A host-side proof copy with an intentionally displaced locator is rejected with `rtti_locator_mismatch` before the scan (`ev_4f492afe5f7b5f665ce67fba28c58615a7a5b4a4871cb4e7bf2a473c951e1fbc`). No target bytes were changed.
- A64KiB scan budget consumes exactly65,536 bytes and returns `byte_limit`, zero candidates and `selectedMappingsExhausted:false` (`ev_df59ab83c1634b4b04ec8218d61ff5d2d995d67a8b0d45c74ccc26ab37aaa6c8`). Zero candidates in a partial scan is not absence from the database.

## Exact-version profile evidence

The selected FMRTE13 artifact remains version13.3.3.62, SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`. An original resource decoder and a separate file-backed reduction of initializer arithmetic derive the same string-decoding seed. The reduction assumes the normal same-assembly StackTrace initialization branch; no target assembly or protected resolver was executed, patched or bypassed. Runtime plaintext/profile selection remains unobserved.

This decode associates ctor `0x060004ab` with the version list containing `13.3.3f359652`, `13.3.3f359720`, `13.3.3f359754` and `13.3.3f359743`. Validator `0x060004b5` compares version descriptions when its source-kind argument is zero; normal resolver `567` passes zero at its validator call. Nonzero source kinds take a different acceptance branch and must not be conflated with CA/PA mode3. The inspected `503/50d` candidate in report17 instead declares13.3.2 version strings.

Descriptor ctor `0x060004bb` calls layout initializers `24e`/`924` and assigns mode3 to both CA/PA selectors. Initializer `924` assigns CA/PA slots336/338 and Person displacement356. Postaccept initialization dispatches override `4c4` through descriptor virtual `91e`. These are confirmed static relationships under the decoded normal branch; they do not show a running FMRTE instance choosing or reading this profile. Private decoder/seed proof, resource ranges, raw CIL and canonical method coordinates are recorded in the manifest.

Canonical profile evidence is `ev_6a15a2fe6c7746301799675bbb5c9776050faffc246b54aafb0a82b4e374369c`; descriptor/layout evidence is `ev_ca570eaade761c768efee06eb07187bc5a82c866512c9c17e9013aadf8133622`. The independent seed derivation reads the exact Int64 operand from original CIL bytes; a JSON Number representation of this operand loses precision and is not used as an arithmetic oracle.

## Actual process restart

The user agreed to reopen FM2013 and load the same save. REA observed a new game PID, then initially found zero records despite valid RTTI (`ev_9212422a8caf7aae94dcab9f9a86faac5600e9a0e9ccc7921a635ff45344cbed`). This early snapshot did not establish that the career had loaded. A subsequent bounded capture found all4,036 candidates (`ev_63fac4d303656a06163af42351e1661115ce4054cf319980041e95695ebdff2b`).

| Restart comparison | Result |
|---|---|
| Game process | PID10500 -> PID29056 |
| Player record addresses | All4,036 changed |
| ID/ID2/SID and both names | Identical across all4,036 records |
| Raw and candidate-scaled Passing/Pace | Identical across all4,036 records |
| Post-load attempted scan bytes / time | 796,388,146 /1,484ms |
| Rejected / duplicate / chunk-fault counts | 0 /0 /0 |

Both generated scripts receive only the freshly selected PID, file-derived type proof and resource limits. No old heap address, player ID or name is an input. The module base happened to remain the same, so this is real heap-relocation recovery; rebasing to a different image base is covered by synthetic tests rather than claimed as a real observation. This is one restart of one exact executable and career, not general compatibility certification. Both Frida sessions were detached, with final target state reported unknown and no kill operation.

## Verification and boundaries

Seventeen focused synthetic tests cover prior reads/scans, file-derived discovery at different simulated module bases, runtime metadata/function/image mismatches, ambiguity, PE corruption and file/RVA mapping. `npm.cmd run check` passes TypeScript,90 Vitest tests,72 Node tests and the production build/bundle budgets. An independent read-only agent review found no actionable code defect and reproduced17/17 focused tests. It noted that the bridge's aligned-function-RVA requirement is appropriate for this exact build, not a general x86 invariant. No UI changed; browser/E2E and Rust checks do not apply. Private career records and proprietary raw analysis stay outside Git.

The evidence audit passes128 method coordinates,150 unique canonical REA records, eight bundle digests and all research links/Evidence IDs. All424 inventoried installation files and three save samples retain their recorded hashes. A separate replay checks the generated script digests, both real scan outputs, changed heap addresses, stable identities/attributes, absent batch ability words and negative/partial cases. Resource/seed proof artifacts and the verifier are hashed in the manifest.

Real restart results are tracked separately from simulated relocation. A new process with valid image metadata can yield zero matching records before a career is available; exhausting selected mappings is not a game-loaded assertion. All instrumentation is read-only apart from Frida's own attachment footprint; no hooks, game-function calls, game-data writes or save writes are issued.
