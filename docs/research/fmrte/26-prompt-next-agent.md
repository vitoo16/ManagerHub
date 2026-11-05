# Prompt tiếp quản — Phase 2 sau Historical Snapshot Consumer

Copy block dưới cho coding agent tiếp theo. Prompt yêu cầu kiểm tra repository thật, thực thi code đến acceptance và báo đúng evidence; không giả định model có Computer Use, REA, private files hoặc quyền merge.

```text
Bạn tiếp tục phát triển ManagerHub:
https://github.com/vitoo16/ManagerHub

## 1. Baseline và quy trình bắt buộc

- Bắt đầu bằng fetch và kiểm tra trạng thái GitHub; dùng main mới nhất làm product baseline.
- Không mặc định checkout `research/fmrte-static`: đây là nhánh nghiên cứu lịch sử, không phải baseline sản phẩm.
- Đọc root AGENTS.md trước; sau đó chỉ đọc phần liên quan của:
  - docs/implementation/00-execution-charter.md
  - docs/implementation/01-full-delivery-plan.md
  - docs/implementation/05-feature-acceptance-ledger.md
  - docs/system/03-domain-schema-and-provenance.md
  - docs/system/04-save-reader-compatibility.md
  - .agents/skills/managerhub-save-safety/SKILL.md
  - docs/research/fmrte/25-handoff-no-computer-use.md
- Kiểm tra PR đang mở #75, #76 và #77, exact head SHA, diff, review threads và CI. PR #75 là stacked dependency trên parser foundation #76; merge #76 trước rồi refresh #75. Nếu job có `runner_id=0`, không có steps và logs trả `BlobNotFound`, đó là failure trước runner assignment, không phải kết quả test code; không dựa vào CI của commit cũ. Chỉ merge khi CI chạy thật trên exact head.
- Đọc docs/research/fmrte/28-save-fixture-corpus.md để biết test fixtures nào đã tồn tại và đâu là blocker evidence; không tạo fixture trùng hoặc gán synthetic evidence thành real build evidence.
- Không merge PR, đóng PR hoặc thay đổi main nếu chưa có phê duyệt rõ ràng. Không force-push. Dùng branch riêng và PR có mô tả WHAT/WHY/evidence/tests/limits.
- Không reset/clean checkout có thay đổi người dùng; không ghi đè private data.

Dự án là full product 27 modules theo 7 integration phases, không MVP. Plan quy định scope; execution charter quy định engineering/security; acceptance ledger là trạng thái thực tế. Không tự sửa roadmap chỉ để khớp tiến độ.

## 2. Những gì đã triển khai — không làm lại

- Historical Snapshot Consumer đã merge vào main qua PR #58; local capture-to-wire handoff qua PR #59.
- Shared worker import dùng strict `parseFm2013LiveCapture`, bounded input và typed errors.
- Historical snapshot có schema/version validation, immutable Editor/Realism projections, store IndexedDB tách biệt, reload validation, search/browse và provenance/coverage.
- Đây là historical capture, không phải live watcher, product IPC hoặc authenticated current-game state.
- `PlayerDataset`/player-library hiện tại vẫn là export-only; không cast live snapshot sang đó.
- Save Library hiện chỉ làm local read-only metadata inspection, SHA-256 khi khả dụng, signature/container observations và experimental archive directory catalogue. Original .fm bytes không được persist.
- Reuse `packages/domain/src/archive.ts`, `archive-metadata.ts`, `archive-codec.ts`, `archive-gaps.ts`, `save.ts`, `save-signature.ts`, `save-library.ts` and `packages/storage/src/save-inspections.ts`. The shared `isSafeArchiveIndexMetadata()` contract owns member/name/file bounds and overlap checks across parser, gap, codec and persistence consumers. Keep the TypeScript `SaveInspectionResult`/`ArchiveIndex` in-memory types separate from `SaveIdentity`/`PersistedArchiveIndex` persisted types. Keep `isSaveInspectionResult()` (ephemeral worker result) separate from `isSaveIdentity()` (persisted IndexedDB schema): the latter must reject `probes` and `gapObservations` keys entirely, including empty/undefined own properties. Save Library validates each ephemeral gap observation against adjacent sorted members, exact gap size, shared sample thresholds and marker-count bounds. Codec trials are bounded length-only hypotheses; do not duplicate them or treat size match as payload decoding.
- Compatibility profile registry vẫn empty; không có offline .fm player decoder, verified CA/PA reader hoặc certified writer.

## 3. Bằng chứng FM2013 và giới hạn phải giữ

Exact research target: FM2013 build `13.3.3f359652` cùng FMRTE13 `13.3.3.62`. Các capture lịch sử có 4,036 Player + 22 PlayerStaff = 4,058 observed records; 49 ordinary attributes, 15 position bytes, biography và game date đã được nghiên cứu. Đây không phải bằng chứng toàn bộ career/database hay mọi build.

- Ordinary attributes và một số biography fields ở Editor vẫn provisional; Realism redacts exact values trước return/serialization.
- `calendarAge` là `derived_model` có policy/version riêng, không phải ActualAge hay FMRTE-engine equivalence.
- CA/PA canonical vẫn null; một số reference matches không đủ để bật reader.
- Club link không chứng minh current employment/loan; primary nation không chứng minh citizenship hoặc eligibility.
- Career lineage, atomic capture, loaded image authentication và product IPC vẫn chưa được chứng nhận.
- FMRTE26 research là nhánh riêng; không chuyển offsets, role semantics hoặc build assumptions giữa editions.
- AFE signature và trailing FMF directory marker là structural observations. 18-byte payload base chỉ là một layout observation trong sample, không phải universal format rule.
- Prefix `zlib_candidate`, repeated marker, member name hoặc directory catalogue không chứng minh payload codec hay player records.

## 4. Gói việc được giao: Phase 2 save compatibility

Tiếp tục B1 corpus/detection, B2 adapter research/framework và B5 verification trong Phase 2. Không mở decoder hoặc profile production chỉ để tăng số tính năng.

Ưu tiên theo thứ tự:

1. Review/finalize PR #76 (archive parser) and PR #75 (Save Library identity/persistence) in dependency order and against exact current heads. Verify ID/hash binding, secure random fallback, legacy record compatibility, file/directory/member bounds, AFE family binding, unsafe labels, malformed UTF-16, mutation tests, and the strict ephemeral-vs-persisted schema boundary.
2. Kiểm tra parser input boundaries, candidate-count/decompression/member/name bounds, duplicate/overlap rules, worker timeout/cancellation và persistence validator. Mọi exported helper nhận input untrusted phải fail closed hoặc có typed error.
3. Mở rộng portable synthetic fixture corpus và deterministic fuzz/property tests. Test malformed/truncated/oversized/mutated input, offset overflow, duplicate names, overlapping extents, bad encoding, decompression cap và marker-heavy tails.
4. Chỉ nghiên cứu member payload codec khi có raw sample được người dùng cho phép dùng, byte-level evidence lặp lại và đối chiếu nhiều member. Không đoán codec từ prefix hoặc tên file.
5. Khi có verified exact-build decoder: giữ adapter versioned, immutable snapshot, per-domain coverage, source/provenance và unknown/null. Kiểm chứng field với same-build game values trước khi đăng ký profile.
6. Cập nhật compatibility docs/acceptance ledger chỉ với evidence đã quan sát. Không đánh dấu MH-01/MH-05 hoặc Phase 2 Complete khi còn thiếu corpus, field verification hoặc unsupported/error UX.

## 5. Safety và architecture

- Save files là untrusted binary. Read-only immutable; không write-back, patch, mutate game process hoặc bypass platform protections.
- Không upload save/raw wire/private Evidence, screenshots, CIL, memory data, binaries hoặc license lên Git/cloud.
- Không dùng filename/size/mtime làm content fingerprint. Tách record identity và content hash.
- Không dùng localStorage cho payload lớn; không thêm backend/framework/package manager/runtime mới nếu chưa có ADR và measurable benefit.
- Giữ VI/EN i18n. Chỉ dùng skills liên quan; save work dùng managerhub-save-safety. Không load toàn bộ vendored skills.
- Nếu thiếu private fixture hoặc native UI evidence, chạy portable tests và ghi blocker; không fabricate real fixture, process identity, screenshot hay game reference.
- Không claim React/browser test chứng minh native Windows, FMRTE, game-load hoặc writer behavior.

## 6. Validation và kết thúc

- Chạy các check liên quan trên exact branch/head: npm ci khi lockfile/dependency environment yêu cầu; npm run check; npm run test:e2e cho UI/critical journey changes.
- Báo command cụ thể, pass/fail/skipped, CI run URL/SHA, tests count nếu được tool xác nhận. Không ghi “all tests passed” nếu browser/E2E chưa xong.
- Mỗi PR mô tả scope, risk, reused abstractions, migration/backward compatibility, tests và unsupported limits.
- Cuối lượt báo: code paths thay đổi, acceptance đạt/chưa đạt, exact commits/PRs, CI, blockers và next bounded task.
- Không tuyên bố hoàn thành 27 modules, offline decoder, CA/PA, writer hoặc phase chỉ vì structural parser tests xanh.
```
