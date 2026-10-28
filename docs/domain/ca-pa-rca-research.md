# Football Manager — CA / PA / RCA knowledge and calculator implementation contract

Research date: 2026-10-28. Historical FM Scout sources:
1. https://www.fmscout.com/a-guide-to-current-ability-in-football-manager.html (CAE; updated 2021; pages 1–5).
2. https://www.fmscout.com/a-football-manager-abilities-explained.html (Stam; 2015).

## Observed football-domain principles

- **CA (Current Ability)** is an internal game quantity (the articles describe approximately 1–200 for initialized players; editor inputs may use 0). A player's visible attributes are position-dependent components of CA cost, not independent bonuses whose unnormalized weighted sum directly equals CA.
- **Attribute weighting changes by position.** In the 2021 research, acceleration and pace are expensive for many attacking positions; decisions and other attributes carry different weights across GK, defenders, midfielders, etc. Set-piece attributes tend to have lower CA cost. A 2021 weight table must **not** be mislabeled as the verified FM26 table.
- **Non-CA-consuming / zero-weight attributes** were observed in the 2021 research for aggression, determination, flair and natural fitness; some GK attributes likewise may carry no CA cost. A zero CA cost does NOT mean the attribute is useless in the match engine or development.
- **Weaker foot** can affect calculated cost. A visible textual weaker-foot description is not necessarily its exact underlying 1–20 value. Do not infer an exact numeric value from a textual foot-strength band.
- **RCA (Recommended Current Ability)** in the game's editor is a cost/required-ability estimate to sustain the current attributes. It is not synonymous with hidden current CA, and can deviate from it.
- The 2021 article derived an *empirical*, fitted relationship from weighted average attributes to RCA; it is not a straight raw sum. It reports nonlinear/high-attribute behavior (roughly 17+) and deviations/outliers. Multi-position weighting needs dedicated investigation.
- **PA (Potential Ability)** is a hidden potential ceiling of the *current save*. Negative PA values used in pre-game databases specify random generation bands upon creation and are **not** raw negative potential scores inside the ongoing save. Exact PA cannot be inferred from a current attributes list.
- **Scout stars** depend on staff judgment, squad strength and league context. They must not be equated with hidden CA, PA or a calibrated model.

## How ManagerHub must represent ability (distinct types)

| Field | Source / scope | Allowed UI label | Display rule |
| --- | --- | --- | --- |
| Verified CA | Tested same-version native save/editor record | Actual CA / CA thật | Only exact source+edition/build verification |
| RCA / CA cost estimate | Version-specific weights, weaker foot and empirically validated conversion | Recommended CA / CA cần cho bộ chỉ số | Show calibration/version/confidence and uncertainty; never claim native CA |
| eCA (statistical prediction) | Labeled, same-version CA training dataset with holdout validation | Estimated CA / CA ước tính | Expose MAE, calibration, intervals, version and missing fields |
| Attribute Strength Index | Existing simple 0–100 visible-attribute summary | Attribute index / Chỉ số tổng hợp | **Not** CA/eCA/RCA; label clearly |
| Role Fit | Position/duty-specific *ManagerHub* weighted heuristic | Role suitability / Độ hợp vai trò | Distinct from CA cost and native positional familiarity |
| PA | Exact verified save/editor field | Potential Ability / PA | Never calculate PA from current attributes |
| Scout stars | Actual club-specific report | Scout assessment / Đánh giá tuyển trạch | Source context, not disguised as CA |

## Computational design (specification, **not a working exact FM26 calculator**)

1. Select edition-specific weight table `W[build, position, attribute]` and required fields (incl. GK attributes and weaker-foot strength), with provenance and validation fixtures from the corresponding game's editor. Reject unsupported editions.
2. Compute an intermediate weighted statistic, for example
   `weightedMean = Σ(W_i * A_i) / Σ W_i`
   on the **same edition's tested schema**. This is an explanatory intermediate, not CA itself. Zero-weight values are excluded *only from cost calculation*, never from role or performance analysis.
3. Apply a version-calibrated transformation `f_build(weightedMean, highAttributeTerms, positionMultiplicity, ...)` to predict RCA/CA cost. Explicitly define nonlinear terms and missing-field behavior; do not use unverified fitted coefficients.
4. Compare to *labeled RCA* records from the editor and independently verified CA values across relevant positions, goalkeepers, two-footed players and multi-position players. Train/test split at player/career group level; publish MAE, bias, outliers and calibration.
5. If required weights, weaker foot, positional ratings, or target version are unknown, **show "Unable to estimate accurately"** with a list of missing inputs. Do not substitute a linear 1–200 conversion or uniform attribute average.
6. Do not use the game's CA-cost attribute weights as a substitute for *role importance* weights; these are two different optimization problems.

## User-facing onboarding copy guidance

Bad: "Game export · Provisional source · No exact CA/PA · No model calibration".
Better EN: "This report uses the attributes you exported. CA and PA are hidden game values, so we won't guess them."
Better VI: "Báo cáo này dùng các chỉ số bạn đã xuất từ FM. CA và PA là dữ liệu ẩn trong game, nên ManagerHub không tự đoán."

Bad: "Hard constraints not met" / "Infeasible XI".
Better EN: "We couldn't build a full starting eleven. Check the highlighted positions or change your player locks."
Better VI: "Chưa thể xếp đủ 11 cầu thủ. Hãy kiểm tra các vị trí còn thiếu hoặc thay đổi cầu thủ đã khóa."

Bad: "Use source-backed roles and calibrate".
Better EN: "Choose a player to see where their attributes are strongest and which roles may suit them."
Better VI: "Chọn một cầu thủ để xem điểm mạnh và vai trò phù hợp với bộ chỉ số hiện tại."

**Non-negotiable:** FM26 weights and engine behavior need new version-specific evidence; the articles describe research from 2015 and 2021, **not a verified exact 2026 formula**.
