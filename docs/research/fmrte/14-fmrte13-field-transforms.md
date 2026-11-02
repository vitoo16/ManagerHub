# FMRTE13 field arithmetic recovered with REA

**CONFIRMED static behavior and controlled arithmetic tests; no actual FM2013 player has been decoded.** An original, isolated implementation is available in [fmrte13-field-math.mjs](../../../scripts/fmrte13-field-math.mjs). It accepts supplied numbers and returns numbers. It has no process handle, save parser, automatic profile selection or external write operation, and is not imported by the product application.

## Exact source and evidence

Source: `<FMRTE13_INSTALL_ROOT>\FMRTE.exe`, version/assembly `13.3.3.62`, x86 .NET4, SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`. Every token below belongs only to this artifact. RVAs locate FMRTE code, not game fields.

| Behavior | Method token | RVA (decimal) | Canonical REA evidence alias |
|---|---|---:|---|
| Actual CA getter / setter helper | `0x06000545` / `0x06000546` | 186824 / 187664 | ca13 |
| Actual PA getter / setter helper | `0x06000547` / `0x06000548` | 188496 / 189336 | ca13 |
| Signed byte display / storage conversion | `0x060008ed` / `0x060008ee` | 297252 / 297328 | math13 |
| Config multiplier | `0x060014d9` | 553496 | profileOffsets13 |
| XOR / NOT / address mask | `0x0600074f` / `752` / `755` | 247292 / 247376 / 247460 | math13 |
| Rotate left / right, 16 bits | `0x06000758` / `75b` | 247548 / 247668 | math13 |
| Working value / effective-address slots and low-word replacement | `0x060008d3`–`8da` (selected methods in manifest) | 296780–297040 | math13 |

Canonical evidence: math13 = `ev_02ee3f7d66b0b8376174370142d292a6c45c84534c8027e101b9d11d6737f792`; ca13 = `ev_4c35ddf55fba55ed58f57ef3f0e9ee65aac8da5f0e66b258ae27229dc806586a`; profileOffsets13 = `ev_1facaa98a62ae5884eebcfe8ae094e82c902609117b0235934c9bd461444a913`. Exact body offsets, signatures and raw/normalized CIL hashes are in [the manifest](evidence-manifest.json). Raw instructions and the private interpreter stay outside Git.

## Ability transforms

Let `x` be the unsigned 16-bit stored word; `n = effectiveFieldAddress & 15`. `L(x,n)` and `R(x,n)` rotate a 16-bit word left/right; `N(x)` complements its 16 bits. Operations below retain the low 16 bits. Interpret the final result as signed Int16, matching the accessor contract.

| Field | Profile mode | Decoding expression |
|---|---:|---|
| CA | 0 | `L(R(N(R(x,n)),8) XOR 42991,n)` |
| CA | 1 | `R(N(R(N(x),2)) XOR 33331,n)` |
| CA | 3 | `L(R(N(L(x,n)),12) XOR 47114,n)` |
| PA | 0 | `L(N(R(N(x XOR 13121),n)),11)` |
| PA | 1 | Same transform as CA mode 3 |
| PA | 3 | `L(R(N(x XOR 51768),14) XOR 20102,n)` |

These are analyst-derived algebraic equivalents of recovered getter operations, not copied decompiled source. Setter analysis independently establishes the inverse order; tests compare both directions against the CIL. The static helpers also operate on wider temporary values, so the reduction to 16 bits was checked rather than assumed.

The CA mode selector is field `0x0400069d`; PA uses `0x0400069e`. They are enum-valued fields, not offsets. Modes 0, 1 and 3 have recovered branches. The original getter returns `-1` for unhandled modes; the research module rejects them explicitly. It also rejects invalid word/address inputs and unknown field names. These errors indicate unresolved inputs, not corrupt FM records.

The key uses the address **after adding the field offset**, not the base player address or player ID. Player and PlayerStaff use separate offset slots. [Profile research](12-fm2013-build-profile.md) records multiple initializers and why none yet establishes the correct layout for the user's exact game process. Applying a transform to arbitrary `.fm` bytes would produce an unsupported interpretation.

## Ordinary attributes

`get_AttributesMultiplier` reads `Config.attributesRange` (`0x04000a21`): range 20 selects multiplier 5; other values select 1. This is a display configuration branch, not proof of a default range or native game build.

For the recovered Passing/Pace converter path, decode is signed-byte conversion of `Math.Round(raw / multiplier)`, then a lower bound of 1. There is no upper clamp to 20 in this helper: raw 127 with multiplier 5 gives 25. Encoding multiplies the signed input by the multiplier and applies unchecked signed-byte conversion; e.g. 26 with multiplier 5 becomes -126. UI/domain validation must therefore be established separately. The research implementation retains these numeric semantics but cannot authorize an edit.

`Math.Round(double)` uses nearest-even midpoint rounding. With integer signed bytes and multipliers 1 or 5, a half-integer quotient cannot occur; neither the test set nor this observation establishes behavior for other multipliers. The module accepts only the two observed multipliers.

## Verification and limits

`node --test scripts/fmrte13-field-math.test.mjs` checks 6,291,456 full-word round trips: 65,536 words × 16 address keys × 3 modes × 2 fields. Round trips establish internal inverses; they alone cannot establish fidelity to FMRTE.

A separate private, bounded interpreter traversed the actual file-backed CIL, including branches, locals, working struct fields, signed conversions and helper calls. All dumped methods with REA metadata matched REA raw CIL hashes. Target assemblies were never loaded or executed. Memory helpers were replaced with numeric test inputs and captured outputs. It compared 98,304 CA/PA results across getter/setter, all 16 keys, 256 evenly spaced words, 3 modes, 2 fields and Player/PlayerStaff address branches; another 1,024 comparisons covered all signed bytes in both directions at both multipliers. **99,328 comparisons passed, zero mismatches.**

Ninety synthetic input/output vectors from that interpreter are retained in [field-math-vectors.json](field-math-vectors.json) and checked by the public test suite. They contain no player/save data. The private run, interpreter/dumper hashes and external evidence bundle are recorded in the manifest; the comparison sequence SHA-256 is `a533352fa599f09d1debf668e444439b0316cb8215149a5fd717de142baa8399`.

**UNKNOWN:** exact-build profile selection, actual player addresses/IDs, native field values, valid editing ranges/dependent fields, stale-record behavior and persistence after FM save/reload. No production CA/PA capability or writer is enabled by this result.
