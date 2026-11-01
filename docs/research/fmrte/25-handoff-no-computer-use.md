# Handoff — phát triển tiếp không cần Computer Use

Ngày bàn giao: 2026-11-01, Asia/Bangkok. Repo: https://github.com/vitoo16/ManagerHub. Nhánh `research/fmrte-static`; code baseline `7588216`. Commit chứa tài liệu này nằm sau baseline. Nhánh đã được push; chưa merge vào `main`. Đây là bàn giao phần phát triển phần mềm từ evidence đã có, không phải chứng nhận reader/editor sản phẩm hoặc hoàn thành 27 module.

## 1. Bắt đầu trên đúng checkout

Yêu cầu Node >=22.12.0. Trên Windows PowerShell, dùng `npm.cmd` thay `npm` nếu execution policy chặn shim `.ps1`.

```powershell
git fetch origin
git switch research/fmrte-static
git pull --ff-only
git status --short --branch
npm ci
npm run check
```

Nếu checkout đã có thay đổi người dùng, giữ nguyên và đánh giá trước khi đổi nhánh; không reset/clean để chạy các lệnh trên. `npm ci` dùng lockfile hiện có; không nâng dependency theo suy đoán. Baseline đã chạy TypeScript,128 Vitest +98 Node =226 tests, build và bundle budgets. Số test có thể tăng sau bàn giao; không giữ cứng226 bằng cách bỏ test.

Đọc theo thứ tự: `AGENTS.md`; execution charter và kế hoạch7 phase trong `docs/implementation/`; `docs/system/03-domain-schema-and-provenance.md`; `docs/system/04-save-reader-compatibility.md`; các report20,22,23,24 và `evidence-manifest.json` ở thư mục này. Report cũ là diễn tiến lịch sử, không dùng câu UNKNOWN đã được report mới giải quyết làm trạng thái hiện tại. [Prompt tiếp quản](26-prompt-next-agent.md) có thể copy nguyên văn.

## 2. Đã làm thật và giới hạn

| Hạng mục | Evidence hiện tại | Không được suy diễn |
|---|---|---|
| Target chính | FMRTE13 `C:\BraCa Soft\FMRTE 13\FMRTE.exe`,13.3.3.62; FM2013 `C:\Program Files (x86)\Football Manager 2013\fm.exe`,13.3.3f359652 | Không hỗ trợ mọi build hoặc phiên bản FM. SHA/MVID cụ thể nằm trong profile/manifest. |
| Cohort | 4,036 Player +22 PlayerStaff =4,058 ID;49 ordinary attrs,15 position bytes; ngày sinh/quốc tịch chính và ngày game đã capture | Không phải chứng minh toàn database/career/field đều đúng. Native Nation/Team RTTI chưa kiểm chứng rộng. |
| Reference |147 ordinary values +6 CA/PA trên3 record;15 vị trí trên1 record;3 DOB/3 tên quốc tịch;1 ngày game trên ảnh FM mới | FMRTE không phải oracle engine cho mọi field; nhiều receipt là lịch sử, không phải ảnh mới. Không cộng các lượt so sánh thành số cầu thủ độc lập. |
| CA/PA | Có static decoder và6 reference matches | Canonical batch snapshot vẫn null; không bật ActualCA/PA hoặc suy ra PA. |
| Tuổi | `calendarAge`, source `derived_model`, policy `gregorian-month-day-v1`, asOf game date | Không gọi ActualAge. Công thức FMRTE khác month/day tại127/995 synthetic boundary cases;4 bất đồng cohort là tính toán, không phải4 quan sát UI. |
| Club/contract | Club link có relation gốc; contract date/money đã nghiên cứu hạn chế | Link không chứng minh current employment/loan. Wage/frequency/currency/expiry canonical vẫn null. |
| Privacy | Realism redacts49 attrs,15 familiarity, supplied DOB/nation và derived age trước return/serialize | Chưa giải mã scouting knowledge; không tự mở exact values vì gắn nhãn ordinary. |
| Lifecycle | Ticket10 phút; UUID +PID +creation FILETIME +path/hash +script SHA; real prepare→REA→finalize cả2 mode qua4,058 record | Không có watcher/IPC, signed attestation, one-use tokens, atomic career hay identity của save. Output luôn historical, currentness unverified. |
| Offline/writer | AFE directory inspection, static write boundaries | `.fm` player decoder và writer chưa hoạt động/chứng nhận. Không chạy thử ghi. |
| FMRTE26 | So sánh static riêng,26.3.2.42 tại `C:\BraCa Soft\FMRTE 26\current\FMRTE.dll` | Không chuyển offset/roles/engine semantics sang13 hoặc ngược lại. Delegate implementation còn thiếu. |

