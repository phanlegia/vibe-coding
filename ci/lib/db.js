import { DatabaseSync } from 'node:sqlite';
import { cfg } from './config.js';

export const db = new DatabaseSync(cfg.dbFile);
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS competitors(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, grp TEXT NOT NULL DEFAULT 'Công ty tài chính',
  website TEXT DEFAULT '', socials TEXT DEFAULT '', keywords TEXT DEFAULT '', status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sources(
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, name TEXT DEFAULT '', url TEXT DEFAULT '',
  freq_hours INTEGER DEFAULT 24, priority INTEGER DEFAULT 2, enabled INTEGER DEFAULT 1, last_run TEXT);
CREATE TABLE IF NOT EXISTS items(
  id INTEGER PRIMARY KEY, competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, title TEXT NOT NULL, summary TEXT, excerpt TEXT, url TEXT NOT NULL,
  published_at TEXT, collected_at TEXT DEFAULT CURRENT_TIMESTAMP, label TEXT NOT NULL,
  trust INTEGER NOT NULL, importance INTEGER NOT NULL, event TEXT, hash TEXT UNIQUE, url_hash TEXT,
  domain TEXT, origin TEXT DEFAULT 'auto', reported INTEGER DEFAULT 0, dup_count INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_items_comp ON items(competitor_id, published_at);
CREATE INDEX IF NOT EXISTS ix_items_pub ON items(published_at);
CREATE INDEX IF NOT EXISTS ix_items_urlh ON items(url_hash);
CREATE TABLE IF NOT EXISTS item_dupes(item_id INTEGER REFERENCES items(id) ON DELETE CASCADE, url TEXT, domain TEXT);
CREATE TABLE IF NOT EXISTS item_reports(id INTEGER PRIMARY KEY, item_id INTEGER, user_id INTEGER, note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS metrics(
  id INTEGER PRIMARY KEY, competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
  kind TEXT, value TEXT, period TEXT, source_url TEXT);
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, role TEXT DEFAULT 'viewer');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subscriptions(
  user_id INTEGER PRIMARY KEY, competitors TEXT DEFAULT '[]', topics TEXT DEFAULT '["a","b","c","d"]',
  digest TEXT DEFAULT 'off', alerts INTEGER DEFAULT 1, alert_threshold INTEGER DEFAULT 60, last_digest_at TEXT);
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY, item_id INTEGER REFERENCES items(id) ON DELETE CASCADE, event TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS outbox(
  id INTEGER PRIMARY KEY, to_email TEXT, subject TEXT, body TEXT, kind TEXT, status TEXT DEFAULT 'pending',
  error TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, sent_at TEXT);
CREATE TABLE IF NOT EXISTS ask_logs(id INTEGER PRIMARY KEY, user_id INTEGER, question TEXT, answer TEXT, cited TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS crawl_logs(
  id INTEGER PRIMARY KEY, source_id INTEGER, source_name TEXT, status TEXT, added INTEGER DEFAULT 0,
  merged INTEGER DEFAULT 0, error TEXT, started_at TEXT DEFAULT CURRENT_TIMESTAMP, ms INTEGER);
`);

export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const get = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export const tx = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

if (!get('SELECT 1 x FROM sources LIMIT 1')) {
  run(`INSERT INTO sources(type,name,url,freq_hours,priority) VALUES('search','Tìm kiếm tin tức theo từng đối thủ (Google News RSS)','',24,1)`);
  for (const [n, u] of [['CafeF - Tài chính ngân hàng', 'https://cafef.vn/tai-chinh-ngan-hang.rss'],
    ['VnExpress - Kinh doanh', 'https://vnexpress.net/rss/kinh-doanh.rss'],
    ['Vietnamnet - Kinh doanh', 'https://vietnamnet.vn/rss/kinh-doanh.rss']])
    run(`INSERT INTO sources(type,name,url,freq_hours,priority) VALUES('rss',?,?,24,2)`, n, u);
}
if (!get('SELECT 1 x FROM competitors LIMIT 1')) {
  for (const [n, g, w, k] of [
    ['Home Credit Việt Nam', 'Công ty tài chính', 'https://www.homecredit.vn', 'Home Credit'],
    ['FE Credit', 'Công ty tài chính', 'https://www.fecredit.com.vn', 'FE Credit,FECredit'],
    ['HD SAISON', 'Công ty tài chính', 'https://www.hdsaison.com.vn', 'HD Saison,HDSaison'],
    ['Shinhan Finance', 'Công ty tài chính', 'https://shinhanfinance.com.vn', 'Shinhan Finance'],
    ['MoMo', 'Fintech / BNPL', 'https://momo.vn', 'MoMo,Ví MoMo'],
    ['Fundiin', 'Fintech / BNPL', 'https://fundiin.vn', 'Fundiin']])
    run('INSERT INTO competitors(name,grp,website,keywords) VALUES(?,?,?,?)', n, g, w, k);
}
