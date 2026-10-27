# Sources, verification level and research notes

**Checked:** 2026-10-27. External links may change. Do not substitute a third-party statement for game behavior without version-specific confirmation.

## Official / primary
1. Football Manager — FM26 two shapes, revised roles, Visualiser, removed Duties: https://www.footballmanager.com/fm26/features/possession-out-possession-fm26s-new-tactical-evolution
2. Sports Interactive — FM24 manual, in-game editor and editable hidden attributes including CA/PA: https://community.sports-interactive.com/sigames-manual/football-manager-2024/enhancing-your-experience-further-r4967/
3. FMRTE Documentation — edits the currently running game: https://docs.fmrte.com/
4. FMRTE — CA/RCA/PA terminology and distinctions: https://docs.fmrte.com/players/ability/
5. Harvard Business School / HBS Working Knowledge conversation with Ferguson, mirrored by Forbes: https://www.forbes.com/sites/hbsworkingknowledge/2015/11/12/the-difference-between-managing-and-leading-a-conversation-with-sir-alex-ferguson/ (long-term infrastructure, academy, leadership). Any fictional interview text in this repository remains original illustrative writing, NOT quotations.

## Independent engineering references; NOT official game specifications
6. fmsave (FM26 read-only save reader): https://github.com/rhiever/fmsave and https://rhiever.github.io/fmsave/ — states 27 reader families and field coverage limitations; do not infer write support.
7. Gilet — reverse-engineered example of an FM26 "fmf." container: https://github.com/fifteen15-labs/gilet/blob/main/docs/SAVE_FORMAT.md — implementation research, not a universal definition for all ".fm" files.

## Local sample observation (not published)
An uploaded anonymized-by-design sample was inspected for format identification only: 29,319,864 bytes; first six bytes hex **02 01 61 66 65 2e** ("afe." after the first two bytes). No Zstandard frame signature was found with a naive byte scan. This is **not proof** of parser support, save generation/version, contents, field correctness or editability. Save material and full file fingerprints are intentionally **not committed**.

## Evidentiary rules
- Every assertion about FM internals requires edition + build + reproduce step or reliable versioned source.
- FMRTE's RCA is an editor-specific estimate; Manager Hub must not claim equivalent formula or exact parity.
- The CA/PA values, scales and save availability must be tested by platform/build. Nonstandard and negative PA conventions, if encountered, require explicit verification instead of automatic assumptions.
- Tactical heuristics are hypotheses requiring evaluation. Fictional interview statements are never attributable to Ferguson.
- For research updates, note link, retrieval date, edition/build and verified/unverified classification.