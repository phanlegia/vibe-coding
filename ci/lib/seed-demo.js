// Dữ liệu MẪU để xem thử giao diện (tiêu đề có tiền tố [MẪU], link example.com). Không phải tin thật.
import { all } from './db.js';
import { ingest } from './collector.js';
const comps = all('SELECT * FROM competitors');
const c = n => comps.find(x => x.name.includes(n)) || comps[0];
const d = n => new Date(Date.now() - n * 36e5).toISOString();
const S = [
  ['FE Credit', '[MẪU] FE Credit điều chỉnh giảm lãi suất vay tiêu dùng từ tháng sau', 'Công ty công bố giảm lãi suất các gói vay tiêu dùng, áp dụng cho khách hàng mới.', 'fecredit.com.vn', 5],
  ['Home Credit', '[MẪU] Home Credit ra mắt gói vay trả góp mới cho sinh viên', 'Sản phẩm mới có hạn mức thấp và thủ tục eKYC hoàn toàn trên ứng dụng.', 'cafef.vn', 20],
  ['HD SAISON', '[MẪU] HD SAISON báo lãi quý III tăng, nợ xấu giảm', 'Lợi nhuận trước thuế tăng so với cùng kỳ; tỷ lệ nợ xấu giảm nhờ siết quản trị rủi ro.', 'vnexpress.net', 30],
  ['Shinhan Finance', '[MẪU] Shinhan Finance bổ nhiệm tổng giám đốc mới', 'Hội đồng quản trị thông qua việc bổ nhiệm tổng giám đốc thay thế người tiền nhiệm.', 'tuoitre.vn', 40],
  ['MoMo', '[MẪU] MoMo tung chiến dịch khuyến mãi lớn trên ứng dụng dịp cuối năm', 'Chiến dịch ưu đãi hoàn tiền và tính năng mới trên app thu hút người dùng.', 'momo.vn', 50],
  ['Fundiin', '[MẪU] Tin đồn Fundiin bị thâu tóm bởi một tập đoàn lớn', 'Theo nguồn tin chưa được xác nhận, việc mua lại đang được thương lượng.', 'tinhte.vn', 60],
];
for (const [n, t, b, dom, h] of S) console.log(t, (await ingest({ competitor: c(n), title: t, body: b, url: `https://${dom}/demo/${encodeURIComponent(t).slice(0, 30)}`, date: d(h), srcDomain: dom, origin: 'demo' })).status);
