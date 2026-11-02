# Local FM2013 executable — user-supplied path follow-up

Date: 2026-10-30, Asia/Bangkok. The user supplied `C:\Program Files (x86)\Football Manager 2013` after the initial bounded search. **The executable is now identified; actual player reading/editing remains unverified.** Earlier negative Steam/registry searches were limited to those locations and did not establish absence on this computer.

## Static identity

| Observation | Result | Confidence / source |
|---|---|---|
| Resolved executable | `C:\Program Files (x86)\Football Manager 2013\fm.exe` | CONFIRMED, selected from the user-supplied directory |
| Length | 40,848,024 bytes | CONFIRMED, filesystem and REA artifact |
| SHA-256 | `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` | CONFIRMED, independent PowerShell and REA agreement |
| Product name / original filename | Football Manager 2013 / FM2013 | CONFIRMED embedded metadata strings, read by Windows FileVersionInfo |
| FileVersion / ProductVersion | `13.3.3` / `13.3.3f359652` | CONFIRMED embedded metadata values; not a runtime observation or proof of vendor authenticity |
| Format | PE32, I386/x86, 14 sections, no CLI data directory | CONFIRMED, REA managed-artifact inspection and independent PEReader |
| .NET members / native code analysis | No managed metadata; native implementation not analyzed | CONFIRMED absence of CLI directory; native provider UNAVAILABLE |

The numeric build `359652` matches the Retail build listed in the previously retrieved [official FMRTE13 release documentation](https://www.fmrte.com/files/file/13-fmrte-13/). **INFERRED candidate compatibility only:** advertised FMRTE compatibility plus a matching metadata string does not authenticate these local bytes or prove successful attachment, field layouts or ManagerHub support. No tested build is enabled.

## REA evidence and exact locations

- Artifact identity/classification: canonical Evidence `ev_9d2e991593b8ab1e7851b2e08a1c309b7f33f4bea06f716cff011c3d170905d4`; summary receipt `ev_efdc69ee4f9f5ae4abf75f52d935bdf5d5b7c1a59ddf135208d7d47a4e7bc748`.
- PE resource inventory: `ev_b4cec8b739d0f53c2e747d9a0c1da19e50f16b6e5150849405ce34118dd6977d`, complete within the admitted resource tree: 96 entries examined, 44 resources.
- RT_VERSION resource: index42, type16/name1/language0, file offset39124032, length1448, payload SHA-256 `20edb78a58734a0bce0af979180229ef46e2e160c0f8404c41db61f3a73a6b8f`. REA inventories this payload as opaque; FileVersionInfo supplies the decoded version values above.
- Supplementary read-only literal check on that exact payload confirmed four UTF-16 occurrences of `13.3.3f359652`; first occurrence at file offset39124340 (26 bytes, excluding terminator). A literal occurrence alone is not a semantic field mapping.
- [Machine-readable executable inventory](inventory-fm2013.json) and [shared manifest](evidence-manifest.json) retain source/path/hash/locators and the separate follow-up bundle digest. Raw evidence is outside the tracked repository.

MCP REA6.7.0 remained responsive. A fresh binary_session reports Ghidra unconfigured, Hopper unsupported on Windows, IDA/Kuna unconfigured, no open native target and no selected native provider. Native decompilation cannot proceed through those unavailable providers. No setup/configuration was changed, and no redundant native-open attempt or target execution was performed.

## Save and runtime discovery

**CONFIRMED updated discovery:** after the user's message that a save now exists, `Untitled Game.fm` was identified in the default FM2013 games folder. Windows MyDocuments resolves to `<LOCAL_USER_PROFILE>\OneDrive\Documents`. Explicit JSON inventory also establishes 63 shipped tutorial `.fm` files inside the installation; the earlier negative installation claim resulted from a mixed-object display error and is corrected in the [sample report](11-fm2013-save-samples.md). No `fm` or `FMRTE` process was observed in the process-name check; that is a point-in-time observation only.

The installation's `special folders.xml` describes relative application/data resource folders; it did not identify a user save path. It is not evidence of a save format. License/configuration credentials were not read, no executable was launched, and no file/process/save was modified.

The user's test save is now selected and inspected through an unchanged private copy; two tutorials were also probed. **UNKNOWN:** same-player ground truth, layout selection for these executable bytes, read consistency, CA/PA extraction, edits, persistence and recovery. Offline bytes are available, but only their experimental container directory is recognized; live validation still requires a controlled running-game test.

Next: resolve member encoding or the native-provider/applicable static-layout boundary, obtain known-player observations and validate read-only entity identity before considering any write experiment. The architecture and all writer safeguards remain unchanged.
