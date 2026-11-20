# Handoff — phát triển tiếp không cần Computer Use

Ngày cập nhật: 2026-11-21, Asia/Ho_Chi_Minh. Repo: https://github.com/vitoo16/ManagerHub. Baseline đã đối chiếu là `main` tại `0d8fac2f5d5bd0256709abda0a01850fceb3ce5f` (sau merge #82/#77/#79); **luôn fetch lại `main` và đọc PR mới nhất trước khi làm**. Nhánh `research/fmrte-static` là lịch sử nghiên cứu. Không diễn giải việc merge tài liệu hoặc test là chứng nhận reader/editor hoặc hoàn thành 27 module.

## 1. Bắt đầu trên đúng checkout

Yêu cầu công cụ Node >=22.12.0 theo package engine; **Local CI chính thức yêu cầu Node 24** theo `ci/local-pipeline.json`. Trên Windows PowerShell, dùng `npm.cmd` nếu execution policy chặn shim `.ps1`. Bắt đầu từ `main` mới nhất; chạy Local CI bằng `scripts/local-ci.mjs` theo `docs/engineering/LOCAL_CI.md` khi cần Quick/Full/Release, không thay thế bằng các test của commit khác.

```powershell
git fetch origin
git switch main
git pull --ff-only
git status --short --branch
npm ci
npm run check
```

Nếu checkout đã có thay đổi người dùng, giữ nguyên và đánh giá trước khi đổi nhánh; không reset/clean để chạy các lệnh trên. `npm ci` dùng lockfile hiện có; không nâng dependency theo suy đoán. Baseline đã chạy TypeScript,128 Vitest +98 Node =226 tests, build và bundle budgets. Số test có thể tăng sau bàn giao; không giữ cứng226 bằng cách bỏ test.

Đọc theo thứ tự: `AGENTS.md`; execution charter và kế hoạch7 phase trong `docs/implementation/`; `docs/system/03-domain-schema-and-provenance.md`; `docs/system/04-save-reader-compatibility.md`; các report20,22,23,24, `28-save-fixture-corpus.md` và `evidence-manifest.json` ở thư mục này. Report cũ là diễn tiến lịch sử, không dùng câu UNKNOWN đã được report mới giải quyết làm trạng thái hiện tại. [Prompt tiếp quản](26-prompt-next-agent.md) có thể copy nguyên văn.

## 2. Đã làm thật và giới hạn

