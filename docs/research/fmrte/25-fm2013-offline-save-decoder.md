# FM2013 Offline `.fm` Save Container, Codec & Database Architecture

**Date:** 2026-11-25  
**Scope:** Football Manager 2013 PC (`13.3.3f359652`, verified `game_db.dat` schema versions `0x757`–`0x774`)  
**Status:** Verified read-only offline decoder implemented in `@managerhub/domain/fm2013-offline`; write capability remains strictly disabled (`writeCapability: false`).

---

## 1. Container & Member Envelope Specification

FM2013 `.fm` save files use Sports Interactive's AFE/FMF v5 archive container format:

1. **18-byte container header:**
   - Bytes `0..8`: Signature `\x02\x01afe.\x05\x00\x00` (encrypted AFE) or `\x02\x01fmf.\x05\x00\x00` (unencrypted FMF).
   - Bytes `9..12`: Little-endian `u32` `directoryOffset` pointing to the trailing directory header (`\x02\x01fmf.\x04\x00\x00`).
   - Bytes `13..16`: Little-endian `u32` (reserved / 0).
   - Byte `17`: Compression flag (`1` = zlib-compressed members, `0` = uncompressed members).
2. **Trailing FMF v4 directory:**
   - Starts at `directoryOffset` with 9-byte header `\x02\x01fmf.\x04\x00\x00`, followed by a zlib-compressed stream.
   - Directory payload contains `u32(0)`, `u32(memberCount)`, and for each member: SI UTF-16LE `stem`, SI UTF-16LE `extension`, `u32(relativeOffset)` (from byte 18), `u32(storedSize)`, and `u32(uncompressedSize)`.
3. **AFE member envelope (`afe.` containers only):**
   - Each member payload begins with a 40-byte envelope: `u32(keyLength = 16)`, `u32(ivLength = 16)`, 16-byte per-member AES-128 key, and 16-byte counter IV, followed by AES-128-CTR ciphertext.
   - No global or proprietary static key exists; each member is self-contained and decryptable via Web Crypto `AES-CTR` (`length: 128`).
   - When `compressed === 1`, the decrypted stream is standard RFC 1950 zlib (`DecompressionStream('deflate')`) whose inflated length matches `uncompressedSize`.

---

## 2. Metadata & Persisted Football Database (`game_db.dat`)

Three members supply the complete offline save database:

- **`save_game_summary.dat`:** Save version string (e.g. `'13.3.3'`), database version tag, active human manager names & club short names, and current in-game date (`SI_DATE` day-of-year + year).
- **`humans.dat`:** Active human manager `PERSON` row IDs.
- **`game_db.dat`:** Header `\x02\x01tad.` + `u16(gameDbVersion)` (`0x757`..`0x774`) followed by **51 sequential persisted database tables**, a post-table tail, and a trailing 64-byte hash. The production parser validates **exact EOF (`remaining === 0`)** after reading all 51 tables and footer bytes.

### Verified Decoded Entities & Fields

- **Players (`PERSON` tags 2 & 3):** `uid`, `rowId`, first/last/common names (resolved from `FIRST_NAME`, `SECOND_NAME`, `COMMON_NAME`), birth date, derived calendar age vs game date, primary nation, current club & parent club (for loanees), team & team type, all **15 positional ratings** (`GK`..`WBR`), all **47 visible 1–20 attributes** (stored internally as `1..100` / `ceil(raw / 5)` for playing attributes), left/right foot (`1..20`), height (cm), weight (kg), morale, market value (GBP), international caps/goals, squad number, contracts (weekly wage GBP, expiry date, join date, loan flag, job type), plus Editor-only fields (`actualCa`, `potentialAbility`, `homeReputation`, `currentReputation`, `worldReputation`, 5 hidden playing traits, 8 personality traits).
- **Staff & Human Managers (`PERSON` tags 1, 3, 9):** Identity, human flag, club, nation, wage, expiry, plus Editor-only `staffCa`, `staffPa`, and reputations.
- **Clubs & Finances (`CLUB`):** Full/short/6-letter names, nation, year founded, facilities (training, youth, youth coaching, youth recruitment), and `FINANCE_BASIC`/`FINANCE_FULL` balance, transfer budget, season transfer budget, weekly wage bill, and weekly wage budget.
- **Teams, Stadiums, Nations, Competitions:** Team type/owner/reputation/comp/stadium links; Stadium capacity/seating/expansion/owner/coordinates; Nation names and entity counts; Competition team counts and sample clubs.

---

## 3. Provenance, Honest Limits & Safety Boundaries

1. **Exact EOF & Cross-Validation:**
   - Verified across **65 real FM2013 `.fm` saves** spanning 7 `game_db` versions (`0x757`, `0x75f`, `0x763`, `0x765`, `0x76e`, `0x773`, `0x774`): **65/65 parsed to exact EOF (`remaining === 0`)**.
   - Cross-validated against independent live FM2013 `13.3.3f359652` ground truth across **4,058 players**: `UID 4,058/4,058`, `Name 4,058/4,058`, `DOB 4,058/4,058`, `Nation 4,058/4,058`, `Club 4,058/4,058`, **Attributes `198,842/198,842` (100.000%)**, and **Positions `60,870/60,870` (100.000%)**.
2. **External Static Strings (`lang_db.dat`):**
   - Unedited base-database names for Stadiums, Competitions, Cities, Awards, Continents, and Injuries are stored in FM2013's external `lang_db.dat` rather than embedded in `.fm` saves. Only customized/renamed strings appear inline inside `game_db.dat`.
   - ManagerHub tracks `nameProvenance: 'decoded_save' | 'not_stored_in_save'` explicitly and never invents or guesses unstored names.
3. **Strict Realism vs Editor Isolation:**
   - Realism mode (default) projects `actualCa`, `potentialAbility`, reputations, hidden playing traits, and hidden personality fields as `redacted` (`null`) across Save Database Explorer, Player Lab, and Squad Planner.
   - Editor mode surfaces the verified decoded values with explicit `source: 'decoded_save'`, `verification: 'verified'` metadata.
4. **Immutability & Non-Goals:**
   - Original `.fm` files are strictly read-only (`writeCapability: false`) and verified unchanged by SHA-256.
   - IndexedDB persistence (`managerhub-save-db` v1) stores only structured decoded records, never raw `.fm` file bytes, and leaves `managerhub-local` v4 untouched.
   - Tactics, match fixtures/events, transfer history, and non-FM2013 editions remain explicitly marked `unsupported` / `not_decoded`.
