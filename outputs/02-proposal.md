# 02 - Đề xuất use case trải nghiệm số cho Novagroup

Ngày: 2026-11-18. Đầu vào: `outputs/01-research.md` (14 use case, 13 tập đoàn).

## 1. Hệ sinh thái Novagroup: phần đã xác minh và phần giả định

**Đã xác minh qua web (mức thấp, chỉ từ tóm tắt tìm kiếm):**
- Novaland (mã NVL) là công ty bất động sản trong hệ sinh thái NovaGroup, thành lập 18/9/1992 (tiền thân Thanh Nhơn). Nguồn: https://www.devex.com/organizations/novaland-group-141676 ; https://theinvestor.vn/novagroup-registers-to-buy-8-million-novaland-shares-d2106.html
- NovaWorld là thương hiệu BĐS nghỉ dưỡng kết hợp lưu trú (hospitality-residential) của Novaland, gồm NovaWorld Phan Thiet, NovaWorld Ho Tram; Aqua City (Đồng Nai) là đô thị sinh thái. Nguồn: https://theinvestor.vn/real-estate-major-novaland-wins-key-approval-for-5-bln-project-in-central-vietnam-d17414.html ; https://www.novaland.com.vn/Data/Sites/1/media/brochure/2024/novaland-group-brochure_nov-2024_eng.pdf
- Nguồn báo chí có nhắc NovaGroup tái cấu trúc thành các nhóm công ty (số lượng nhóm không thống nhất giữa các nguồn: "2 nhóm" vs "3 tập đoàn"). Nguồn: https://bizhub.vietnamnews.vn/novagroup-30-years-of-brightening-lives-post337616.html ; https://e.vnexpress.net/interactive/2021/nova-group-restructures-for-sustainable-development-4370207

**Chưa xác minh được (xử lý như GIẢ ĐỊNH, cần Novagroup xác nhận):**
- Các công ty thành viên ngoài BĐS (hospitality, tiêu dùng/nông nghiệp, giáo dục, y tế, tài chính, dịch vụ vận hành) và quy mô từng mảng. Tìm kiếm không cho nguồn xác nhận các tên "Nova Hospitality / Consumer / Service / Education".
- Số liệu cư dân, chủ sở hữu, khách lưu trú, hệ thống ID/CRM hiện có, đối tác ngân hàng.
- Tình trạng pháp lý và tài chính hiện tại của từng dự án (cần kiểm tra trước khi truyền thông cho khách).

**Giả định làm việc:** Novagroup có ít nhất 4 nhóm điểm chạm: (A) BĐS/đô thị (người mua nhà, cư dân, nhà đầu tư), (B) nghỉ dưỡng và lưu trú (du khách, chủ sở hữu BĐS nghỉ dưỡng), (C) tiêu dùng/dịch vụ/F&B, (D) dịch vụ cộng đồng (giáo dục, y tế, nếu có). Các dịch vụ thuộc nhóm C, D được dùng ở mức "mô-đun có thể cắm vào", prototype dùng dữ liệu mẫu.

## 2. Bản đồ điểm chạm khách hàng xuyên ngành

| Giai đoạn | Điểm chạm | Mảng | Dữ liệu sinh ra | Cơ hội cross-sell |
|---|---|---|---|---|
| Khám phá | Website, sự kiện mở bán, tham quan dự án | BĐS | Lead, quan tâm sản phẩm | Mời trải nghiệm lưu trú thử tại NovaWorld |
| Mua | Tư vấn, đặt cọc, ký HĐ, thanh toán đợt | BĐS | Hồ sơ, ngân sách, tiến độ thanh toán | Gói vay/trả góp qua ngân hàng đối tác; ID thành viên khởi tạo |
| Nhận nhà/bàn giao | Bàn giao, bảo hành, nội thất | BĐS, dịch vụ | Yêu cầu bảo hành, hộ gia đình | Dịch vụ vận hành, nội thất, bảo hiểm nhà |
| Sinh sống | Phí quản lý, tiện ích, cộng đồng, trường học, khám bệnh | BĐS, dịch vụ, giáo dục, y tế (giả định) | Hành vi sử dụng tiện ích | Ưu đãi gia đình, chăm sóc sức khỏe chủ động |
| Nghỉ dưỡng | Đặt phòng, F&B, golf/giải trí, sự kiện | Hospitality | Lịch sử lưu trú, chi tiêu | Cư dân/chủ sở hữu đi nghỉ nội bộ; mua BĐS nghỉ dưỡng |
| Đầu tư/chủ sở hữu | Cho thuê, ngày nghỉ của chủ sở hữu, bán lại | BĐS nghỉ dưỡng | Công suất, doanh thu cho thuê | Giới thiệu bạn bè, nâng hạng thành viên |
| Giới thiệu/giữ chân | Giới thiệu, điểm thưởng | Toàn nhóm | Mạng lưới giới thiệu | Vòng lặp: khách cũ giới thiệu khách mới |

