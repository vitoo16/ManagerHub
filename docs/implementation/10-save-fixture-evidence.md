# Save reader fixture evidence

This record documents a bounded, read-only inspection of one user-provided save. The source file is intentionally **not committed** to this repository.

## Fixture AFE-USER-001

| Property | Observed value |
|---|---|
| Source file | `Untitled Game (v03).fm` — private local fixture |
| Size | 29,319,864 bytes |
| SHA-256 | `b67b3f34c41c2454ee5514ef910e750ae8b89407237749fbd2400cc8341c8ed6` |
| First six bytes | `02 01 61 66 65 2e` |
| Outer signature family | AFE, observed |
| Exact game edition/build | Unknown; not inferred from filename or signature |

## Internal catalogue observation

A bounded scan of the final 64 KiB found an experimental directory candidate beginning at file offset 29,310,371. A zlib/deflate stream beginning at offset + 9 decompressed to 44,430 bytes, below the 512 KiB inspection limit.

The first two little-endian 32-bit values were a zero prefix and a member count of 69. The current read-only directory layout parsed 69 member records using UTF-16LE name stems/extensions and bounded offset/size fields. The first few names were `game_info.dat`, `save_game_summary.dat`, `game_db.dat`, `humans.dat`, `news.dat` and `transfer_man.dat`.

**Important unresolved evidence:** the 69 records consume 4,330 bytes of the 44,430-byte decompressed payload, leaving 40,100 bytes unexplained by this directory parser. The parser intentionally ignores this remainder and labels the result an experimental index candidate. It does not claim the full container is understood.

## What this proves — and does not prove

- It supports a read-only catalogue hypothesis for this exact file fingerprint.
- The presence of an internal `fmf.` marker does not change the observed outer AFE signature or establish that the file is a standalone FMF save.
- No member payload was decompressed or decoded. The listed sizes are metadata, not verified player/club fields.
- It does **not** identify the exact Football Manager edition/build, decode players, or validate Actual CA/Potential CA.
- The source save remains private and is not part of the repository. The SHA-256 is retained only to identify the exact local fixture if the same file is supplied again.

## Next verification gates

1. Identify the exact game edition and patch/build using game-side evidence.
2. Explain or safely bound the 40,100-byte remainder before treating the candidate as a complete directory format.
3. Validate member extents and compression behaviour against additional permissioned fixtures from known builds.
4. Compare any decoded field against the same save loaded in the same game build; keep unknown, absent and not-decoded states distinct.
