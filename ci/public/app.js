const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (path, method = 'GET', body) => {
  const r = await fetch('/api' + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Lỗi ' + r.status); return j;
};
const fmt = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
let CFG, ME, COMPS = [];
const RANK = { viewer: 1, editor: 2, admin: 3 }, can = r => RANK[ME.role] >= RANK[r];
const toast = m => alert(m);
const tagLabel = i => `<span class="tag ${i.label}">${esc(CFG.labels[i.label])}</span><span class="tag">tin cậy ${i.trust}/100</span>`;

function itemCard(i, withReport = true) {
  return `<div class="card item"><div class="row"><span class="tag">${esc(i.competitor_name)}</span><span class="tag">${esc(CFG.topics[i.topic])}</span>
    ${i.event ? `<span class="tag ev">${esc(CFG.events[i.event])}</span>` : ''}${tagLabel(i)}
    <span class="grow"></span><span class="imp ${i.importance >= 60 ? 'hi' : ''}">Quan trọng ${i.importance}</span></div>
    <h4><a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a></h4><p>${esc(i.summary)}</p>
    <div class="mut">Đăng ${fmt(i.published_at)} · thu thập ${fmt(i.collected_at)} · ${esc(i.domain)}${i.dup_count ? ` · gộp ${i.dup_count} tin trùng` : ''}${i.origin === 'manual' ? ' · nhập tay' : ''}
    ${withReport ? ` · <a href="#" data-report="${i.id}">Báo sai</a>` : ''}${can('editor') ? ` · <a href="#" data-del="${i.id}" class="err">Xóa</a>` : ''}</div></div>`;
}
function wireItems(root, reload) {
  root.querySelectorAll('[data-report]').forEach(a => a.onclick = async e => { e.preventDefault(); const n = prompt('Tin này sai ở đâu? (tùy chọn)'); if (n === null) return; await api(`/items/${a.dataset.report}/report`, 'POST', { note: n }); toast('Đã ghi nhận, cảm ơn bạn.'); });
  root.querySelectorAll('[data-del]').forEach(a => a.onclick = async e => { e.preventDefault(); if (confirm('Xóa tin này?')) { await api(`/items/${a.dataset.del}`, 'DELETE'); reload(); } });
}
const compOpts = (sel, all = true) => (all ? '<option value="">Tất cả đối thủ</option>' : '') + COMPS.filter(c => c.status === 'active').map(c => `<option value="${c.id}" ${sel == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

// ---------- views ----------
const views = {
  async feed(el) {
    const q = JSON.parse(sessionStorage.getItem('fq') || '{"days":"30"}');
    el.innerHTML = `<h2>Dòng tin</h2><div class="card row">
      <select id="fc">${compOpts(q.competitor)}</select>
      <select id="ft"><option value="">Mọi chủ đề</option>${Object.entries(CFG.topics).map(([k, v]) => `<option value="${k}" ${q.topic === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <select id="fd">${[['1', '24 giờ'], ['7', '7 ngày'], ['30', '30 ngày'], ['90', '90 ngày'], ['', 'Tất cả']].map(([v, l]) => `<option value="${v}" ${q.days === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="fi"><option value="">Mọi mức quan trọng</option><option value="40" ${q.min_importance === '40' ? 'selected' : ''}>≥ 40</option><option value="60" ${q.min_importance === '60' ? 'selected' : ''}>≥ 60 (quan trọng)</option></select>
      <select id="fl"><option value="">Mọi nhãn</option>${Object.entries(CFG.labels).map(([k, v]) => `<option value="${k}" ${q.label === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <input id="fq" placeholder="Tìm từ khóa" value="${esc(q.q || '')}" class="grow"></div><div id="list"></div>`;
    const load = async (more = false) => {
      const cur = { competitor: $('#fc').value, topic: $('#ft').value, days: $('#fd').value, min_importance: $('#fi').value, label: $('#fl').value, q: $('#fq').value };
      sessionStorage.setItem('fq', JSON.stringify(cur));
      const off = more ? $('#list').querySelectorAll('.item').length : 0;
      const r = await api('/items?' + new URLSearchParams({ ...cur, limit: 30, offset: off }));
      const html = r.items.map(i => itemCard(i)).join('');
      if (!more) $('#list').innerHTML = r.items.length ? '' : '<div class="empty">Chưa có tin phù hợp. Admin có thể bấm “Chạy thu thập ngay” ở mục Quản trị.</div>';
      $('#list').querySelector('#more')?.remove(); $('#list').insertAdjacentHTML('beforeend', html);
      if (off + r.items.length < r.total) { $('#list').insertAdjacentHTML('beforeend', `<button id="more">Xem thêm (${r.total - off - r.items.length})</button>`); $('#more').onclick = () => load(true); }
      wireItems($('#list'), () => load());
    };
    el.querySelectorAll('select').forEach(s => s.onchange = () => load()); $('#fq').onchange = () => load(); load();
  },
  async competitors(el) {
    const id = location.hash.split('/')[1];
    if (id) {
      const p = await api(`/competitors/${id}/profile`), c = p.competitor;
      el.innerHTML = `<p><a href="#competitors">← Danh sách</a></p><h2>${esc(c.name)}</h2><div class="card"><span class="tag">${esc(c.grp)}</span>
        ${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">${esc(c.website)}</a>` : ''}<p class="mut">Từ khóa: ${esc(c.keywords) || '—'} · Fanpage/MXH: ${esc(c.socials) || '—'}</p>
        <div>${Object.entries(CFG.topics).map(([k, v]) => `<span class="tag">${esc(v)}: ${p.byTopic.find(t => t.topic === k)?.n || 0}</span>`).join('')}</div></div>
        ${p.metrics.length ? `<div class="card"><b>Chỉ số</b><table>${p.metrics.map(m => `<tr><td>${esc(m.kind)}</td><td>${esc(m.value)}</td><td>${esc(m.period)}</td><td>${m.source_url ? `<a href="${esc(m.source_url)}" target="_blank" rel="noopener noreferrer">nguồn</a>` : ''}</td></tr>`).join('')}</table></div>` : ''}
        <h3>Tin gần đây</h3><div id="list">${p.items.map(i => itemCard(i)).join('') || '<div class="empty">Chưa có tin.</div>'}</div>`;
      return wireItems($('#list'), () => views.competitors(el));
    }
    COMPS = await api('/competitors');
    el.innerHTML = `<h2>Đối thủ</h2>${can('editor') ? `<div class="card"><b>Thêm đối thủ</b><div class="row" style="margin-top:8px">
      <input id="n" placeholder="Tên *"><select id="g"><option>Ngân hàng</option><option selected>Công ty tài chính</option><option>Fintech / BNPL</option><option>Khác</option></select>
      <input id="w" placeholder="Website"><input id="s" placeholder="Fanpage / MXH (cách nhau dấu phẩy)"><input id="k" placeholder="Từ khóa (cách nhau dấu phẩy)" class="grow"><button class="p" id="add">Thêm</button></div>
      <div class="mut">Hệ thống sẽ thu thập tin của đối thủ mới ngay sau khi thêm.</div></div>` : ''}
      <div class="card"><table><tr><th>Tên</th><th>Nhóm</th><th>Từ khóa</th><th>Tin</th><th></th></tr>${COMPS.map(c => `<tr><td><a href="#competitors/${c.id}">${esc(c.name)}</a>${c.status !== 'active' ? ' <span class="tag">tạm dừng</span>' : ''}</td><td>${esc(c.grp)}</td><td class="mut">${esc(c.keywords)}</td><td>${c.item_count}</td>
      <td>${can('editor') ? `<button data-tg="${c.id}">${c.status === 'active' ? 'Tạm dừng' : 'Bật lại'}</button> <button class="d" data-rm="${c.id}">Xóa</button>` : ''}</td></tr>`).join('')}</table></div>`;
    if (can('editor')) {
      $('#add').onclick = async () => { try { await api('/competitors', 'POST', { name: $('#n').value, grp: $('#g').value, website: $('#w').value, socials: $('#s').value, keywords: $('#k').value }); views.competitors(el); } catch (e) { toast(e.message); } };
      el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (confirm('Xóa đối thủ này và toàn bộ tin của nó?')) { await api('/competitors/' + b.dataset.rm, 'DELETE'); views.competitors(el); } });
      el.querySelectorAll('[data-tg]').forEach(b => b.onclick = async () => { const c = COMPS.find(x => x.id == b.dataset.tg); await api('/competitors/' + c.id, 'PUT', { ...c, status: c.status === 'active' ? 'inactive' : 'active' }); views.competitors(el); });
    }
  },
  async compare(el) {
    COMPS = await api('/competitors');
    el.innerHTML = `<h2>So sánh đối thủ</h2><div class="card">${COMPS.map(c => `<label class="c"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}
      <div class="row" style="margin-top:8px"><select id="d"><option value="7">7 ngày</option><option value="30" selected>30 ngày</option><option value="90">90 ngày</option></select><button class="p" id="go">So sánh (tối đa 5)</button></div></div><div id="out"></div>`;
    $('#go').onclick = async () => {
      const ids = [...el.querySelectorAll('input:checked')].map(i => i.value).join(','); if (!ids) return toast('Chọn ít nhất 1 đối thủ');
      const r = await api(`/compare?ids=${ids}&days=${$('#d').value}`); const max = Math.max(1, ...r.flatMap(x => x.byTopic.map(t => t.n)));
      $('#out').innerHTML = `<div class="grid">${r.map(x => `<div class="card"><h3 style="margin-top:0">${esc(x.competitor.name)}</h3><div class="mut">Quan trọng TB: ${x.avgImportance ?? '—'}</div>
        ${Object.entries(CFG.topics).map(([k, v]) => { const n = x.byTopic.find(t => t.topic === k)?.n || 0; return `<div class="mut">${esc(v)}: ${n}</div><div class="bar" style="width:${n / max * 100}%"></div>`; }).join('')}
        <h4>Tin nổi bật</h4>${x.top.map(i => `<p><a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a><br>${tagLabel(i)}</p>`).join('') || '<p class="mut">Không có tin trong kỳ</p>'}</div>`).join('')}</div>`;
    };
  },
  async ask(el) {
    el.innerHTML = `<h2>Hỏi đáp</h2><div class="card"><div class="row"><input id="q" class="grow" placeholder="Ví dụ: FE Credit gần đây có thay đổi lãi suất không?"><button class="p" id="go">Hỏi</button></div>
      <p class="mut">Chế độ AI: ${CFG.ai === 'claude' ? 'Claude' : 'quy tắc nội bộ (đặt ANTHROPIC_API_KEY để dùng Claude)'}. Câu trả lời chỉ dựa trên tin đã thu thập và luôn kèm trích dẫn.</p></div><div id="out"></div>`;
    const go = async () => {
      const q = $('#q').value.trim(); if (!q) return; $('#go').disabled = true; $('#out').innerHTML = '<div class="empty">Đang tìm…</div>';
      try { const r = await api('/ask', 'POST', { question: q });
        $('#out').innerHTML = `<div class="card"><div class="ans">${esc(r.answer)}</div></div><h3>Nguồn</h3>${r.sources.map(s => `<div class="card">[${s.n}] <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><div class="mut">${esc(s.competitor_name)} · ${fmt(s.published_at)} · ${esc(CFG.labels[s.label])} · tin cậy ${s.trust}${s.cited ? ' · <b>được trích dẫn</b>' : ''}</div></div>`).join('')}`;
      } catch (e) { $('#out').innerHTML = `<div class="err">${esc(e.message)}</div>`; } $('#go').disabled = false;
    };
    $('#go').onclick = go; $('#q').onkeydown = e => e.key === 'Enter' && go();
  },
  async subs(el) {
    COMPS = await api('/competitors'); const s = await api('/subscription'); const cs = JSON.parse(s.competitors || '[]'), ts = JSON.parse(s.topics || '[]');
    el.innerHTML = `<h2>Bản tin & cảnh báo của tôi</h2><div class="card"><b>Đối thủ quan tâm</b> <span class="mut">(không chọn = tất cả)</span><div>${COMPS.map(c => `<label class="c"><input type="checkbox" name="c" value="${c.id}" ${cs.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div>
      <b>Chủ đề</b><div>${Object.entries(CFG.topics).map(([k, v]) => `<label class="c"><input type="checkbox" name="t" value="${k}" ${ts.includes(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>
      <p><b>Bản tin email:</b> <select id="dg">${[['off', 'Tắt'], ['daily', 'Hằng ngày'], ['weekly', 'Hằng tuần']].map(([v, l]) => `<option value="${v}" ${s.digest === v ? 'selected' : ''}>${l}</option>`).join('')}</select></p>
      <p><label class="c"><input type="checkbox" id="al" ${s.alerts ? 'checked' : ''}> Nhận cảnh báo tức thời (đổi lãi suất, sản phẩm mới, M&A, nhân sự cấp cao)</label> ngưỡng quan trọng ≥ <input id="th" type="number" min="0" max="100" value="${s.alert_threshold ?? 60}" style="width:70px"></p>
      <button class="p" id="save">Lưu</button> <span class="mut">Email gửi tới: ${esc(ME.email)}</span></div>`;
    $('#save').onclick = async () => { await api('/subscription', 'PUT', { competitors: [...el.querySelectorAll('[name=c]:checked')].map(i => +i.value), topics: [...el.querySelectorAll('[name=t]:checked')].map(i => i.value), digest: $('#dg').value, alerts: $('#al').checked, alert_threshold: +$('#th').value }); toast('Đã lưu'); };
  },
  async admin(el) {
    if (!can('editor')) return el.innerHTML = '<div class="empty">Bạn không có quyền truy cập.</div>';
    COMPS = await api('/competitors');
    const [src, logs, reps] = await Promise.all([api('/sources'), api('/logs'), api('/reports')]);
    const users = can('admin') ? await api('/users') : [], outbox = can('admin') ? await api('/outbox') : [];
    el.innerHTML = `<h2>Quản trị</h2>
    <div class="card"><b>Thêm tin từ link / tài liệu</b><div class="row" style="margin:8px 0"><input id="u" class="grow" placeholder="Dán link bài viết"><select id="uc">${compOpts('')}</select><button class="p" id="ul">Thêm link</button></div>
      <div class="row"><input id="tt" placeholder="Tiêu đề"><input id="tu" class="grow" placeholder="Link nguồn của tài liệu (bắt buộc)"><select id="tc">${compOpts('', false)}</select></div>
      <textarea id="tx" placeholder="Dán nội dung hoặc chọn file .txt/.md bên dưới"></textarea><div class="row"><input type="file" id="tf" accept=".txt,.md"><button class="p" id="tb">Tóm tắt & phân loại</button></div><div id="im" class="mut"></div></div>
    <div class="card"><div class="row"><b class="grow">Nguồn tin</b><button class="p" id="runall">Chạy thu thập ngay</button></div><div id="rr" class="mut"></div>
      <table><tr><th>Loại</th><th>Tên / URL</th><th>Lần chạy cuối</th><th></th></tr>${src.map(s => `<tr><td>${s.type}</td><td>${esc(s.name)}<div class="mut">${esc(s.url)}</div></td><td>${esc(s.last_run || '—')}</td><td><button data-run="${s.id}">Chạy lại</button> <button class="d" data-rs="${s.id}">Xóa</button></td></tr>`).join('')}</table>
      <div class="row" style="margin-top:8px"><select id="st"><option>rss</option><option>site</option></select><input id="sn" placeholder="Tên"><input id="su" class="grow" placeholder="URL RSS / trang"><button id="sa">Thêm nguồn</button></div></div>
    <div class="card"><b>Nhật ký thu thập</b><table><tr><th>Giờ (UTC)</th><th>Nguồn</th><th>Kết quả</th><th>Mới</th><th>Gộp</th><th>Lỗi</th></tr>${logs.map(l => `<tr><td>${esc(l.started_at)}</td><td>${esc(l.source_name)}</td><td class="${l.status === 'ok' ? '' : 'err'}">${l.status}</td><td>${l.added}</td><td>${l.merged}</td><td class="err">${esc(l.error)}</td></tr>`).join('') || '<tr><td colspan=6 class="mut">Chưa có</td></tr>'}</table></div>
    <div class="card"><b>Tin bị báo sai (${reps.length})</b><table>${reps.map(r => `<tr><td>${esc(r.title)}</td><td>${esc(r.note)}</td><td class="mut">${esc(r.email)}</td></tr>`).join('')}</table></div>
    ${can('admin') ? `<div class="card"><b>Người dùng & vai trò</b><table>${users.map(u => `<tr><td>${esc(u.email)}</td><td><select data-ur="${u.id}">${['viewer', 'editor', 'admin'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td><td><button class="d" data-ud="${u.id}">Xóa</button></td></tr>`).join('')}</table>
      <div class="row" style="margin-top:8px"><input id="ne" placeholder="email@congty.com"><select id="nr"><option>viewer</option><option>editor</option><option>admin</option></select><button id="na">Thêm</button></div><p class="mut">viewer = xem · editor = cấu hình đối thủ/nguồn, thêm tin · admin = quản lý người dùng.</p></div>
    <div class="card"><div class="row"><b class="grow">Thư đã tạo (bản tin / cảnh báo)</b><button id="fl">Gửi ngay</button></div><p class="mut">${CFG.smtp ? 'SMTP đã cấu hình.' : 'Chưa cấu hình SMTP — thư chỉ được lưu tại đây. Đặt SMTP_HOST/PORT/USER/PASS/FROM để gửi thật.'}</p>
      <table>${outbox.map(m => `<tr><td>${esc(m.created_at)}</td><td>${esc(m.kind)}</td><td>${esc(m.to_email)}</td><td>${esc(m.subject)}</td><td class="${m.status === 'error' ? 'err' : ''}">${esc(m.status)} ${esc(m.error)}</td></tr>`).join('')}</table></div>` : ''}`;
    const re = () => views.admin(el), W = (id, f) => { const n = $(id); if (n) n.onclick = async () => { try { await f(); } catch (e) { toast(e.message); } }; };
    W('#ul', async () => { const r = await api('/ingest/url', 'POST', { url: $('#u').value, competitor_id: $('#uc').value || undefined }); $('#im').textContent = `${r.status === 'added' ? 'Đã thêm' : 'Trùng tin cũ, đã gộp'}: ${r.title} (${r.competitor})`; });
    W('#tb', async () => { const r = await api('/ingest/text', 'POST', { title: $('#tt').value, url: $('#tu').value, text: $('#tx').value, competitor_id: $('#tc').value }); $('#im').textContent = `${r.status === 'added' ? 'Đã thêm' : 'Trùng, đã gộp'} (${r.competitor})`; });
    $('#tf').onchange = async e => { const f = e.target.files[0]; if (f) { $('#tx').value = await f.text(); if (!$('#tt').value) $('#tt').value = f.name; } };
    W('#runall', async () => { $('#rr').textContent = 'Đang chạy…'; const r = await api('/collect', 'POST', {}); $('#rr').textContent = r.map(x => `${x.source}: ${x.status} (+${x.added}, gộp ${x.merged}${x.error ? ', lỗi ' + x.error : ''})`).join(' | '); });
    el.querySelectorAll('[data-run]').forEach(b => b.onclick = async () => { b.disabled = true; await api('/collect', 'POST', { source_id: +b.dataset.run }); re(); });
    el.querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => { await api('/sources/' + b.dataset.rs, 'DELETE'); re(); });
    W('#sa', async () => { await api('/sources', 'POST', { type: $('#st').value, name: $('#sn').value, url: $('#su').value }); re(); });
    el.querySelectorAll('[data-ur]').forEach(s => s.onchange = async () => { try { await api('/users/' + s.dataset.ur, 'PUT', { role: s.value }); } catch (e) { toast(e.message); re(); } });
    el.querySelectorAll('[data-ud]').forEach(b => b.onclick = async () => { try { await api('/users/' + b.dataset.ud, 'DELETE'); re(); } catch (e) { toast(e.message); } });
    W('#na', async () => { await api('/users', 'POST', { email: $('#ne').value, role: $('#nr').value }); re(); });
    W('#fl', async () => { await api('/outbox/flush', 'POST', {}); re(); });
  },
};

// ---------- shell ----------
const NAV = [['feed', 'Dòng tin'], ['competitors', 'Đối thủ'], ['compare', 'So sánh'], ['ask', 'Hỏi đáp'], ['subs', 'Bản tin của tôi'], ['admin', 'Quản trị', 'editor']];
async function render() {
  const view = (location.hash.slice(1).split('/')[0]) || 'feed';
  $('nav').innerHTML = NAV.filter(n => !n[2] || can(n[2])).map(([k, l]) => `<a href="#${k}" class="${k === view ? 'on' : ''}">${l}</a>`).join('');
  const el = $('main'); el.innerHTML = '<div class="empty">Đang tải…</div>';
  try { COMPS = await api('/competitors'); await (views[view] || views.feed)(el); } catch (e) { el.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}
function login() {
  $('#app').innerHTML = CFG.authMode === 'oidc' ? `<div class="card login"><h2>Theo dõi đối thủ</h2><a href="/auth/login"><button class="p">Đăng nhập SSO</button></a></div>` :
    `<div class="card login"><h2>Theo dõi đối thủ</h2><p class="mut">Chế độ DEV: nhập email để đăng nhập (người đầu tiên là admin). Triển khai thật hãy đặt AUTH_MODE=oidc.</p><div class="row"><input id="em" type="email" class="grow" placeholder="email@congty.com"><button class="p" id="go">Vào</button></div><div id="e" class="err"></div></div>`;
  if (CFG.authMode !== 'oidc') $('#go').onclick = async () => { try { await api('/login', 'POST', { email: $('#em').value }); boot(); } catch (e) { $('#e').textContent = e.message; } };
}
async function boot() {
  CFG = await api('/config'); ME = await api('/me');
  if (!ME) return login();
  $('#app').innerHTML = `<header><b>Theo dõi đối thủ</b><nav></nav><span class="mut">${esc(ME.email)} (${ME.role})</span><button id="lo">Đăng xuất</button></header><main></main>`;
  $('#lo').onclick = async () => { await api('/logout', 'POST', {}); boot(); };
  if (!window._h) { window._h = 1; addEventListener('hashchange', render); } render();
}
boot();
