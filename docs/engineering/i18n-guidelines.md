# Vietnamese / English language system (i18n)

**Implementation date:** 2026-10-28. UI code: `apps/web/src/i18n/`, `react-i18next` + `i18next`.

## User behavior

- ManagerHub offers **VI** and **EN** controls in the app's top navigation bar.
- First visit: Vietnamese if the browser language starts with `vi`, otherwise English.
- After the user switches, `mh-locale` is saved in browser `localStorage`. This choice takes priority over browser language on future visits and survives reloads. Changes apply without a page refresh.
- `<html lang>` follows the current locale to improve screen-reader pronunciation.
- If storage is unavailable, language switching still works in-memory until the page reloads.
- The URL route (e.g. `/#/players`) does **not** change with locale. Do not introduce a parallel `/vi/` / `/en/` routing layer without a product decision.

## Developer use

1. Import `useTranslation` from `react-i18next` in React UI components.
2. Use `const { t } = useTranslation()` once in each component, and wrap user-facing text: `t('Player Lab')`.
3. Add/maintain the Vietnamese translation in `apps/web/src/i18n/vi.ts`. English source text is the canonical natural-language key; the English resource is generated as an identity map of these keys, so it is not duplicated. **Do not add raw Vietnamese conditionals in components.**
4. For role names and attribute labels from the domain package, translate at the display boundary: `t(role.title)` or `t(ATTRIBUTE_LABELS[key])`. The domain layer **must remain language-agnostic**.
5. Keep IDs, file extensions, CA/PA/RCA identifiers, file names, imported player names and positional codes unchanged. Numeric source data must never change when locale switches.
6. For dynamic counts, use translation templates with plural rules where necessary. Do not concatenate English and Vietnamese fragments.
7. Do not surface raw parser errors/technical provenance as the primary message; use actionable guidance first. Technical diagnostics may be disclosed in expandable details.

## Vocabulary and copy rules

| Concept | English UI | Vietnamese UI |
|---|---|---|
| Player Lab | Player Lab | Phân tích cầu thủ |
| Actual CA | Actual CA | CA thật |
| PA | PA | PA |
| RCA | Recommended CA | CA đề xuất |
| Role fit | Role fit | Độ hợp vai trò |
| 1–20 attributes | Attributes | Chỉ số |
| Squad Planner | Squad Planner | Lập kế hoạch đội hình |
| Football Manager save | Save file | File save |
| Export | Export player list | Xuất danh sách cầu thủ |

Avoid "infeasible XI", "provisional source", "data contracts", "adapter" and "not calibrated" in end-user onboarding. Instead tell the player **what they can do next**, why a value is unavailable and how to get the missing data. Place technical definitions in documentation or optional help.

Maintain a strict separation among hidden game CA, RCA/CA cost estimation, model eCA, the visible-attribute index and the user-created Role Fit score. See [CA/PA/RCA research](../domain/ca-pa-rca-research.md).

## Quality gates

- `apps/web/src/i18n/i18n.test.ts` verifies Vietnamese/English resources and locale resolution.
- `scripts/translation-audit.test.ts` scans TSX UI components for literal translation keys missing from Vietnamese resources and rejects string-concatenated keys; use interpolation such as `t('Plan {{plan}}', { plan })` instead.
- Import failures and warnings must be converted into actionable guidance by `player-import-copy.ts`; keep parser diagnostics out of primary onboarding messages and test every returned copy key.
- Playwright tests check locale switching, persistence across page reload, translated navigation, role-specific labels and player metrics.
- Run `npm run check` and `npm run test:e2e`; verify the most recent GitHub Actions run before claiming fully green CI.