| Hạng mục | Evidence hiện tại | Không được suy diễn |
|---|---|---|
| Target chính | FMRTE13 `<FMRTE13_INSTALL_ROOT>\FMRTE.exe`,13.3.3.62; FM2013 `<FM2013_INSTALL_ROOT>\fm.exe`,13.3.3f359652 | Không hỗ trợ mọi build hoặc phiên bản FM. SHA/MVID cụ thể nằm trong profile/manifest. |
| Cohort | 4,036 Player +22 PlayerStaff =4,058 ID;49 ordinary attrs,15 position bytes; ngày sinh/quốc tịch chính và ngày game đã capture | Không phải chứng minh toàn database/career/field đều đúng. Native Nation/Team RTTI chưa kiểm chứng rộng. |
| Reference |147 ordinary values +6 CA/PA trên3 record;15 vị trí trên1 record;3 DOB/3 tên quốc tịch;1 ngày game trên ảnh FM mới | FMRTE không phải oracle engine cho mọi field; nhiều receipt là lịch sử, không phải ảnh mới. Không cộng các lượt so sánh thành số cầu thủ độc lập. |
| CA/PA | Có static decoder và6 reference matches | Canonical batch snapshot vẫn null; không bật ActualCA/PA hoặc suy ra PA. |
| Tuổi | `calendarAge`, source `derived_model`, policy `gregorian-month-day-v1`, asOf game date | Không gọi ActualAge. Công thức FMRTE khác month/day tại127/995 synthetic boundary cases;4 bất đồng cohort là tính toán, không phải4 quan sát UI. |
| Club/contract | Club link có relation gốc; contract date/money đã nghiên cứu hạn chế | Link không chứng minh current employment/loan. Wage/frequency/currency/expiry canonical vẫn null. |
| Privacy | Realism redacts49 attrs,15 familiarity, supplied DOB/nation và derived age trước return/serialize | Chưa giải mã scouting knowledge; không tự mở exact values vì gắn nhãn ordinary. |
| Lifecycle | Ticket10 phút; UUID +PID +creation FILETIME +path/hash +script SHA; real prepare→REA→finalize cả2 mode qua4,058 record | Không có watcher/IPC, signed attestation, one-use tokens, atomic career hay identity của save. Output luôn historical, currentness unverified. |
| Offline/writer | AFE directory inspection, static write boundaries | `.fm` player decoder và writer chưa hoạt động/chứng nhận. Không chạy thử ghi. |
| FMRTE26 | So sánh static riêng,26.3.2.42 tại `<FMRTE26_INSTALL_ROOT>\current\FMRTE.dll` | Không chuyển offset/roles/engine semantics sang13 hoặc ngược lại. Delegate implementation còn thiếu. |

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
| `packages/domain/src/archive.ts`, `archive-metadata.ts`, `archive-codec.ts`, `archive-gaps.ts` | Bounded structural catalogue parsing, one shared archive-index validator and base/size limits reused by parser, gap, codec and persistence consumers; experimental, no decoded member payloads. |
| `packages/domain/src/save.ts`, `save-signature.ts`, `save-library.ts`, `packages/storage/src/save-inspections.ts` | Read-only save inspection; distinct `SaveInspectionResult`/`SaveIdentity` TypeScript contracts; canonical AFE/FMF detection, worker/persistence validation, unhashed record identity and metadata-only opt-in IndexedDB. |
| `packages/domain/src/player-import.ts`, `player-library.ts` | Existing **export-only** `PlayerDataset`/library. Không cast live snapshot vào đây hoặc nới literal provenance. |
| `packages/domain/src/historical-live-snapshot.ts` | Strict historical snapshot contract, schema validation, immutable Editor/Realism projections and mode filtering. |
| `apps/web/src/features/historical-snapshots/`, `useHistoricalSnapshotLibrary.ts`, `workers/historical-snapshot.worker.ts` | Historical workspace, bounded import worker, local persistence, search/browse and reload flow (merged PR #58). |
| `apps/web/src/import-historical-capture.ts`, `historical-library-sync.ts` | Address-free wire admission and persistence synchronization; inspect before extending the existing flow. |
| `apps/web/src/App.tsx`, `usePlayerLibrary.ts`, workers/ and `inspect-save-in-worker.ts` | Shared frontend/worker/persistence patterns; inspect before adding a parallel path. |

Không có Cargo/Tauri host hiện thực ở baseline. Target kiến trúc vẫn shared React/Tauri; không dựng HTTP server thứ hai chỉ để chạy offsets.

## 4. Trạng thái consumer lịch sử và gói việc tiếp theo

### Đã tích hợp vào main

Historical snapshot consumer **đã được triển khai và merge trong PR #58** (merge commit `d918a68`); CI [#41490068166](https://github.com/vitoo16/ManagerHub/actions/runs/41490068166) đã chạy TypeScript, unit tests, production build/bundle budget và Playwright desktop/mobile. PR #59 bổ sung portable local capture-to-wire handoff. Không triển khai lại các phần đã có.

Phạm vi consumer hiện có:
- Người dùng chủ động import address-free wire JSON qua worker bounded.
- Parser strict dùng `parseFm2013LiveCapture`; schema và build/profile mismatch được phân loại.
- Editor/Realism có projection và IndexedDB store tách biệt, versioned; reload có schema validation và mode filtering.
- Historical workspace có danh sách snapshot, search/browse player, provenance/coverage và trạng thái missing.
- Import là historical capture; không có watcher, product IPC hoặc trạng thái currently-live.
- Realism redaction diễn ra ở domain/storage/query/serialization boundary, không chỉ ẩn ở UI.
- Không cast snapshot sang export-only `PlayerDataset`; không mở Actual CA/PA, wage, contract hoặc eligibility.

### Gói Phase 2 còn lại

Mục tiêu tiếp theo vẫn là **B1 corpus + detection, B2 adapter research/framework, B5 verification** trong [Phase 2](../../implementation/01-full-delivery-plan.md), không phải một UI consumer thứ hai.

1. **Giữ parser/container inspection ở mức structural:** AFE signature và trailing FMF directory candidate chỉ là observations. Directory/member metadata, prefix samples và gap markers không chứng minh member payload đã decode.
2. **Mở rộng portable fixture corpus:** synthetic fixtures cho valid, truncated, malformed UTF-16, duplicate names, overlap, invalid offsets, marker-heavy tails, decompression bounds và corruption. Mỗi fixture ghi rõ synthetic hay user-consented real sample.
3. **Nghiên cứu member payload độc lập:** `archive-codec.ts` hiện chỉ chạy length-only codec hypothesis trials có giới hạn; không trả member payload. Tái sử dụng và review implementation này, không tạo decoder song song. Chỉ xác nhận codec/envelope khi có raw sample được phép dùng, repeatable byte-level evidence và đối chiếu nhiều member. Không kết luận zlib chỉ từ hai byte candidate hoặc prefix lặp; không giải nén dữ liệu không có output/memory bounds.
4. **Exact-build coverage:** edition/build phải được xác minh độc lập. AFE/FMF family signature không phải build identity. Không đăng ký production profile khi chưa có per-domain reference và same-build game comparison.
5. **Persistence integrity:** mọi IndexedDB record và worker result là untrusted; kiểm tra ID/hash consistency, file-size/directory/member extents, duplicate identity và migration. Original save bytes không được persist hoặc mutate.

**Trạng thái PR đã tích hợp (21/11/2026):** [#76](https://github.com/vitoo16/ManagerHub/pull/76) đã đóng do toàn bộ nội dung được bao phủ bởi [#75](https://github.com/vitoo16/ManagerHub/pull/75). PR #85 (Local CI provenance) được merge trước #75 (Save Library archive hardening). Sau đó #82 (PID boundary tests), #77 (handoff) và #79 (FM27 research) đều đã merge vào `main` tại `0d8fac2`. **Không thực hiện lại thứ tự merge #76 → #75.** Công việc triển khai tiếp theo là [#81](https://github.com/vitoo16/ManagerHub/issues/81) và [PR #86](https://github.com/vitoo16/ManagerHub/pull/86) cho native-side read-only guard, chưa phải live reader được chứng nhận.

### Blocker và acceptance

Private save samples/evidence không được commit hoặc upload. Nếu không có raw sample được người dùng cho phép, tiếp tục synthetic/property tests và tài liệu hóa giới hạn; **không chế tạo payload fixture giống thật, không giả codec và không tuyên bố decoder**.

Acceptance cho bước tiếp theo: deterministic bounded parser; malformed inputs không crash; member extents nằm trong file và trước directory; no duplicate/overlap; output chỉ là metadata structural; CI/test evidence gắn với commit cụ thể; compatibility registry vẫn empty cho đến khi exact-build decoder được kiểm chứng.

**CI status (updated 21/11/2026):** GitHub-hosted Actions từng thất bại trước runner ở PR #75–#79, được theo dõi trong [#80](https://github.com/vitoo16/ManagerHub/issues/80); đó là sự cố lịch sử chưa được kết luận chính xác, không phải bằng chứng test code lỗi. Local CI Windows đã được chủ repository ghi nhận cho #85 head `724be37` và #75 head `efde1c4`: Quick 6/6, Full 8/8, Release 9/9, Playwright desktop/mobile 112/112; cả hai đã merge vào `main`. Các bản báo cáo giữ trong bình luận PR, log gốc vẫn ở máy local. **Chưa thay bằng kết quả chạy trên merge SHA hoặc PR #86**: yêu cầu clean exact-head Local CI với `acceptanceEligible=true` trước mọi kết luận nghiệm thu. Không khôi phục GitHub-hosted triggers tự động ngoài quyết định DevOps mới.

## 5. Tool và evidence khi không có Computer Use

Coding, tests, CLI và browser automation không yêu cầu điều khiển native FM/FMRTE. Nếu được cấp MCP REA, model vẫn có thể dùng static managed analysis và Frida không qua GUI. Phải discover tool/schema thực tế; không suy ra tool từ tên trong tài liệu.

Để làm consumer ở mục4, không cần game đang chạy hay raw private fixture: portable synthetic tests phải tự chạy. Đối chiếu field mới với FM/FMRTE UI, chứng nhận writer, nghiên cứu native phức tạp và build/career mới cần giao cho agent/người có công cụ phù hợp. Không giả vờ đã xem ảnh hoặc chạy validation thiếu tool. Browser Playwright có thể kiểm tra app web khi browser/tooling khả dụng; nó không thay thế bằng chứng native-game UI.

Khi cần REA trên máy này: user yêu cầu **nếu MCP REA không kết nối thì dừng phần REA và báo**, không tự reinstall/configure. Không giả creation time khi sandbox không thấy process. Quan sát đã gặp: MCP thấy game, sandbox observer báo not-found; host-visible read-only execution đã được approval review cho phép và chạy thật. CLI không tự nâng quyền. Một not-found trong namespace không chứng minh game đã đóng trên toàn máy.

Runtime workflow: discover PID hiện tại; `prepare` tạo request/script mới; explicit REA attach/load; đóng session trong `finally`; export complete Evidence; `finalize` với Evidence ID cụ thể trong10 phút. Đọc report24 để xem flags. Không tái dùng PID22984 hoặc UUID/ticket đã hết hạn từ lịch sử. `prepare` không attach; `finalize` không chọn Evidence mới nhất hộ người dùng.

## 6. Private artifacts và tính di động

Không nằm trong Git:

`<LOCAL_USER_PROFILE>\.codex\visualizations\2026\10\30\01a18c2c-5b30-7ac2-841d-290449543b12`

Manifest tham chiếu nhiều file ở đây. Một clone trên máy khác **không có raw evidence** chỉ vì có manifest. Không tải lên Git/cloud để chữa thiếu fixture. Trên máy hiện tại có thể dùng raw wire `fm13-dated-wire.json` hoặc `fm13-biography-wire.json` cho import lịch sử; đây là dữ liệu thật/private, không phải test fixture công khai. Session request/script/Evidence và `fm13-session-editor.json`/`fm13-session-realism.json` là thí nghiệm lifecycle; ticket đã hết hạn, output vẫn là lịch sử.

Private audit/helper quan trọng: `check-fmrte-evidence.cjs`, `verify-fm13-session-workflow.mjs`, `fm13-session-workflow-verification.json`, `fm13-host-observer-final-verification.json`, `fm13-session-expiry-verification.json`, `fm13-local-session-independent-review-v3.json`. Snapshot modes, captures, CIL và screenshot ở đây phải tiếp tục private. Audit script cần đúng checkout cwd; không gọi nếu artifacts không có rồi báo PASS giả.

```powershell
npm run check
npm run test:e2e
```

`check` gồm typecheck, unit/Node tests, build và bundle budgets. E2E/visual không được claim từ `check`; cần chạy riêng khi thay UI. Rust fmt/clippy/fuzz chỉ báo khi có Rust code/toolchain thực và đã chạy. Khi handoff sang máy khác, tái chạy portable checks; ghi rõ private audit/real replay chưa tái chạy nếu thiếu artifacts.

## 7. Quy tắc quyết định khi bị chặn

Chưa có field/source/reference → để unknown và giữ capability disabled. Chưa có native UI tool → tiếp tục việc độc lập bằng code và ghi gate còn lại. Chưa có private artifact → chạy synthetic/code checks, không dựng lại values như dữ liệu thật. Không cài REA/Ghidra/dependency để giải quyết vấn đề không cần chúng. Không chỉnh save/game, activation, hoặc tự thử writer; những thao tác đó cần scope/approval và certification riêng theo skill save-safety.
