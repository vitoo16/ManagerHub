# MANAGERHUB — MH-07 / PR #104–#106
## Bộ prompt triển khai cho TEAM TESTER và TEAM DEVELOPMENT / LOCAL CI

**Ngày chuẩn bị:** 2026-11-24  
**Repository:** https://github.com/vitoo16/ManagerHub  
**Baseline đã merge (PR #104):** `15abea835db1020ce5945664eb0c1d9ca8e81db7`  
**QA issue:** https://github.com/vitoo16/ManagerHub/issues/105  
**PR phát triển tiếp:** https://github.com/vitoo16/ManagerHub/pull/106 (**Draft; chưa được chứng nhận bởi Local CI**)  
**PR #106 head tại thời điểm giao việc:** `3f494d199b4a3b374928a29f66af588cfd9a9a73` — luôn xác minh lại trước khi chạy.  
**Phạm vi:** MH-07 Tactical Lab, Tactical Diagnostics, Guided Adjustments, tích hợp MH-11 liên quan.  
**Nguyên tắc:** Hai team chạy song song trên cùng hợp đồng tính năng, nhưng **không sửa cùng file/branch khi chưa phân quyền**. Không coi CI PASS là bằng chứng nghiệm thu đầy đủ. Không tự động merge khi chưa đạt gate.

---

# 0. Hợp đồng chung bắt buộc cho cả hai team

1. Đọc đúng nguồn quy định và dữ liệu hiện tại trên `origin/main`:
   - `AGENTS.md`
   - `docs/implementation/00-execution-charter.md`
   - `docs/implementation/01-full-delivery-plan.md`
   - `docs/implementation/05-feature-acceptance-ledger.md`
   - `docs/product/01-full-feature-catalog.md` (MH-07, MH-08, MH-09, MH-11, MH-25)
   - `docs/engineering/LOCAL_CI.md`, `scripts/local-ci.mjs` (đối với team Dev)
   - `.agents/README.md` và chỉ các skill thực sự liên quan.
2. Kiểm tra `git status --porcelain=v1`, `git fetch origin`, `git rev-parse HEAD`, `git rev-parse origin/main`, `git branch --show-current` trước khi báo bằng chứng. Không force-push main và không xóa thay đổi không rõ nguồn gốc.
3. **Không MVP, không cắt test/stage hoặc bỏ module** để báo hoàn thành nhanh. Giữ quy trình bảy phase / 27 module đã thống nhất.
4. FM2013 là đối tượng nghiên cứu hiện tại. Tactical Lab đang xử lý các **scenario do người dùng tự khai báo**, không phải native FM2013 tactics, không phải xác suất thắng trận và không phải thuật toán match engine.
5. Không ghi vào file save `.fm` gốc; không bật capability write, CA/PA editing, live FM2013 đọc bộ nhớ, nếu chưa được kiểm chứng và phê duyệt riêng. Giữ local-first, provenance, Editor/Realism isolation, đúng giới hạn dữ liệu.
6. Bảo toàn i18n VI/EN, WCAG 2.2 A/AA trên phạm vi có thể tự động kiểm tra, keyboard/mobile/assistive technology, responsive, dark/light và privacy.
7. Không giả lập đầu ra PASS, không đưa save cá nhân, process dumps, game binaries, địa chỉ bộ nhớ hoặc dữ liệu nhạy cảm lên public issue/PR. Chỉ dùng fixtures tổng hợp/được phép và bằng chứng đã loại thông tin riêng tư.
8. Mọi kết luận phải chỉ rõ **SHA** và evidence; nếu không chạy được công đoạn nào, ghi `BLOCKED / NOT RUN` cùng lý do. Sau merge phải chạy lại Release trên **merge commit mới của main**, không dùng kết quả PR thay thế.
9. Chỉ đánh dấu **MH-07 increment Accepted** khi đạt gate tương ứng. MH-07 toàn module vẫn **In progress** cho đến khi tất cả phạm vi có thể hỗ trợ được nghiệm thu và các giới hạn FM2013 được công bố trung thực.
10. Ưu tiên những thay đổi phát triển end-to-end có ích; tránh framework mới, layer trùng, refactor rộng hoặc thay cơ sở công nghệ nếu chưa có ADR.

---

# 1. PROMPT GỬI TEAM TESTER (COPY NGUYÊN KHỐI)

> **ROLE:** Bạn là Senior QA Lead / Test Engineer phụ trách kiểm định ManagerHub. Mục tiêu là thực hiện UAT thực tế trên MH-07 đã merge ở `main` và regression + UAT cho PR #106, tìm lỗi thật, tái hiện được và cung cấp bằng chứng, **không viết kết luận PASS chỉ dựa trên CI**.
>
> **REPO:** https://github.com/vitoo16/ManagerHub  
> **BASELINE:** PR #104 — merge SHA `15abea835db1020ce5945664eb0c1d9ca8e81db7`.  
> **TRACKER:** Issue #105 — https://github.com/vitoo16/ManagerHub/issues/105.  
> **CANDIDATE:** PR #106 — https://github.com/vitoo16/ManagerHub/pull/106 (phải xác minh HEAD trước khi test).
>
> **BƯỚC 1 — ĐỌC VÀ GHI NHẬN:** Đọc hợp đồng chung trong file này; đọc các tài liệu quyền lực trong `AGENTS.md` và acceptance ledger. Xác định SHA thực tế, build/commit, môi trường, browsers, OS, màn hình, nguồn fixtures. Chạy baseline PR #104 trước để đối chiếu, sau đó PR #106 trên branch riêng hoặc worktree, không làm bẩn main.
>
> **BƯỚC 2 — THỰC HIỆN TOÀN BỘ TEST CASE** trong Checklist QA bên dưới. Kiểm tra cả các tình huống âm (negative), boundary, accessibility, persistence và khả năng cách ly A/B. Không bỏ qua test vì đã có unit/E2E tự động. Test trên ít nhất Chromium desktop và viewport mobile; nếu có Firefox, Edge, thiết bị cảm ứng và NVDA thì thêm matrix thực tế. Ghi `NOT RUN` cho môi trường chưa có.
>
> **BƯỚC 3 — PR #106:** Verify từng Apply Suggested Adjustment trên 3 cảnh báo; việc áp dụng phải cần thao tác chủ động; Undo phải trả lại state trước đó. Không sửa Plan B khi thao tác Plan A, không thay đổi pha ngoài phạm vi điều chỉnh; Undo không được ghi đè chỉnh sửa sau đó, đổi dữ liệu nguồn hoặc đổi formation. Thử Save/Restore/Forget sau Apply; thử VI/EN, keyboard/screen reader và các cảnh báo tồn tại đồng thời. Kiểm tra UI nói rõ đây chỉ là gợi ý dựa trên hình học.
>
> **BƯỚC 4 — GHI LỖI:** Tạo GitHub issue liên kết #105 và PR #106 nếu có lỗi, dùng mẫu bug report bên dưới. P0/P1 phải BLOCK merge; không tự sửa code nếu không thuộc nhiệm vụ QA. Nếu case bị chặn bởi bug khác, ghi BLOCKED kèm ID.
>
> **BƯỚC 5 — BÁO CÁO:** Tạo/đính kèm `QA-MH07-UAT-REPORT.md` (không đưa dữ liệu riêng tư lên repo). Báo cáo gồm SHA, test matrix, kết quả từng case, evidence link, bug list, còn thiếu môi trường, kết luận `ACCEPT / REJECT / CONDITIONAL` cho **phạm vi incremental**; không khẳng định toàn bộ MH-07 Complete. Cập nhật issue #105 bằng comment tổng kết có dẫn chứng, không đóng issue trước khi Dev xử lý các blocker và QA retest.
>
> **QUY TẮC:** Không xóa test, không thay tên PASS khi chưa có log, không đoán native FM2013 tactical fidelity hoặc CA/PA. Nêu rõ giới hạn nguồn dữ liệu.

## Checklist QA — MH-07 PR #104

- [ ] **UAT-01 — Import & Complete XI:** Import player export hợp lệ; kiểm tra 4-3-3 và 4-2-3-1 có 11 player ID duy nhất, không trùng slot; dữ liệu không đủ/không hợp lệ phải báo thiếu, không bịa cầu thủ.
- [ ] **UAT-02 — Pitch interaction:** Di chuyển bằng pointer drag, arrow keys, Shift+arrow, touch nudge; tọa độ nguyên trong [1..19], không vượt sân. Possession/Defending độc lập.
- [ ] **UAT-03 — Plan A/B:** Hai plan giữ formation, đội hình, instructions và vị trí độc lập. Chỉnh hoặc reset một plan không ảnh hưởng plan còn lại. Đổi formation chỉ reset vị trí tương ứng theo contract hiện tại.
- [ ] **UAT-04 — Save/Restore/Forget:** Lưu/khôi phục cả A/B, reload/re-open đúng player export, xác nhận/cancel xóa. Xóa không tác động source export hoặc `.fm` gốc; session edits xử lý đúng message.
- [ ] **UAT-05 — VI/EN:** Tất cả text, accessibility names, thông báo lỗi, giải thích giới hạn, hướng dẫn người dùng dịch đủ; đổi ngôn ngữ không làm mất state.
- [ ] **UAT-06 — Incomplete XI:** Khi thiếu 11 cầu thủ đủ điều kiện chỉ hiện incomplete XI, không bật shape warnings dù đã đặt high line/low press.
- [ ] **UAT-07 — High-line/low-press:** XI đầy đủ + defensive line `high` + pressing `low` => cảnh báo; đổi pressing hoặc line => hết cảnh báo phù hợp.
- [ ] **UAT-08 — Fullback cover:** Cả LB/RB tiến >=4 ô so với defending, không có CM/DM bọc lót trung lộ sâu => cảnh báo. Cho một FB lùi hoặc thêm CM/DM cover => hết cảnh báo.
- [ ] **UAT-09 — CB gap:** Hai CB trong defending cách >=10 ô X, không có CM/DM cover sâu => cảnh báo; thu hẹp khoảng cách hoặc đưa CM/DM bọc lót => hết cảnh báo.
- [ ] **UAT-10 — Storage/data safety:** JSON sai schema, vượt giới hạn, wrong source SHA, wrong formation, storage denied, repeated reload, stale plan; fail closed, không ghi đè dữ liệu khác nguồn.
- [ ] **UAT-11 — Accessibility/responsive:** 360px, tablet, desktop, dark/light, keyboard-only, focus, screen reader, touch target và reduced motion. Không che khuất nội dung hoặc kẹt focus.
- [ ] **UAT-12 — Stability/performance:** Chỉnh liên tục, đổi plan/phase nhanh, save/restore repeated, kiểm tra console, UI freeze, stale callbacks và tính nhất quán dữ liệu.
- [ ] **Global boundaries:** Mọi warning có WHY / Consider / Limit và model version; không ngụ ý native FM2013 behavior hoặc match prediction.

## Checklist QA bổ sung — PR #106

- [ ] **QA-106-01:** Với high line + low pressing, nhấn Apply => `defensiveLine=balanced`, `pressing=low` giữ nguyên, warning tương ứng hết; nhấn Undo => dữ liệu cũ phục hồi đúng.
- [ ] **QA-106-02:** Với FB đều dâng, Apply => RB quay lại độ sâu defending, LB không đổi; diagnostics cập nhật; Undo phục hồi tọa độ possession cũ.
- [ ] **QA-106-03:** Với CB gap, Apply => điều chỉnh RCB về trong phạm vi ngưỡng, LCB và possession không đổi; Undo phục hồi.
- [ ] **QA-106-04:** Hai hoặc nhiều warnings cùng lúc: áp dụng chỉ một warning, không tự ý sửa các trường khác; kiểm tra thông báo còn lại đúng, Undo một bước đúng.
- [ ] **QA-106-05:** Undo không xuất hiện sai hoặc phục hồi sai sau edit khác, đổi formation, đổi A/B, đổi player export, restore/reset hay lưu/xóa state.
- [ ] **QA-106-06:** Button Apply/Undo có tên truy cập rõ ràng, hỗ trợ keyboard/touch, dịch VI/EN, không bị double click gây state sai.
- [ ] **QA-106-07:** Không xuất hiện Apply trên incomplete XI; mọi thao tác chỉ sửa scenario trong app, không ghi save FM2013.

## Mẫu bug report bắt buộc

```md
### [P0/P1/P2/P3] MH-07 — <mô tả lỗi>
- Test case: UAT-xx / QA-106-xx
- Tested commit SHA:
- Branch / build / Local CI evidence:
- OS / browser / device / viewport / language:
- Fixture (synthetic / được phép):
- Steps to reproduce:
  1.
  2.
  3.
- Expected:
- Actual:
- Frequency (n/N):
- Impact / priority:
- Screenshot / recording / sanitized console evidence:
- Suspected regression from PR #104 or #106 (nếu có chứng cứ):
- Retest outcome + SHA:
```

**QA exit gate:** 100% case bắt buộc có trạng thái PASS/FAIL/BLOCKED/NOT RUN kèm bằng chứng; không còn P0/P1; P2/P3 chỉ được ngoại lệ nếu owner chấp thuận và có issue theo dõi. PR #106 có riêng phần retest. Verdict chỉ áp dụng cho phạm vi đã kiểm tra.

---

# 2. PROMPT GỬI TEAM DEVELOPMENT / LOCAL CI (COPY NGUYÊN KHỐI)

> **ROLE:** Bạn là Senior Tech Lead + Software Engineer + DevOps chịu trách nhiệm tiếp tục ManagerHub toàn sản phẩm. Nhiệm vụ trước mắt: review, fix, harden và nghiệm thu kỹ thuật PR #106; hỗ trợ QA issue #105; sau đó triển khai vertical slice MH-07 ↔ MH-11 tiếp theo. **Không tạo MVP; không cắt tests/stages; không merge thiếu bằng chứng.**
>
> **REPO:** https://github.com/vitoo16/ManagerHub  
> **MAIN BASELINE:** `15abea835db1020ce5945664eb0c1d9ca8e81db7` (đối chiếu `origin/main` mới nhất).  
> **PR:** https://github.com/vitoo16/ManagerHub/pull/106 — Draft.  
> **QA:** https://github.com/vitoo16/ManagerHub/issues/105.
>
> **BƯỚC 1 — INSPECT:** `git fetch`, xác minh commit/working tree, đọc AGENTS.md và các canonical docs/skill router ở phần 0; kiểm tra đầy đủ source diff PR #106 và các contract bị ảnh hưởng: `packages/domain/src/tactical-diagnostics.ts`, `tactical-scenarios.ts`, `tactical-state.ts`, `squad-optimizer.ts`, `apps/web/src/features/squad-planner/components/TacticalLab.tsx`, i18n, `tests/e2e/shell.spec.ts` và unit tests. Đối chiếu PR #104, yêu cầu MH-07/MH-11 và các bug QA.
>
> **BƯỚC 2 — REVIEW CHUYÊN SÂU:** Kiểm tra input/source constraints, tính bất biến state, correction có giải quyết đúng rule theo hình học không, hành vi khi 2+ diagnostics cùng tồn tại, điều kiện Undo, đổi formation, đổi plan, save/restore/delete, malformed stored data, accessibility, VI/EN và cleanup. Giữ contract versioning minh bạch; không viết model prediction hoặc FM2013 native tactics giả. Tìm tech debt có bằng chứng (file/line/impact), sửa trong scope; không refactor toàn bộ app.
>
> **BƯỚC 3 — FIX VÀ TEST:** Sửa phát hiện, thêm unit/property/negative tests và Playwright desktop/mobile phù hợp, giữ tên lỗi dễ hiểu. Không sửa domain heuristics thành thuật toán match engine. Không disable test hoặc lờ lỗi bằng catch rỗng. Nếu sửa rule phải cập nhật explanation và test boundary.
>
> **BƯỚC 4 — LOCAL CI:** Chạy đúng version Node/package manager trong repo; ưu tiên Windows runner thực cho native stages. Kiểm tra file `docs/engineering/LOCAL_CI.md` và `scripts/local-ci.mjs` để xác minh cú pháp/profile hiện tại. Chạy `npm ci`, `npm run typecheck`, `npm run test`, kiểm tra lint/format/build/E2E theo cấu hình và **Local CI Release đầy đủ**. Không tự suy đoán tên script hoặc stage count nếu config đã đổi. Lưu `summary.json` dưới `.local-ci/runs/...` và evidence hash, profile, PASS/FAIL từng stage, exact tested HEAD. Nếu vướng môi trường: BLOCKED với nguyên nhân và fallback không mạo nhận Release PASS.
>
> **BƯỚC 5 — QA SYNC:** Tiếp nhận lỗi từ issue #105, tái hiện, phân loại, sửa bằng commit bounded, báo retest SHA cho Tester. P0/P1 phải giải quyết trước merge; không đóng bug nếu chưa có QA retest.
>
> **BƯỚC 6 — REVIEW & MERGE GATE:** Khi đúng PR HEAD đã PASS toàn bộ applicable tests + Local CI Release, không có P0/P1 và QA đồng ý, cập nhật summary/test evidence và chuyển Draft -> Ready for review. Yêu cầu independent code review. Chỉ merge khi tất cả gate đáp ứng và owner/quyền repo cho phép; nếu chưa đủ thì giữ Draft. Không force-push main. Sau merge: sync main, chạy lại Full Release trên **merge SHA**, so sánh `git rev-parse HEAD` với evidence, và ghi trạng thái verified.
>
> **BƯỚC 7 — NEXT PRODUCT SLICE:** Tiếp tục MH-07 ↔ MH-11: `Player Report -> eligible XI/role assignments -> tactical board -> diagnostics -> opt-in adjustment -> saved plan -> report`. Chọn phần nhỏ nhất tạo luồng production hoàn chỉnh nhưng không làm MVP; kiểm tra reusable role/position contracts. Chốt dữ liệu đầu vào, versioned rules, UI, persistence, report, negative tests và UAT trước khi code. Các hạng mục phụ thuộc native FM2013 chưa xác minh phải giữ `unsupported`/`research`, không bịa dữ liệu. Lập PR độc lập, tránh conflict với PR #106 và các nhóm khác.
>
> **BƯỚC 8 — DOCS & BÀN GIAO:** Chỉ cập nhật `docs/implementation/05-feature-acceptance-ledger.md` theo evidence có thật. Tổng kết PR/commits, tests, runtime/OS, SHA log, blocker, compatibility limits, scope accepted/not accepted, issue links và proposed next dependency. Không tự đổi MH-07 Complete khi các gate của module chưa qua.

## Checklist Development / DevOps

### A. Kiểm soát source, kiến trúc và bảo mật
- [ ] DEV-01 Xác minh origin/main, branch, SHA, dirty state; chọn worktree/branch riêng cho PR #106.
- [ ] DEV-02 Đọc charter, feature catalog, delivery plan, acceptance ledger và skill `managerhub-football-intelligence` (thêm skill khác chỉ khi phù hợp).
- [ ] DEV-03 Review diff PR #106: domain method, undo state, UI, translation, unit/E2E.
- [ ] DEV-04 Rà tính bất biến dữ liệu, không làm sai Plan A/B, không mutating source/saves hoặc cross-dataset.
- [ ] DEV-05 Rà a11y, keyboard, mobile, translated accessible labels và error recovery.
- [ ] DEV-06 Rà performance dưới thao tác nhanh, edge cases cùng lúc, stale state/async operations.
- [ ] DEV-07 Giữ read-only/source provenance/FM2013 limits. Không bật writer, giả CA/PA, match win probabilities.

### B. Chất lượng và kiểm thử PR #106
- [ ] DEV-08 Unit test đầy đủ 3 actions, Undo, boundary, multiple warnings, formation variants, unexpected input.
- [ ] DEV-09 Browser E2E desktop/mobile: Apply/Undo, A/B, VI/EN, keyboard, save/restore, negative flows.
- [ ] DEV-10 `npm ci` từ lockfile đã commit, `typecheck`, unit/Node, lint/format/build, Playwright theo cấu hình.
- [ ] DEV-11 Local CI Release tất cả stages thật, gồm Windows native build/protocol self-test và budget nếu cấu hình yêu cầu; **không skip**.
- [ ] DEV-12 Evidence có exact commit SHA, run folder, profile/stages, exit codes, SHA256 của `summary.json`, Node/Windows versions.
- [ ] DEV-13 Đối chiếu QA #105; fix P0/P1, retest có bằng chứng.

### C. Review, merge và triển khai tiếp
- [ ] DEV-14 Independent review, ready-for-review khi toàn bộ gate đạt, không tự merge Draft thiếu bằng chứng.
- [ ] DEV-15 Merge có kiểm soát, sau merge chạy lại Release đúng `main` SHA; xác nhận clean working tree và origin sync.
- [ ] DEV-16 Cập nhật acceptance ledger đúng phạm vi bằng evidence, MH-07 vẫn In progress nếu chưa hoàn tất toàn module.
- [ ] DEV-17 Tạo PR riêng cho slice MH-07/MH-11 tiếp theo, giữ 27-module/7-phase plan và không mở rộng native capability không có chứng cứ.

## Lệnh tham chiếu (kiểm tra scripts thực trước khi dùng)

```powershell
git fetch origin
git status --porcelain=v1
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git log --oneline -5

# Tạo worktree riêng để review PR #106 (đường dẫn tùy môi trường):
git worktree add ..\ManagerHub-pr106 codex/mh07-diagnostic-guided-adjustments
cd ..\ManagerHub-pr106

git rev-parse HEAD
npm ci
npm run typecheck
npm run test

# Xem cấu hình thực tế trước khi chạy Local CI:
Get-Content docs\engineering\LOCAL_CI.md
Get-Content scripts\local-ci.mjs
node scripts/local-ci.mjs --help

# Chạy profile release theo cú pháp ĐÃ XÁC MINH từ file cấu hình,
# không thay đổi stage hoặc dùng --help giả định là lệnh run.

# Sau khi review, merge và kiểm tra merged-main:
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
```

**Lưu ý:** `node scripts/local-ci.mjs --help` chỉ là bước kiểm tra khả năng hiển thị usage, **không mặc định chứng minh script có hỗ trợ --help**. Nếu không hỗ trợ, đọc tài liệu/cấu hình và chạy lệnh thực tế đã định nghĩa; tuyệt đối không coi lỗi usage là lỗi CI sản phẩm.

## Mẫu báo cáo Development/CI

```md
# MH-07 / PR #106 — Development & Release Evidence
- Repository / branch / PR:
- Tested HEAD SHA:
- Latest origin/main SHA:
- Working tree clean? (yes/no):
- Node / npm / OS / target runtime:
- Changes (files, architectural rationale):
- Review findings / risks / disposition:
- Focused tests (command, counts, exit code):
- Full Local CI Release (command, each stage, exit code):
- Playwright desktop/mobile results:
- Windows native build + protocol self-test:
- Evidence path and summary.json SHA256:
- QA UAT reference #105 and disposition:
- Outstanding P0/P1/P2/P3:
- Merge status (Draft / Ready / Merged / Blocked):
- If merged: merge SHA + merged-main Release evidence:
- Accepted scope and explicitly unsupported functionality:
- Next vertical slice / PR / owner / dependency:
```

---

# 3. Phân công song song và trình tự đồng bộ

| Thời điểm / gate | Team Tester | Team Development / Local CI | Điều kiện chuyển bước |
|---|---|---|---|
| **Gate A — Baseline** | UAT PR #104 trên merged main, issue #105 | Review PR #106, xác minh contract + code diff | Có baseline SHA, task ownership |
| **Gate B — Candidate** | Thực thi QA-106-01..07 trên PR HEAD | Fix & unit/integration/E2E, chạy Local CI Release | Có evidence candidate cùng SHA |
| **Gate C — Defect resolution** | Reproduce + retest mỗi bug | Sửa từng bug, cung cấp fix SHA | Không P0/P1 chưa giải quyết |
| **Gate D — Release approval** | Nộp UAT verdict scoped | Review độc lập, Release PASS, merge khi được phép | Hai team xác nhận; không merge thiếu gate |
| **Gate E — Post-merge** | Smoke regression trên merged main | Local CI Release trên merge SHA, sync ledger | Evidence cùng commit chính xác |
| **Gate F — Next slice** | Thiết kế test cases theo contract mới | Triển khai MH-07/MH-11 end-to-end PR riêng | Không phá contract/baseline đã qua |

## Bảng phân loại defect và chặn merge

- **P0 — Block:** mất/corrupt dữ liệu, lộ dữ liệu nhạy cảm, thay đổi `.fm` ngoài ý muốn, phá vỡ trust boundary.
- **P1 — Block:** cảnh báo sai điều kiện cốt lõi, A/B/source isolation lỗi, Apply/Undo làm sai đội hình, flow không hoạt động.
- **P2 — Cần xử lý hoặc chấp thuận ngoại lệ:** accessibility/i18n/responsive ảnh hưởng rõ rệt nhưng còn workaround; không tự ý bỏ qua.
- **P3 — Có thể theo dõi sau với owner approval:** sai lệch thẩm mỹ nhỏ, không ảnh hưởng dữ liệu/quyết định/thao tác.

---

# 4. Tiêu chí nghiệm thu cuối cùng

**Tính năng thuộc PR #104/106 chỉ được coi là nghiệm thu khi:**
- [ ] QA có kết quả từng case + evidence cho build/SHA cụ thể.
- [ ] Unit/integration/E2E/Windows native/Local CI Release áp dụng thực sự chạy và PASS theo cấu hình hiện tại (không bỏ stage).
- [ ] Không có P0/P1 mở; P2/P3 có quyết định rõ nếu tồn tại.
- [ ] Independent review phê duyệt; PR #106 không còn Draft khi merge.
- [ ] Sau merge có post-merge Release evidence trên `main` đúng SHA.
- [ ] Ledger cập nhật giới hạn và trạng thái trung thực; chưa có native FM2013 tactic verification, save writer, verified CA/PA hoặc match prediction.

**Điểm kết thúc hiện tại:** PR #104 đã merge (người dùng báo cáo Release PASS); PR #106 được tạo và đẩy code/test nhưng **chưa được chạy CI trong phiên chuẩn bị tài liệu này**. Team nhận nhiệm vụ phải độc lập xác minh test và không biến trạng thái Draft thành Completed chỉ qua văn bản này.
