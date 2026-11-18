import { createHash } from 'node:crypto';
import { all, get, run, tx } from './db.js';
import { analyze, detectEvent, importanceScore, fold } from './ai.js';
import { assessTrust, hostOf } from './trust.js';
import { cfg } from './config.js';

const sha = s => createHash('sha1').update(s).digest('hex');
const UA = 'Mozilla/5.0 (compatible; CompetitorIntelBot/0.1)';

// ---------- parsing ----------
const decode = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
export const stripTags = s => decode(decode(s || '')).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, 'i')); return m ? m[1] : ''; };

export function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)) {
    const x = m[0];
    const link = stripTags(tag(x, 'link')) || (x.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const src = x.match(/<source[^>]*url="([^"]+)"/i);
    out.push({
      title: stripTags(tag(x, 'title')), url: link.trim(),
      body: stripTags(tag(x, 'description') || tag(x, 'summary') || tag(x, 'content:encoded') || tag(x, 'content')),
      date: stripTags(tag(x, 'pubDate') || tag(x, 'published') || tag(x, 'updated') || tag(x, 'dc:date')),
      srcDomain: src ? hostOf(src[1]) : '',
    });
  }
  return out.filter(i => i.title && i.url);
}

async function fetchText(url, ms = 15000) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml,application/rss+xml,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status} khi tải ${url}`);
  return r.text();
}

export function parsePage(html, url) {
  const meta = n => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`, 'i')) || [])[1];
  const title = stripTags(meta('og:title') || tag(html, 'title')) || url;
  const desc = stripTags(meta('og:description') || meta('description') || '');
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => stripTags(m[1])).filter(p => p.length > 60).join(' ').slice(0, 1500);
  const date = meta('article:published_time') || (html.match(/<time[^>]+datetime=["']([^"']+)/i) || [])[1] || '';
  return { title, body: (desc + ' ' + paras).trim(), url, date };
}

// ---------- ingest ----------
const toISO = d => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toISOString() : null; };
const normTitle = t => fold(t).replace(/\s+-\s+[^-]{2,40}$/, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 90);
const normUrl = u => { try { const x = new URL(u); x.hash = ''; ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'].forEach(k => x.searchParams.delete(k)); return x.href.replace(/\/$/, ''); } catch { return u; } };

export function matchCompetitor(text, competitors) {
  const t = fold(text);
  let best = null, bl = 0;
  for (const c of competitors) {
    for (const k of [c.name, ...c.keywords.split(',')].map(s => fold(s.trim())).filter(s => s.length > 2)) {
      if (new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(t) && k.length > bl) { best = c; bl = k.length; }
    }
  }
  return best;
}

/** Thêm 1 tin; trả về {status:'added'|'merged', id}. Trùng thì gộp, thêm link nguồn phụ và tăng điểm tin cậy. */
export async function ingest({ competitor, title, body, url, date, srcDomain, origin = 'auto', forceLabel }) {
  const hash = sha(competitor.id + '|' + normTitle(title));
  const url_hash = sha(normUrl(url));
  const dup = get('SELECT id,domain,trust,label FROM items WHERE hash=? OR (url_hash=? AND competitor_id=?)', hash, url_hash, competitor.id);
  const domain = srcDomain || hostOf(url);
  if (dup) {
    tx(() => {
      if (domain !== dup.domain && !get('SELECT 1 x FROM item_dupes WHERE item_id=? AND domain=?', dup.id, domain)) {
        run('INSERT INTO item_dupes(item_id,url,domain) VALUES(?,?,?)', dup.id, url, domain);
        // được nhiều nguồn độc lập xác nhận -> tăng điểm, và nâng nhãn nếu đang là tin đồn
        run('UPDATE items SET trust=MIN(99,trust+6), label=CASE WHEN label=\'rumor\' THEN \'press\' ELSE label END WHERE id=?', dup.id);
      }
      run('UPDATE items SET dup_count=dup_count+1 WHERE id=?', dup.id);
    });
    return { status: 'merged', id: dup.id };
  }
  const useless = !body || fold(body).startsWith(fold(title).slice(0, 40)); // RSS tổng hợp chỉ lặp lại tiêu đề
  const { topic, summary: s0 } = await analyze(title, useless ? '' : body);
  const summary = useless ? '' : s0;
  let { label, trust } = assessTrust({ domain, url, competitor, text: title + ' ' + body });
  if (forceLabel) label = forceLabel;
  const event = detectEvent(title + ' ' + (body || ''));
  const importance = importanceScore({ topic, event, label, text: title + ' ' + body });
  const published = toISO(date) || new Date().toISOString();
  const r = run(`INSERT INTO items(competitor_id,topic,title,summary,excerpt,url,published_at,label,trust,importance,event,hash,url_hash,domain,origin)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, competitor.id, topic, title.slice(0, 300), summary, (body || '').slice(0, 600), url, published,
    label, trust, importance, event, hash, url_hash, domain, origin);
  const id = Number(r.lastInsertRowid);
  if (event && importance >= Math.min(cfg.alertThreshold, 60)) { run('INSERT INTO alerts(item_id,event) VALUES(?,?)', id, event); queueAlertEmails(id); }
  return { status: 'added', id };
}

export function queueAlertEmails(itemId) {
  const it = get('SELECT i.*, c.name cname FROM items i JOIN competitors c ON c.id=i.competitor_id WHERE i.id=?', itemId);
  const subs = all('SELECT s.*, u.email FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.alerts=1');
  for (const s of subs) {
    const comps = JSON.parse(s.competitors || '[]');
    if (it.importance < s.alert_threshold) continue;
    if (comps.length && !comps.includes(it.competitor_id)) continue;
    run('INSERT INTO outbox(to_email,subject,body,kind) VALUES(?,?,?,?)', s.email, `[Cảnh báo] ${it.cname}: ${it.title}`.slice(0, 200),
      `${it.cname} — ${it.title}\n\n${it.summary || ''}\n\nNhãn: ${it.label} | Tin cậy: ${it.trust}/100 | Quan trọng: ${it.importance}/100\nNguồn: ${it.url}\n`, 'alert');
  }
}

// ---------- sources ----------
const activeComps = () => all("SELECT * FROM competitors WHERE status='active'");
const recent = d => !d || (Date.now() - new Date(d).getTime()) < 120 * 864e5; // bỏ tin quá cũ (>120 ngày)

async function runFeed(url, comps, fixedComp) {
  const entries = parseFeed(await fetchText(url));
  let added = 0, merged = 0;
  for (const e of entries) {
    if (!recent(toISO(e.date))) continue;
    const c = matchCompetitor(e.title + ' ' + e.body, fixedComp ? [fixedComp] : comps); // kết quả tìm kiếm cũng phải nhắc đúng đối thủ
    if (!c) continue;
    const r = await ingest({ competitor: c, ...e });
    r.status === 'added' ? added++ : merged++;
  }
  return { added, merged };
}

async function runSource(src, onlyComp) {
  const comps = onlyComp ? [onlyComp] : activeComps();
  if (src.type === 'rss') return runFeed(src.url, comps);
  if (src.type === 'search') {
    let a = 0, m = 0;
    for (const c of comps) {
      const terms = [c.name, ...c.keywords.split(',').map(s => s.trim()).filter(Boolean)].slice(0, 3).map(s => `"${s}"`).join(' OR ');
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(terms + ' when:7d')}&hl=vi&gl=VN&ceid=VN:vi`;
      const r = await runFeed(url, comps, c); a += r.added; m += r.merged;
    }
    return { added: a, merged: m };
  }
  if (src.type === 'site') {
    const p = parsePage(await fetchText(src.url), src.url);
    const c = matchCompetitor(p.title + ' ' + p.body + ' ' + src.url, comps);
    if (!c) return { added: 0, merged: 0 };
    const r = await ingest({ competitor: c, ...p, date: p.date });
    return { added: r.status === 'added' ? 1 : 0, merged: r.status === 'merged' ? 1 : 0 };
  }
  return { added: 0, merged: 0 };
}

/** Chạy thu thập (1 nguồn hoặc tất cả). Mỗi nguồn ghi 1 dòng nhật ký; lỗi một nguồn không dừng các nguồn khác. */
export async function collect({ sourceId, competitorId } = {}) {
  const srcs = sourceId ? all('SELECT * FROM sources WHERE id=?', sourceId) : all('SELECT * FROM sources WHERE enabled=1 AND type IN (\'rss\',\'site\',\'search\') ORDER BY priority');
  const onlyComp = competitorId ? get('SELECT * FROM competitors WHERE id=?', competitorId) : null;
  const results = [];
  for (const s of srcs) {
    const t0 = Date.now();
    let status = 'ok', error = null, r = { added: 0, merged: 0 };
    try { r = await runSource(s, onlyComp); } catch (e) { status = 'error'; error = String(e.cause?.code || e.message || e); }
    run('INSERT INTO crawl_logs(source_id,source_name,status,added,merged,error,ms) VALUES(?,?,?,?,?,?,?)', s.id, s.name || s.url, status, r.added, r.merged, error, Date.now() - t0);
    run("UPDATE sources SET last_run=datetime('now') WHERE id=?", s.id);
    results.push({ source: s.name || s.url, status, ...r, error });
  }
  return results;
}

/** Tin do người dùng dán link. */
export async function ingestUrl(url, competitorId) {
  const comps = activeComps();
  let p;
  try { p = parsePage(await fetchText(url), url); }
  catch (e) { throw new Error('Không tải được trang (có thể bị chặn/yêu cầu đăng nhập). Hãy dùng "Dán nội dung". Chi tiết: ' + (e.cause?.code || e.message)); }
  const c = competitorId ? comps.find(x => x.id === +competitorId) : matchCompetitor(p.title + ' ' + p.body, comps);
  if (!c) throw new Error('Không xác định được đối thủ, hãy chọn đối thủ.');
  return { ...(await ingest({ competitor: c, ...p, origin: 'manual' })), competitor: c.name, title: p.title };
}

export async function ingestText({ title, text, url, competitorId, date }) {
  const c = get('SELECT * FROM competitors WHERE id=?', competitorId) || matchCompetitor(title + ' ' + text, activeComps());
  if (!c) throw new Error('Hãy chọn đối thủ.');
  if (!/^https?:\/\//i.test(url || '')) throw new Error('Cần link nguồn (http/https) để truy vết.');
  return { ...(await ingest({ competitor: c, title: title || text.slice(0, 80), body: text, url, date, origin: 'manual' })), competitor: c.name };
}
