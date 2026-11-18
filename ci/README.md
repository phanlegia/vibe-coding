# Công cụ theo dõi đối thủ (MVP)

Web nội bộ theo dõi tin đối thủ ngành tài chính tiêu dùng, theo `SPEC.md`. Không cần cài thư viện (Node ≥ 22.13, SQLite tích hợp).

```bash
cd ci
npm start                 # http://localhost:3000
npm run seed:demo         # (tùy chọn) 6 tin MẪU để xem giao diện
npm test
```

Đăng nhập DEV: nhập email, người đầu tiên (hoặc email trong `ADMIN_EMAILS`) là admin.

## Cấu hình (biến môi trường)
| Biến | Ý nghĩa |
|---|---|
| `AUTH_MODE=oidc`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `BASE_URL` | SSO OIDC (callback `BASE_URL/auth/callback`). Mặc định `dev` – KHÔNG dùng khi triển khai thật |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | Bật Claude cho tóm tắt/phân loại/hỏi đáp; thiếu khóa thì dùng bộ quy tắc từ khóa |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Gửi email thật (TLS cổng 465). Thiếu thì thư chỉ lưu ở Quản trị → Thư đã tạo |
| `COLLECT_EVERY_HOURS` (24), `ALERT_THRESHOLD` (60), `DIGEST_HOUR` (8), `DB_FILE`, `PORT` | |

## Đáp ứng spec
- **Đối thủ**: thêm/sửa/tạm dừng/xóa động; thêm xong thu thập ngay (tin xuất hiện < 24h).
- **Thu thập**: tìm kiếm tin theo từng đối thủ (Google News RSS) + RSS/trang cố định + dán link + dán/tải tài liệu .txt/.md; lịch mặc định 24h; mỗi lượt có nhật ký lỗi và nút "Chạy lại".
- **Phân loại 4 chủ đề**, điểm quan trọng, nhãn Chính thức/Báo chí/Tin đồn + điểm tin cậy; chống trùng (hash tiêu đề + URL), tin trùng được gộp và tăng điểm tin cậy khi có nguồn độc lập khác xác nhận.
- **Feed** có lọc, hồ sơ đối thủ, so sánh, nút "Báo sai".
- **Digest** daily/weekly theo bộ lọc từng người; **cảnh báo** (đổi lãi suất / sản phẩm mới / M&A / nhân sự) vào hàng đợi ngay khi phát hiện, gửi trong ≤ 30 giây khi có SMTP.
- **Hỏi đáp**: chỉ trả lời từ tin đã thu thập, trích dẫn `[n]` được kiểm tra hợp lệ.
- **Phân quyền**: viewer (xem) / editor (cấu hình, thêm tin) / admin (người dùng).

## Chưa kiểm chứng / hạn chế (cần làm trước khi coi là xong)
- **Độ chính xác phân loại ≥ 85%** mới chỉ thử trên 12 câu mẫu. Cần bộ ~100 tin do người dùng gán nhãn (xem `test/core.test.js`).
- **SSO OIDC và SMTP đã viết nhưng chưa chạy với IdP/máy chủ thật.**
- **Tải 10.000 tin < 3 giây** chưa đo; đã đánh index và phân trang 30 tin/lần.
- Phân loại bằng quy tắc từ khóa là mức tối thiểu; đặt `ANTHROPIC_API_KEY` sẽ chính xác hơn.
- Tải lên PDF/Word chưa hỗ trợ (chỉ .txt/.md hoặc dán nội dung). Trang chặn crawl → dùng dán nội dung.
- Bảng `metrics` có API (`POST /api/metrics`) nhưng chưa có form nhập trên giao diện.
- Tìm kiếm tin của đối thủ có tên chung (vd. "MoMo") vẫn có thể nhiễu; hãy tinh chỉnh từ khóa.

## Triển khai
Cần hosting chạy tiến trình Node liên tục + ổ đĩa bền (SQLite). Dùng `ci/Dockerfile`, gắn volume vào `/data`.
Biến bắt buộc khi public: `NODE_ENV=production`, `BASE_URL=https://tên-miền`, và `DEV_PASSWORD=...` (tạm) hoặc `AUTH_MODE=oidc` + thông số SSO.
