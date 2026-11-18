import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';
import { all, get, run, tx } from './lib/db.js';
import { cfg } from './lib/config.js';
import { TOPICS, LABELS, EVENT_NAMES, answer, keywordsOf, fold } from './lib/ai.js';
import { ingestUrl, ingestText } from './lib/collector.js';
import { startJobs, collectGuarded, flushOutbox } from './lib/jobs.js';

const PUB = fileURLToPath(new URL('./public/', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const RANK = { viewer: 1, editor: 2, admin: 3 };

class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const need = (u, role) => { if (!u) throw new HttpError(401, 'Chưa đăng nhập'); if (RANK[u.role] < RANK[role]) throw new HttpError(403, 'Không đủ quyền'); };

const cookies = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => c.split('=').map(decodeURIComponent)));
const userOf = req => { const t = cookies(req).sid; return t ? get('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?', t) : null; };
function startSession(res, userId) {
  const t = randomBytes(24).toString('hex'); run('INSERT INTO sessions(token,user_id) VALUES(?,?)', t, userId);
  res.setHeader('Set-Cookie', `sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}`);
}
function upsertUser(email, name) {
  email = email.toLowerCase();
  let u = get('SELECT * FROM users WHERE email=?', email);
  if (!u) {
    const first = !get('SELECT 1 x FROM users LIMIT 1');
    run('INSERT INTO users(email,name,role) VALUES(?,?,?)', email, name || email.split('@')[0], first || cfg.adminEmails.includes(email) ? 'admin' : 'viewer');
    u = get('SELECT * FROM users WHERE email=?', email);
    run('INSERT OR IGNORE INTO subscriptions(user_id) VALUES(?)', u.id);
  }
  return u;
}

const json = (res, data, code = 200) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
const body = req => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 5e6) { no(new HttpError(413, 'Quá lớn')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { no(new HttpError(400, 'JSON không hợp lệ')); } }); });

const compRow = c => c && ({ ...c, socials: c.socials || '', keywords: c.keywords || '' });
const itemSelect = `SELECT i.id,i.competitor_id,c.name competitor_name,i.topic,i.title,i.summary,i.url,i.published_at,i.collected_at,i.label,i.trust,i.importance,i.event,i.dup_count,i.reported,i.domain,i.origin
  FROM items i JOIN competitors c ON c.id=i.competitor_id`;

function queryItems(q, lim = 50) {
  const w = [], p = [];
  if (q.competitor) { const ids = String(q.competitor).split(',').map(Number).filter(Boolean); if (ids.length) { w.push(`i.competitor_id IN (${ids.map(() => '?').join(',')})`); p.push(...ids); } }
  if (q.topic) { const t = String(q.topic).split(',').filter(x => TOPICS[x]); if (t.length) { w.push(`i.topic IN (${t.map(() => '?').join(',')})`); p.push(...t); } }
  if (q.label && LABELS[q.label]) { w.push('i.label=?'); p.push(q.label); }
  if (+q.days) { w.push('i.published_at >= ?'); p.push(new Date(Date.now() - q.days * 864e5).toISOString()); }
  if (+q.min_importance) { w.push('i.importance >= ?'); p.push(+q.min_importance); }
  if (q.q) { w.push('(i.title LIKE ? OR i.summary LIKE ?)'); p.push(`%${q.q}%`, `%${q.q}%`); }
  const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
  const total = get(`SELECT COUNT(*) n FROM items i ${where}`, ...p).n;
  const rows = all(`${itemSelect} ${where} ORDER BY i.published_at DESC LIMIT ? OFFSET ?`, ...p, Math.min(+q.limit || lim, 200), +q.offset || 0);
  return { total, items: rows };
}

