# FMRTE13 versus FMRTE26 — independent evidence

Date: 2026-10-30. Each substantive table cell carries its confidence. **CONFIRMED** means its stated static/documentary observation; it never means successful runtime execution unless explicitly tested. No game runtime tests were executed.

| Dimension | FMRTE 13 — primary/FM2013 | FMRTE 26 — comparison/FM2026 |
|---|---|---|
| Installed root/version | CONFIRMED C:\BraCa Soft\FMRTE 13; file/assembly13.3.3.62 | CONFIRMED C:\BraCa Soft\FMRTE 26; managed files26.3.2.42, assemblies26.3.2.0 |
| Main binaries | CONFIRMED FMRTE.exe; miniFMRTE.exe | CONFIRMED current\FMRTE.dll and FmrteAvalonia.dll; launcher/apphost inventoried separately |
| Architecture | CONFIRMED main x86-required CIL, .NET4 Client, WPF | CONFIRMED startup x64 CIL + AnyCPU Avalonia CIL, .NET9 |
| Process discovery | CONFIRMED CIL resolver0x06000567 calls GetProcessesByName/GetProcesses/OpenProcess; actual process UNKNOWN | UNKNOWN behind delegate binding; handler names do not establish process calls |
| Version checks | CONFIRMED resolver reads ProductVersion and builds GameProcess descriptors; exact compatibility algorithm UNKNOWN | UNKNOWN framework implementation; dependencies26.3.2.0 CONFIRMED |
| Load command | CONFIRMED WPF method0x060020a1 -> e7 -> e5 ->567; exact toolbar binding INFERRED | CONFIRMED named LoadGameCommandHandler0x0600075d -> enh/enp runtime delegate boundary |
| Player identity | CONFIRMED Person/Player address-like constructor and Int32 ID getter paths; real ID/native layout UNKNOWN | CONFIRMED BaseObject.MemoryAddress interface reference; decoded player layout UNKNOWN |
| CA / PA | CONFIRMED separate i2 getter/setter wrapper paths to memory helpers; actual game mapping/read result UNKNOWN | UNKNOWN actual extraction/write mapping; search filter member names only CONFIRMED |
| Ordinary attributes | CONFIRMED Passing/Pace i1 access plus conversion helper; scale/actual field UNKNOWN | UNKNOWN implementation and encoding |
| Editing dispatch | CONFIRMED main candidate20ae -> virtual basePage.save; player_information.save -> SaveFields -> UpdateSource; binding gap UNKNOWN | CONFIRMED SaveChangesCommandHandler0x0600075e + callback -> delegate wrappers; underlying commit UNKNOWN |
| Deepest write boundary | CONFIRMED managed call site0x06000448 IL205 -> WriteProcessMemory P/Invoke0x06000988; runtime write UNKNOWN | CONFIRMED runtime delegate Invoke boundary only; memory/file target UNKNOWN |
| Native libraries | CONFIRMED direct kernel32 process API declarations; native implementation not analyzed | CONFIRMED LoadLibrary/GetProcAddress declarations in Avalonia; indirect targets UNKNOWN |
| Offline .fm capability | UNKNOWN; FileStream/Stream alternate does not establish FM save parsing | UNKNOWN from local binary; official current docs describe live Load Game |
| Persistence | UNKNOWN / no FM2013 save/reload test | CONFIRMED vendor instruction to save in FM; local behavior UNKNOWN / not tested |
| ManagerHub support | UNSUPPORTED live/offline player reader and writer until exact-build verification | UNSUPPORTED; comparative UI symbols are not an adapter |

## Sources and commonality

Primary paths and Evidence IDs: [13 load](01-fmrte13-load-pipeline.md), [13 writes](02-fmrte13-write-pipeline.md), [26 load](01-fmrte26-load-pipeline.md), [26 writes](02-fmrte26-write-pipeline.md), [manifest](evidence-manifest.json). Both are managed applications with separate load/edit UI references (**CONFIRMED**); shared native layout, offset values, CA calculation, protection behavior or write invariants are **UNKNOWN**, not established overlap.

[Official FMRTE26 Load Game](https://docs.fmrte.com/getting-started/load-game/) says the currently loaded game is the data source; [first-edit instructions](https://docs.fmrte.com/getting-started/first-edit/) describe saving in FM for persistence. These are vendor statements retrieved2026-10-30, separate from the incomplete binary graph. [FMRTE13's release page](https://www.fmrte.com/files/file/13-fmrte-13/) is a version-specific advertised compatibility reference, not a local runtime result.

**UNSUPPORTED assumption:** transfer FM26 offsets/formats into FM2013. **INFERRED design reuse:** source detection, exact-version gate, session lifetime, normalized provenance and independent write capability are useful ManagerHub boundaries. No proprietary implementation or decompiled source is imported.
