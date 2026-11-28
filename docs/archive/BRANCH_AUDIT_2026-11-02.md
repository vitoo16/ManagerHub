# Báo cáo Audit & Kế hoạch Cleanup Nhánh ManagerHub (2026-11-02)

## 1. Tổng quan Trạng thái Repository (`vitoo16/ManagerHub`)

- **Tổng số nhánh trên remote ban đầu:** 59 nhánh
- **Số nhánh đã dọn dẹp thành công:** 49 nhánh (đã xóa an toàn qua Git remote ngày 2026-11-02)
- **Số nhánh còn lại trên remote:** 10 nhánh (bao gồm `main`, `research/fmrte-static` và 8 nhánh review)
- **Nhánh tích hợp chính:** `main` (commit `1c87726188757deda02e23add0e2264848ba90bd`)
- **Nhánh nghiên cứu FMRTE:** `research/fmrte-static` (commit `4cd40ab81f4233dccf5863a22d9e5fd3601885da`)
- **PR tồn đọng:** PR #11 đã được đóng thành công. Hiện có 0 PR mở.

---

## 2. Nhóm 1: Nhánh cần Giữ lại & Phát triển (`research/fmrte-static`)

### Trạng thái phân kỳ so với `main`:
- **Đang có:** 14 commit nghiên cứu độc lập (FM2013 RTTI vtables, readonly memory probe, domain live session, player biography, tests).
- **Đang thiếu:** 4 commit từ `main`:
  1. `39112ae` research(afe): test bounded raw LZ4 block codec hypothesis
  2. `b4d7a59` feat(afe): validate header-directed trailing directory locator
  3. `bf92ddb` fix(afe): verify header-declared FMF marker length before direct catalogue lookup
  4. `1c87726` feat(research): compare full AFE catalogues safely across save versions

### Phân tích xung đột (Conflict Analysis):
- Khi merge `main` vào `research/fmrte-static`, **chỉ có duy nhất 1 file xung đột** là `package.json` ở trường `"scripts": { "test": ... }`.
  - `main` thêm test script `scripts/afe-raw-lz4.test.mjs`.
  - `research/fmrte-static` thêm các test script FMRTE và FM2013 session (`scripts/fmrte13-field-math.test.mjs`, v.v.).
- Xử lý xung đột: Kết hợp cả hai danh sách test script, không có mâu thuẫn logic nào trong mã nguồn domain hay web.
- **Quyết định:** Giữ nguyên trên remote. Khi chuẩn bị tích hợp, thực hiện sync `main` vào `research/fmrte-static`, giải quyết `package.json`, chạy toàn bộ test suite trước khi tạo PR.

---

## 3. Nhóm 2: Nhóm 8 Nhánh Cần Review (Không merge đè vào `main`)

Các nhánh này đã phân kỳ mạnh (ahead 8-77 commits, behind 50-76 commits so với `main`).
Qua đối chiếu chi tiết diff và git log:

| STT | Tên nhánh | Tip SHA | Phân tích giá trị & Tình trạng tích hợp | Quyết định |
|---|---|---|---|---|
| 1 | `work/i18n-player-import-guidance` | `6f6e539` | 9 commit sau merge tập trung vào `squad contribution preview` trực tiếp trong `PlayerWorkspace.tsx`. Toàn bộ tính năng và bản dịch tiếng Việt này **đã được tái cấu trúc thành công vào `RecruitmentPreviewPanel.tsx` và `apps/web/src/i18n/vi.ts` trên `main`**. | **Không merge lại**. Giữ làm tham chiếu lịch sử hoặc xóa sau khi nghiệm thu. |
| 2 | `work/component-performance-refactor` | `db164fc` | Các hook và component tải dữ liệu thử nghiệm ban đầu. Đã được thay thế bởi kiến trúc lazy module `apps/web/src/features/overview`, `apps/web/src/features/player-lab` trên `main`. | **Không merge lại**. |
| 3 | `work/integrate-performance-architecture-20261029` | `cce7967` | Nhánh tích hợp thử nghiệm ngày 29/10. Đã được finalize vào `main` tại commit `da12687` (*perf: integrate workspace architecture and worker optimizations*). | **Không merge lại**. |
| 4 | `work/performance-architecture` | `35bfb57` | Tiền thân của worker pool và IndexedDB caching. Đã được đưa vào `packages/storage` trên `main`. | **Không merge lại**. |
| 5 | `work/recruitment-squad-impact-preview` | `9843a37` | Nhánh phát triển tiếp theo của `work/i18n-player-import-guidance`. Đã được refactor vào `main` tại commit `ac34df9` (*feat(player-lab): isolate recruitment squad contribution panel*). | **Không merge lại**. |
| 6 | `work/refactor-player-lab-components` | `db4b62b` | Tách nhỏ các component của Player Lab; đã được sáp nhập vào `main`. | **Không merge lại**. |
| 7 | `work/refactor-player-lab-components-20261029` | `1ecf441` | Tinh chỉnh PlayerReportTabs; đã nằm trong `apps/web/src/features/player-lab/components/PlayerReportTabs.tsx` trên `main`. | **Không merge lại**. |
| 8 | `work/refactor-player-lab-components-clean` | `e6b561f` | Cập nhật Playwright e2e test cho recruitment panel; đã được tích hợp vào `tests/e2e/shell.spec.ts` trên `main`. | **Không merge lại**. |

