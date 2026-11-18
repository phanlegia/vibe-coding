# Prototype Novagroup (3 use case)

Nguồn: `outputs/02-proposal.md`, mục 5. Mỗi prototype là một `index.html` tự chứa (HTML + CSS + JS thuần, không build, không CDN), chạy offline, mobile-first (khung ~390px).

## Cách mở
Mở `index.html` trong thư mục này (trang danh mục) hoặc mở trực tiếp từng file bằng trình duyệt. Không cần server.

| Thư mục | Use case |
|---|---|
| `01-nova-one/` | UC1 Nova One |
| `02-nova-living-stay/` | UC2 Nova Living & Stay |
| `03-customer-360-nbo/` | UC3 Customer 360 + Next Best Offer |

Mỗi thư mục có `screenshot.png` (UC3 thêm `screenshot-desktop.png`).

## Luồng demo
**UC1 Nova One:** chọn tài khoản demo, Nhận OTP, nhập 123456, chọn đồng ý dữ liệu theo mục đích, liên kết hợp đồng (mã mẫu `NV-AQ-1024` hoặc `NV-WP-2208`), xem hạng và điểm. Trang chủ có nút mô phỏng phát sinh điểm (số dư và thanh tiến độ đổi ngay). Vào Đổi điểm, chọn quà, xác nhận (3 thao tác từ tab). Thử đổi quà đắt khi thiếu điểm (tài khoản Hà), rút đồng ý "chia sẻ liên công ty" ở tab Dữ liệu để khóa quà nghỉ dưỡng. Tài khoản Quang để xem trạng thái trống.

**UC2 Living & Stay:** chế độ Cư dân: thanh toán hóa đơn quá hạn (nhận điểm), báo sự cố (có ảnh), nút mô phỏng đổi trạng thái, đặt tiện ích. Chế độ Khách lưu trú: check-in số, đặt món vào hóa đơn phòng, thanh toán dùng một phần điểm (1 điểm = 100đ), chọn "Thẻ hết hạn" để xem màn hình lỗi, bản đồ khu nghỉ dưỡng. Điểm giữ nguyên khi chuyển chế độ.

**UC3 Customer 360:** Tổng quan, bấm tệp "Cư dân chưa nghỉ dưỡng", mở một hồ sơ (tên và SĐT bị che, bấm hiện thì ghi nhật ký), đọc lý do gợi ý, phê duyệt. Khách thiếu đồng ý không có nút phê duyệt. Tab Chiến dịch hiển thị số khách bị loại vì thiếu đồng ý và mô phỏng gửi. Tab Nhật ký liệt kê hành động.

## Giới hạn
- Dữ liệu và OTP/thanh toán/QR/bản đồ đều mô phỏng, trạng thái chỉ nằm trong bộ nhớ trang (tải lại là mất).
- Không có backend, không tích hợp PMS/CRM/ngân hàng thật; kết quả chiến dịch (tỷ lệ mở, đổi) là số ước lượng giả.
- Tên công ty thành viên ngoài Novaland là giả định; không dùng logo/thương hiệu thật.
- Chưa phải đánh giá pháp lý: cơ chế đồng ý chỉ minh họa, cần pháp chế rà soát theo Nghị định 13/2023/NĐ-CP.
- Chưa kiểm thử với trình đọc màn hình thật hay trên thiết bị thật; chỉ kiểm tra bằng Playwright (Chromium).
