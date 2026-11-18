import { fold } from './ai.js';

const PRESS = ['vnexpress.net', 'cafef.vn', 'vietnamnet.vn', 'tuoitre.vn', 'thanhnien.vn', 'dantri.com.vn', 'vietnamfinance.vn',
  'nhandan.vn', 'vneconomy.vn', 'cafebiz.vn', 'theinvestor.vn', 'vir.com.vn', 'thesaigontimes.vn', 'ndh.vn', 'laodong.vn',
  'nld.com.vn', 'baodautu.vn', 'tienphong.vn', 'zingnews.vn', 'vtv.vn', 'vov.vn', 'tinnhanhchungkhoan.vn', 'reuters.com',
  'bloomberg.com', 'forbes.vn', 'nhipcaudautu.vn', 'baochinhphu.vn', 'kinhtedothi.vn', 'plo.vn', 'tapchitaichinh.vn', 'vietstock.vn'];
const SOCIAL = ['facebook.com', 'tiktok.com', 'youtube.com', 'linkedin.com', 'x.com', 'twitter.com', 'zalo.me'];
const FORUM = ['voz.vn', 'tinhte.vn', 'reddit.com', 'webtretho.com', 'otofun.net'];
const RUMOR_WORDS = /(tin don|don doan|theo nguon tin|nguon tin cho biet|chua duoc xac nhan|chua kiem chung|rum |rumor|ro ri|nghe noi)/;

export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const match = (h, list) => list.some(d => h === d || h.endsWith('.' + d));

/** Gán nhãn & điểm tin cậy cho tin. `domain` là tên miền nguồn thật (có thể khác link trung gian như Google News). */
export function assessTrust({ domain, url, competitor, text }) {
  const h = domain || hostOf(url);
  const own = hostOf(competitor?.website);
  const socials = (competitor?.socials || '').split(/[\s,]+/).filter(Boolean);
  let label, trust;
  if ((own && (h === own || h.endsWith('.' + own))) || h.endsWith('.gov.vn') || socials.some(s => hostOf(s) === h && url.includes(new URL(s).pathname.replace(/\/$/, '')))) {
    label = 'official'; trust = 92;
  } else if (match(h, PRESS)) { label = 'press'; trust = 76; }
  else if (match(h, SOCIAL) || match(h, FORUM)) { label = 'rumor'; trust = 30; }
  else { label = 'press'; trust = 52; } // báo/site chưa biết: coi là báo chí nhưng điểm thấp
  if (RUMOR_WORDS.test(fold(text))) { label = 'rumor'; trust = Math.min(trust, 38); }
  return { label, trust };
}
