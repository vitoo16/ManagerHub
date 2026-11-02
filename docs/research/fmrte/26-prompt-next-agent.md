# Prompt tiếp quản — không có Computer Use

Copy nguyên block dưới cho model coding tiếp theo. Prompt không yêu cầu một model cụ thể; agent phải kiểm tra tool thực có và báo giới hạn thay vì giả định.

```text
Bạn tiếp tục phát triển ManagerHub từ repository https://github.com/vitoo16/ManagerHub,
nhánh research/fmrte-static. Code research baseline là7588216; lấy cả các commit
handoff mới hơn trên nhánh. Không merge main hoặc force-push.

Đây là yêu cầu thực thi code đến acceptance, không chỉ lập plan. Tôi không có
nhu cầu điều khiển native FM/FMRTE trong gói việc này. Bạn có thể không có
Computer Use; dùng filesystem/shell/test/browser automation thực có. Không
claim đã chụp màn hình/test khi chưa thực hiện. Không thay phạm vi27 module
thành MVP và không đánh dấu phase/module hoàn thành vượt bằng chứng.

Trước khi sửa:
- Kiểm tra git status, bảo toàn mọi thay đổi người dùng; không reset/clean.
- Đọc AGENTS.md và execution charter/kế hoạch7phase ở docs/implementation/.
- Đọc docs/research/fmrte/25-handoff-no-computer-use.md, reports20/22/23/24,
  evidence-manifest.json, domain schema/provenance và compatibility specs.
- Áp dụng các skill liên quan thực sự cài sẵn: save-safety cho ingestion,
  data-ux/football-intelligence khi có analytics, app-screen UI/motion/React
  skills theo AGENTS khi thay UI. Không dùng marketing landing workflow.
- Inspect code hiện có trước khi thiết kế thêm abstractions. Chốt interface,
  file ownership/task map và review độc lập theo repository policy.

Trạng thái đã chứng minh:
- Reader research exact FM2013 13.3.3f359652:4036Player+22PlayerStaff=4058,
  49ordinary attrs,15position bytes,DOB,primaryNation,gameDate; calendarAge là
  derived_model có policy riêng, không ActualAge/FMRTE-engine equivalence.
- Shared strict parser trả immutable GameSnapshot, live_game/provisional,
  roster/currentness/career identity không verified. Ticket10min binds
  UUID/PID/creation FILETIME/path/hash/scriptSHA; real local workflow đã qua
  Editor/Realism. Output luôn historical_capture, không current/live watcher.
- Realism lọc49attrs/15familiarity và suppliedDOB/nation/derivedage trước
  return/serialize; scouting knowledge chưa decode. CA/PA/contract canonical
  vẫn null. Không tự mở chúng từ một vài reference matches.
- Không có Tauri/Rust host, product IPC, historical live-snapshot consumer/UI
  hoàn chỉnh, offline .fm player decoder hoặc certified writer.
- Baseline npm run check:128Vitest+98Node=226,TypeScript/build/budgets qua.
  Đây là baseline cần tái kiểm tra, không phải kết quả của lượt chạy của bạn.

GÓI VIỆC BÂY GIỜ:
Implement consumer snapshot lịch sử end-to-end trong shared web UI hiện có:
user chọn address-free wire JSON, chọn mode, parse trong worker bằng
parseFm2013LiveCapture, thấy coverage/provenance/unknown, duyệt/search player,
lưu local, reload và mở lại. Tái sử dụng code ở domain và worker patterns.
Chưa import normalized wrapper bất kỳ bằng type assertion; mọi data từ file
hoặc persistence đều untrusted và phải có validation/privacy contract rõ.

Yêu cầu triển khai:
1. Historical store/schema riêng với validation/versioning; không cast vào
   PlayerDataset hoặc nới export-only player-library. Không tự merge career.
2. Worker bounded input/cancel/error/partial/empty/rejected; không Node,
   PowerShell, Frida, handles hoặc process APIs trong browser. Không persist
   raw exact-value wire trong luồng Realism.
3. Nối navigation/state thật; VI/EN, source/build/mode/time/missing reasons,
   history label rõ. Nút nào thêm phải có hành vi và error state thực.
4. Privacy ở data/store/query/export/reload/mode-switch; Editor data đã lưu
   không được rò vào Realism. Unknown khác zero, tuổi phải label derived.
5. Persistence phải xét payload hàng chục MiB, quota/corruption/duplicate
   imports/removal; không chọn localStorage chỉ vì tiện. Bám architecture/ADR
   và reuse; không thêm competing backend/framework không cần thiết.
6. Không nối live fields sang eCA/roles/squad optimizer trước khi có projection
   edition-aware/eligibility/calibration đúng. PrimaryNation không có nghĩa
   mọi citizenship; club relation không chứng minh current employment/loan.
7. Unit/integration cho schema/worker/store/privacy/errors; Playwright cho
   import→browse→persist→reload→switch mode. Kiểm tra VI/EN, keyboard,
   reduced motion, desktop/mobile/200%zoom và source badges theo skills.
   Synthetic fixtures ghi rõ trong tests, không fake production roster.
8. Chạy npm run check và các check UI/E2E thực sự liên quan; báo command,
   pass/fail/skipped và lý do chưa chạy. Update ledger/compat/docs đúng scope;
   commit chức năng nối thật, không dừng ở plan hoặc stub.

Private artifacts không ởGit. Localroot hiện tại:
<LOCAL_USER_PROFILE>\.codex\visualizations\2026\10\30\01a18c2c-5b30-7ac2-841d-290449543b12
Có wire thật fm13-dated-wire.json/fm13-biography-wire.json cho local manual
validation nếu máy này còn file. Không commit/upload chúng, screenshots thật,
CIL, memory data, binaries, save hoặc license. Clone máy khác có thể thiếu
toàn bộ raw evidence: báo rõ và vẫn làm portable tests, không fabricate.

Không cần REA để code consumer trên contract hiện có. Nếu mở rộng field/runtime:
discover MCP REA/tool schemas thật; user yêu cầu nếu không kết nối được thì
dừng phần REA và báo. Không có Computer Use không ngăn static/Frida nếu tool
được cấp, nhưng không được bịa UI reference. Không hardcode PID cũ; sandbox
not-found không chứng minh process đã đóng toàn máy. Không fake creation time,
không tự reinstall/configure/privilege fallback. Native UI validation mới,
writer,build khác,career lineage và offline codec giữ gate riêng.

Kết thúc với: thay đổi cụ thể, acceptance đã đạt, tests chạy thật, giới hạn,
commit/branch. Không tự push nếu chưa được tôi yêu cầu cho các commit mới.
Không claim27modules/product reader/editor certified chỉ vì consumer xong.
```
