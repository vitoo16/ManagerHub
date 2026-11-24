# MANAGERHUB — MH-07 UAT & QA REPORT
## Báo cáo kiểm định tính năng MH-07 (PR #104 Baseline & PR #106 Guided Adjustments)

**Ngày thực hiện:** 2026-11-24  
**QA Lead / Test Engineer:** Senior QA Lead  
**Repository:** https://github.com/vitoo16/ManagerHub  
**Baseline PR #104 SHA:** `15abea835db1020ce5945664eb0c1d9ca8e81db7`  
**Candidate PR #106 Tested SHA:** `bb67c8772618ee2fbf88101fc790f3dd6c8dd2b5`  
**Tracker:** Issue #105 (https://github.com/vitoo16/ManagerHub/issues/105)  
**Pull Request:** PR #106 (https://github.com/vitoo16/ManagerHub/pull/106)  

---

### 1. Môi trường kiểm thử và Ma trận thiết bị

- **Hệ điều hành:** Windows 11 Pro 64-bit (Host)
- **Runtime & Tools:** Node.js v24.22.3, npm 11.19.1, .NET SDK 10.0.401, Playwright 1.64.1
- **Trình duyệt / Viewports:**
  - Chromium Desktop (1280x720)
  - Chromium Mobile (375x667, Pixel 5 emulation)
- **Ngôn ngữ:** Tiếng Anh (EN) và Tiếng Việt (VI)
- **Nguồn dữ liệu:** Synthetic squad export CSV hợp lệ và fixture thiếu cầu thủ (synthetic fixtures đã được loại bỏ thông tin riêng tư, không sử dụng file save cá nhân).

---

### 2. Kết quả kiểm tra Baseline (PR #104 — Issue #105)

| Test ID | Nội dung kiểm thử | Kết quả | Bằng chứng / Chi tiết |
|---|---|:---:|---|
| **UAT-01** | Roster hợp lệ -> đủ 11 vị trí duy nhất trong 4-3-3 & 4-2-3-1; thiếu cầu thủ báo lỗi rõ ràng. | **PASS** | Vitest `squad-optimizer.test.ts`, E2E `Tactical diagnostics suppress shape warnings for incomplete XI`. |
| **UAT-02** | Tương tác sa bàn: pointer drag, keyboard arrows (+ Shift), touch nudge trong [1..19]; possession và defending độc lập. | **PASS** | Vitest `tactical-scenarios.test.ts`, E2E keyboard navigation tests. |
| **UAT-03** | Plan A/B: giữ nguyên sơ đồ, đội hình, chỉ dẫn, vị trí độc lập; đổi formation chỉ reset plan tương ứng. | **PASS** | Vitest `tactical-diagnostics.test.ts`, E2E `Tactical diagnostics react to scenario edits, plan switching...`. |
| **UAT-04** | Lưu / khôi phục / quên chiến thuật: lưu A/B trên browser storage, reload mở lại đúng export, không sửa file gốc. | **PASS** | Vitest `tactical-scenarios.test.ts`, `save-library.test.ts`, E2E persistence specs. |
| **UAT-05** | Bản địa hóa VI/EN: nhãn, lỗi, hướng dẫn, giới hạn dịch đầy đủ; đổi ngôn ngữ không mất state. | **PASS** | Vitest `i18n.test.ts`, `translation-audit.test.ts`, E2E localized selector assertions. |
| **UAT-06** | Incomplete XI: thiếu cầu thủ thì cảnh báo incomplete XI, ẩn các cảnh báo hình học. | **PASS** | E2E `Tactical diagnostics suppress shape warnings for incomplete XI` (desktop & mobile). |
| **UAT-07** | High-line + low-press: kích hoạt cảnh báo; hạ defensive line hoặc tăng pressing thì tắt cảnh báo. | **PASS** | Vitest `tactical-diagnostics.test.ts`, E2E diagnostics specs. |
| **UAT-08** | Fullback dâng cao thiếu bọc lót: cả 2 FB dâng >=4 ô không có CM/DM bọc lót -> cảnh báo; lùi 1 FB hoặc thêm cover -> hết cảnh báo. | **PASS** | Vitest `finds both advancing fullbacks without deep midfield cover and resolves with cover`. |
| **UAT-09** | CB gap: 2 CB cách nhau >=10 ô X trong phase defending -> cảnh báo; thu hẹp khoảng cách hoặc thêm cover -> hết cảnh báo. | **PASS** | Vitest `detects a drawn central defensive gap and clears with narrower centre-backs or cover`. |
| **UAT-10** | An toàn dữ liệu / storage: dữ liệu hỏng, sai hash, sai formation, storage denied đều fail-closed, không corrupt state. | **PASS** | Vitest `restoreSavedTacticalScenarios` failure cases, E2E storage error handling. |
| **UAT-11** | Khả năng truy cập / responsive: desktop, mobile, bàn phím, dark/light theme, aria-label, touch target. | **PASS** | E2E Playwright desktop + mobile suite (138/138 passed), axe accessibility audits. |
| **UAT-12** | Độ ổn định & hiệu năng: chuyển phase/plan liên tục, console clean, không rò rỉ bộ nhớ hay stale callbacks. | **PASS** | Playwright test execution clean, 0 console exceptions. |
| **Global boundaries** | Mọi cảnh báo có WHY / Consider / Limit / model provenance; không khẳng định native FM2013 prediction. | **PASS** | Verified UI text: `Rule set managerhub.tactical-diagnostics.v1`, manager-authored disclaimer present. |

