process.env.DB_FILE = ':memory:';
const { test } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { ruleClassify, detectEvent, answer } = await import('../lib/ai.js');
const { assessTrust } = await import('../lib/trust.js');
const { parseFeed, ingest, matchCompetitor } = await import('../lib/collector.js');
const { get, all } = await import('../lib/db.js');

// Bộ mẫu nhỏ để chạy thử. Bộ ~100 tin do người dùng gán nhãn: đặt vào test/labeled.json dạng [{"text":"..","topic":"a"}].
const LABELED = [
  ['Công ty giảm lãi suất vay tiêu dùng xuống 18%/năm', 'a'], ['Ra mắt gói vay trả góp điện thoại không cần thế chấp', 'a'],
  ['Biểu phí thẻ tín dụng mới áp dụng từ tháng 1', 'a'], ['Lợi nhuận quý III tăng 20%, nợ xấu giảm còn 5%', 'b'],
  ['Tăng vốn điều lệ lên 5.000 tỷ đồng', 'b'], ['Báo cáo tài chính cho thấy dư nợ tăng mạnh', 'b'],
  ['Chiến dịch khuyến mãi lớn trên ứng dụng di động', 'c'], ['Chuyển đổi số: ra tính năng eKYC mới cho khách hàng', 'c'],
  ['Đại sứ thương hiệu mới cho chiến dịch quảng cáo', 'c'], ['Bổ nhiệm tổng giám đốc mới thay người tiền nhiệm', 'd'],
  ['Công ty nhận giải thưởng doanh nghiệp xuất sắc', 'd'], ['Ký kết hợp tác chiến lược với đối tác công nghệ', 'd'],
];
test('phân loại chủ đề ≥ 85% trên bộ mẫu nhỏ', () => {
  const ok = LABELED.filter(([t, k]) => ruleClassify(t) === k).length;
  assert.ok(ok / LABELED.length >= 0.85, `chỉ đúng ${ok}/${LABELED.length}`);
});
test('phát hiện sự kiện cảnh báo', () => {
  assert.equal(detectEvent('FE Credit giảm lãi suất cho vay'), 'rate_change');
  assert.equal(detectEvent('Sáp nhập hai công ty tài chính'), 'ma');
  assert.equal(detectEvent('Bổ nhiệm tổng giám đốc mới'), 'exec_change');
  assert.equal(detectEvent('Công ty tổ chức sự kiện'), null);
});
test('nhãn tin cậy', () => {
  const c = { website: 'https://www.fecredit.com.vn', socials: '' };
  assert.equal(assessTrust({ domain: 'fecredit.com.vn', url: 'https://fecredit.com.vn/a', competitor: c, text: 'x' }).label, 'official');
  assert.equal(assessTrust({ domain: 'vnexpress.net', url: 'https://vnexpress.net/a', competitor: c, text: 'x' }).label, 'press');
  assert.equal(assessTrust({ domain: 'tinhte.vn', url: 'https://tinhte.vn/a', competitor: c, text: 'x' }).label, 'rumor');
  assert.equal(assessTrust({ domain: 'vnexpress.net', url: 'https://vnexpress.net/a', competitor: c, text: 'theo nguồn tin chưa được xác nhận' }).label, 'rumor');
});
test('RSS parse + ingest + chống trùng', async () => {
  const xml = `<rss><channel><item><title><![CDATA[FE Credit giảm lãi suất - CafeF]]></title><link>https://cafef.vn/a</link><pubDate>Mon, 17 Nov 2026 03:00:00 GMT</pubDate><description>Giảm lãi suất cho vay tiêu dùng.</description></item></channel></rss>`;
  const [e] = parseFeed(xml); assert.equal(e.url, 'https://cafef.vn/a');
  const comp = get("SELECT * FROM competitors WHERE name='FE Credit'");
  assert.equal(matchCompetitor(e.title, all('SELECT * FROM competitors')).name, 'FE Credit');
  const r1 = await ingest({ competitor: comp, ...e });
  const r2 = await ingest({ competitor: comp, title: 'FE Credit giảm lãi suất', body: '', url: 'https://vnexpress.net/b', date: e.date });
  assert.equal(r1.status, 'added'); assert.equal(r2.status, 'merged'); assert.equal(r2.id, r1.id);
  const it = get('SELECT * FROM items WHERE id=?', r1.id);
  assert.equal(it.event, 'rate_change'); assert.ok(it.trust > 76); assert.equal(all('SELECT * FROM alerts').length, 1);
});
test('hỏi đáp không bịa trích dẫn', async () => {
  const empty = await answer('abc', []); assert.deepEqual(empty.cited, []);
  const a = await answer('x', [{ id: 7, title: 't', summary: 's', competitor_name: 'C', published_at: '2026-01-01', label: 'press' }]);
  assert.deepEqual(a.cited, [7]);
});
