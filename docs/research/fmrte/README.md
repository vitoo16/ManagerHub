# FMRTE research summary — 2026-10-30

**REA MCP worked. Static FM2013-oriented read/write paths were recovered in FMRTE13; no ManagerHub player reader, CA/PA extractor or editor was validated.** FMRTE26 was inspected independently and remains unresolved below delegate dispatch. No proprietary target was executed, and no installation/game/save was changed.

**User-path follow-up:** [local `fm.exe`](10-local-fm2013-executable.md) is now identified as PE32/x86, ProductVersion `13.3.3f359652`, SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871`. [The new user save and two tutorials](11-fm2013-save-samples.md) have recognized experimental AFE indexes (774/773/772 members); selected member payloads remain undecoded. Executable/save location blockers are resolved. Known-player validation and a native analysis provider remain missing; reader/editor capability is unchanged.

| Question | Result / confidence | Evidence and remaining limit |
|---|---|---|
| Q1 Process or .fm? | 13: CONFIRMED memory call sites plus UNKNOWN stream format. 26: CONFIRMED vendor description of live Load Game; local implementation UNKNOWN below delegates. | [13 load](01-fmrte13-load-pipeline.md), [26 load](01-fmrte26-load-pipeline.md), [official current Load Game](https://docs.fmrte.com/getting-started/load-game/). No offline .fm parser demonstrated. |
| Q2 Load components? | CONFIRMED 13 WPF candidate20a1 -> e7 -> e5 ->567; toolbar identity INFERRED. CONFIRMED26 named handler/wrappers. | Version-specific load reports preserve exact tokens and static edges. |
| Q3 Player data origin? | 13 CONFIRMED getter paths to ReadProcessMemory and Stream.Read; selected source/runtime data UNKNOWN. 26 UNKNOWN beyond gameContext. | M13 / P13 / CA13 and W26 in [manifest](evidence-manifest.json). |
| Q4 Identity/attributes? | 13 CONFIRMED address-like constructor, i4 ID getter, i2 CA/PA and i1 Passing/Pace plus conversion; native layout/known entity UNKNOWN. 26 interface names only CONFIRMED. | [Field mapping](01-fmrte13-load-pipeline.md); metadata signatures are not tested native offsets. |
| Q5 Actual CA/PA? | 13 CONFIRMED getter-to-memory-helper references; exact native mapping and real values UNKNOWN. 26 extraction UNKNOWN. | Player getters0x06000fe4/fe6 -> helpers545/547 -> read42c ->426/427 -> P/Invoke987. |
| Q6 Save components? | 13 CONFIRMED virtual current-page save/UpdateSource, CA/PA binding gap UNKNOWN. 26 CONFIRMED handler/callback/wrappers. | [13 write](02-fmrte13-write-pipeline.md), [26 write](02-fmrte26-write-pipeline.md). |
| Q7 Deepest write? | 13 CONFIRMED static site0x06000448 IL205 -> WriteProcessMemory0x06000988. 26 CONFIRMED delegate Invoke only; actual write UNKNOWN. | [Boundaries](03-managed-native-boundaries.md). No executed write trace. |
| Q8 Persistence? | Local save/reload UNKNOWN / NOT RUN. Vendor26 instructs saving in FM; applicability to13 INFERRED and untested. | [Official first edit](https://docs.fmrte.com/getting-started/first-edit/), [verification](07-verification-and-tests.md). |
| Q9 Shared mechanisms? | CONFIRMED managed applications with load/edit UI; shared layout/offsets/serialization UNKNOWN. | [Comparison](09-fmrte13-vs-fmrte26.md). No cross-version adapter equivalence. |
| Q10 Implement now? | CONFIRMED reproducible PE/CIL research utilities and evidence artifacts added. Production FM2013 player reader/editor UNSUPPORTED. | [Adapter design](06-managerhub-adapter-design.md), [next actions](08-next-actions.md). |

Start with [environment and inventories](00-environment-and-inventory.md) for exact paths, versions and SHA-256. [The manifest](evidence-manifest.json) records47 function discoveries, canonical REA locators and external raw-bundle digests. Raw proprietary analysis stays outside Git. [Offline save research](05-offline-save-format.md) remains independently unresolved. Unknowns are research blockers; the full27-module product scope remains unchanged.
