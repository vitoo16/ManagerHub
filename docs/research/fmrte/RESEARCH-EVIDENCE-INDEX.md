# Research Evidence Index (FMRTE 26, FMRTE 13, FM2013 & FM2026)

## 1. Local Binary & Asset Inventory (Sanitized Paths)

All proprietary binaries, `.fm` save files, and exported raw REA evidence bundles remain strictly outside Git. Historical artifact identities below are reported identifiers, not independently rechecked in this review. The FM2013 executable digest is not the corpus digest. The rolesAndDuties.json digest was also attributed to FM26 editor.fmf; both artifact-specific associations require rechecking before verification. See the validation report.

| Artifact | Sanitized Path | Version / Architecture | Size (Bytes) | SHA-256 |
| --- | --- | --- | ---: | --- |
| FMRTE 26 Outer Launcher | `<FMRTE26_INSTALL_ROOT>/FMRTE.exe` | `26.3.2-build41` (`x86` PE) | `628,704` | `a0e41aabf3466b6609ad45407dc756a9355eb5acdd37175a223694bf28be1097` |
| FMRTE 26 .NET 9 Apphost | `<FMRTE26_INSTALL_ROOT>/current/FMRTE.exe` | `26.3.2.42` (`x64` PE) | `383,968` | `5513fe1be1179195a90b21c2087175d49e469d68cdf7a290a369105c3ab7a3fd` |
| FMRTE 26 Bootstrapper DLL | `<FMRTE26_INSTALL_ROOT>/current/FMRTE.dll` | `26.3.2.42` (`x64` CIL, MVID `c1d1bd13-5fbc-417d-40ad-2d18cd8973c8`) | `12,328,416` | `29122b04bde4d77b5860423544d93f6bbef5b2e9c65b9a5749bd388c2be4b89e` |
| FMRTE 26 Avalonia UI DLL | `<FMRTE26_INSTALL_ROOT>/current/FmrteAvalonia.dll` | `26.3.2.42` (`AnyCPU` CIL, MVID `ae81bf4d-f887-2214-dad5-9a575848146b`) | `19,534,816` | `c763b9614e98f13a16f1b49b4a14ad191fc585627919fbac165970938d425ecf` |
| FMRTE 26 RCA Weights | `<FMRTE26_INSTALL_ROOT>/Ratings/rca.json` | `SettingsVersion: "24.4.0.35"` | `41,537` | `a378c8e0be5e268dc7ed2a2b932ed9d478f135976c0bf45788f77294b63d4ffa` |
| FMRTE 26 Positional % Weights | `<FMRTE26_INSTALL_ROOT>/Ratings/positions.json` | `SettingsVersion: "24.4.0.35"` | `54,958` | `c1ee11733e8d76715a3d157f76e1742b8f4b6f2e22a11b9b54ada9891c7de675` |
| FMRTE 26 Roles & Duties | `<FMRTE26_INSTALL_ROOT>/Ratings/rolesAndDuties.json` | FM26 Dual-Phase Schema | `127,578` | `3652da78662d8f0da91e67a6d396f1b47ef6c76c306d20ec7cc2538c7f3fffbc` |
| FMRTE 26 Wonderkid Config | `<FMRTE26_INSTALL_ROOT>/Ratings/wonderkidGenerator.json` | JSON Probability Config | `1,804` | `81a948d7513a8d64159b7555b8eef06a8daa1e0a5a5df171111ee84ebe03d263` |
| FMRTE 26 App Config | `<FMRTE26_INSTALL_ROOT>/config.json` | JSON App/Columns Config | `37,058` | `eac5efdd4bddf9b164f721f1f1a5b9964206d0f3e6c1a75c87d7fe8e7937cf17` |
| FMRTE 13 Main Executable | `<FMRTE13_INSTALL_ROOT>/FMRTE.exe` | `13.3.3.62` (`x86` CIL, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`) | `3,233,792` | `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae` |
| Football Manager 2013 Executable | `<FM2013_INSTALL_ROOT>/fm.exe` | `13.3.3f359652` (`x86` Native PE) | `40,848,024` | `df45cde67cb7361867e7afc9808dacab8bf53bd972f48145f6f881ff55d08871` |
| Exported REA Session Bundle | `<LOCAL_EVIDENCE_DIR>/fmrte26-rca-rea-evidence.json` | REA `6.7.0` (`32` canonical records, `0` unknowns) | `30,788,259` | `44b5d49cd187becdae37026a79e18d001c9f7e7ab833c980cf4e21248de713bc` |

---

## 2. Canonical REA Evidence Records (`fmrte26-rca-rea-evidence.json`)

| REA Evidence ID | Operation & Target | Key Verified Observation | Confidence |
| --- | --- | --- | --- |
| `ev_4354c5ba30f94943de7cbe1fca1540aa417532a1cc435c3582dec562bf6dcd54` | `inspect_managed_artifact` on `FMRTE 26/current/FMRTE.dll` | Identifies .NET 9 assembly, MVID `c1d1bd13-...`, and embedded resource `uAutp` (`0x28000002`, `11,854,499` B, SHA-256 `b70449567f0baf5fb54eb4149ab41c8c5a6acec70cceae71af2e9d69148d0223`) | `OBSERVED` |
| `ev_a69502d7ebd23619ce3fcbf07621e7e0c915e45efda41eadd03e8e87ef16f105` | `inspect_managed_members` on `FMRTE 26/current/FMRTE.dll` | Confirms anti-debug/crypto loader references (`IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, `CreateDecryptor`); establishes non-decryption boundary | `OBSERVED` |
| `ev_2c9c90ac6f878f5b7bce09dfff1cfc150ab80fc8ae5c5cc81738ce9841306df4` | `inspect_managed_artifact` on `FmrteAvalonia.dll` | Confirms Avalonia `11.3.10.0` UI assembly, AssemblyRefs to `Fmrte.Framework`, `Fmrte.Mvvm`, `Fmrte.Framework.IO`, `Fmrte.Licensing`, and 7 embedded resources | `OBSERVED` |
| `ev_bdf1ea070b38a8c685160958522acf7fce6383af642029c8d8373c25e122580e` | `inspect_managed_members` on `RcaSettingsView` & `AbilityView` | Recovers all `5,280` assembly-wide `MemberRef` rows, including `PersonalInformationViewModel::CA/PA/RCA/AbilityDifference/MatchCaWithRCA` (`0x0a000900..0908`) | `OBSERVED` |
| `ev_a61d53d35232eb3beaf07b84804b1f99848c90deb30f32c4ab1acd5830f7eeb3` | `inspect_managed_members` + `inspect_analysis_view` (`ev_007a50bd...`, `ev_008c00a0...`) on `AbilityView` | Decodes `AbilityView.!XamlIlPopulate` (`0x06000315`, `RVA=447100`), proving read-only `TextBox` (`0x0a000dfb`) for `RCA` and editable bindings for `CA`/`PA`/`MatchCaWithRCA` | `OBSERVED` |
| `ev_e217a88c9dcba22182f7d1a06968465d95082861bbae2e9ec165970938d425ecf` / `ev_8409755d27fb778d5572f5f9a5a5fd5d5bc789052ea6c17b498a14f306787261` | `inspect_managed_members` on `XamlClosure_140`, `AttributeTextBox`, `HighlightableAttribute`, `PlayerPositions` | Confirms `RcaSettingsView` weight editor closure (`XamlClosure_140.Build_2` `0x06000205`) and `AttributeTextBox` range/colorize bindings | `OBSERVED` |
| `ev_ff210acd23f7ebd712248eb739ce0861cf22f15adf4a7d3416b83c0945d6253d` & `ev_c8421357f4ab30ad6d10deef76764b37f98e186374efe5eb4a85ccaeb169b607` | `inspect_managed_artifact` & `inspect_managed_members` on `FMRTE 13/FMRTE.exe` | Proves `FMRTE 13` (`13.3.3.62`) has `rating_settings`, `player_information`, and `scout_positionalRating` (`FMRTE.xml`), with zero RCA engine | `OBSERVED` |

---

## 3. Reproduction Procedure

1. Verify SHA-256 digests of installed `<FMRTE26_INSTALL_ROOT>/Ratings/rca.json`, `positions.json`, `current/FmrteAvalonia.dll`, `<FMRTE13_INSTALL_ROOT>/FMRTE.exe`, and `<FM2013_INSTALL_ROOT>/fm.exe`.
2. Run REA `inspect_managed_artifact` and `inspect_managed_members` on `FmrteAvalonia.dll` with `type_names: ["FmrteAvalonia.Views.Persons.AbilityView", "FmrteAvalonia.Views.Settings.Ratings.RcaSettingsView"]`.
3. Run ManagerHub's deterministic verification suite:
   ```bash
   npx vitest run packages/domain/src/rca-engine.test.ts packages/domain/src/player-development.test.ts
   ```
4. Never unpack `uAutp` (`0x28000002`) or `bVew` (`0x28000007`), and never commit `.fm` files, game/editor executables, or raw REA bundles to Git.
