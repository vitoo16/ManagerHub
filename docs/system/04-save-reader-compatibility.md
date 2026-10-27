# S04 — Save Reader and FM compatibility research

**Status: no validated format decoder committed.** The earlier sample `Untitled Game (v03).fm` was 29,319,864 bytes; header began `02 01 61 66 65 2e` (ASCII segment `afe.`). These observations **do not prove which edition generated it, or that player CA/PA was extracted**. Do not commit sample save data or speculate on fields.

A different independent FM26 `fmf.` save-reader research line exists (see [references](../references.md)). Extension `.fm` is not proof of format compatibility. Separate version-specific adapters.

## Reader contract
detect(bytes) -> edition?, build?, family?, confidence, capabilities, diagnostics.
read(bytes) -> immutable canonical snapshot + per-domain coverage + warnings or typed error.
Domains: player identity, attributes, CA/PA, positions, clubs, contracts, tactics, match stats, finance. Coverage: verified / partial / unsupported / unknown. Errors: unsupported, corrupt, unknown build, unavailable data, failure; keep distinct.

Input safety: file-picker consent, maximum byte lengths, offset checks, bounded decompression, structured error recovery, fuzzing and time/memory quotas. No save mutation on read path. Validate interpreted fields against same-build in-game observation and repeatable fixtures.

## Compatibility matrix (initial)
| Family | Read | Write |
|---|---|---|
| Uploaded afe. sample | Research only; not validated | Unsupported |
| FM26 independent fmf. research | Third-party experiments; not ManagerHub support | Unsupported |
| Other Football Manager releases | Unverified until fixtures | Unsupported |

## Milestones
Fixture corpus -> format detection -> catalog/container decoding -> entity extraction -> CA/PA cross-validation -> contracts/tactics/events coverage -> performance and abuse tests -> optional certified writer in a separate release.

See [editor safeguards](05-player-editor-ca-pa.md), [system provenance](03-domain-schema-and-provenance.md).