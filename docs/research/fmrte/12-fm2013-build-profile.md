# FMRTE13 profile selection and mutable layout slots

**CONFIRMED static dispatch and several layout initializers; UNKNOWN exact profile for local FM2013 `13.3.3f359652`.** The game's version string alone does not identify which reflected profile validates successfully.

Source is FMRTE.exe `13.3.3.62`, SHA-256 `c3d594ed4d9d2c50e987a36ed186d771dd4242450c7e75fc34920e5d8dbcfcae`, MVID `3a4eebcf-0c16-4aa7-9cf2-ae0de96d1ec6`, x86/.NET4. [The manifest](evidence-manifest.json) binds tokens, RVAs and CIL hashes to that source.

## Selection contract

The shared interface is TypeDef `0x02000108`. REA evidence `ev_b430cdca4f436f5e5599da3b683d57491e5c5c9d2cbf6337cd7c89ff24790ba4` records its 12 abstract members. `0x06000898` returns an enum; `899` returns Description; `89b` accepts GameProcess and an access-mode enum and returns Boolean; `89d`/`89e` return Boolean; `8a0` returns a list of strings. Names remain obfuscated except Description.

Process resolver `0x06000567`, RVA 193848, reflects `Assembly.GetCallingAssembly().GetTypes()`, filters assignable types, instantiates candidates and invokes the interface. At IL884 it reads the enum; IL934/985 reads the string list and formats entries split at character `f`. This string formatting builds diagnostics and does not itself prove a build comparison. The actual validator call is IL1185 (`89b`, current GameProcess, literal access mode 0). A true result then passes additional Boolean checks at IL1199/1208 before storing the candidate at IL1226. Some candidate types are explicitly skipped earlier in this method. Source evidence: `ev_cd0cfcfea5622bc352c978da5c834b6caefe70f65195afe8a4f9fbb5c411ec7d`.

File resolver `0x06000566`, RVA 193140, also reflects/instantiates profiles. It reads `898` at IL322 and invokes `89b` at IL339 with literal mode 1, then stores a successful candidate at IL353. Thus the validator participates in both source modes; a description/list is insufficient to declare either compatible.

The 13 outer profile types associated with discovered mode assignments were inspected separately: `ev_fae623eb37f5e240acb33356fad565bb5d856c84beac978e7e56db012c570e70`. Nested initializer methods were inspected with their exact retained simple TypeDef names: `ev_717e8c0d93b0767398504b2f8c5fb32e6c3fdcb2bc456319c060500a9a1d7bd7`. The two nested types sharing one simple name remain distinguishable by their build-local type/method tokens. This selection does not claim all profiles in the assembly are fully understood.

Within that outer-profile selection, 13 validator methods have call edges to `GameProcess.get_VersionDescription` and `System.String.Equals`; two also call StartsWith. These establish actual string-comparison sites below the interface. Operand values and remaining conditions were not fully reconstructed, so neither an Equals call nor a formatted list is used to assign a known game build to a profile. Profile `0x0600089c` supplies the type descriptors consumed by the [catalog/object construction routines](15-fmrte13-player-catalog.md).

## Offset slots are mutable

The CA/PA helpers first choose an offset slot, add it to `BaseObject.MemoryAddress` (`0x040007da`), then derive the low-nibble rotation key from that effective address. A PlayerStaff instance takes alternate slots. [Field transforms](14-fmrte13-field-transforms.md) independently verify this branch numerically with mocked reads/writes.

| Initializer token | CA slot `0x04000683` | PA slot `0x04000685` | Role |
|---|---:|---:|---|
| `0x06000922` (.cctor) | 180 | 182 | Static initial values |
| `0x06000923` | 180 | 182 | Alternate initializer |
| `0x06000924` | 336 | 338 | Alternate initializer |
| `0x06000925` | 312 | 314 | Alternate initializer |

| Initializer token | PlayerStaff CA slot `0x04000154` | PlayerStaff PA slot `0x04000155` |
|---|---:|---:|
| `0x06000191` (.cctor) | -136 | -134 |
| `0x06000192` | 336 | 338 |
| `0x06000193` | 296 | 298 |

Numbers are **byte offsets assigned by FMRTE code relative to its object address**, not validated game layouts or `.fm` member offsets. They must not enter a production adapter as known FM2013 offsets. Canonical initializer evidence: `ev_1facaa98a62ae5884eebcfe8ae094e82c902609117b0235934c9bd461444a913`.

## Mode assignments

`0x0400069d` (CA) and `0x0400069e` (PA) are enum selectors, not locations. Their .cctor writes 0. Additional nested profile routines write both selectors together:

| Assigned mode | Initializer methods |
|---:|---|
| 0 | `0x0600047b` |
| 1 | `0x0600009d`, `0x060000d5`, `0x060001fe`, `0x060003eb`, `0x060005ab`, `0x0600067a`, `0x06000702`, `0x06000852` |
| 3 | `0x0600023c`, `0x060004bb`, `0x060004f4`, `0x06000513` |

The standalone method `0x060008b3` also assigns mode 1 (evidence `ev_d112d5274c6cb7e7c33591263403797d8be406162479d993f4337370704b3d96`). Most listed routines call offset initializers `0x06000924`/`0x06000192`; `0x060005ab` contains several alternate initializer calls. Presence of calls is established; which branch runs for the local game is not.

**Remaining work:** resolve per-profile validation conditions, selected record catalogs and known entity addresses against a running, exact-build game. Several descriptions/version lists are obtained through the obfuscated string/resource resolver `0x06000825`; their plaintext values were not reconstructed. No protected resolver was executed or altered. A numeric build match with a vendor release page remains a candidate, not evidence that one of these layouts applies.

**2026-10-31 superseding evidence:** [file-relative discovery and profile decoding](18-fm2013-file-relative-discovery.md) independently derives the normal same-assembly string-decoding seed and associates local `13.3.3f359652` with ctor4ab, validator4b5, descriptor4bb and postaccept override4c4. The descriptor assigns CA/PA mode3 and calls924/24e. Thus the prior absence of decoded version lists is resolved statically. Runtime FMRTE profile selection and hidden-ability value certification remain unobserved. The original scanner also recovers4,036 candidates after a real process restart without old heap addresses.
