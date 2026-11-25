# FMRTE 13 (`13.3.3.62`) vs ManagerHub Complete Feature Parity Matrix

**Date:** 2026-11-25  
**Scope:** Football Manager 2013 PC (`13.3.3f359652`, verified `afe` v4 container + `game_db.dat` `0x757`–`0x774`) compared against FMRTE 13 (`13.3.3.62` domain inventory: 64 top-level feature sections, XML presets, rating profiles, and live-memory utilities).  
**Mandate:** Zero fake support. Every FMRTE 13 capability is classified honestly into one of four categories:

- **`offline_read_write`** — Verified offline decoding AND surgical lossless `Save As .fm` writing (when authorized via runtime `fm.exe` key derivation in Editor mode; original `.fm` files are never modified).
- **`offline_read_only`** — Verified offline decoding and interactive browsing/analysis across ManagerHub workspaces, without binary write-back.
- **`live_only_optional_adapter`** — Operates on transient in-memory runtime structures of a running `fm.exe` process rather than static `game_db.dat` scalar offsets; intentionally excluded from offline `.fm` binary mutation.
- **`not_in_save`** — Data resides in external static game installation files (such as `lang_db.dat`) or user-authored external presets rather than inside `.fm` save archives.

---

## 1. Global Application, Session & Safety Parity

| FMRTE 13 Capability | Parity Status | ManagerHub Implementation | QA / Test Gate |
| --- | --- | --- | --- |
| Load game database once across all views | `offline_read_write` | Unified `SaveSession` in `apps/web/src/App.tsx` + persistent `ActiveSaveToolbar.tsx`; non-remounting workspace shell (`visitedViews`) | `S01`, `S02` |
| Realism vs Editor privacy & write gating | `offline_read_write` | `saveMode: 'realism' \| 'editor'` in `SaveSession`; Realism redacts CA/PA/hidden/personality and blocks `commitEditorTransaction` & `writePatchedFm2013Save` | `S04`, `writer.test.ts` |
| Undo / Redo / Discard draft changes | `offline_read_write` | Immutable transaction stack (`editor-transactions.ts`: `commitEditorTransaction`, `undoEditorTransaction`, `redoEditorTransaction`, `discardEditorTransactions`) | `S06`, `writer.test.ts` |
| Semantic diff preview before write | `offline_read_write` | `summarizeDraftChanges` + `Save As .fm` review table in `SaveEntityEditorModal.tsx` | `S06`, `S08` |
| Certified lossless `Save As .fm` export | `offline_read_write` | `writePatchedFm2013Save` (`writer.ts`): validates incoming `HMAC-SHA512`, patches fixed-width offsets in `game_db.dat`, recomputes `HMAC-SHA512`, re-encrypts AES-128-CTR envelope, preserves all other archive members (`rgman/`) byte-for-byte, and independently re-decodes output | `S06`, `S07`, `S08` |
| Static base-name resolution (`lang_db.dat`) | `not_in_save` (`offline_read_only` when attached) | Optional user-supplied `lang_db.dat` parser (`lang-db.ts`, 15 tables, `remaining === 0`) attached via `ActiveSaveToolbar` (`nameProvenance: 'lang_db'`) | `Gate B`, `writer.test.ts` |
| Global search & multi-entity filtering | `offline_read_only` | `SaveDatabaseExplorer.tsx`, `PlayerWorkspace.tsx` (virtualized 4,000+ roster search, position/club filters) | `S01`, `S03` |
| Mass Edit (Players, Staff, Clubs) | `offline_read_write` | `buildMassEditPlayersOverlay`, `buildMassEditStaffOverlay`, `buildMassEditClubsOverlay` + `MassEditModal` in `SaveEntityEditorModal.tsx` | `S06`, `writer.test.ts` |
| Custom XML / Quick Presets (`Heal`, `Inspire`, `Wonderkid`, `Peak`, `Sugardaddy`, etc.) | `offline_read_write` | `buildPlayerPresetPatch` (6 player presets) + `buildClubSquadPresetOverlay` (4 club/squad presets) | `S06`, `writer.test.ts` |
| Shortlists & CSV import/export | `offline_read_only` | Mode-independent `scout-shortlist.ts` (`decoded_save` canonical SHA-256) + `squad-plan-report.ts` | `S04`, `writer.test.ts` |
| Positional / Role Suitability Ratings (`Ratings\FMRTE.xml` equivalent) | `offline_read_only` | `MH-06` / `MH-09` / `MH-11` role-fit engine, Player Intelligence radar/bars, Squad Planner 2.0, Tactical Lab | `S03`, `S04` |

