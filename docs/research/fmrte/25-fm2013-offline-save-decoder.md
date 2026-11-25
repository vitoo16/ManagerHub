# FM2013 Offline `.fm` Save Container, Codec, Static `lang_db.dat` & Surgical Writer Architecture

**Date:** 2026-11-25  
**Scope:** Football Manager 2013 PC (`13.3.3f359652`, verified `afe` v4 builds `13.0.0d288310`–`13.3.3f359652` and `game_db.dat` schema versions `0x757`–`0x774`)  
**Status:** Verified offline decoder, optional `lang_db.dat` static name resolver, and gated surgical `Save As .fm` copy writer implemented in `@managerhub/domain/fm2013-offline`. Original `.fm` files remain strictly immutable.

---

## 1. Container, Recursive Directory Tree & Member Envelope Specification

FM2013 `.fm` save files use Sports Interactive's AFE/FMF v4 archive container format (`fm.exe` `0x13c0910`):

1. **18-byte container header:**
   - Bytes `0..8`: Signature `\x02\x01afe.\x04\x00\x00` (encrypted AFE v4) or `\x02\x01fmf.\x04\x00\x00` (unencrypted FMF v4, research-only).
   - Bytes `9..12`: Little-endian `u32` `directoryPtr = directoryOffset - 9` (`directoryMetaLen = 9`), where `directoryOffset = directoryPtr + 9` points to the trailing directory header (`\x02\x01fmf.\x04\x00\x00`). Both conventions (`directoryOffset` and `directoryOffset - 9`) are accepted on read; canonical `directoryOffset - 9` is emitted on write.
   - Bytes `13..16`: Little-endian `u32` `directoryMetaLen` (`9` in canonical FM2013 saves).
   - Byte `17`: Compression flag (`1` = zlib-compressed members, `0` = uncompressed members).
2. **Recursive FMF v4 directory tree (`rem === 0`):**
   - Starts at `directoryOffset` with 9-byte header `\x02\x01fmf.\x04\x00\x00`, followed by a zlib-compressed tree stream.
   - Each directory node begins with `u8(hasPrefix)`: if `1`, an SI UTF-16LE directory prefix (e.g. `rgman/`) precedes the node's `u32(memberCount)` entries (`stem`, `extension`, `relativeOffset` from byte 18, `storedSize`, `uncompressedSize`), followed by `u32(subDirCount)` child nodes.
   - The production parser validates **exact directory EOF (`cursor === bytes.byteLength`)** across all root and nested (`rgman/`) members (e.g. 774 total members = 69 root + 705 `rgman/` in real FM2013 saves) and enforces non-overlapping byte extents within `[18, directoryOffset]`.
3. **AFE member envelope (`afe.` containers):**
   - Each member payload begins with a 40-byte envelope: `u32(keyLength = 16)`, `u32(ivLength = 16)`, 16-byte per-member AES-128 key, and 16-byte counter IV, followed by AES-128-CTR ciphertext (`Web Crypto AES-CTR`, `length: 128`).
   - When `compressed === 1`, the decrypted stream is standard RFC 1950 zlib whose inflated byte count is strictly checked against `reportedUncompressedBytes`.

---

## 2. Persisted Database (`game_db.dat`), `HMAC-SHA512` Integrity & `lang_db.dat`

Three archive members plus an optional external language database supply the complete offline domain:

- **`save_game_summary.dat`:** Required for verified compatibility gating; supplies save build string (e.g. `'13.3.3'`), database version tag, active human manager names & clubs, and current in-game `SI_DATE`. Missing or unrecognized build metadata downgrades compatibility to `unverified` (`verifiedDomains: []`).
- **`humans.dat`:** Active human manager `PERSON` row IDs.
- **`game_db.dat`:**
  - Header `\x02\x01tad.` + `u16(gameDbVersion)` (`0x757`..`0x774`) + `u8(subVer)` + `u8(marker)` (9 bytes), followed by **51 sequential persisted database tables**, a post-table tail, and a mandatory length-prefixed **64-byte `HMAC-SHA512` footer** (`u32(64)` + 64-byte digest computed over `game_db[9 : length - 68]`).
  - No proprietary key bytes are embedded in ManagerHub source code. When the user supplies their local `fm.exe` (`13.3.3f359652`) in memory (`deriveFm2013SigningKeyFromExecutable`), ManagerHub derives the 32-byte UTF-16LE `HMAC-SHA512` signing key from PE section `.rdata` at VA `0x2474be0` to cryptographically verify incoming saves (`verified_hmac_sha512`) and sign `Save As .fm` copies.