function retrieve(question, k = 8) {
  const kws = keywordsOf(question);
  const comps = all("SELECT id,name,keywords FROM competitors");
  const fq = fold(question);
  const mentioned = comps.filter(c => [c.name, ...c.keywords.split(',')].some(n => n.trim().length > 2 && fq.includes(fold(n.trim()))));
  const rows = all(`${itemSelect.replace('i.domain', 'i.excerpt, i.domain')} WHERE i.published_at >= ? ORDER BY i.published_at DESC LIMIT 3000`, new Date(Date.now() - 365 * 864e5).toISOString());
  const scored = rows.map(r => {
    const t = fold(r.title + ' ' + (r.summary || '') + ' ' + (r.excerpt || ''));
    let s = kws.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (mentioned.length) { if (mentioned.some(c => c.id === r.competitor_id)) s += 2; else s = Math.min(s, 1) * 0; }
    return { r, s: s + r.trust / 400 };
  }).filter(x => x.s >= 1).sort((a, b) => b.s - a.s).slice(0, k);
  return scored.map(x => x.r);
}

async function api(req, res, url) {
  const m = req.method, path = url.pathname, q = Object.fromEntries(url.searchParams);
  const user = userOf(req);
  if (m !== 'GET' && !(req.headers['content-type'] || '').includes('application/json') && m !== 'DELETE' && !path.startsWith('/api/login')) throw new HttpError(415, 'Cần JSON');

  if (path === '/api/config') return json(res, { authMode: cfg.authMode, topics: TOPICS, labels: LABELS, events: EVENT_NAMES, ai: cfg.anthropicKey ? 'claude' : 'rules', smtp: !!cfg.smtp.host });
  if (path === '/api/login' && m === 'POST') {
    if (cfg.authMode !== 'dev') throw new HttpError(400, 'Dùng SSO');
    const b = await body(req); if (!/^[^@\s]+@[^@\s]+$/.test(b.email || '')) throw new HttpError(400, 'Email không hợp lệ');
    const u = upsertUser(b.email, b.name); startSession(res, u.id); return json(res, u);
  }
  if (path === '/api/logout' && m === 'POST') { const t = cookies(req).sid; if (t) run('DELETE FROM sessions WHERE token=?', t); res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/'); return json(res, { ok: true }); }
  if (path === '/api/me') return json(res, user);
  need(user, 'viewer');

  if (path === '/api/competitors') {
    if (m === 'GET') return json(res, all("SELECT c.*, (SELECT COUNT(*) FROM items WHERE competitor_id=c.id) item_count FROM competitors c ORDER BY name"));
    if (m === 'POST') {
      need(user, 'editor'); const b = await body(req); if (!b.name?.trim()) throw new HttpError(400, 'Thiếu tên');
      const r = run('INSERT INTO competitors(name,grp,website,socials,keywords) VALUES(?,?,?,?,?)', b.name.trim(), b.grp || 'Công ty tài chính', b.website || '', b.socials || '', b.keywords || '');
      const id = Number(r.lastInsertRowid);
      collectGuarded({ competitorId: id }).catch(() => {}); // thu thập ngay để tin xuất hiện sớm (không chờ lịch)
      return json(res, get('SELECT * FROM competitors WHERE id=?', id), 201);
    }
  }
  let mm;
  if ((mm = path.match(/^\/api\/competitors\/(\d+)$/))) {
    const id = +mm[1];
    if (m === 'PUT') { need(user, 'editor'); const b = await body(req); run('UPDATE competitors SET name=?,grp=?,website=?,socials=?,keywords=?,status=? WHERE id=?', b.name, b.grp, b.website || '', b.socials || '', b.keywords || '', b.status === 'inactive' ? 'inactive' : 'active', id); return json(res, { ok: true }); }
    if (m === 'DELETE') { need(user, 'editor'); run('DELETE FROM competitors WHERE id=?', id); return json(res, { ok: true }); }
  }
  if ((mm = path.match(/^\/api\/competitors\/(\d+)\/profile$/))) {
    const id = +mm[1]; const c = get('SELECT * FROM competitors WHERE id=?', id); if (!c) throw new HttpError(404, 'Không có');
    return json(res, { competitor: compRow(c), byTopic: all('SELECT topic, COUNT(*) n FROM items WHERE competitor_id=? GROUP BY topic', id),
      metrics: all('SELECT * FROM metrics WHERE competitor_id=? ORDER BY period DESC', id), ...queryItems({ competitor: id, limit: 30 }) });
  }
  if (path === '/api/compare') {
    const ids = (q.ids || '').split(',').map(Number).filter(Boolean).slice(0, 5);
    return json(res, ids.map(id => {
      const c = get('SELECT * FROM competitors WHERE id=?', id); if (!c) return null;
      const since = new Date(Date.now() - (+q.days || 30) * 864e5).toISOString();
      return { competitor: c, byTopic: all('SELECT topic, COUNT(*) n FROM items WHERE competitor_id=? AND published_at>=? GROUP BY topic', id, since),
        avgImportance: get('SELECT ROUND(AVG(importance)) v FROM items WHERE competitor_id=? AND published_at>=?', id, since).v,
        top: all(`${itemSelect} WHERE i.competitor_id=? AND i.published_at>=? ORDER BY i.importance DESC LIMIT 3`, id, since),
        metrics: all('SELECT * FROM metrics WHERE competitor_id=? ORDER BY period DESC', id) };
    }).filter(Boolean));
  }
  if (path === '/api/items' && m === 'GET') return json(res, queryItems(q));
  if ((mm = path.match(/^\/api\/items\/(\d+)$/)) && m === 'GET') {
    const it = get(`${itemSelect.replace('i.domain', 'i.excerpt, i.domain')} WHERE i.id=?`, +mm[1]); if (!it) throw new HttpError(404, 'Không có');
    return json(res, { ...it, alt_sources: all('SELECT url,domain FROM item_dupes WHERE item_id=?', it.id) });
  }
  if ((mm = path.match(/^\/api\/items\/(\d+)\/report$/)) && m === 'POST') {
    const b = await body(req); run('INSERT INTO item_reports(item_id,user_id,note) VALUES(?,?,?)', +mm[1], user.id, (b.note || '').slice(0, 500)); run('UPDATE items SET reported=reported+1 WHERE id=?', +mm[1]); return json(res, { ok: true });
  }
  if ((mm = path.match(/^\/api\/items\/(\d+)$/)) && m === 'DELETE') { need(user, 'editor'); run('DELETE FROM items WHERE id=?', +mm[1]); return json(res, { ok: true }); }
  if ((mm = path.match(/^\/api\/items\/(\d+)\/fix$/)) && m === 'PUT') { need(user, 'editor'); const b = await body(req); if (TOPICS[b.topic]) run('UPDATE items SET topic=? WHERE id=?', b.topic, +mm[1]); return json(res, { ok: true }); }

  if (path === '/api/ingest/url' && m === 'POST') { need(user, 'editor'); const b = await body(req); if (!/^https?:\/\//i.test(b.url || '')) throw new HttpError(400, 'Link không hợp lệ'); return json(res, await ingestUrl(b.url, b.competitor_id)); }
  if (path === '/api/ingest/text' && m === 'POST') { need(user, 'editor'); const b = await body(req); if (!b.text || b.text.length < 30) throw new HttpError(400, 'Nội dung quá ngắn'); return json(res, await ingestText({ title: b.title, text: b.text.slice(0, 20000), url: b.url, competitorId: b.competitor_id, date: b.date })); }

  if (path === '/api/sources') {
    if (m === 'GET') return json(res, all('SELECT * FROM sources ORDER BY priority, id'));
    if (m === 'POST') { need(user, 'editor'); const b = await body(req); if (!['rss', 'site', 'search'].includes(b.type)) throw new HttpError(400, 'Loại nguồn không hợp lệ'); if (b.type !== 'search' && !/^https?:\/\//.test(b.url || '')) throw new HttpError(400, 'Cần URL');
      const r = run('INSERT INTO sources(type,name,url,freq_hours,priority) VALUES(?,?,?,?,?)', b.type, b.name || b.url, b.url || '', +b.freq_hours || 24, +b.priority || 2); return json(res, { id: Number(r.lastInsertRowid) }, 201); }
  }
  if ((mm = path.match(/^\/api\/sources\/(\d+)$/))) {
    need(user, 'editor');
    if (m === 'DELETE') { run('DELETE FROM sources WHERE id=?', +mm[1]); return json(res, { ok: true }); }
    if (m === 'PUT') { const b = await body(req); run('UPDATE sources SET enabled=? WHERE id=?', b.enabled ? 1 : 0, +mm[1]); return json(res, { ok: true }); }
  }
  if (path === '/api/collect' && m === 'POST') { need(user, 'editor'); const b = await body(req); return json(res, await collectGuarded({ sourceId: b.source_id })); }
  if (path === '/api/logs') { need(user, 'editor'); return json(res, all('SELECT * FROM crawl_logs ORDER BY id DESC LIMIT 100')); }
  if (path === '/api/reports') { need(user, 'editor'); return json(res, all('SELECT r.*, i.title, u.email FROM item_reports r JOIN items i ON i.id=r.item_id LEFT JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 100')); }

  if (path === '/api/metrics') {
    if (m === 'POST') { need(user, 'editor'); const b = await body(req); run('INSERT INTO metrics(competitor_id,kind,value,period,source_url) VALUES(?,?,?,?,?)', +b.competitor_id, b.kind, String(b.value), b.period || '', b.source_url || ''); return json(res, { ok: true }, 201); }
    return json(res, all('SELECT m.*, c.name competitor_name FROM metrics m JOIN competitors c ON c.id=m.competitor_id ORDER BY period DESC'));
  }
  if ((mm = path.match(/^\/api\/metrics\/(\d+)$/)) && m === 'DELETE') { need(user, 'editor'); run('DELETE FROM metrics WHERE id=?', +mm[1]); return json(res, { ok: true }); }

  if (path === '/api/subscription') {
    if (m === 'GET') return json(res, get('SELECT * FROM subscriptions WHERE user_id=?', user.id) || {});
    if (m === 'PUT') {
      const b = await body(req);
      run(`INSERT INTO subscriptions(user_id,competitors,topics,digest,alerts,alert_threshold) VALUES(?,?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET competitors=excluded.competitors,topics=excluded.topics,digest=excluded.digest,alerts=excluded.alerts,alert_threshold=excluded.alert_threshold`,
        user.id, JSON.stringify(b.competitors || []), JSON.stringify((b.topics || []).filter(t => TOPICS[t])), ['off', 'daily', 'weekly'].includes(b.digest) ? b.digest : 'off', b.alerts ? 1 : 0, Math.max(0, Math.min(100, +b.alert_threshold || 60)));
      return json(res, { ok: true });
    }
  }
  if (path === '/api/alerts') return json(res, all(`SELECT a.id, a.event, a.created_at, i.id item_id, i.title, i.url, i.importance, i.label, c.name competitor_name FROM alerts a JOIN items i ON i.id=a.item_id JOIN competitors c ON c.id=i.competitor_id ORDER BY a.id DESC LIMIT 50`));
  if (path === '/api/outbox') { need(user, 'admin'); return json(res, all('SELECT * FROM outbox ORDER BY id DESC LIMIT 100')); }
  if (path === '/api/outbox/flush' && m === 'POST') { need(user, 'admin'); await flushOutbox(); return json(res, { ok: true }); }

  if (path === '/api/ask' && m === 'POST') {
    const b = await body(req); const qn = (b.question || '').trim(); if (qn.length < 3) throw new HttpError(400, 'Câu hỏi quá ngắn');
    const items = retrieve(qn); const a = await answer(qn, items);
    run('INSERT INTO ask_logs(user_id,question,answer,cited) VALUES(?,?,?,?)', user.id, qn, a.text, JSON.stringify(a.cited));
    const idx = Object.fromEntries(items.map(i => [i.id, i]));
    return json(res, { answer: a.text, sources: items.map((i, n) => ({ n: n + 1, id: i.id, title: i.title, url: i.url, competitor_name: i.competitor_name, published_at: i.published_at, label: i.label, trust: i.trust, cited: a.cited.includes(i.id) })) });
  }
  if (path === '/api/ask/history') return json(res, all('SELECT id,question,answer,created_at FROM ask_logs WHERE user_id=? ORDER BY id DESC LIMIT 20', user.id));

  if (path === '/api/users') {
    need(user, 'admin');
    if (m === 'GET') return json(res, all('SELECT * FROM users ORDER BY email'));
    if (m === 'POST') { const b = await body(req); const u = upsertUser(b.email, b.name); if (RANK[b.role]) run('UPDATE users SET role=? WHERE id=?', b.role, u.id); return json(res, { ok: true }, 201); }
  }
  if ((mm = path.match(/^\/api\/users\/(\d+)$/))) {
    need(user, 'admin'); const id = +mm[1];
    if (m === 'PUT') { const b = await body(req); if (!RANK[b.role]) throw new HttpError(400, 'Vai trò sai'); if (id === user.id && b.role !== 'admin') throw new HttpError(400, 'Không tự hạ quyền admin'); run('UPDATE users SET role=? WHERE id=?', b.role, id); return json(res, { ok: true }); }
    if (m === 'DELETE') { if (id === user.id) throw new HttpError(400, 'Không tự xóa'); run('DELETE FROM users WHERE id=?', id); return json(res, { ok: true }); }
  }
  throw new HttpError(404, 'Không tìm thấy');
}

// ---------- OIDC ----------
const oidcState = new Map();
async function oidc(req, res, url) {
  const o = cfg.oidc; if (cfg.authMode !== 'oidc' || !o.issuer) throw new HttpError(400, 'SSO chưa cấu hình');
  const disc = await (await fetch(o.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration')).json();
  const redirect = cfg.baseUrl + '/auth/callback';
  if (url.pathname === '/auth/login') {
    const st = randomBytes(16).toString('hex'); oidcState.set(st, Date.now());
    res.writeHead(302, { location: `${disc.authorization_endpoint}?${new URLSearchParams({ response_type: 'code', client_id: o.clientId, redirect_uri: redirect, scope: 'openid email profile', state: st })}` }); return res.end();
  }
  const st = url.searchParams.get('state'); if (!oidcState.delete(st)) throw new HttpError(400, 'State sai');
  const tr = await fetch(disc.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: redirect, client_id: o.clientId, client_secret: o.clientSecret }) });
  if (!tr.ok) throw new HttpError(401, 'Đăng nhập SSO thất bại');
  const claims = JSON.parse(Buffer.from((await tr.json()).id_token.split('.')[1], 'base64url').toString()); // nhận trực tiếp từ token endpoint qua TLS
  if (!claims.email) throw new HttpError(401, 'IdP không trả về email');
  const u = upsertUser(claims.email, claims.name); startSession(res, u.id);
  res.writeHead(302, { location: '/' }); res.end();
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname.startsWith('/auth/')) return await oidc(req, res, url);
    const f = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
    if (f.includes('..')) throw new HttpError(400, 'Bad path');
    const data = await readFile(join(PUB, f)).catch(() => null);
    if (!data) throw new HttpError(404, 'Không tìm thấy');
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(data);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    json(res, { error: e instanceof HttpError ? e.message : 'Lỗi máy chủ' }, e.code || 500);
  }
}).listen(cfg.port, () => { console.log(`Competitor Intel chạy tại ${cfg.baseUrl} (auth=${cfg.authMode}, ai=${cfg.anthropicKey ? 'claude' : 'rules'})`); startJobs(); });