**Cross-sell chính:** (1) cư dân đi nghỉ tại NovaWorld bằng điểm; (2) khách lưu trú thành khách mua BĐS nghỉ dưỡng; (3) chủ sở hữu BĐS nghỉ dưỡng dùng đêm nghỉ miễn phí và gửi khách giới thiệu; (4) gia đình cư dân dùng giáo dục/y tế/F&B trong khu đô thị (nếu có đối tác trong nhóm).

## 3. Sáu use case đề xuất

Thang điểm 1-5. Điểm tổng = Tác động x Khả thi x Phù hợp hệ sinh thái (tối đa 125).

### UC1. Nova One: một ID thành viên và một ví điểm xuyên ngành
- **Vấn đề/insight:** Chương trình/app rời rạc theo dự án và thương hiệu khiến khách không thấy giá trị cộng dồn. Vingroup, MAF, Emaar đều gộp về một chương trình (research mục 5, pattern 1).
- **Công ty tham gia:** Toàn bộ nhóm; khởi động với BĐS (Novaland) và hospitality/NovaWorld.
- **Trải nghiệm:** Persona "Chị Lan, cư dân và chủ sở hữu". Đăng ký bằng số điện thoại, liên kết hợp đồng mua nhà/lưu trú, thấy hạng thành viên (Silver/Gold/Diamond) và số điểm. Luồng: tích điểm khi thanh toán phí quản lý, lưu trú, ăn uống; đổi điểm lấy đêm nghỉ, voucher, giảm phí dịch vụ; giới thiệu bạn bè nhận điểm.
- **Dữ liệu/công nghệ:** Danh tính thống nhất, ví điểm (ledger), API cho các hệ thống PMS/CRM/ERP, quy tắc hạng và hết hạn điểm, chống gian lận.
- **KPI:** % khách hiện hữu kích hoạt ID, thành viên hoạt động hằng tháng, tỷ lệ đổi điểm giữa hai mảng (cross-ngành), tỷ lệ giới thiệu thành công.
- **Khả thi 4 · Tác động 5 · Phù hợp 5 · Tổng 100.**
- **Rủi ro:** Đồng ý xử lý dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) khi gộp dữ liệu giữa các pháp nhân; chương trình điểm là khoản nợ kế toán; quy định khuyến mại thương mại.
- **Tham chiếu research:** 3.6 VinClub, 3.5 SHARE, 3.10 Ponta, 3.4 Rakuten, 3.1 Tata Neu (cảnh báo).

