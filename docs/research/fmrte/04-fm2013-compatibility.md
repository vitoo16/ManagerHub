# FM2013 compatibility — tested research subset only

**Target:** FM2013. FMRTE13 is the primary reference. FMRTE26 evidence does not grant compatibility.

## What is independently established

**CONFIRMED:** installed FMRTE13 is 13.3.3.62, .NET4/x86, hash c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae. REA found process discovery/version inspection and CA/PA getter/setter paths reaching memory APIs; [load](01-fmrte13-load-pipeline.md), [write](02-fmrte13-write-pipeline.md).

**CONFIRMED as vendor documentation, not a local test:** [official FMRTE13 release page](https://www.fmrte.com/files/file/13-fmrte-13/) lists 13.3.3.62 for FM13.3.3, including 13.3.3.359652 Retail and 13.3.3.359720 Russian among supported reference builds. It describes Classic-mode editing restrictions. These are FMRTE's advertised capabilities, not ManagerHub-supported builds. Retrieved 2026-10-30; vendor text/version metadata do not authenticate the installed executable.

**CONFIRMED local executable, follow-up:** the user supplied `C:\Program Files (x86)\Football Manager 2013`. Its `fm.exe` is PE32/x86 with no CLI directory, metadata ProductVersion `13.3.3f359652`, FileVersion `13.3.3`, 40,848,024 bytes, SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871`. See [exact REA evidence and limitations](10-local-fm2013-executable.md). Matching the vendor-listed build number establishes a candidate, not tested compatibility or authenticity.

**CONFIRMED updated discovery:** the earlier Steam/registry checks did not identify this installation. Corrected JSON inventory finds63 shipped tutorial `.fm` files and one user save in the default games folder. [Three selected files](11-fm2013-save-samples.md) have recognized experimental AFE directories, but no offline player/CA/PA decoding. Later REA/Frida attached to the user-opened game and established a limited live comparison on two records. No broad private-directory scan was performed.

## Verification matrix

| Edition / exact executable build | Reference source | Process detection | Player / CA/PA / attributes | Writeback | Persistence |
|---|---|---|---|---|---|
| FM2013 local metadata `13.3.3f359652`, executable SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` | FMRTE13 13.3.3.62; matching version list/mode decoded statically | REA/Frida attached before/after user-driven restart | Two user-text ID/Passing/Pace matches; file-relative discovery recovers4,036 relocated records; CA/PA and database completeness unverified | UNSUPPORTED in ManagerHub | Editing/save-reload UNKNOWN / not tested |
| FM2013 13.3.3.359720 Russian (vendor-listed candidate) | Official release documentation only | UNKNOWN for ManagerHub | UNKNOWN | UNSUPPORTED | UNKNOWN |
| FM2026 local build not investigated | FMRTE26 26.3.2.42, hashes in inventory | UNKNOWN | UNKNOWN | UNSUPPORTED | UNKNOWN |

No row is labeled supported. The local Football Manager build is identified from executable metadata; support still requires runtime/field validation. Metadata token/RVA coordinates in the FMRTE reports locate FMRTE code, never offsets to put into a live adapter.

The [later live experiment](16-fm2013-live-readonly-record.md) supersedes earlier observations in this report that no game process/read was available. It correlates runtime image path/architecture with the selected file hash without authenticating all loaded image bytes. One same-session candidate does not establish general schema/profile compatibility.

## FM2013 validation dependency

The executable metadata/hash and a private test-save snapshot are recorded. [Bounded live discovery](17-fm2013-bounded-player-discovery.md) establishes a user-confirmed ID/Passing/Pace subset on two named records and repeated candidate enumeration. Hidden CA/PA, club, exact profile validation, restart behavior and real wrong-build/access-denied/process-exit cases remain open. Synthetic failure tests do not substitute for these runtime checks. Writer gates remain unsatisfied. Offline record extraction and a controlled same-career pair remain separate gates.

[The file-relative follow-up](18-fm2013-file-relative-discovery.md) resolves the supplied-anchor/restart gap on one tested career: all4,036 record addresses change across a new process, while identities/two attributes remain equal. File-derived RTTI and runtime metadata checks select the marker without old player addresses. Local-version profile declarations are now decoded statically; actual FMRTE runtime selection, hidden values, wider coverage and write/reload support remain uncertified.

**UNSUPPORTED:** guessed offsets, FM26 layout transplantation, testing synthetic memory and calling it FM2013 support, or weakening actual-CA provenance. **UNKNOWN:** game-engine CA balancing and reload behavior.
