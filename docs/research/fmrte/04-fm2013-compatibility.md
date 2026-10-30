# FM2013 compatibility — no tested build yet

**Target:** FM2013. FMRTE13 is the primary reference. FMRTE26 evidence does not grant compatibility.

## What is independently established

**CONFIRMED:** installed FMRTE13 is 13.3.3.62, .NET4/x86, hash c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae. REA found process discovery/version inspection and CA/PA getter/setter paths reaching memory APIs; [load](01-fmrte13-load-pipeline.md), [write](02-fmrte13-write-pipeline.md).

**CONFIRMED as vendor documentation, not a local test:** [official FMRTE13 release page](https://www.fmrte.com/files/file/13-fmrte-13/) lists 13.3.3.62 for FM13.3.3, including 13.3.3.359652 Retail and 13.3.3.359720 Russian among supported reference builds. It describes Classic-mode editing restrictions. These are FMRTE's advertised capabilities, not ManagerHub-supported builds. Retrieved 2026-10-30; vendor text/version metadata do not authenticate the installed executable.

**CONFIRMED bounded discovery:** no running fm process observed; no FM2013 entry found in standard uninstall keys; normal Steam library metadata points to C:\Program Files (x86)\Steam and D:\SteamLibrary. Neither library contained a Football Manager 2013 directory or identified its manifest. Checked Sports Interactive Documents roots list FM2017/FM26, not FM2013. Workspace has no .fm. This does not prove absence elsewhere. No broad private-directory scan was performed.

## Verification matrix

| Edition / exact executable build | Reference source | Process detection | Player / CA/PA / attributes | Writeback | Persistence |
|---|---|---|---|---|---|
| FM2013 local build UNKNOWN (no executable supplied/found in checked locations) | FMRTE13 13.3.3.62, above hash | UNKNOWN / not runtime tested | UNKNOWN / no trusted same-build records | UNSUPPORTED in ManagerHub | UNKNOWN / not tested |
| FM2013 13.3.3.359652 Retail (vendor-listed candidate) | Official release documentation only | UNKNOWN for ManagerHub | UNKNOWN | UNSUPPORTED | UNKNOWN |
| FM2013 13.3.3.359720 Russian (vendor-listed candidate) | Official release documentation only | UNKNOWN for ManagerHub | UNKNOWN | UNSUPPORTED | UNKNOWN |
| FM2026 local build not investigated | FMRTE26 26.3.2.42, hashes in inventory | UNKNOWN | UNKNOWN | UNSUPPORTED | UNKNOWN |

No row is labeled supported. Known FMRTE version is not known Football Manager build. Metadata token/RVA coordinates in the reports are coordinates inside FMRTE, never offsets to put into a live adapter.

## FM2013 validation dependency

An exact legitimate fm.exe version/hash, authorized disposable career and known-player ground truth are needed first. Verify one ID/name/club; repeat reads; independently compare CA, PA and one transformed normal attribute; verify wrong-build/access-denied/process-exit cases. Only a verified read path permits a separately authorized write experiment. Offline file parsing requires actual FM2013 save bytes and independent record extraction; it is a separate gate.

**UNSUPPORTED:** guessed offsets, FM26 layout transplantation, testing synthetic memory and calling it FM2013 support, or weakening actual-CA provenance. **UNKNOWN:** game-engine CA balancing and reload behavior.