---

### 3. Kết quả kiểm tra Candidate (PR #106 — Guided Adjustments)

| Test ID | Nội dung kiểm thử | Kết quả | Bằng chứng / Chi tiết |
|---|---|:---:|---|
| **QA-106-01** | High line + low press: bấm Apply -> `defensiveLine='balanced'`, `pressing='low'` giữ nguyên, warning biến mất; Undo -> phục hồi trạng thái cũ. | **PASS** | E2E `Tactical diagnostics allow explicit correction and undo without changing Plan B`, Vitest `suggests an opt-in high-line correction without mutating input`. |
| **QA-106-02** | Fullback cover: bấm Apply -> RB lùi về độ sâu defending, LB không đổi; warning tắt; Undo -> phục hồi tọa độ possession. | **PASS** | Vitest `suggests retaining one fullback for cover without changing defending positions`. |
| **QA-106-03** | CB gap: bấm Apply -> RCB x điều chỉnh về khoảng cách an toàn (<=9 ô so với LCB), LCB và possession không đổi; Undo -> phục hồi. | **PASS** | Vitest `narrows the centre-back gap without changing the possession phase` & boundary clamp test. |
| **QA-106-04** | Nhiều warning cùng lúc: bấm Apply cho 1 warning chỉ sửa trường liên quan, warning còn lại vẫn giữ nguyên; Undo trả về đúng bước đó. | **PASS** | Vitest `handles multiple concurrent warnings by adjusting only the targeted finding`. |
| **QA-106-05** | Hủy hợp lệ Undo: chỉnh sửa thủ công sau Apply, đổi plan/formation, restore hoặc reset lập tức vô hiệu hóa Undo; không phục hồi stale state. | **PASS** | E2E: manual edit on pressing removes Undo button; `restore` & `forget` explicitly reset `lastAdjustment`. |
| **QA-106-06** | UI & A11y: nút Apply/Undo có accessible label rõ ràng, dịch VI/EN đầy đủ, hỗ trợ touch/keyboard, disabled khi busy. | **PASS** | E2E VI/EN checks: `Áp dụng điều chỉnh cho...`, `Hoàn tác điều chỉnh chiến thuật vừa áp dụng`. |
| **QA-106-07** | Incomplete XI: không hiển thị nút Apply; mọi điều chỉnh chỉ tác động scenario trên app, không chạm vào file save hay engine FM2013. | **PASS** | E2E assertion: `expect(diagnostics.getByRole('button', { name: /Apply suggested adjustment/ })).toHaveCount(0)`. |

---

### 4. Báo cáo khuyết tật (Defect Log)

