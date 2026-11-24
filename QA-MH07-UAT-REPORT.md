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