### UC2. Nova Living & Stay: ứng dụng hợp nhất cho cư dân và khách lưu trú
- **Vấn đề/insight:** Mỗi khu đô thị/khách sạn/điểm vui chơi có kênh riêng; Emaar từng có tới khoảng 20 app trước khi gộp về một (research 3.13).
- **Công ty tham gia:** Novaland (quản lý đô thị), hospitality/NovaWorld, đơn vị vận hành dịch vụ, F&B (giả định).
- **Trải nghiệm:** Hai persona: "Anh Minh, cư dân Aqua City" và "Gia đình Hà, khách NovaWorld". Luồng cư dân: thanh toán phí quản lý, báo sự cố, đặt tiện ích, nhận thông báo cộng đồng. Luồng khách lưu trú: đặt phòng, check-in số, mở khóa/gọi dịch vụ, đặt ăn uống, bản đồ khu nghỉ dưỡng, thanh toán gắn ví điểm Nova One.
- **Dữ liệu/công nghệ:** Tích hợp PMS khách sạn, hệ thống quản lý tòa nhà, thanh toán QR/ngân hàng, bản đồ trong khu, thông báo đẩy.
- **KPI:** MAU, tỷ lệ cư dân thanh toán phí qua app, điểm hài lòng (CSAT), tỷ lệ đặt dịch vụ qua app, doanh thu F&B/dịch vụ trên mỗi khách lưu trú.
- **Khả thi 4 · Tác động 4 · Phù hợp 5 · Tổng 80.**
- **Rủi ro:** Chất lượng app quyết định việc sử dụng (app VinClub bị đánh giá thấp, research 3.6); phụ thuộc tích hợp hệ thống cũ; dữ liệu định vị và hình ảnh nhạy cảm.
- **Tham chiếu:** 3.13 Emaar, 3.5 SHARE, 3.6 VinClub, 3.9 WeChat (O2O).

### UC3. Nova Customer 360 và gợi ý ưu đãi theo vòng đời (CDP + Next Best Offer)
- **Vấn đề/insight:** Dữ liệu nằm ở từng mảng nên không thấy khách đang ở giai đoạn nào. Masan và CP ALL dùng dữ liệu hợp nhất để cá nhân hóa (research 3.11, 3.12).
- **Công ty tham gia:** Toàn nhóm; trung tâm dữ liệu dùng chung.
- **Trải nghiệm:** Người dùng nội bộ (CRM/marketing) thấy hồ sơ 360 một khách, giai đoạn vòng đời (khám phá, đã mua, cư dân, khách lưu trú, chủ sở hữu), và gợi ý hành động tiếp theo (ví dụ: cư dân chưa từng nghỉ dưỡng nhận ưu đãi đêm nghỉ). Khách thấy ưu đãi đúng ngữ cảnh trong app.
- **Dữ liệu/công nghệ:** CDP, khớp danh tính (SĐT/email/số hợp đồng), mô hình quy tắc rồi ML đơn giản, kiểm soát đồng ý (consent) theo mục đích.
- **KPI:** Tỷ lệ chuyển đổi chéo ngành, tỷ lệ mở/đổi ưu đãi, doanh thu tăng thêm trên mỗi khách, tỷ lệ khách có hồ sơ gộp đầy đủ.
- **Khả thi 3 · Tác động 4 · Phù hợp 5 · Tổng 60.**
- **Rủi ro:** Rủi ro cao nhất về dữ liệu cá nhân: cần cơ sở pháp lý và sự đồng ý rõ ràng cho từng mục đích, đánh giá tác động xử lý dữ liệu, chuyển dữ liệu giữa các pháp nhân; chất lượng dữ liệu thấp; hiệu quả chưa có benchmark công khai (research mục 6).
- **Tham chiếu:** 3.11 Masan, 3.12 CP ALL, 3.4 Rakuten, 3.10 Ponta.

### UC4. Nova Care AI: trợ lý chăm sóc chủ động cho cư dân và du khách
- **Vấn đề/insight:** Ping An cho thấy chăm sóc chủ động có AI tạo gắn kết lâu dài (research 3.2), nhưng mô hình y tế cần bảo hiểm và bác sĩ nội bộ.
- **Công ty tham gia:** Dịch vụ cư dân, hospitality; y tế/giáo dục nếu thuộc nhóm (giả định).
- **Trải nghiệm:** Trợ lý hội thoại trả lời câu hỏi cư dân (phí, bảo trì, nội quy), gợi ý lịch bảo dưỡng, nhắc lịch, hỗ trợ khách lưu trú (concierge). Phiên bản y tế chỉ làm đặt lịch và nhắc, không chẩn đoán.
- **Dữ liệu/công nghệ:** LLM có truy xuất tri thức nội bộ, tích hợp ticket và đặt chỗ.
- **KPI:** Tỷ lệ tự giải quyết, thời gian phản hồi, CSAT, giảm tải tổng đài.
- **Khả thi 3 · Tác động 3 · Phù hợp 4 · Tổng 36.**
- **Rủi ro:** Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm (NĐ 13/2023), AI trả lời sai; Ping An có kênh bảo hiểm mà Novagroup không có.
- **Tham chiếu:** 3.2 Ping An.

