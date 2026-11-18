import tls from 'node:tls';
import { all, get, run } from './db.js';
import { cfg } from './config.js';
import { collect } from './collector.js';
import { TOPICS, LABELS } from './ai.js';

// ---------- SMTP tối giản (TLS ngầm định, AUTH LOGIN). Không có SMTP_HOST thì thư nằm ở hộp "Thư đã tạo" ----------
function smtpSend(to, subject, body) {
  const { host, port, user, pass, from } = cfg.smtp;
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host }, () => {});
    const steps = [null, `EHLO intel`, 'AUTH LOGIN', Buffer.from(user || '').toString('base64'), Buffer.from(pass || '').toString('base64'),
      `MAIL FROM:<${from}>`, `RCPT TO:<${to}>`, 'DATA',
      `From: ${from}\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body.replace(/\n\./g, '\n..')}\r\n.`, 'QUIT'];
    let i = 1, buf = '';
    const t = setTimeout(() => { sock.destroy(); reject(new Error('SMTP timeout')); }, 20000);
    sock.on('data', d => {
      buf += d; const last = buf.split(/\r?\n/).filter(Boolean).pop() || '';
      if (!/\r?\n$/.test(buf) || !/^\d{3} /.test(last)) return;
      const code = +buf.slice(0, 3); const ok = code < 400; buf = '';
      if (!ok) { clearTimeout(t); sock.destroy(); return reject(new Error('SMTP ' + code)); }
      if (i >= steps.length) { clearTimeout(t); sock.end(); return resolve(); }
      sock.write(steps[i++] + '\r\n');
    });
    sock.on('error', e => { clearTimeout(t); reject(e); });
  });
}

export async function flushOutbox() {
  for (const m of all("SELECT * FROM outbox WHERE status='pending' ORDER BY id LIMIT 50")) {
    if (!cfg.smtp.host) { run("UPDATE outbox SET status='queued-nosmtp' WHERE id=?", m.id); continue; }
    try { await smtpSend(m.to_email, m.subject, m.body); run("UPDATE outbox SET status='sent', sent_at=datetime('now') WHERE id=?", m.id); }
    catch (e) { run("UPDATE outbox SET status='error', error=? WHERE id=?", String(e.message), m.id); }
  }
}

export function buildDigest(sub, sinceISO) {
  const comps = JSON.parse(sub.competitors || '[]'), topics = JSON.parse(sub.topics || '[]');
  let items = all(`SELECT i.*, c.name cname FROM items i JOIN competitors c ON c.id=i.competitor_id WHERE i.collected_at > ? ORDER BY i.importance DESC, i.published_at DESC`, sinceISO.replace('T', ' ').slice(0, 19));
  items = items.filter(i => (!comps.length || comps.includes(i.competitor_id)) && (!topics.length || topics.includes(i.topic))).slice(0, 30);
  if (!items.length) return null;
  const by = {};
  for (const i of items) (by[i.topic] ||= []).push(i);
  let body = `Bản tin đối thủ — ${items.length} tin\n\n`;
  for (const [t, arr] of Object.entries(by)) {
    body += `== ${TOPICS[t]} ==\n`;
    for (const i of arr) body += `• [${i.cname}] ${i.title}\n  ${i.summary || ''}\n  ${LABELS[i.label]} (${i.trust}/100) · ${(i.published_at || '').slice(0, 10)} · ${i.url}\n`;
    body += '\n';
  }
  return body;
}

export function runDigests(now = new Date()) {
  for (const s of all("SELECT s.*, u.email FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.digest!='off'")) {
    const gap = s.digest === 'weekly' ? 7 * 24 : 24;
    const last = s.last_digest_at ? new Date(s.last_digest_at) : new Date(now - gap * 36e5);
    if (now - last < gap * 36e5 - 6e4 || now.getHours() < cfg.digestHour) continue;
    const body = buildDigest(s, last.toISOString());
    run('UPDATE subscriptions SET last_digest_at=? WHERE user_id=?', now.toISOString(), s.user_id);
    if (body) run('INSERT INTO outbox(to_email,subject,body,kind) VALUES(?,?,?,?)', s.email, `Bản tin đối thủ (${s.digest === 'weekly' ? 'tuần' : 'ngày'}) ${now.toISOString().slice(0, 10)}`, body, 'digest');
  }
}

let collecting = false;
export async function collectGuarded(opts) {
  if (collecting) return [{ source: '-', status: 'error', error: 'Đang có một lượt thu thập chạy' }];
  collecting = true;
  try { return await collect(opts); } finally { collecting = false; }
}

export function startJobs() {
  setInterval(() => { flushOutbox().catch(() => {}); try { runDigests(); } catch {} }, 30000);
  setInterval(() => {
    const last = get("SELECT MAX(started_at) m FROM crawl_logs")?.m;
    if (!last || Date.now() - new Date(last.replace(' ', 'T') + 'Z') > cfg.collectEveryHours * 36e5) collectGuarded().catch(() => {});
  }, 10 * 60000);
  setTimeout(() => { if (!get('SELECT 1 x FROM crawl_logs LIMIT 1')) collectGuarded().catch(() => {}); }, 5000);
}