- **External `lang_db.dat` (`parseFm2013LangDb`):**
  - Header `\x02\x01tad.` + `u16(ver)` + `u8(0)` + `u8(langCount)` + directory of `(u32 langId, u32 relOffsetFrom9)` entries.
  - Slicing only the English stream (`langId === 8`, ~1.89 MB compressed out of ~38.9 MB) inflates to 15 sequential static string tables (`CITY`, `CLUB`, `CONTINENT`, `INJURY`, `NATION`, `AWARD`, `STADIUM`, `STAGE_NAME`, `COMPETITION`, `T09`, `T10`, `MEDIA`, `REGION`, `LOCAL_REGION`, `AGREEMENT`) verified to **exact EOF (`remaining === 0`)**, resolving unedited base names with explicit `nameProvenance: 'lang_db'`.

### Verified Decoded & Editable Entities

- **Players (`PERSON` tags 2 & 3):** Identity, DOB (`SI_DATE` bijection), derived age, nation, club/loan parent, all **15 positional ratings** (`GK`..`ST`), all **47 visible 1–20 attributes**, feet, height/weight, morale, market value, caps/goals, contracts (`weeklyWageGbp`, `expiryDate`, `squadNumber`), plus Editor-only `actualCa`, `potentialAbility`, reputations, 5 hidden traits, and 8 personality traits.
- **Staff & Human Managers (`PERSON` tags 1, 3, 9):** Identity, human flag, club, nation, wage, expiry, Editor-only `staffCa`/`staffPa`/reputations, and all **18 `NON_PLAYING_DATA` (`0x29` = 41B) coaching/scouting/mental/medical attributes** (`attacking`..`physiotherapy`).
- **Clubs & Finances (`CLUB`):** Names, nation, year founded, 4 facility ratings (`1..20`), and `FINANCE_BASIC`/`FINANCE_FULL` balance, transfer budget, season transfer budget, weekly wage bill, and weekly wage budget.
- **Teams, Stadiums, Nations, Competitions:** Full relational links, Stadium capacities (`capacity`, `seatingCapacity`, `expansionCapacity`), Nation entity counts, and Competition rosters.

---

## 3. Surgical Lossless `Save As .fm` Writer & Safety Gates

1. **Strict Gating:** `writePatchedFm2013Save` requires `mode === 'editor'`, `compatibilityStatus === 'verified'`, `afe` v5 container, non-empty 64-byte `signingKey`, and `incomingChecksum === 'verified_hmac_sha512'`. Realism mode, tampered saves, `fmf` containers, and unverified builds fail closed.
2. **Surgical In-Place Byte Patching:** Only recorded fixed-width scalar offsets (`GameDbEditableOffsetMap`) inside a copy of `game_db.dat` are modified; variable-length arrays and all 773 other archive members (`rgman/*` and container slack gaps) are spliced byte-for-byte without re-encoding.
3. **Cryptographic Re-Signing & Independent Roundtrip Verification:** After patching `game_db.dat`, `HMAC-SHA512` is recomputed, the member is compressed and encrypted in a fresh CSPRNG AES-128-CTR envelope, recursive FMF v4 directory offsets after `game_db.dat` are shifted by `deltaBytes`, `directoryPtr` is updated to `newDirOffset - 9`, and the resulting `.fm` buffer is **independently re-decoded and schema-validated** (`validateDecodedSaveDatabase` + `HMAC-SHA512` re-check) before returning a new downloadable `.fm` copy. Original `.fm` files on disk are never mutated.

See [FMRTE 13 Complete Parity Matrix](26-fmrte13-complete-parity-matrix.md) for the full feature-by-feature comparison.