### UC5. Nova Owner Club: hành trình chủ sở hữu BĐS nghỉ dưỡng
- **Vấn đề/insight:** Chủ sở hữu BĐS nghỉ dưỡng muốn thấy giá trị sử dụng và khai thác, đồng thời là nguồn giới thiệu quan trọng. Hợp với mô hình hospitality-residential của NovaWorld.
- **Công ty tham gia:** Novaland, hospitality/NovaWorld, đơn vị vận hành.
- **Trải nghiệm:** Persona "Anh Tuấn, chủ sở hữu". Xem tình trạng sở hữu, đêm nghỉ được hưởng, lịch sử khai thác/cho thuê (nếu có), đặt đêm nghỉ, mời bạn bè tham quan, nâng hạng.
- **Dữ liệu/công nghệ:** Dữ liệu hợp đồng/sở hữu, lịch phòng, đối soát doanh thu, tích hợp Nova One.
- **KPI:** Tỷ lệ chủ sở hữu hoạt động, số đêm sử dụng, giới thiệu thành công, NPS.
- **Khả thi 3 · Tác động 4 · Phù hợp 5 · Tổng 60.**
- **Rủi ro:** Cam kết lợi nhuận/khai thác có thể bị coi là quảng cáo, chào bán chứng khoán hoặc đầu tư nếu diễn đạt sai; cần pháp chế rà soát; chính sách chủ sở hữu từng dự án khác nhau (giả định).
- **Tham chiếu:** 3.6 VinClub (ưu đãi theo hạng), 3.13 Emaar (BĐS + hospitality).

### UC6. Nova Pay: thanh toán O2O, thẻ đồng thương hiệu và trả góp với đối tác tài chính
- **Vấn đề/insight:** Tài chính là chất kết dính kinh tế (Grab, Sea, Tata Neu) nhưng kéo rủi ro tín dụng và quy định; nên hợp tác thay vì tự làm (research mục 5).
- **Công ty tham gia:** Toàn nhóm cộng ngân hàng/ví đối tác (cần đàm phán).
- **Trải nghiệm:** Thanh toán QR tại khách sạn/F&B/dịch vụ, thẻ đồng thương hiệu tích điểm Nova One, trả góp tiền lưu trú/phí dịch vụ.
- **Dữ liệu/công nghệ:** Tích hợp cổng thanh toán, KYC bởi đối tác, đối soát.
- **KPI:** Tỷ lệ thanh toán không tiền mặt, số thẻ phát hành, chi tiêu trên mỗi thẻ.
- **Khả thi 2 · Tác động 4 · Phù hợp 3 · Tổng 24.**
- **Rủi ro:** Giấy phép trung gian thanh toán, phụ thuộc đối tác, thời gian đàm phán dài.
- **Tham chiếu:** 3.1 Tata Neu card, 3.3 Grab, 3.14 Sea, 3.11 Masan-Techcombank.

## 4. Chấm điểm và xếp hạng

| Hạng | Use case | Tác động | Khả thi | Phù hợp | Tổng |
|---|---|---|---|---|---|
| 1 | UC1 Nova One (ID + ví điểm) | 5 | 4 | 5 | 100 |
| 2 | UC2 Nova Living & Stay (app hợp nhất) | 4 | 4 | 5 | 80 |
| 3 (đồng hạng) | UC3 Customer 360 + NBO | 4 | 3 | 5 | 60 |
| 3 (đồng hạng) | UC5 Nova Owner Club | 4 | 3 | 5 | 60 |
| 5 | UC4 Nova Care AI | 3 | 3 | 4 | 36 |
| 6 | UC6 Nova Pay | 4 | 2 | 3 | 24 |

Điểm do người viết đánh giá chủ quan dựa trên research và giả định ở mục 1; cần hiệu chỉnh cùng Novagroup.

