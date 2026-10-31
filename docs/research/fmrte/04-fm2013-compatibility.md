# FM2013 compatibility — tested research subset only

**Target:** FM2013. FMRTE13 is the primary reference. FMRTE26 evidence does not grant compatibility.

## What is independently established

**CONFIRMED:** installed FMRTE13 is 13.3.3.62, .NET4/x86, hash c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae. REA found process discovery/version inspection and CA/PA getter/setter paths reaching memory APIs; [load](01-fmrte13-load-pipeline.md), [write](02-fmrte13-write-pipeline.md).

**CONFIRMED as vendor documentation, not a local test:** [official FMRTE13 release page](https://www.fmrte.com/files/file/13-fmrte-13/) lists 13.3.3.62 for FM13.3.3, including 13.3.3.359652 Retail and 13.3.3.359720 Russian among supported reference builds. It describes Classic-mode editing restrictions. These are FMRTE's advertised capabilities, not ManagerHub-supported builds. Retrieved 2026-10-30; vendor text/version metadata do not authenticate the installed executable.

**CONFIRMED local executable, follow-up:** the user supplied `C:\Program Files (x86)\Football Manager 2013`. Its `fm.exe` is PE32/x86 with no CLI directory, metadata ProductVersion `13.3.3f359652`, FileVersion `13.3.3`, 40,848,024 bytes, SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871`. See [exact REA evidence and limitations](10-local-fm2013-executable.md). Matching the vendor-listed build number establishes a candidate, not tested compatibility or authenticity.

**CONFIRMED updated discovery:** the earlier Steam/registry checks did not identify this installation. Corrected JSON inventory finds 63 shipped tutorial `.fm` files and one user save in the default games folder. [Three selected files](11-fm2013-save-samples.md) have recognized experimental AFE directories, but no offline player/CA/PA decoding. Later REA/Frida attached to the user-opened game and established a limited live comparison on two records. No broad private-directory scan was performed.

## Verification matrix

| Edition / exact executable build | Reference source | Process detection | Player / CA/PA / attributes | Writeback | Persistence |
|---|---|---|---|---|---|
| FM2013 local metadata `13.3.3f359652`, executable SHA-256 `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` | FMRTE13 13.3.3.62; static profile plus authorized running UI reference | REA/Frida attached across changed process/image/heap addresses | Two classes, 4,058 IDs;49 ordinary / 15 position bytes per row;3,730 qualified club links; provisional snapshots normalized locally. Three-record147-attribute/six-ability reference comparison; production certification open | UNSUPPORTED in ManagerHub | Editing/save-reload UNKNOWN / not tested |
| FM2013 13.3.3.359720 Russian (vendor-listed candidate) | Official release documentation only | UNKNOWN for ManagerHub | UNKNOWN | UNSUPPORTED | UNKNOWN |
| FM2026 local build not investigated | FMRTE26 26.3.2.42, hashes in inventory | UNKNOWN | UNKNOWN | UNSUPPORTED | UNKNOWN |

No row is labeled supported. The local Football Manager build is identified from executable metadata; support still requires runtime/field validation. Metadata token/RVA coordinates in the FMRTE reports locate FMRTE code, never offsets to put into a live adapter.

The [later live experiment](16-fm2013-live-readonly-record.md) supersedes earlier observations in this report that no game process/read was available. It correlates runtime image path/architecture with the selected file hash without authenticating all loaded image bytes. One same-session candidate does not establish general schema/profile compatibility.

## FM2013 validation dependency

The executable identity and private save snapshot are recorded. [Bounded discovery](17-fm2013-bounded-player-discovery.md), [restart recovery](18-fm2013-file-relative-discovery.md), [reference comparison](19-fm2013-reference-comparison.md) and [snapshot normalization](20-fm2013-live-snapshot-contract.md) resolve the earlier lack of live reads, restart evidence and selected reference values. General career/build compatibility and real wrong-build/access-denied/process-exit cases remain open; synthetic failures do not replace them. Writer gates remain unsatisfied. Offline extraction and a controlled same-career save pair remain separate gates.

[The file-relative follow-up](18-fm2013-file-relative-discovery.md) resolves the supplied-anchor/restart gap on one career: all 4,036 record addresses change across a new process while identities/two attributes remain equal. File-derived RTTI and runtime metadata checks select the marker without old player addresses. Local-version profile declarations are decoded statically; actual FMRTE runtime selection, wider hidden-value coverage and write/reload support remain uncertified.

[The authorized running-reference comparison](19-fm2013-reference-comparison.md) subsequently confirms six CA/PA values and 147 ordinary values on three records, including a PlayerStaff. A22-record second native class accounts for the reference count difference. This resolves the complete lack of reference ability values; it does not certify all 4,058 abilities, broader career/build support, production integration or writing. Immutable raw capture flags remain unchanged.

**UNSUPPORTED:** guessed offsets, FM26 layout transplantation, testing synthetic memory and calling it FM2013 support, or weakening actual-CA provenance. **UNKNOWN:** game-engine CA balancing and reload behavior.

## Local snapshot contract — 2026-11-01

[The subsequent biography capture](22-fm2013-biography-cohort.md) extends local snapshot admission with DOB and primary-nation evidence on all4,058 observed records. Three dates and three nation names match prior reference receipts; Editor exposes provisional values and Realism redacts both. Legacy captures remain admissible with unknown biography. This does not add a supported build, authenticate native Nation objects or certify nationality eligibility, whole-career coverage or product integration.

[The new pipeline](20-fm2013-live-snapshot-contract.md) normalizes a complete, address-free real capture into 4,058 immutable records in both modes. It retains exact-build declarations and provisional per-field/per-pass evidence without treating the declared executable hash, career ID or timestamp as authenticated runtime facts. `ready` means payload admission, not roster or adapter certification.

Editor exposes the49 provisional ordinary ratings and 15 familiarity ratings; Realism redacts all exact numeric ratings because manager/scouting knowledge remains undecoded. CA/PA are null in both modes, as are wage/currency/frequency/expiry. The3,730 club links retain `player_team_pointer` or `primary_contract_team`;328 unknown links are not interpreted as no club. Position bytes derive no eligibility. One dual-class reference page matches 15 position values; a separately captured contract page supports a limited date/wage comparison, without certifying unit/currency or contract semantics.

No product compatibility flag is enabled. A reviewed desktop bridge, source authorization, storage/UI projection, other-career references, offline decoding and independently validated writing remain unfinished.
