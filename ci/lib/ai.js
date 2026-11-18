import { cfg } from './config.js';

export const TOPICS = { a: 'Sản phẩm & lãi suất', b: 'Tài chính & chỉ số kinh doanh', c: 'Marketing & số hóa', d: 'Tin tức & truyền thông' };
export const LABELS = { official: 'Chính thức', press: 'Báo chí', rumor: 'Tin đồn / chưa kiểm chứng' };

export const fold = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const KW = {
  a: ['lai suat', 'san pham', 'goi vay', 'cho vay', 'vay tieu dung', 'the tin dung', 'tra gop', 'ra mat', 'bieu phi', 'han muc', 'goi bao hiem', 'tiet kiem', 'mua truoc tra sau', 'bnpl', 'lai vay', 'phi '],
  b: ['loi nhuan', 'doanh thu', 'no xau', 'du no', 'bao cao tai chinh', 'ket qua kinh doanh', 'tang von', 'von dieu le', 'huy dong', 'co phieu', 'roe', 'ty dong', 'xep hang tin nhiem', 'quy i', 'quy ii', 'quy iii', 'quy iv', 'tai san', 'trai phieu'],
  c: ['marketing', 'chien dich', 'khuyen mai', 'uu dai', 'quang cao', 'ung dung', 'app ', 'so hoa', 'ngan hang so', 'ekyc', 'dai su thuong hieu', 'tinh nang', 'tiktok', 'fanpage', 'thuong hieu', 'tai tro', 'livestream', 'ai '],
  d: ['bo nhiem', 'mien nhiem', 'nhan su', 'thanh tra', 'xu phat', 'giai thuong', 'sap nhap', 'thau tom', 'hop tac', 'ky ket', 'lanh dao', 'tong giam doc', 'chu tich', 'su kien', 'bao chi', 'ceo'],
};
const EVENTS = {
  rate_change: t => /lai suat/.test(t) && /(tang|giam|dieu chinh|ha |doi|thay doi|nang|cat)/.test(t),
  new_product: t => /(ra mat|gioi thieu|trien khai|cong bo|tung ra|chinh thuc)/.test(t) && /(san pham|goi |the |dich vu|ung dung|app |tinh nang|vay)/.test(t),
  ma: t => /(sap nhap|thau tom|mua lai|m&a|chuyen nhuong von|ban co phan|mua co phan|ban lai)/.test(t),
  exec_change: t => /(bo nhiem|mien nhiem|tu nhiem|thay tuong|nghi huu)/.test(t) && /(tong giam doc|ceo|chu tich|giam doc|pho tong|hdqt|lanh dao)/.test(t),
};
export const EVENT_NAMES = { rate_change: 'Đổi lãi suất', new_product: 'Sản phẩm mới', ma: 'M&A', exec_change: 'Nhân sự cấp cao' };

export function ruleClassify(text) {
  const t = ' ' + fold(text) + ' ';
  let best = 'd', bs = 0;
  for (const k of ['a', 'b', 'c', 'd']) {
    const s = KW[k].reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (s > bs) { bs = s; best = k; }
  }
  return best;
}

export function detectEvent(text) {
  const t = ' ' + fold(text) + ' ';
  for (const [k, f] of Object.entries(EVENTS)) if (f(t)) return k;
  return null;
}

export function importanceScore({ topic, event, label, text }) {
  let s = { a: 35, b: 30, c: 20, d: 15 }[topic] ?? 15;
  if (event) s += 40;
  if (label === 'official') s += 10; else if (label === 'press') s += 5; else s -= 10;
  const t = fold(text);
  if (/(khan cap|quan trong|lon nhat|dau tien|dot pha|vi pham|phat|dieu tra)/.test(t)) s += 8;
  return Math.max(0, Math.min(100, s));
}

