# B13 — Player Intelligence & Scouting: tự phỏng vấn chuyên môn

> Phỏng vấn **giả định** theo phong cách quản lý của Sir Alex Ferguson; không phải phát ngôn hay cuộc phỏng vấn thật.

## Q1. Cầu thủ CA cao nhất có luôn là lựa chọn tốt nhất?
**Trả lời mô phỏng:** "Điều quan trọng là anh ta làm được gì trong hệ thống này và ai sẽ đá bên cạnh anh ta."

Quy tắc: phân biệt Actual CA (game), estimated CA/eCA (dự báo), Role Fit (suitability) và Tactical Fit (tác động tập thể). Không dùng một con số để thay thế tất cả.

## Q2. Có thể tính CA từ attributes?
**Trả lời mô phỏng:** "Có thể ước lượng khả năng mà bộ thuộc tính gợi ý, nhưng phải cho thấy sai số."

eCA được xây từ bộ thuộc tính, vị trí, chân thuận và phiên bản FM; trước tiên dùng mô hình minh bạch, sau đó hiệu chuẩn bằng dữ liệu có CA thật. Nếu chưa có dữ liệu kiểm định, chỉ được hiển thị 'Attribute Strength Index', chưa được giả danh eCA đáng tin cậy. PA không thể suy ra chính xác chỉ từ attributes.

## Q3. Báo cáo tuyển trạch cần những gì?
**Trả lời mô phỏng:** "Hãy nói cho tôi biết cầu thủ giỏi ở đâu, yếu ở đâu, phù hợp vai trò nào, giá bao nhiêu và giúp CLB mạnh hơn bao nhiêu."

Cần 5 lớp thông tin:
1. Ability: actual CA (nếu có), eCA và độ tin cậy, attributes.
2. Football profile: điểm mạnh/yếu theo từng nhiệm vụ; mental/physical/technical.
3. Roles: vị trí sở trường, role tốt nhất, role chưa quen nhưng phù hợp thuộc tính.
4. Performance: radar percentile, xu hướng, shot/pass chart **chỉ khi có dữ liệu trận cần thiết**.
5. Decision: chênh lệch so với cầu thủ hiện có, giá, lương, rủi ro, phương án mua/cho mượn/đào tạo nội bộ.

## Q4. Một tiền vệ chuyền tốt đã là một playmaker giỏi?
**Trả lời mô phỏng:** "Không. Chọn đúng đường chuyền quan trọng như thực hiện đường chuyền."

Đánh giá Passing cùng Vision, Decisions, First Touch, Composure, Technique, nhận thức không gian và yêu cầu trong/ngoài bóng; role đánh chặn cần thêm defensive screening. Không sử dụng điểm trung bình thuộc tính thuần túy.

## Q5. Những biểu đồ nào thật sự hữu ích?
Radar attributes khác **radar percentile**. Bar chart role fit giải thích vị trí; pitch suitability map gợi ý tái đào tạo; time series xem phát triển; scatter giữa phí chuyển nhượng và đóng góp; bản đồ dứt điểm và passing networks phải có dữ liệu sự kiện/tọa độ. Thiếu dữ liệu thì ẩn biểu đồ, không giả lập thành thống kê thực tế.

## Q6. Có nên mua không?
**Trả lời mô phỏng:** "Đừng mua vì cầu thủ hấp dẫn trên giấy. Hãy mua khi anh ta giải quyết nhu cầu với chi phí phù hợp."

Quyết định cần phân tích marginal improvement so với XI đang có, nhu cầu chiến thuật, slot đăng ký, tuổi, hợp đồng, quỹ lương và giải pháp nội bộ. Verdict: Buy / Shortlist / Loan / Internal Option / Pass / Insufficient Data. Mỗi kết luận phải đi kèm lý do, rủi ro và phương án thay thế.

## Q7. eCA cao có bảo đảm thành công?
Không. Chất lượng cá nhân, sự hòa hợp chiến thuật, phong độ, đối thủ, fitness và ngẫu nhiên là các chiều khác nhau. Không trình bày Role Fit hoặc eCA như xác suất thắng trận.

**Ví dụ hoàn toàn giả định:** eCA 154 (khoảng 147–161), Deep Playmaker Fit 87/100, Ball-Winner 57/100, PA unknown. Vision/Passing mạnh, defensive screening trung bình. Đội hình có sẵn hai playmaker nhưng thiếu tiền vệ đánh chặn → khuyến nghị Shortlist với điều kiện về giá, vẫn ưu tiên DM phòng ngự.

**Chuyển giao:** [System eCA engine](../system/08-player-intelligence-engine.md) · [Player page UX](../product/04-player-intelligence-ux.md).