Audit baseline:283 method coordinates,2 artifact observations,201 canonical records,19 bundle hashes;424 installation files và3 save samples giữ hash. Chi tiết source SHA, MVID, token/RVA và private artifact references nằm trong manifest; không xem bảng này là certificate.

## 3. Bản đồ code cần tái sử dụng

| File/nhóm | Trách nhiệm |
|---|---|
| `packages/domain/src/fm2013-live-profile.json` | Exact-build identity, native kinds, attrs/positions/biography/game-date offsets và bounds chung. |
| `packages/domain/src/live-snapshot.ts` | `parseFm2013LiveCapture(text,context)` → immutable `GameSnapshot`; ready/partial/empty/rejected, provenance và mode filtering. |
| `packages/domain/src/fm2013-date.ts`, `fm2013-calendar-age.ts` | Conservative native-date decode; calendar model riêng có version, không dùng host clock. |
| `packages/domain/src/live-session.ts` | Pure ticket/admission; không có OS API trong browser/domain. |
| `scripts/pe32-rtti-vtables.mjs`, `fm2013-readonly-record-probe.mjs`, `fm2013-game-date-probe.mjs` | Original file-relative locator và guarded read-only Frida source builders. |
| `scripts/fm2013-live-wire.mjs` | Complete-evidence extraction; legacy v1/v2 tuples; optional outer capture UUID. Không chấp nhận truncated preview. |
| `scripts/fm2013-normalize-live.mjs` | Shared `buildFm2013NormalizedDocument`, bounded fresh-output writer và file-only CLI. |
| `scripts/fm2013-local-session.mjs` | `prepare`/`finalize`; OS-instance admission và historical output wrapper. |
| `scripts/fm2013-process-observer.mjs`, `local-research-files.mjs` | Read-only Windows identity observation; bounded file I/O, fatal UTF-8, absolute built-in PowerShell. |
| `packages/domain/src/player-import.ts`, `player-library.ts` | Existing **export-only** `PlayerDataset`/library. Không cast live snapshot vào đây hoặc nới literal provenance. |
| `apps/web/src/App.tsx`, `usePlayerLibrary.ts`, workers/ và `inspect-save-in-worker.ts` | Existing shared frontend/worker/persistence patterns; xem trước khi thêm đường mới. |

Không có Cargo/Tauri host hiện thực ở baseline. Target kiến trúc vẫn shared React/Tauri; không dựng HTTP server thứ hai chỉ để chạy offsets.

## 4. Gói việc tiếp theo: consumer snapshot lịch sử trong ứng dụng

Mục tiêu: người dùng chủ động chọn **address-free wire JSON**, chọn mode, import qua worker, thấy provenance/coverage, lưu local và mở lại snapshot lịch sử. Dùng parser đang có. Không nhận normalized JSON bất kỳ bằng `as GameSnapshot`; chưa có validator an toàn cho mọi serialized normalized wrapper.

Interface/task map cần chốt trước khi code:

1. **Domain + persisted schema:** store riêng cho historical live snapshots; version/validate mọi dữ liệu đọc lại từ storage; snapshot-scoped IDs, manual career lineage, explicit mode và hash nguồn. Áp dụng visibility boundary khi load/query/export, không chỉ khi vẽ UI. Editor-stored values không được rò vào Realism khi đổi mode/reload.
2. **Worker/import adapter:** file người dùng chọn, byte/text/record bounds theo parser hiện có; progress/cancel/error; schema/build sai, corrupt, partial, empty và rejected tách biệt. Hash bằng browser API phù hợp, không import Node/Frida/PowerShell vào renderer. Không persist raw wire chứa exact values trong luồng Realism.
3. **Historical workspace:** nối vào navigation/composition đang có; danh sách snapshot, detail/search player, source/build/time/mode/coverage và unknown reasons. `live_game` nghĩa nguồn dữ liệu, không đồng nghĩa currently connected. Label tuổi là derived calendar age. Không dùng relation club/nation làm eligibility.
4. **Persistence:** chọn theo architecture/ADR và kích thước thực tế; normalized cohort khoảng hàng chục MiB nên không nhét vào localStorage không xét quota. Kiểm tra quota, dữ liệu hỏng, duplicate import, interrupted storage và removal; không silent overwrite. Không thêm generic framework nếu chỉ có một nhu cầu.
5. **Verification:** domain/storage/worker tests; Playwright hành trình import→browse→save→reload→mode switch; malformed/build mismatch/cancel/quota cases; VI/EN, keyboard, reduced motion, desktop/mobile/200% zoom và source badges. Dùng synthetic fixture được ghi rõ trong test, không seed cầu thủ giả vào sản phẩm.