---

## 2. Player Domain Parity (`PERSON` Tags 2 & 3)

| FMRTE 13 Section / Field Group | Parity Status | ManagerHub Coverage & Provenance | QA / Test Gate |
| --- | --- | --- | --- |
| Identity (`UID`, `RowID`, First/Last/Common Name, Nation, Club, Loan Parent, Team) | `offline_read_only` | Decoded from `PERSON`, `FIRST_NAME`, `SECOND_NAME`, `COMMON_NAME`, `TEAM`, `CLUB`, `NATION` (`game-db-parser.ts`) | `S01`, `writer.test.ts` |
| Date of Birth & Derived Calendar Age | `offline_read_write` | `birthDate` (`SI_DATE` bijection `isoToSiDate` / `siDateToIso`) + exact age vs save game date | `writer.test.ts` |
| Ability & Reputations (`CA`, `PA`, Home / Current / World Reputation) | `offline_read_write` | Editor-gated read + fixed-offset surgical patch (`CA`/`PA` `1..200`, reputations `0..10000`) | `S06`, `S07`, `S08` |
| Morale, Market Value, International Caps & Goals, Height, Weight | `offline_read_write` | `morale` (`1..20`), `marketValueGbp`, `intlCaps`, `intlGoals` read/write; `heightCm`/`weightKg` read-only | `S06`, `writer.test.ts` |
| Contract (`Weekly Wage`, `Expiry Date`, `Squad Number`, `Join Date`, `Loan`, `Job`) | `offline_read_write` | `weeklyWageGbp`, `expiryDate` (`SI_DATE`), and `squadNumber` (`0..99`) editable; join/loan/job decoded read-only | `S06`, `writer.test.ts` |
| Preferred Foot (`Left Foot`, `Right Foot` `1..20`) | `offline_read_write` | Decoded (`1..100` raw scaled to `1..20`) and editable in `SaveEntityEditorModal.tsx` | `S06`, `writer.test.ts` |
| Positional Familiarity (15 positions: `GK`..`ST`) | `offline_read_write` | All 15 positions decoded (`1..20`) and editable (`GK`, `SW`, `DL`, `DC`, `DR`, `WBL`, `DM`, `ML`, `MC`, `MR`, `WBR`, `AML`, `AMC`, `AMR`, `ST`) | `S06`, `writer.test.ts` |
| Technical, Mental, Physical & Goalkeeping Attributes (47 visible `1..20` fields) | `offline_read_write` | All 47 visible attributes (`corners`..`throwing`) cross-validated 100.000% (`198,842/198,842`) and editable individually, via presets, or via Mass Edit | `S06`, `S07`, `writer.test.ts` |
| Hidden Playing Attributes (`Consistency`, `Dirtiness`, `Important Matches`, `Injury Proneness`, `Versatility`) | `offline_read_write` | Editor-only read + surgical write (`1..20`, redacted in Realism mode) | `S04`, `S06`, `writer.test.ts` |
| Personality Attributes (`Adaptability`, `Ambition`, `Controversy`, `Loyalty`, `Pressure`, `Professionalism`, `Sportsmanship`, `Temperament`) | `offline_read_write` | Editor-only read + surgical write (`1..20`, redacted in Realism mode) | `S04`, `S06`, `writer.test.ts` |
| Preferred Moves (PPM bitmask), Relations, Happiness details, Contract Clauses & Bonuses | `offline_read_only` / `live_only_optional_adapter` | Not mutated in v1 surgical writer to avoid variable-length array re-indexing inside `PERSON` / `CONTRACT`; original bytes preserved untouched | `S07`, `S09` |
| Match Condition / Fitness / Jadedness (`10000`), Live Bans & Injuries Removal (`Heal Team` match fitness) | `live_only_optional_adapter` | Runtime match fitness and active injury/ban linked-list nodes are dynamic structures; offline `Heal & Peak Morale` preset safely restores persisted `morale = 20` and `injuryProneness = 1` without corrupting injury-table pointers | `S09` |
| `Freeze` Player Attributes & `Swap` / `Clone` Player | `live_only_optional_adapter` | FMRTE `Freezer` polls running `fm.exe` memory on a timer; `Clone` allocates heap objects in RAM. Offline saves are static snapshots without a background game loop | `S09` |

---

## 3. Staff & Human Manager Domain Parity (`PERSON` Tags 1, 3, 9)