export function extractiveSummary(text, max = 320) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const sents = clean.split(/(?<=[.!?…])\s+/).filter(x => x.length > 25);
  let out = '';
  for (const s of sents) { if ((out + ' ' + s).length > max) break; out = (out + ' ' + s).trim(); }
  return out || clean.slice(0, max);
}

async function claude(system, user, maxTokens = 800) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.aiModel, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error('Claude API ' + r.status);
  const j = await r.json();
  return j.content?.map(c => c.text || '').join('') || '';
}

/** Phân tích 1 tin: trả về {topic, summary}. Dùng Claude nếu có khóa, lỗi thì rơi về quy tắc. */
export async function analyze(title, body) {
  const text = `${title}. ${body || ''}`;
  const fallback = { topic: ruleClassify(text), summary: extractiveSummary(body || title), ai: false };
  if (!cfg.anthropicKey) return fallback;
  try {
    const out = await claude(
      'Bạn là chuyên viên phân tích đối thủ ngành tài chính tiêu dùng. Chỉ dựa vào nội dung được cho, không bịa. Trả về DUY NHẤT JSON: {"topic":"a|b|c|d","summary":"tóm tắt tiếng Việt ≤ 2 câu"}. a=Sản phẩm & lãi suất, b=Tài chính & chỉ số kinh doanh, c=Marketing & số hóa, d=Tin tức & truyền thông.',
      `Tiêu đề: ${title}\nNội dung: ${(body || '').slice(0, 3000)}`, 300);
    const j = JSON.parse(out.match(/\{[\s\S]*\}/)[0]);
    if (!TOPICS[j.topic] || !j.summary) return fallback;
    return { topic: j.topic, summary: String(j.summary).slice(0, 500), ai: true };
  } catch { return fallback; }
}

const STOP = new Set('la va cua cho cac nhung mot nhu the nao gi co khong trong ve voi den tu da dang se duoc bi nay do khi nam thang gan day moi nhat hay cho biet toi minh ban hoi'.split(' '));

/** Hỏi đáp: truy xuất tin liên quan, trả lời kèm trích dẫn [n] chỉ tới tin có thật. */
export async function answer(question, items) {
  if (!items.length) return { text: 'Không tìm thấy tin liên quan trong cơ sở dữ liệu. Hãy thử từ khóa khác hoặc thêm nguồn/đối thủ.', cited: [] };
  const numbered = items.map((it, i) => `[${i + 1}] (${it.competitor_name}, ${(it.published_at || '').slice(0, 10)}, ${it.label}) ${it.title} — ${it.summary || ''}`).join('\n');
  if (cfg.anthropicKey) {
    try {
      const out = await claude(
        'Trả lời tiếng Việt, ngắn gọn, CHỈ dựa vào danh sách tin đánh số được cung cấp. Mỗi nhận định phải kèm trích dẫn dạng [n]. Nếu tin không đủ để trả lời, nói rõ là chưa đủ dữ liệu. Không thêm thông tin ngoài danh sách. Nêu rõ khi nguồn là tin đồn/chưa kiểm chứng.',
        `Câu hỏi: ${question}\n\nDanh sách tin:\n${numbered}`, 700);
      const refs = [...new Set([...out.matchAll(/\[(\d+)\]/g)].map(m => +m[1]))];
      const valid = refs.filter(n => n >= 1 && n <= items.length);
      // loại bỏ trích dẫn không tồn tại; nếu không còn trích dẫn hợp lệ thì dùng bản trích xuất
      if (valid.length && valid.length === refs.length) return { text: out.trim(), cited: valid.map(n => items[n - 1].id) };
    } catch { /* rơi về bản trích xuất */ }
  }
  const top = items.slice(0, 5);
  const text = 'Các tin liên quan nhất tìm được:\n' + top.map((it, i) => `• ${it.competitor_name} (${(it.published_at || '').slice(0, 10)}): ${it.summary || it.title} [${i + 1}]`).join('\n');
  return { text, cited: top.map(i => i.id) };
}

export function keywordsOf(q) {
  return fold(q).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}
