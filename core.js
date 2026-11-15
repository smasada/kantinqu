/* KantinQu - inti aplikasi: state, helper, router, shell, realtime */
window.KQ = (function () {
  'use strict';
  const CFG = window.KANTINQU_CONFIG || {};
  const CONFIGURED = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/YOUR_/.test(CFG.SUPABASE_URL + CFG.SUPABASE_ANON_KEY));
  const sb = CONFIGURED && window.supabase
    ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  const KQ = { sb, CONFIGURED, views: {}, acts: {}, forms: {}, inputs: {}, hooks: {}, V: {} };
  const S = KQ.S = { uid: null, profile: null, lang: 'id', canteenId: null, cartCount: 0, cartCanteen: null, channels: {} };

  /* ---------- Util ---------- */
  const $ = KQ.$ = (s, r) => (r || document).querySelector(s);
  const $$ = KQ.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = KQ.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = KQ.t = (k, v) => {
    const e = window.KQ_T[k];
    let s = e ? e[S.lang === 'en' ? 1 : 0] : k;
    if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  };
  KQ.money = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  KQ.fmt = (d) => d ? new Date(d).toLocaleString(S.lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  KQ.q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  KQ.bad = (key) => { const e = new Error(key); e.key = key; return e; };
  KQ.norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    list: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    chev: '<polyline points="9 18 15 12 9 6"/>',
    store: '<path d="M3 9l1-5h16l1 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/>',
    clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'
  };
  const ic = KQ.ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  KQ.imgTag = (url, cls, extra) => `<div class="thumb ${cls || ''}"><span class="ph">${ic('image')}</span>${url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${extra || ''}</div>`;
  KQ.badge = (kind, key) => `<span class="badge ${esc(kind)}">${esc(t(key))}</span>`;
  KQ.statusBadge = (s) => `<span class="badge ${esc(s)}">${esc(t('status.' + s))}</span>`;
  KQ.vBadge = (s) => `<span class="badge ${esc(s)}">${esc(t('vstatus.' + s))}</span>`;
  KQ.tBadge = (s) => `<span class="badge ${esc(s)}">${esc(t('tstatus.' + s))}</span>`;
  KQ.empty = (icon, title, sub, btn) => `<div class="empty">${ic(icon)}<h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}${btn || ''}</div>`;
  KQ.loadingHtml = () => `<div class="loading"><div class="spinner" role="status" aria-label="${esc(t('loading'))}"></div></div>`;
  KQ.back = (href) => `<a class="back" href="${href}">${ic('back')} ${esc(t('btn.back'))}</a>`;

  KQ.fld = (name, o = {}) => {
    const label = o.label || t('f.' + name);
    const opt = o.req === false ? ` <span class="muted sm">(${esc(t('f.optional'))})</span>` : '';
    const inner = o.tag === 'textarea'
      ? `<textarea id="f-${name}" name="${name}" rows="${o.rows || 3}" maxlength="${o.max || 500}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>${esc(o.val)}</textarea>`
      : `<input id="f-${name}" name="${name}" type="${o.type || 'text'}" value="${esc(o.val)}" ${o.ro ? 'readonly' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.attrs || ''} autocomplete="${o.ac || 'off'}">`;
    return `<div class="fld"><label for="f-${name}">${esc(label)}${opt}</label>${inner}${o.hint ? `<div class="hint">${esc(o.hint)}</div>` : ''}</div>`;
  };
  KQ.pwfld = (name, ac) => `<div class="fld"><label for="f-${name}">${esc(t('f.' + name))}</label><div class="pw"><input id="f-${name}" name="${name}" type="password" autocomplete="${ac || 'current-password'}"><button type="button" data-act="togglepw" aria-label="${esc(t('btn.showPw'))}">${ic('eye')}</button></div></div>`;
  KQ.select = (name, opts, val, label) => `<div class="fld"><label for="f-${name}">${esc(label || t('f.' + name))}</label><select id="f-${name}" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  KQ.val = (f, n) => (f.elements[n] ? f.elements[n].value.trim() : '');
  KQ.need = (f, names) => {
    let miss = false;
    names.forEach((n) => { const el = f.elements[n]; const bad = !el || !el.value.trim(); if (el) el.classList.toggle('bad', bad); if (bad) miss = true; });
    if (miss) throw KQ.bad('err.required');
  };

  /* ---------- Pesan kesalahan ---------- */
  const CODES = ['FORBIDDEN', 'IDENTITY_LOCKED', 'INVALID_ROLE', 'REQUIRED', 'MENU_NOT_FOUND', 'INVALID_QTY', 'CANTEEN_MISMATCH', 'OUT_OF_STOCK', 'EXCEEDS_STOCK', 'NOT_VERIFIED', 'CART_EMPTY', 'INVALID_TRANSITION', 'REASON_REQUIRED', 'BAD_CODE', 'NOT_FOUND', 'ALREADY_REVIEWED', 'ALREADY_CLAIMED', 'NO_MATCH', 'USER_NOT_FOUND', 'WRONG_ROLE'];
  KQ.errMsg = (e) => {
    if (e && e.key) return t(e.key);
    const m = String((e && (e.message || e.error_description)) || e || '');
    for (const c of CODES) if (m.includes(c)) return t('err.' + c);
    if (/duplicate key|already registered|already exists/i.test(m)) return t('err.dup');
    if (/Invalid login credentials/i.test(m)) return t('err.login');
    if (/not confirmed/i.test(m)) return t('err.confirm');
    if (/Failed to fetch|NetworkError|network|Load failed/i.test(m)) return t('err.network');
    if (/rate limit|too many/i.test(m)) return t('err.rate');
    if (/row-level security|permission denied|JWT/i.test(m)) return t('err.FORBIDDEN');
    if (/Database error saving new user/i.test(m)) return t('err.signup');
    if (/password/i.test(m) && /characters|weak|short/i.test(m)) return t('err.pwShort');
    return t('err.generic');
  };

  /* ---------- Toast, modal, konfirmasi ---------- */
  KQ.toast = (msg, type) => {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  };
  KQ.ok = (k, v) => KQ.toast(t(k, v), 'ok');
  KQ.fail = (e) => KQ.toast(KQ.errMsg(e), 'err');
  KQ.openModal = (html, dismiss = true) => {
    const m = document.createElement('div');
    m.className = 'modal-bg';
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(m);
    if (dismiss) m.addEventListener('mousedown', (e) => { if (e.target === m) m.remove(); });
    return m;
  };
  KQ.closeModals = () => $$('.modal-bg').forEach((m) => m.remove());
  KQ.confirmBox = (o) => new Promise((res) => {
    const f = o.field;
    const m = KQ.openModal(`<h3>${esc(o.title)}</h3>${o.msg ? `<p class="muted">${esc(o.msg)}</p>` : ''}
      ${f ? `<div class="fld"><label for="cb-f">${esc(f.label)}</label>${f.single ? `<input id="cb-f" maxlength="${f.max || 60}" inputmode="${f.mode || 'text'}" autocomplete="off">` : `<textarea id="cb-f" rows="3" maxlength="300"></textarea>`}</div><div class="form-err" id="cb-e"></div>` : ''}
      <div class="row end"><button class="btn ghost" data-r="0">${esc(o.cancel || t('btn.cancel'))}</button><button class="btn ${o.danger ? 'danger' : 'primary'}" data-r="1">${esc(o.ok || t('btn.yes'))}</button></div>`, false);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === '0') { m.remove(); res(null); return; }
      if (f) {
        const v = $('#cb-f', m).value.trim();
        if (f.required && !v) { $('#cb-e', m).textContent = t('err.required'); return; }
        m.remove(); res({ value: v });
      } else { m.remove(); res({}); }
    });
    const inp = $('#cb-f', m); if (inp) inp.focus();
  });
  KQ.busy = async (btn, fn) => {
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    try { return await fn(); } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('busy'); } }
  };

  /* ---------- Upload gambar ---------- */
  KQ.upload = async (bucket, file, maxMB) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw KQ.bad('err.fileType');
    if (file.size > maxMB * 1048576) throw KQ.bad('err.fileSize');
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${S.uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  };
  KQ.publicUrl = (path) => sb.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
  KQ.signedUrl = async (path) => { const { data } = await sb.storage.from('support-attachments').createSignedUrl(path, 600); return data ? data.signedUrl : null; };

  /* ---------- Bahasa ---------- */
  KQ.initLang = () => {
    let l = null;
    try { l = localStorage.getItem('kq_lang'); } catch (e) { /* abaikan */ }
    if (l !== 'id' && l !== 'en') l = (navigator.language || 'id').toLowerCase().startsWith('en') ? 'en' : 'id';
    S.lang = l; document.documentElement.lang = l;
  };
  KQ.setLang = async (l) => {
    if (l !== 'id' && l !== 'en') return;
    S.lang = l; document.documentElement.lang = l;
    try { localStorage.setItem('kq_lang', l); } catch (e) { /* abaikan */ }
    const snap = snapshot();
    await render({ keep: true, restore: snap });
    if (S.profile && S.profile.preferred_language !== l) {
      try { await KQ.q(sb.from('users').update({ preferred_language: l }).eq('id', S.uid)); S.profile.preferred_language = l; }
      catch (e) { KQ.fail(e); }
    }
  };
  function snapshot() {
    const o = {};
    $$('#view input, #view textarea, #view select').forEach((el) => { if (el.name && el.type !== 'file' && el.type !== 'password') o[el.name] = el.value; });
    return o;
  }

  /* ---------- Profil, keranjang ---------- */
  KQ.loadProfile = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { S.uid = null; S.profile = null; return null; }
    S.uid = session.user.id;
    S.profile = await KQ.q(sb.from('users').select('*').eq('id', S.uid).maybeSingle());
    if (!S.profile) { await sb.auth.signOut(); S.uid = null; throw KQ.bad('err.noProfile'); }
    return S.profile;
  };
  KQ.refreshCart = async () => {
    if (!S.profile || S.profile.role !== 'buyer') { S.cartCount = 0; S.cartCanteen = null; return; }
    const d = await KQ.q(sb.from('cart_items').select('quantity,canteen_id'));
    S.cartCount = d.reduce((a, x) => a + x.quantity, 0);
    S.cartCanteen = d[0] ? d[0].canteen_id : null;
    if (S.cartCanteen) KQ.setCanteen(S.cartCanteen);
    KQ.updateBadge();
  };
  KQ.updateBadge = () => $$('[data-cartbadge]').forEach((b) => { b.textContent = S.cartCount || ''; b.dataset.n = S.cartCount; });
  KQ.setCanteen = (id) => { S.canteenId = id; try { sessionStorage.setItem('kq_canteen', id || ''); } catch (e) { /* abaikan */ } };
  KQ.dest = () => {
    const r = S.profile && S.profile.role;
    if (r === 'buyer') return S.canteenId ? '#/home' : '#/canteens';
    if (r === 'seller' || r === 'admin') return '#/dashboard';
    return '#/';
  };
  KQ.afterLogin = async () => {
    if (S.profile.preferred_language) { S.lang = S.profile.preferred_language; try { localStorage.setItem('kq_lang', S.lang); } catch (e) { /* abaikan */ } document.documentElement.lang = S.lang; }
    await KQ.refreshCart().catch(() => {});
    setupRealtime();
    const h = KQ.dest();
    if (location.hash === h) render(); else location.hash = h;
  };
  KQ.logout = async () => {
    Object.values(S.channels).forEach((c) => sb.removeChannel(c));
    S.channels = {};
    await sb.auth.signOut();
    S.uid = null; S.profile = null; S.cartCount = 0; S.cartCanteen = null; KQ.setCanteen(null);
    if (location.hash === '#/') render(); else location.hash = '#/';
  };

  /* ---------- Realtime ---------- */
  KQ.subscribe = (key, table, event, filter, cb) => {
    if (!sb) return;
    if (S.channels[key]) { sb.removeChannel(S.channels[key]); delete S.channels[key]; }
    const cfg = { event, schema: 'public', table }; if (filter) cfg.filter = filter;
    try { S.channels[key] = sb.channel(key + Math.random().toString(36).slice(2, 6)).on('postgres_changes', cfg, cb).subscribe(); } catch (e) { /* realtime opsional */ }
  };
  function setupRealtime() {
    const p = S.profile; if (!p) return;
    const name = () => KQ.nameOf();
    if (p.role === 'buyer') {
      KQ.subscribe('rt-orders', 'orders', 'UPDATE', `buyer_id=eq.${S.uid}`, (pl) => {
        const o = pl.new; if (!o) return;
        KQ.toast(t('rt.orderStatus', { no: o.order_number, status: t('status.' + o.order_status) }));
        if (['orders', 'order'].includes(name())) render({ keep: true });
      });
    }
    if (p.role === 'seller') {
      KQ.subscribe('rt-sorders', 'orders', '*', `seller_id=eq.${S.uid}`, (pl) => {
        if (pl.eventType === 'INSERT') KQ.toast(t('rt.newOrder', { no: pl.new.order_number }));
        if (['orders', 'order', 'dashboard'].includes(name())) render({ keep: true });
      });
    }
    if (p.role === 'admin') {
      KQ.subscribe('rt-atickets', 'support_tickets', 'INSERT', null, (pl) => {
        KQ.toast(t('rt.newTicket', { no: pl.new.ticket_number }));
        if (['dashboard', 'support'].includes(name())) render({ keep: true });
      });
    } else {
      KQ.subscribe('rt-replies', 'support_replies', 'INSERT', null, (pl) => {
        if (pl.new && pl.new.sender_role === 'admin') {
          KQ.toast(t('rt.reply'));
          if (name() === 'help') render({ keep: true });
        }
      });
      KQ.subscribe('rt-tickets', 'support_tickets', 'UPDATE', `user_id=eq.${S.uid}`, (pl) => {
        if (pl.new && pl.new.ticket_status === 'resolved') KQ.toast(t('rt.resolved', { no: pl.new.ticket_number }), 'ok');
        if (name() === 'help') render({ keep: true });
      });
    }
  }

  /* ---------- Router ---------- */
  const ALL = ['buyer', 'seller', 'admin'];
  const ROUTES = {
    landing: { pub: 1 }, login: { pub: 1 }, register: { pub: 1 }, forgot: { pub: 1 }, reset: { any: 1 }, help: { pub: 1 },
    canteens: { roles: ['buyer'] }, home: { roles: ['buyer'], canteen: 1 }, menu: { roles: ['buyer'], canteen: 1 },
    cart: { roles: ['buyer'], canteen: 0 }, checkout: { roles: ['buyer'] },
    orders: { roles: ['buyer', 'seller'] }, order: { roles: ['buyer', 'seller'] }, profile: { roles: ALL },
    dashboard: { roles: ['seller', 'admin'] }, menus: { roles: ['seller'] }, stock: { roles: ['seller'] },
    verify: { roles: ['admin'] }, students: { roles: ['admin'] }, support: { roles: ['admin'] }, faq: { roles: ['admin'] }, settings: { roles: ['admin'] }
  };
  const NAV = {
    buyer: [['home', '#/home', 'nav.home', ['home', 'menu', 'canteens']], ['orders', '#/orders', 'nav.orders', ['orders', 'order']], ['cart', '#/cart', 'nav.cart', ['cart', 'checkout']], ['user', '#/profile', 'nav.profile', ['profile', 'help']]],
    seller: [['grid', '#/dashboard', 'nav.dashboard', ['dashboard']], ['store', '#/menus', 'nav.manageMenu', ['menus']], ['box', '#/stock', 'nav.manageStock', ['stock']], ['list', '#/orders', 'nav.orders', ['orders', 'order']], ['user', '#/profile', 'nav.profile', ['profile', 'help']]],
    admin: [['grid', '#/dashboard', 'nav.dashboard', ['dashboard']], ['shield', '#/verify', 'nav.verify', ['verify']], ['users', '#/students', 'nav.students', ['students']], ['msg', '#/support', 'nav.support', ['support']], ['help', '#/faq', 'nav.faq', ['faq']], ['gear', '#/settings', 'nav.settings', ['settings', 'profile']]]
  };
  KQ.parseHash = () => {
    const p = (location.hash || '#/').replace(/^#\/?/, '').split('?')[0].split('/').map(decodeURIComponent);
    return { name: p[0] || 'landing', a: p[1], b: p[2] };
  };
  KQ.nameOf = () => KQ.parseHash().name;

  function shell(name) {
    const role = S.profile && S.profile.role;
    const nav = NAV[role] || [];
    const hdrRight = `
      <div class="seg" role="group" aria-label="${esc(t('lang.label'))}"><button data-act="lang" data-v="id" class="${S.lang === 'id' ? 'on' : ''}">ID</button><button data-act="lang" data-v="en" class="${S.lang === 'en' ? 'on' : ''}">EN</button></div>
      ${role !== 'admin' ? `<a class="iconbtn" href="#/help" title="${esc(t('help.title'))}" aria-label="${esc(t('help.title'))}">${ic('help')}</a>` : ''}
      ${role === 'buyer' ? `<a class="iconbtn" href="#/cart" title="${esc(t('nav.cart'))}" aria-label="${esc(t('nav.cart'))}">${ic('cart')}<span class="cart-badge" data-cartbadge data-n="${S.cartCount}">${S.cartCount || ''}</span></a>` : ''}
      ${role === 'admin' ? `<button class="iconbtn" data-act="logout" title="${esc(t('btn.logout'))}" aria-label="${esc(t('btn.logout'))}">${ic('logout')}</button>` : ''}`;
    return `<header class="hdr"><a class="logo" href="${role ? KQ.dest() : '#/'}"><i>${ic('store')}</i>KantinQu</a><div class="sp"></div>${hdrRight}</header>
      ${nav.length ? `<nav class="nav" aria-label="Menu">${nav.map(([icon, href, label, match]) => `<a href="${href}" class="${match.includes(name) ? 'on' : ''}">${ic(icon)}<span>${esc(t(label))}</span>${icon === 'cart' ? `<span class="cart-badge" data-cartbadge data-n="${S.cartCount}">${S.cartCount || ''}</span>` : ''}</a>`).join('')}</nav>` : ''}
      <div class="shell ${nav.length ? 'has-nav' : ''}"><main><div class="wrap" id="view"></div></main></div>`;
  }

  let renderToken = 0;
  async function render(opts = {}) {
    if (!CONFIGURED) { $('#app').innerHTML = setupHtml(); return; }
    const token = ++renderToken;
    const { name, a, b } = KQ.parseHash();
    const r = ROUTES[name];
    const role = S.profile && S.profile.role;
    if (!r) { location.replace('#/'); return; }
    if (!role && !r.pub && !r.any) { location.replace('#/'); return; }
    if (role && ['landing', 'login', 'register', 'forgot'].includes(name)) { location.replace(KQ.dest()); return; }
    if (role && r.roles && !r.roles.includes(role)) { KQ.toast(t('err.FORBIDDEN'), 'err'); location.replace(KQ.dest()); return; }
    if (role === 'buyer' && r.canteen === 1 && !S.canteenId) { KQ.toast(t('err.noCanteen'), 'err'); location.replace('#/canteens'); return; }
    const y = window.scrollY;
    $('#app').innerHTML = shell(name);
    const v = $('#view');
    v.innerHTML = KQ.loadingHtml();
    KQ.V = {};
    try {
      const html = await KQ.views[name]({ a, b });
      if (token !== renderToken) return;
      v.innerHTML = html;
      if (opts.restore) Object.keys(opts.restore).forEach((k) => { const el = v.querySelector(`[name="${k}"]`); if (el && !el.value && el.tagName !== 'SELECT') el.value = opts.restore[k]; });
      if (KQ.hooks[name]) KQ.hooks[name]({ a, b });
    } catch (e) {
      if (token !== renderToken) return;
      v.innerHTML = KQ.empty('help', KQ.errMsg(e), null, `<button class="btn outline" data-act="retry">${esc(t('btn.retry'))}</button>`);
    }
    window.scrollTo(0, opts.keep ? y : 0);
  }
  KQ.render = render;

  function setupHtml() {
    return `<div class="auth"><div class="card"><div class="logo-lg">${ic('store')}</div><h2 class="center">KantinQu</h2>
      <div class="notice bad">Backend belum terhubung. Isi <b>js/config.js</b> dengan SUPABASE_URL dan SUPABASE_ANON_KEY, lalu jalankan <b>schema.sql</b> di Supabase. Selama belum terhubung, tidak ada data yang tersimpan.<br><br>Backend is not connected. Fill in <b>js/config.js</b> and run <b>schema.sql</b> in Supabase. Nothing is saved until then.</div></div></div>`;
  }

  /* ---------- Event delegation ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    if (act === 'lang') return KQ.setLang(el.dataset.v);
    if (act === 'retry') return render({ keep: true });
    if (act === 'logout') {
      const c = await KQ.confirmBox({ title: t('logout.title'), ok: t('btn.logout') });
      if (c) KQ.logout();
      return;
    }
    if (act === 'togglepw') {
      const inp = el.parentElement.querySelector('input');
      const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
      el.innerHTML = ic(show ? 'eyeoff' : 'eye'); return;
    }
    if (act === 'closemodal') return KQ.closeModals();
    const fn = KQ.acts[act];
    if (fn) { try { await fn(el, e); } catch (err) { KQ.fail(err); } }
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const fn = KQ.forms[f.dataset.form]; if (!fn) return;
    const btn = f.querySelector('button[type="submit"]');
    const errBox = f.querySelector('.form-err');
    if (errBox) errBox.textContent = '';
    try { await KQ.busy(btn, () => fn(f, e)); }
    catch (err) { if (errBox) errBox.textContent = KQ.errMsg(err); else KQ.fail(err); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]'); if (!el) return;
    const fn = KQ.inputs[el.dataset.input]; if (fn) fn(el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]'); if (!el) return;
    const fn = KQ.inputs[el.dataset.change]; if (fn) fn(el, e);
  });
  window.addEventListener('hashchange', () => { KQ.closeModals(); render(); });

  /* ---------- Boot ---------- */
  KQ.boot = async () => {
    KQ.initLang();
    if (!CONFIGURED) { render(); return; }
    try { const c = sessionStorage.getItem('kq_canteen'); if (c) S.canteenId = c; } catch (e) { /* abaikan */ }
    sb.auth.onAuthStateChange((ev) => {
      if (ev === 'PASSWORD_RECOVERY') setTimeout(() => { location.hash = '#/reset'; }, 0);
    });
    try {
      await KQ.loadProfile();
      if (S.profile) {
        S.lang = S.profile.preferred_language || S.lang; document.documentElement.lang = S.lang;
        await KQ.refreshCart().catch(() => {});
        setupRealtime();
      }
    } catch (e) { KQ.toast(KQ.errMsg(e), 'err'); }
    render();
  };
  return KQ;
})();