### Ba use case được chọn làm prototype
1. **UC1 Nova One**: điểm cao nhất, là nền tảng danh tính và ví điểm cho mọi use case khác.
2. **UC2 Nova Living & Stay**: là giao diện người dùng thấy được của hệ sinh thái, hiển thị ví điểm và dịch vụ của UC1.
3. **UC3 Customer 360 + NBO**: đồng hạng với UC5; chọn UC3 vì là lớp dữ liệu cho UC4, UC5, UC6 và chứng minh được giá trị cross-sell xuyên ngành (nguyên tắc "một điểm vào" của research). UC5 được đưa vào giai đoạn 2 vì cần xác nhận pháp lý về chính sách chủ sở hữu.

Lưu ý bài học Tata Neu: không bắt đầu từ thương mại tần suất thấp; điểm vào nên là tiện ích cư dân (thanh toán phí quản lý hằng tháng) và lưu trú, là các hành vi lặp lại.

### Lộ trình 3 giai đoạn
- **Giai đoạn 1 - Quick win (0-6 tháng):** UC1 phiên bản tối thiểu (ID, điểm, hạng) trên nhóm khách hiện hữu BĐS + hospitality; gộp các chương trình rời rạc; thu thập đồng ý dữ liệu đúng chuẩn.
- **Giai đoạn 2 - Mở rộng (6-18 tháng):** UC2 (app cư dân + khách lưu trú), UC5 (Owner Club), bắt đầu CDP cho UC3, bổ sung đối tác đổi điểm bên ngoài.
- **Giai đoạn 3 - Hệ sinh thái (18-36 tháng):** UC3 đầy đủ với NBO, UC4 trợ lý AI, UC6 thanh toán/thẻ đồng thương hiệu với đối tác tài chính, mở các mảng giáo dục/y tế nếu thuộc nhóm.

## 5. Đặc tả prototype cho 3 use case được chọn

Nguyên tắc chung: web app responsive (mobile-first), dữ liệu mẫu hoàn toàn giả lập, không dùng dữ liệu cá nhân thật; tiếng Việt; thể hiện thương hiệu Novagroup dạng trung tính, không sao chép logo thật.

### Prototype 1 - Nova One
- **Màn hình chính:**
  1. Đăng ký/đăng nhập bằng SĐT + OTP (mô phỏng) và màn hình đồng ý dữ liệu theo từng mục đích (có thể bỏ chọn).
  2. Trang chủ thành viên: thẻ thành viên với hạng, số điểm, thanh tiến độ lên hạng, hết hạn điểm sắp tới.
  3. Lịch sử giao dịch điểm (lọc theo mảng: BĐS, lưu trú, F&B, dịch vụ).
  4. Danh mục đổi điểm (đêm nghỉ, voucher F&B, giảm phí dịch vụ) và màn hình xác nhận đổi.
  5. Giới thiệu bạn bè (mã, trạng thái).
- **Luồng chính:** Đăng ký, đồng ý dữ liệu, liên kết hợp đồng (nhập mã mẫu), xem điểm, đổi điểm lấy đêm nghỉ, xem điểm trừ và lịch sử cập nhật.
- **Dữ liệu mẫu:** 5 persona với hạng khác nhau; 30-50 giao dịch điểm trải trên các mảng; 12 phần quà; 3 quy tắc hạng; mã giới thiệu.
- **Tiêu chí chấp nhận:** (a) giao dịch điểm cộng/trừ cập nhật số dư và thanh tiến độ ngay; (b) không đổi được khi thiếu điểm, có thông báo rõ; (c) hiển thị hạng đúng quy tắc; (d) khách có thể xem và rút lại đồng ý dữ liệu; (e) hiển thị tốt ở 360px; (f) đi hết luồng đổi điểm trong dưới 5 thao tác.

### Prototype 2 - Nova Living & Stay
- **Màn hình chính:**
  1. Trang chủ có chuyển chế độ "Cư dân" / "Khách lưu trú".
  2. Cư dân: hóa đơn phí quản lý (thanh toán mô phỏng, tích điểm), báo sự cố có ảnh, đặt tiện ích (hồ bơi, phòng họp), bảng tin cộng đồng.
  3. Khách lưu trú: thông tin đặt phòng, check-in số (mã QR mô phỏng), đặt dịch vụ/ăn uống, bản đồ khu nghỉ dưỡng với các điểm chính.
  4. Thanh toán và điểm Nova One tích hợp.
