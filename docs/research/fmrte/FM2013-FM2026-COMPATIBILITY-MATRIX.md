# FM2013 vs FM2026 Compatibility Matrix

## 1. Classification Taxonomy

Every subsystem compared between **Football Manager 2013 (`13.3.3f359652`) / FMRTE 13 (`13.3.3.62`)** and **Football Manager 26 / FMRTE 26 (`26.3.2-build41`)** is assigned one of five canonical compatibility labels:

- `Shared and verified` — Identical semantic domain and verified on both editions.
- `Version-specific` — Exists in only one edition or uses an edition-exclusive runtime/container.
- `Compatible but unverified` — Structurally mappable; no reproduced fit or exact-build native parity.
- `Changed between versions` — Renamed, split, retired, or structurally redesigned between FM2013 and FM2026.
- `Unknown` — Blocked by packed/encrypted binary sections (`uAutp`) or uncollected runtime evidence.

---

## 2. Subsystem Compatibility Matrix

| Dimension | FM2013 (`13.3.3f359652`) / FMRTE 13 (`13.3.3.62`) | FM2026 / FMRTE 26 (`26.3.2-build41`) | Classification | ManagerHub Adapter Rule |
| --- | --- | --- | --- | --- |
| **Save / Archive Container** | `afe.` v4 (`04 00`), zlib (`0x78DA`), `game_db.dat` + AES-128-CTR + 64-byte HMAC-SHA512 | `afe.` / `fmf.` v8 (`08 00`), Zstandard (`0xFD2FB528`) | `Changed between versions` | Dedicated `fm2013-offline` decoder; never feed FM26 `.fm` to FM2013 parser |
| **Game Engine Runtime** | Native Win32 x86 C++ (`fm.exe`, `40.8 MB`) | Unity IL2CPP x64 (`GameAssembly.dll` + `global-metadata.dat` v31) | `Changed between versions` | Version-isolated binary/save adapters |
| **Gender / DB Scope** | Men's football database only | Men's + Women's football (`Config.SearchMensFootball`, `SearchWomensFootball` `0x0a001147`..`1148`) | `Changed between versions` | Keep gender filter optional per edition |
| **`CA` / `PA` Scale** | `1..200` (`Int16` in `T25 PERSON` `+6`/`+8`) | `1..200` (`Int16` `PersonalInformationViewModel.CA`/`PA`, `pers,PCAB`/`PPAB`) | `Shared and verified` | Unified `1..200` integer validation |
| **`RCA` & `MatchCaWithRCA`** | Absent in FMRTE 13 (`Match CA to PA` only) | Present in FMRTE 26 (`RCA` `Int32`, `MatchCaWithRCA` `bool`, `Ratings/rca.json`) & SI `editor.fmf` (`pers,ERCL`) | `Compatible but unverified` | Expose as **Advisory RCA (`FM2013-research-v2`)**; FM2026 reference-only; keep `Auto Match CA` fail-closed (`false`) |
| **Technical Attributes (14)** | 14 attributes (`1..100` raw → `1..20` UI) | Same 14 attributes (`Corners`..`Technique`) | `Shared and verified` | Direct 1:1 `AttributeKey` mapping |
| **Mental Attributes (14)** | `Creativity`, `Influence`, + 12 others | Renamed `Creativity → Vision`, `Influence → Leadership` (+ same 12 others) | `Changed between versions` | Normalized onto canonical `vision` and `leadership` with FM2013 UI/import aliases |
| **Physical Attributes (8)** | `Jumping` + 7 others (`LeftFoot`/`RightFoot` `1..100` → `1..20`) | Renamed `Jumping → JumpingReach` (`Jumping` key still used inside `rca.json`!) | `Changed between versions` | Normalized onto `jumpingReach` with `Jumping` alias |
| **Goalkeeping Attributes (11)** | `Aerial Ability`, `Tendency to Punch` (byte `31` shared `punching`/`tendencyToPunch`), + 9 others | `AerialReach` (`AerialAbility` in `rca.json`), `TendencyToPunch`, + 9 others | `Changed between versions` | Normalized onto `aerialReach` and `punching`/`tendencyToPunch` |
| **Hidden Playing Traits (5)** | `Dirtiness`, `Consistency`, `ImportantMatches`, `InjuryProneness`, `Versatility` (`T27` bytes `56,59,62,63,64`) | Identical 5 traits (`Weight: 0.0` in `rca.json`) | `Shared and verified` | Direct 1:1 mapping; redacted in Realism mode |
| **Personality Traits (8)** | `Adaptability`, `Ambition`, `Loyalty`, `Pressure`, `Professionalism`, `Sportsmanship`, `Temperament`, `Controversy` (`T26` 8 bytes `1..20`) | Identical 8 traits (`Weight: 0.0` in `rca.json`) | `Shared and verified` | Direct 1:1 mapping; redacted in Realism mode |
| **Playable Pitch Positions** | **15 positions** (`GK`, `SW`, `DL`, `DC`, `DR`, `WBL`, `WBR`, `DM`, `ML`, `MC`, `MR`, `AML`, `AMC`, `AMR`, `ST`) | **14 positions** (`SW` Sweeper removed; confirmed in `config.json` & `GeneralViewModel` `0x0a0006ea..0705`) | `Changed between versions` | `FM2013` profile maps `SW → DefenderCentral` with explicit fallback flag (`isFallbackMapping: true`) |
| **Tactical Roles & Duties** | Single-phase Role + Duty (`Defend`/`Support`/`Attack`/`Stopper`/`Cover`/`Automatic`, 28 roles in `FM2013_ROLES`) | Dual-phase **`InPossession` + `OutOfPossession`** roles in `Ratings/rolesAndDuties.json` (e.g., `BallPlayingGoalkeeper`, `LineHoldingKeeper`, `ChannelMidfielder`, `SplittingOutletWinger`) | `Changed between versions` | Strictly isolate `FM2013` role registry from FM26 dual-phase roles; never mix role catalogs |
| **Positional Suitability %** | `Ratings/FMRTE.xml` (`-20..100` weights + `AgePeak` + `AbilityDependent`) | `Ratings/positions.json` (identical mathematical structure, `SettingsVersion: "24.4.0.35"`) | `Shared and verified` | Keep separate from `rca.json` CA-cost weights |
| **Internal `Fmrte.Framework` Math** | Unencrypted CIL in `FMRTE 13/FMRTE.exe` (`fmrte13-field-math.mjs`, `6,291,456` verified round-trips) | Packed inside `FMRTE.dll` private resource `uAutp` (`0x28000002`) | `Unknown` | Never unpack protected resources; maintain clean-room verified TypeScript implementation |

---

## 3. Attribute Rename & Internal Offset Crosswalk

| Canonical `AttributeKey` | FM2013 UI Label | FM2013 `T27` Byte | FMRTE 26 `rca.json` Key | FM2026 UI Label |
| --- | --- | ---: | --- | --- |
| `vision` | Creativity | `pd[10]` | `Vision` | Vision |
| `leadership` | Influence | `pd[57]` | `Leadership` | Leadership |
| `jumpingReach` | Jumping | `pd[55]` | `Jumping` | Jumping Reach |
| `aerialReach` | Aerial Ability | `pd[12]` | `AerialAbility` | Aerial Reach |
| `punching` / `tendencyToPunch` | Tendency to Punch | `pd[31]` | `TendencyToPunch` | Tendency to Punch |
| `freeKickTaking` | Free Kick Taking | `pd[33]` | `Freekicks` | Free Kick Taking |
| `longThrows` | Long Throws | `pd[28]` | `Longthrows` | Long Throws |
| `workRate` | Work Rate | `pd[27]` | `Workrate` | Work Rate |