Đây là gói tích hợp có acceptance đầy đủ trong kế hoạch27 module/7 phase, không đổi dự án thành MVP và không đánh dấu toàn MH-01/03/05 đã xong. Chưa nối live data vào role/eCA/squad analytics nếu chưa có projection edition-aware và eligibility/calibration đúng; không map tên attrs13 thành26 một cách im lặng.

Acceptance của gói này: real user path nối end-to-end; historical/current không nhập nhằng; browser không có process capability; Realism không lộ qua store/query/export; source không bị nâng thành verified; all unknown giữ null; existing game-export import/Player Lab/Squad Planner không regress; full checks và kiểm chứng UI chạy thật; ledger/compat/docs/commit đồng bộ.

## 5. Tool và evidence khi không có Computer Use

Coding, tests, CLI và browser automation không yêu cầu điều khiển native FM/FMRTE. Nếu được cấp MCP REA, model vẫn có thể dùng static managed analysis và Frida không qua GUI. Phải discover tool/schema thực tế; không suy ra tool từ tên trong tài liệu.

Để làm consumer ở mục4, không cần game đang chạy hay raw private fixture: portable synthetic tests phải tự chạy. Đối chiếu field mới với FM/FMRTE UI, chứng nhận writer, nghiên cứu native phức tạp và build/career mới cần giao cho agent/người có công cụ phù hợp. Không giả vờ đã xem ảnh hoặc chạy validation thiếu tool. Browser Playwright có thể kiểm tra app web khi browser/tooling khả dụng; nó không thay thế bằng chứng native-game UI.

Khi cần REA trên máy này: user yêu cầu **nếu MCP REA không kết nối thì dừng phần REA và báo**, không tự reinstall/configure. Không giả creation time khi sandbox không thấy process. Quan sát đã gặp: MCP thấy game, sandbox observer báo not-found; host-visible read-only execution đã được approval review cho phép và chạy thật. CLI không tự nâng quyền. Một not-found trong namespace không chứng minh game đã đóng trên toàn máy.

Runtime workflow: discover PID hiện tại; `prepare` tạo request/script mới; explicit REA attach/load; đóng session trong `finally`; export complete Evidence; `finalize` với Evidence ID cụ thể trong10 phút. Đọc report24 để xem flags. Không tái dùng PID22984 hoặc UUID/ticket đã hết hạn từ lịch sử. `prepare` không attach; `finalize` không chọn Evidence mới nhất hộ người dùng.

## 6. Private artifacts và tính di động

Không nằm trong Git:

`C:\Users\viett\.codex\visualizations\2026\10\30\01a18c2c-5b30-7ac2-841d-290449543b12`

Manifest tham chiếu nhiều file ở đây. Một clone trên máy khác **không có raw evidence** chỉ vì có manifest. Không tải lên Git/cloud để chữa thiếu fixture. Trên máy hiện tại có thể dùng raw wire `fm13-dated-wire.json` hoặc `fm13-biography-wire.json` cho import lịch sử; đây là dữ liệu thật/private, không phải test fixture công khai. Session request/script/Evidence và `fm13-session-editor.json`/`fm13-session-realism.json` là thí nghiệm lifecycle; ticket đã hết hạn, output vẫn là lịch sử.

Private audit/helper quan trọng: `check-fmrte-evidence.cjs`, `verify-fm13-session-workflow.mjs`, `fm13-session-workflow-verification.json`, `fm13-host-observer-final-verification.json`, `fm13-session-expiry-verification.json`, `fm13-local-session-independent-review-v3.json`. Snapshot modes, captures, CIL và screenshot ở đây phải tiếp tục private. Audit script cần đúng checkout cwd; không gọi nếu artifacts không có rồi báo PASS giả.

```powershell
npm run check
npm run test:e2e
```

`check` gồm typecheck, unit/Node tests, build và bundle budgets. E2E/visual không được claim từ `check`; cần chạy riêng khi thay UI. Rust fmt/clippy/fuzz chỉ báo khi có Rust code/toolchain thực và đã chạy. Khi handoff sang máy khác, tái chạy portable checks; ghi rõ private audit/real replay chưa tái chạy nếu thiếu artifacts.

## 7. Quy tắc quyết định khi bị chặn

Chưa có field/source/reference → để unknown và giữ capability disabled. Chưa có native UI tool → tiếp tục việc độc lập bằng code và ghi gate còn lại. Chưa có private artifact → chạy synthetic/code checks, không dựng lại values như dữ liệu thật. Không cài REA/Ghidra/dependency để giải quyết vấn đề không cần chúng. Không chỉnh save/game, activation, hoặc tự thử writer; những thao tác đó cần scope/approval và certification riêng theo skill save-safety.