- **Luồng chính:** (Cư dân) xem hóa đơn, thanh toán, nhận điểm; báo sự cố, theo dõi trạng thái. (Khách) check-in, đặt bữa ăn, xem hóa đơn phòng, thanh toán bằng điểm một phần.
- **Dữ liệu mẫu:** 2 căn hộ/hóa đơn (đã thanh toán, quá hạn), 4 sự cố ở các trạng thái, 6 tiện ích có khung giờ, 1 đặt phòng, thực đơn mẫu 10 món, bản đồ giả lập khu nghỉ dưỡng.
- **Tiêu chí chấp nhận:** (a) trạng thái hóa đơn và sự cố đổi đúng sau thao tác; (b) chuyển chế độ không mất đăng nhập/điểm; (c) thanh toán bằng điểm giảm đúng số tiền cần trả; (d) màn hình lỗi/trống có hướng dẫn; (e) kiểm tra truy cập cơ bản (tương phản, cỡ chạm tối thiểu 44px).

### Prototype 3 - Nova Customer 360 và Next Best Offer
- **Màn hình chính:**
  1. Bảng điều khiển CRM: phễu vòng đời (khám phá, đã mua, cư dân, khách lưu trú, chủ sở hữu) với số khách mỗi giai đoạn.
  2. Hồ sơ 360 một khách: dòng thời gian các sự kiện xuyên ngành, các mảng đã dùng, trạng thái đồng ý theo mục đích (che thông tin định danh theo mặc định).
  3. Gợi ý ưu đãi (NBO): danh sách hành động đề xuất, lý do gợi ý, nút phê duyệt/bỏ qua.
  4. Mô phỏng chiến dịch: chọn tệp khách theo điều kiện, xem số khách đủ điều kiện (chỉ khách có đồng ý phù hợp).
- **Luồng chính:** Mở bảng điều khiển, chọn giai đoạn "cư dân chưa nghỉ dưỡng", mở hồ sơ, xem lý do gợi ý "ưu đãi đêm nghỉ", phê duyệt; xem kết quả mô phỏng và nhật ký hành động.
- **Dữ liệu mẫu:** 200 hồ sơ giả lập với sự kiện đa mảng, 5 quy tắc NBO có lý do giải thích được, 3 trạng thái đồng ý, 1 tệp khách thiếu đồng ý để minh họa bị loại.
- **Tiêu chí chấp nhận:** (a) khách không có đồng ý phù hợp không xuất hiện trong chiến dịch; (b) mỗi gợi ý hiển thị lý do rõ ràng; (c) phễu và hồ sơ khớp nhau về số liệu; (d) có nhật ký phê duyệt; (e) dữ liệu nhạy cảm bị che mặc định; (f) ghi rõ trên giao diện rằng đây là dữ liệu giả lập.

## 6. Rủi ro chung và việc cần xác nhận
- **Pháp lý dữ liệu:** Nghị định 13/2023/NĐ-CP (đồng ý rõ ràng theo mục đích, quyền rút lại đồng ý, đánh giá tác động, chuyển dữ liệu giữa pháp nhân); cần pháp chế rà soát trước khi đưa vào sản xuất. Prototype chỉ dùng dữ liệu giả.
- **Tài chính/pháp lý khác:** chương trình điểm (khoản nợ, quy định khuyến mại), UC5 (cách diễn đạt về lợi nhuận/khai thác), UC6 (giấy phép thanh toán).
- **Thực tế triển khai:** chất lượng app, tích hợp hệ thống cũ, hiệu quả khó đo khi thiếu benchmark công khai (VinClub, SHARE, Tata Neu đều không có số thành viên/hiệu quả đáng tin).
- **Cần Novagroup xác nhận:** danh sách công ty thành viên hiện hành, hệ thống ID/CRM sẵn có, nhóm khách ưu tiên, các đối tác tài chính, các ràng buộc thương hiệu và pháp lý từng dự án.
