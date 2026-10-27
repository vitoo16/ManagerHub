# System knowledge / Kiến thức hệ thống

The following documents are **proposed technical specifications**, not evidence of implemented functionality.

- [S08 — Player Intelligence Engine](08-player-intelligence-engine.md): estimated CA, distinction from actual CA and RCA, version-aware models, scouting recommendation, confidence and acceptance criteria.

## Planned technical modules
- Binary save reader and compatibility adapters.
- Canonical football data with provenance.
- Safe optional CA/PA editor with verified write support only.
- Tactical and role-fit rule engine.
- Squad optimizer, recruitment and development models.
- Offline-first privacy, testing and security.

Start with validated read-only importing. Unsupported save formats and unknown attributes must never produce invented values.