| FMRTE 13 Section / Field Group | Parity Status | ManagerHub Coverage & Provenance | QA / Test Gate |
| --- | --- | --- | --- |
| Identity, Human Manager Detection (`humans.dat`), Role, Nation, Club | `offline_read_only` | Decoded across all non-playing staff, player-staff (`tag 3`), and human managers | `S01`, `writer.test.ts` |
| Ability & Reputations (`Staff CA`, `Staff PA`, Home / Current / World Reputation) | `offline_read_write` | Editor-gated read + surgical write (`1..200` CA/PA, `0..10000` reputations) | `S06`, `writer.test.ts` |
| Contract (`Weekly Wage`, `Expiry Date`) | `offline_read_write` | Editable fixed-offset contract fields (`weeklyWageGbp`, `expiryDate`) | `writer.test.ts` |
| Coaching, Scouting, Mental & Medical Attributes (18 `NON_PLAYING_DATA` `0x29` fields) | `offline_read_write` | Verified against `fm.exe` `0x1247480`: `attacking`, `defending`, `fitness`, `goalkeepers`, `mental`, `player`, `tactical`, `technical`, `workingWithYoungsters`, `judgingPlayerAbility`, `judgingPlayerPotential`, `tacticalKnowledge`, `adaptability`, `determination`, `levelOfDiscipline`, `manManagement`, `motivating`, `physiotherapy` (`1..20`, redacted in Realism mode) | `S06`, `S07`, `writer.test.ts` |
| Tactical Preferences (`NonPlayingTacticalAttributes`) | `live_only_optional_adapter` | Preserved byte-for-byte in `NON_PLAYING_DATA` without mutation | `S07` |

---

## 4. Club, Finance, Stadium, Nation & Competition Parity

| FMRTE 13 Section / Field Group | Parity Status | ManagerHub Coverage & Provenance | QA / Test Gate |
| --- | --- | --- | --- |
| Club Overview (`UID`, Full/Short/6-letter Names, Nation, Year Founded, Teams) | `offline_read_only` | Decoded from `CLUB` + `TEAM` tables; global `Managed club` selector decoupled from Player Lab local filter | `S02`, `S03` |
| Club Finances (`Balance`, `Transfer Budget`, `Season Transfer Budget`, `Weekly Wage Budget`, `Weekly Wage Bill`) | `offline_read_write` | `balanceGbp`, `transferBudgetGbp`, `seasonTransferBudgetGbp`, `weeklyWageBudgetGbp` editable individually, via `Sugardaddy` preset, or via Mass Edit | `S06`, `S07`, `S08` |
| Club Facilities (`Training`, `Youth Facilities`, `Youth Coaching`, `Youth Recruitment`) | `offline_read_write` | Editable `1..20` facility ratings + `State-of-the-Art Facilities` preset | `S06`, `writer.test.ts` |
| Club Squad Presets (`Max Squad Morale`, `Peak Squad Attributes`) | `offline_read_write` | Batch transaction helper (`buildClubSquadPresetOverlay`) targeting all players in a selected club | `S06`, `writer.test.ts` |
| Club Kits, Colours, Affiliations, Sponsors, Debts & Transfer Proposals | `live_only_optional_adapter` | Variable-length sub-arrays inside `CLUB` / `FINANCE_FULL`; preserved untouched byte-for-byte during surgical `Save As .fm` writes | `S07`, `S09` |
| Stadiums (`Capacity`, `Seating Capacity`, `Expansion Capacity`, Owner, Coordinates, Name) | `offline_read_write` | `capacity`, `seatingCapacity`, and `expansionCapacity` editable via `SaveEntityEditorModal.tsx`; unedited base names resolved via `lang_db.dat` when attached | `S06`, `S07`, `writer.test.ts` |
| Nations (`Name`, Continent, Club/Player/Staff counts) | `offline_read_only` | Decoded in `SaveDatabaseExplorer.tsx` (`Nations` tab) + `lang_db.dat` static name resolution | `S01`, `writer.test.ts` |
| Competitions (`Name`, Nation, Reputation, Active Teams, Sample Clubs) | `offline_read_only` | Decoded in `SaveDatabaseExplorer.tsx` (`Competitions` tab) + `lang_db.dat` static name resolution | `S01`, `writer.test.ts` |
| Live Match Preparation, Fixture Rescheduling, Registration & MiniFMRTE Overlay | `live_only_optional_adapter` | Match/competition runtime state lives in separate `rgman/` competition members or running `fm.exe` memory; preserved byte-for-byte in `.fm` archives | `S07`, `S09` |