- **DEV-01 (Đã khắc phục):**
  - **Mô tả:** Lỗi TypeScript compilation (`TS2345: Argument of type 'TacticalDiagnosticId' is not assignable to parameter of type 'TacticalAdjustmentId'`) trong `TacticalLab.tsx:250:48` khi truyền `item.id` vào callback `applyAdjustment`.
  - **Phân loại:** P1 (Build / Type Safety Blocker).
  - **Khắc phục:** Mở rộng chữ ký `applyAdjustment(id: TacticalDiagnosticId)` với guard `if (id === 'incomplete-xi') return;`, đảm bảo type-safety hoàn hảo và fail-closed nếu gọi sai ID.
  - **Retest SHA:** `bb67c8772618ee2fbf88101fc790f3dd6c8dd2b5` — `typecheck`, `lint`, `vitest`, `playwright` 100% PASS.

---

### 5. Kết luận nghiệm thu (QA Verdict PR #106)

- **Đánh giá:** **ACCEPT (Chấp thuận phạm vi tăng dần của PR #106)**.
- **Tiêu chí:**
  - 100% các ca kiểm thử UAT-01..12 và QA-106-01..07 đạt trạng thái **PASS**.
  - Không còn lỗi P0 hoặc P1 tồn đọng.
  - Local CI Release đạt **10/10 stages passed** với bằng chứng xác thực (`acceptanceEligible: true`).
- **Giới hạn phạm vi (Honest Boundaries):**
  - Tính năng chỉ áp dụng trên **scenario hình học do người dùng tự thiết lập**.
  - Chưa hỗ trợ native FM2013 tactic verification, write-back file save, live memory capture, hay dự đoán kết quả trận đấu.
  - Module **MH-07 tiếp tục duy trì trạng thái "In progress"** theo đúng lộ trình sản phẩm.

---

### 6. Kết quả kiểm tra Gate F — PR #107 (Tactical CSV Report)

**Tested SHA:** `103885387dd87d8bcde4066046602de9ea5098e8`  
**Profile:** Local CI Release 10/10 stages PASS (`acceptanceEligible: true`, SHA256: `83AF972E444629E87C526CD0E78CC43A6CCC12E9C2FDE64DB62B8596EEC12820`).

| Test ID | Nội dung kiểm thử | Kết quả | Bằng chứng / Chi tiết |
|---|---|:---:|---|
| **QA-107-01** | Xuất báo cáo CSV đúng phương án đang chọn (Plan A/B độc lập): xuất đủ 22 vị trí (possession & defending), chỉ dẫn, sơ đồ và tên cầu thủ tương ứng. | **PASS** | Vitest `tactical-report.test.ts`, Playwright E2E `Tactical report exports the active edited scenario...`. |
| **QA-107-02** | Nội dung cảnh báo và nguồn gốc: CSV ghi nhận đầy đủ trigger, adjustment, limitation, model version (`managerhub.tactical-diagnostics.v1`) và tuyên bố giới hạn. | **PASS** | Vitest: xác minh presence của `High line with low pressing`, `Consider:`, `Limit:`. |
| **QA-107-03** | Phản ánh chính xác sau Apply / Undo: xuất CSV phản ánh đúng chỉ dẫn điều chỉnh (ví dụ `defensiveLine=balanced`) và sau khi Undo (`defensiveLine=high`). | **PASS** | Vitest & E2E download stream validation. |
| **QA-107-04** | Chống chèn công thức (CSV formula injection): các trường bắt đầu bằng `=`, `+`, `-`, `@` được tiền tố bằng `'` tránh thực thi mã độc trong bảng tính. | **PASS** | Vitest: `'=HYPERLINK` được bảo vệ, không xuất hiện công thức trần. |
| **QA-107-05** | An toàn đường dẫn file: tên file xuất được chuẩn hóa loại bỏ `../` và ký tự đặc biệt độc hại (`tacticalReportFilename`). | **PASS** | Vitest: `../../evil.csv` chuyển thành `ManagerHub-evil-tactical-B.csv`. |
| **QA-107-06** | Incomplete XI: xuất rõ `incomplete-xi`, các vị trí chưa gán ghi `Unassigned`, không suy diễn đội hình giả. | **PASS** | Vitest: xác nhận `incomplete-xi` và formation mismatch handling. |
| **QA-107-07** | Bản địa hóa VI/EN & Không thay đổi state: nút "Xuất báo cáo chiến thuật CSV" dịch chuẩn; thao tác xuất không làm thay đổi phương án hoặc mất dữ liệu. | **PASS** | Playwright E2E: kiểm tra nhãn tiếng Việt trên cả desktop và mobile viewports. |

**Kết luận QA Gate F:** **ACCEPT (Chấp thuận tăng dần phạm vi xuất báo cáo CSV của PR #107)**. Không phát hiện lỗi P0/P1. Toàn bộ 140/140 E2E tests và 237/237 Vitest tests đã chạy đạt 100% PASS. MH-07 và MH-11 tiếp tục ở trạng thái **In progress**.

---

### 7. Kết quả kiểm tra Step 2 — PR #108 / Issue #109 (MH-09 Role Interaction Diagnostics)

**Tested Candidate SHA:** `f8d5921b08d7145dd50a2dd26bb2e3f8fca852d7`  
**Profile:** Local CI Release 10/10 stages PASS (`acceptanceEligible: true`, SHA256: `1E7CFED742BFECF9A10B7B3DA52D789913DAA66B545B893ED80E9F7D5EC9FEE8`).

| Test ID | Nội dung kiểm thử | Kết quả | Bằng chứng / Chi tiết |
|---|---|:---:|---|
| **QA-108-01** | Đội hình 4-3-3 neutral XI hoàn chỉnh: không xuất hiện cảnh báo tương tác vai trò; hiển thị đúng mã mô hình `managerhub.role-interactions.v1`. | **PASS** | Vitest `role-interactions.test.ts`, Playwright E2E: assert text 'No role interaction findings under these bounded rules' và hiển thị version. |
| **QA-108-02** | Dâng cao LB >= 4 ô cùng hành lang biên với LW: phát hiện cặp wing-back + winger dâng cao; hiển thị chính xác tên cầu thủ được phân công và giới hạn hình học. | **PASS** | Playwright E2E: `Advancing wing-back and winger share a flank`, `Assigned players: Left Defender, Left Wing`. |
| **QA-108-03** | Điều chỉnh LB ra khỏi hành lang biên hoặc lùi sâu: cảnh báo tương tác biên lập tức biến mất. | **PASS** | Playwright E2E: di chuyển LB lùi 1 ô (Y=12) hoặc vào trung lộ -> cảnh báo tắt. |
| **QA-108-04** | Đội hình 4-2-3-1, dâng RB và kéo DM về trung lộ sâu: hiển thị nhận xét bọc lót trung lộ sâu có điều kiện (qualified observation), không khẳng định kết quả trận đấu. | **PASS** | Playwright E2E: `Deep central midfield cover is drawn`, `Assigned players: DM One`. |
| **QA-108-05** | Incomplete XI, sai sơ đồ, trùng cầu thủ/vị trí hoặc lệch vai trò: fail-closed an toàn; hiển thị yêu cầu đủ XI, không tạo tương tác giả. | **PASS** | Vitest: 8 negative test cases; Playwright E2E: kiểm tra `Role partnership checks need a complete XI`. |
| **QA-108-06** | Tính độc lập A/B & Lưu trữ: Plan A và Plan B giữ phân tích độc lập; lưu và khôi phục (Save/Restore) sau reload giữ đúng tên cầu thủ và cảnh báo. | **PASS** | Playwright E2E: Plan A cảnh báo, Plan B neutral; save to browser, reload, restore hoạt động hoàn hảo. |
| **QA-108-07** | Bản địa hóa VI/EN & Trợ năng: hiển thị đầy đủ `Tương tác giữa các vai trò`, `Cầu thủ liên quan`, `Hậu vệ biên dâng cao cùng hành lang...`, `Đã bố trí tiền vệ bọc lót...`; hỗ trợ bàn phím, screen reader `role="status"`. | **PASS** | Playwright E2E: chuyển đổi ngôn ngữ tiếng Việt xác nhận text; toàn bộ 144/144 E2E tests PASS. |
| **QA-108-08** | Giới hạn trung thực (Honest Boundaries): không khẳng định đọc trực tiếp chiến thuật FM2013, không can thiệp save/memory, không bịa điểm tương tác chemistry hay dự đoán trận đấu. | **PASS** | Provenance ghi rõ: `Mô hình managerhub.role-interactions.v1 chỉ dùng vai trò do Squad Planner gán và vị trí do bạn thiết lập, không phải vai trò gốc trong FM.` |

**Kết luận QA Step 2 (PR #108):** **ACCEPT (Chấp thuận tăng dần phạm vi chẩn đoán tương tác vai trò của PR #108)**. 100% test cases QA-108-01..08 PASS. Không có lỗi P0/P1. MH-09 và MH-11 tiếp tục duy trì trạng thái **In progress**.

---

### 8. Kết quả kiểm tra Step 3 — PR #110 / Issue #111 (MH-09 Central Dynamics & Reversible Role Adjustments)

**Tested Candidate SHA:** `938f13e1dc18f6d8e23615e358297840dbd58ebd`  
**Merged Main SHA:** `3c58a8df5c2fa7724d3852880be5c513a21f3452`  
**Profile:** Local CI Release 10/10 stages PASS (`acceptanceEligible: true`, Candidate SHA256: `A462C8775668CB5941143DC960145E6743AB27068F360FA6248840B3288B2539`, Merged Main SHA256: `E2AF317EFEEB34BA1149CFDB2E70EEF0B346284A5C0A804C37A1E982E9D1CF3F`).

| Test ID | Nội dung kiểm thử | Kết quả | Bằng chứng / Chi tiết |
|---|---|:---:|---|
| **QA-110-01** | Đội hình neutral 4-3-3 & 4-2-3-1: không có cảnh báo tương tác vai trò, hiển thị đúng model `managerhub.role-interactions.v1`. | **PASS** | Vitest `role-interactions.test.ts`, Playwright E2E assert text 'No role interaction findings under these bounded rules'. |
| **QA-110-02** | Dâng tất cả tiền vệ trung tâm (CM/DM) lên $Y \le 8$: phát hiện `Uncovered central pivot`, liệt kê đúng tên cầu thủ được phân công. | **PASS** | Playwright E2E `MH-09 Step 3 central dynamics`: assert 'Uncovered central pivot' và lý do dâng cao. |
| **QA-110-03** | Áp dụng gợi ý (Apply suggested adjustment) cho Uncovered central pivot & Undo: tiền vệ trụ lùi về $Y=12$, cảnh báo tắt, Undo phục hồi đúng. | **PASS** | Playwright E2E: click 'Apply suggested adjustment to Uncovered central pivot', cảnh báo biến mất, click 'Undo last tactical adjustment' cảnh báo xuất hiện lại. |
| **QA-110-04** | Trùng lặp không gian trung lộ tấn công ($|dx| \le 1, |dy| \le 1$ tại $Y \le 9, 7 \le X \le 13$): phát hiện `Central midfield spatial congestion`. | **PASS** | Vitest: kịch bản 4-2-3-1 với `ldm` dâng cạnh `am` tại $\{x:10, y:7\}$; phát hiện chính xác cặp slot. |
| **QA-110-05** | Áp dụng gợi ý cho Central midfield spatial congestion & Undo: tự động kéo lùi lệch tầng vị trí thứ hai ($Y+3$), cảnh báo tắt. | **PASS** | Vitest: vị trí `am` chuyển từ $y=6$ thành $y=9$, cảnh báo giải tỏa hoàn toàn. |
| **QA-110-06** | Incomplete XI / đội hình thiếu hoặc sai sơ đồ: fail-closed an toàn, không tạo cảnh báo giả. | **PASS** | Vitest 8 negative tests: status `incomplete-xi`, danh sách `incomplete-role-evidence`. |
| **QA-110-07** | Độc lập Plan A/B & Lưu trữ trình duyệt: Plan A cảnh báo/điều chỉnh, Plan B giữ nguyên trạng thái; Save/Restore qua browser reload nguyên vẹn. | **PASS** | Playwright E2E desktop & mobile 146 tests PASS. |
| **QA-110-08** | Bản địa hóa VI/EN & Trợ năng WCAG 2.2: hiển thị tiếng Việt `Khoảng trống trục dọc trung lộ chưa được che chắn`, `Trùng lặp không gian trung lộ`; `role="status"` live region. | **PASS** | Playwright E2E switch VI/EN assert text tiếng Việt; axe-core WCAG 2.2 PASS. |

**Kết luận QA Step 3 (PR #110):** **ACCEPT (Chấp thuận tăng dần phạm vi động lực trung lộ và điều chỉnh có thể hoàn tác của PR #110)**. 100% test cases QA-110-01..08 PASS. Zero P0/P1 defects. MH-09 và MH-11 tiếp tục duy trì trạng thái **In progress**.