> **Cảnh báo quan trọng:** Không merge bất kỳ nhánh nào trong 8 nhánh trên vào `main` vì sẽ đảo ngược cấu trúc module hóa hiện tại và gây hồi quy mã nguồn.

---

## 4. Nhóm 3: 49 Nhánh Đã Merge Đủ Điều Kiện Xóa An Toàn

Tất cả 49 nhánh dưới đây đã được đối chiếu:
- PR tương ứng trên GitHub đã MERGE vào `main`.
- Commit SHA trên remote khớp 100% với commit tại thời điểm merge (không có commit mới sinh ra sau merge).

```text
 1. docs/afe-member-envelope-evidence-20261029              [0dcfb8b]
 2. docs/afe-vs-modern-fmf-format-gate-20261029             [96f6649]
 3. docs/member-prefix-analysis-20261029                    [0c9e0e7]
 4. feat/afe-bounded-codec-validation-20261030              [19b07d5]
 5. feat/afe-cohort-byte-profile-20261030                   [74c1a5d]
 6. feat/afe-cross-save-full-catalogue-diff-20261031        [2638e6d]
 7. feat/afe-directory-unparsed-metadata-20261030           [cc8f150]
 8. feat/afe-envelope-consistency-20261030                  [7d11d84]
 9. feat/afe-equal-size-gap-comparison-20261030             [8c1c4a7]
10. feat/afe-gap-complete-marker-audit-20261030             [5078a93]
11. feat/afe-header-directory-pointer-20261030              [e0064d0]
12. feat/afe-local-batch-codec-catalogue-20261030           [7453851]
13. feat/afe-member-envelope-consistency-20261029           [2532a4d]
14. feat/afe-nested-directory-rgman-20261030                [2798822]
15. feat/afe-nested-member-structure-summary-20261030       [2df7f3b]
16. feat/afe-node-consumed-bytes-probe-20261030             [d23a90f]
17. feat/afe-raw-deflate-trials-20261030                    [6e81b3d]
18. feat/afe-unindexed-gap-audit-20261030                   [dd2067c]
19. feat/afe-unindexed-gap-marker-analysis-20261029         [0f80ea5]
20. feat/afe-validated-member-decoder-20261030              [c582faa]
21. feat/browser-nested-afe-directory-20261030              [5390742]
22. feat/member-post-prefix-diagnostics-20261029            [68ebf07]
23. feat/read-only-member-envelope-probe-20261029           [021d87f]
24. feat/save-library-gap-diagnostics-20261029              [4d12f04]
25. fix/afe-batch-index-integrity-20261030                  [eb70822]
26. fix/afe-codec-trailing-data-checks-20261030             [845b1d5]
27. fix/afe-cross-save-pair-selection-20261030              [269e9ec]
28. fix/afe-cross-save-stratified-samples-20261030          [4374852]
29. fix/afe-full-member-hash-evidence-20261030              [5f85100]
30. fix/afe-header-marker-length-validation-20261030        [e768f81]
31. fix/afe-validated-decoder-envelope-bound-20261030       [61c3af0]
32. fix/archive-directory-integrity-20261030                [7a755ae]
33. fix/archive-index-candidate-scan-bound-20261029         [f7f67de]
34. fix/archive-member-boundary-afe-20261029                [612c270]
35. fix/save-inspection-metadata-sanitize-20261030          [bc508bc]
36. perf/afe-cross-save-index-only-20261030                 [8d867e9]
37. perf/save-library-bounded-members-20261030              [9f3f794]
38. research/afe-cross-save-validation-20261030             [484da6e]
39. research/afe-framed-codec-signatures-20261030           [f4ba107]
40. research/afe-raw-lz4-block-20261030                     [00e716f]
41. research/afe-targeted-codec-falsification-20261030      [b8059e0]
42. test/afe-container-trailing-index-20261029              [83b771a]
43. test/archive-index-69-member-fixture-20261029           [e549b31]
44. test/archive-index-real-shape-20261029                  [1d0608c]
45. work/archive-index-integration-20261029                 [029895d]
46. work/save-error-i18n-audit-20261029                     [0c96d9f]
47. work/save-index-integration-test-20261029               [abfd3d8]
48. work/save-metadata-persistence-20261029                 [16dcc30]
49. work/save-metadata-recovery-20261029                    [8f45ba0]
```

---

## 5. Hướng dẫn Sử dụng Công cụ Cleanup

File script: `cleanup-merged-branches.ps1` (ở thư mục gốc repository).

### Bước 1: Chạy kiểm tra (Dry-Run, an toàn 100%)
```powershell
.\cleanup-merged-branches.ps1
```
Script sẽ tự động fetch refs mới nhất từ origin, đối chiếu SHA của từng nhánh và in ra kết quả mà không xóa bất kỳ nhánh nào.

### Bước 2: Thực thi xóa 49 nhánh đã kiểm chứng
```powershell
.\cleanup-merged-branches.ps1 -Apply
```
- Script sẽ yêu cầu bạn nhập chữ `CONFIRM` trước khi thực hiện.
- Tự động nhận diện GitHub CLI (`gh`) nếu đã đăng nhập; nếu chưa đăng nhập `gh`, script tự động fallback sang `git push origin --delete <branch>` dùng quyền git thông thường.

