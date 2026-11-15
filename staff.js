/* KantinQu - fitur penjual dan admin sekolah */
(function (KQ) {
  'use strict';
  const { t, esc, ic, fld, val, need, q, bad, sb, S, money, fmt } = KQ;
  const STATUSES = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
  const MCATS = ['food', 'drink', 'snack'];
  const count = async (qb) => { const { count: c, error } = await qb; if (error) throw error; return c || 0; };
  const stat = (n, label, href) => `<${href ? `a href="${href}"` : 'div'} class="card stat" style="display:block;color:inherit"><b>${n}</b><span>${esc(label)}</span></${href ? 'a' : 'div'}>`;

  /* =============== DASHBOARD =============== */
  KQ.views.dashboard = async () => S.profile.role === 'admin' ? adminDash() : sellerDash();

  async function sellerDash() {
    const [c, orders, menus] = await Promise.all([
      q(sb.from('canteens').select('*').eq('seller_id', S.uid).maybeSingle()),
      q(sb.from('orders').select('id,order_number,order_status,created_at,total_price,buyer_name,buyer_class').order('created_at', { ascending: false }).limit(500)),
      q(sb.from('menus').select('id,stock'))
    ]);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = orders.filter((o) => new Date(o.created_at) >= start).length;
    const by = (s) => orders.filter((o) => o.order_status === s).length;
    const recent = orders.slice(0, 5);
    return `<p class="muted" style="margin:0">${esc(t('hello', { name: S.profile.full_name }))}</p>
      <h2>${esc(c ? c.canteen_name : '')} ${c ? `<span class="badge ready">${esc(c.canteen_label)}</span>` : ''}</h2>
      <div class="stats">${stat(today, t('dash.today'))}${stat(menus.filter((m) => m.stock > 0).length, t('dash.menuAvail'), '#/menus')}${stat(menus.filter((m) => m.stock <= 0).length, t('dash.menuOut'), '#/stock')}${stat(by('pending'), t('status.pending'), '#/orders')}</div>
      <div class="sec-h"><h3>${esc(t('dash.byStatus'))}</h3></div>
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${STATUSES.map((s) => `<a class="card stat" href="#/orders" style="color:inherit"><b>${by(s)}</b>${KQ.statusBadge(s)}</a>`).join('')}</div>
      <div class="sec-h"><h3>${esc(t('dash.recent'))}</h3><a class="btn small ghost" href="#/orders">${esc(t('btn.seeAll'))}</a></div>
      ${recent.length ? `<div class="stack">${recent.map((o) => `<a class="card order-card" href="#/order/${o.id}"><div class="row between"><b>${esc(o.order_number)}</b>${KQ.statusBadge(o.order_status)}</div><div class="muted sm">${esc(o.buyer_name)}${o.buyer_class ? ' (' + esc(o.buyer_class) + ')' : ''} &middot; ${esc(fmt(o.created_at))}</div><b>${money(o.total_price)}</b></a>`).join('')}</div>` : KQ.empty('list', t('orders.empty'))}`;
  }

  async function adminDash() {
    const [pend, buyers, open, students] = await Promise.all([
      count(sb.from('verification_requests').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')),
      count(sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer').eq('verification_status', 'verified')),
      count(sb.from('support_tickets').select('*', { count: 'exact', head: true }).neq('ticket_status', 'resolved')),
      count(sb.from('student_records').select('*', { count: 'exact', head: true }))
    ]);
    return `<p class="muted" style="margin:0">${esc(t('hello', { name: S.profile.full_name }))}</p><h2>${esc(t('admin.title'))}</h2>
      <div class="stats">${stat(pend, t('admin.pendingVerif'), '#/verify')}${stat(buyers, t('admin.verifiedBuyers'), '#/verify')}${stat(open, t('admin.openTickets'), '#/support')}${stat(students, t('admin.studentRecords'), '#/students')}</div>
      ${students === 0 ? `<div class="notice" style="margin-top:14px">${ic('shield')}<span>${esc(t('admin.noRecords'))}</span></div>` : ''}`;
  }

  /* =============== KELOLA MENU =============== */
  KQ.views.menus = async () => {
    const menus = await q(sb.from('menus').select('*').order('menu_name'));
    KQ.V.menus = menus;
    return `<div class="row between"><h2 style="margin:0">${esc(t('nav.manageMenu'))}</h2><button class="btn primary small" data-act="addmenu">${ic('plus')} ${esc(t('btn.addMenu'))}</button></div>
      <div style="margin-top:14px">${menus.length ? `<div class="stack">${menus.map((m) => `<div class="card item">${KQ.imgTag(m.image ? KQ.publicUrl(m.image) : '')}
        <div class="info"><b>${esc(m.menu_name)}</b><span class="price">${money(m.price)}</span>
          <div class="muted sm">${esc(t('cat.' + m.category))} &middot; ${esc(t('menu.stock'))}: ${m.stock} &middot; <span class="badge ${m.stock > 0 ? 'green' : 'gray'}">${esc(m.stock > 0 ? t('menu.available') : t('menu.out'))}</span></div></div>
        <div class="row"><button class="iconbtn" data-act="editmenu" data-id="${m.id}" aria-label="${esc(t('btn.edit'))}" title="${esc(t('btn.edit'))}">${ic('edit')}</button><button class="iconbtn" data-act="delmenu" data-id="${m.id}" aria-label="${esc(t('btn.delete'))}" title="${esc(t('btn.delete'))}">${ic('trash')}</button></div></div>`).join('')}</div>`
        : KQ.empty('store', t('menus.empty'), t('menus.empty.sub'), `<button class="btn primary" data-act="addmenu">${esc(t('btn.addMenu'))}</button>`)}</div>`;
  };

  function menuModal(m) {
    const cur = m && m.image ? KQ.publicUrl(m.image) : '';
    KQ.openModal(`<h3>${esc(t(m ? 'menu.edit' : 'menu.add'))}</h3>
      <form data-form="menu" data-id="${m ? m.id : ''}" data-image="${esc(m && m.image || '')}" novalidate>
        ${fld('menu_name', { val: m ? m.menu_name : '', max: 80 })}
        ${fld('description', { val: m ? m.description || '' : '', tag: 'textarea', rows: 2, max: 200, req: false })}
        ${KQ.select('category', MCATS.map((c) => [c, t('cat.' + c)]), m ? m.category : 'food')}
        ${fld('price', { type: 'number', val: m ? m.price : '', attrs: 'min="0" step="500" inputmode="numeric"', hint: t('f.priceHint') })}
        ${fld('stock', { type: 'number', val: m ? m.stock : '', attrs: 'min="0" step="1" inputmode="numeric"' })}
        <div class="fld"><label for="f-photo">${esc(t('f.photo'))}</label><input id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" data-change="preview"><div class="hint">${esc(t('f.photoHint'))}</div>
          <img id="pv" class="preview" alt="" ${cur ? `src="${esc(cur)}"` : 'hidden'}></div>
        <div class="form-err" role="alert"></div>
        <div class="row end"><button type="button" class="btn ghost" data-act="closemodal">${esc(t('btn.cancel'))}</button><button class="btn primary" type="submit">${esc(t('btn.save'))}</button></div>
      </form>`);
  }
  KQ.inputs.preview = (el) => {
    const file = el.files[0]; const pv = KQ.$('#pv'); if (!pv) return;
    if (file && /^image\//.test(file.type)) { pv.src = URL.createObjectURL(file); pv.hidden = false; }
  };
  KQ.acts.addmenu = () => menuModal(null);
  KQ.acts.editmenu = (el) => menuModal(KQ.V.menus.find((m) => m.id === el.dataset.id));
  KQ.acts.delmenu = async (el) => {
    const m = KQ.V.menus.find((x) => x.id === el.dataset.id);
    const c = await KQ.confirmBox({ title: t('menu.delete.title'), msg: t('menu.delete.msg', { name: m.menu_name }), ok: t('btn.delete'), danger: true });
    if (!c) return;
    await q(sb.from('menus').delete().eq('id', m.id));
    KQ.ok('ok.menuDeleted'); KQ.render({ keep: true });
  };
  KQ.forms.menu = async (f) => {
    need(f, ['menu_name', 'price', 'stock']);
    const price = Number(val(f, 'price')), stock = Number(val(f, 'stock'));
    if (!Number.isInteger(price) || price < 0) throw bad('err.price');
    if (!Number.isInteger(stock) || stock < 0) throw bad('err.stock');
    const category = val(f, 'category'); if (!MCATS.includes(category)) throw bad('err.required');
    let image = f.dataset.image || null;
    const file = f.elements.photo.files[0];
    if (file) image = await KQ.upload('menu-images', file, 2);
    const row = { menu_name: val(f, 'menu_name'), description: val(f, 'description') || null, category, price, stock, image };
    if (f.dataset.id) await q(sb.from('menus').update(row).eq('id', f.dataset.id));
    else await q(sb.from('menus').insert({ ...row, canteen_id: S.profile.canteen_id, seller_id: S.uid }));
    KQ.closeModals(); KQ.ok(f.dataset.id ? 'ok.menuUpdated' : 'ok.menuAdded'); KQ.render({ keep: true });
  };

  /* =============== KELOLA STOK =============== */
  KQ.views.stock = async () => {
    const menus = await q(sb.from('menus').select('*').order('menu_name'));
    return `<h2>${esc(t('nav.manageStock'))}</h2>
      ${menus.length ? `<div class="stack">${menus.map((m) => `<div class="card item" id="row-${m.id}">${KQ.imgTag(m.image ? KQ.publicUrl(m.image) : '')}
        <div class="info"><b>${esc(m.menu_name)}</b><span class="badge ${m.stock > 0 ? 'green' : 'gray'}" data-st="${m.id}">${esc(m.stock > 0 ? t('menu.available') : t('menu.out'))}</span>
          <div class="row" style="margin-top:6px"><div class="qty"><button data-act="sqty" data-id="${m.id}" data-d="-1" aria-label="${esc(t('btn.minus'))}">${ic('minus')}</button>
            <input id="st-${m.id}" type="number" min="0" step="1" inputmode="numeric" value="${m.stock}" data-orig="${m.stock}" data-input="sinput" data-id="${m.id}" aria-label="${esc(t('menu.stock'))}">
            <button data-act="sqty" data-id="${m.id}" data-d="1" aria-label="${esc(t('btn.plus'))}">${ic('plus')}</button></div>
            <button class="btn small primary" data-act="ssave" data-id="${m.id}" disabled>${esc(t('btn.save'))}</button></div></div></div>`).join('')}</div>`
        : KQ.empty('box', t('menus.empty'), t('menus.empty.sub'), `<a class="btn primary" href="#/menus">${esc(t('btn.addMenu'))}</a>`)}`;
  };
  function stockDirty(id) {
    const inp = KQ.$('#st-' + id); const v = Number(inp.value);
    const bad2 = !Number.isInteger(v) || v < 0;
    KQ.$(`[data-act="ssave"][data-id="${id}"]`).disabled = bad2 || String(v) === inp.dataset.orig;
  }
  KQ.acts.sqty = (el) => {
    const inp = KQ.$('#st-' + el.dataset.id);
    inp.value = Math.max(0, (Number(inp.value) || 0) + Number(el.dataset.d));
    stockDirty(el.dataset.id);
  };
  KQ.inputs.sinput = (el) => stockDirty(el.dataset.id);
  KQ.acts.ssave = async (el) => {
    const id = el.dataset.id; const inp = KQ.$('#st-' + id); const v = Number(inp.value);
    if (!Number.isInteger(v) || v < 0) throw bad('err.stock');
    await KQ.busy(el, async () => {
      await q(sb.from('menus').update({ stock: v }).eq('id', id));
      inp.dataset.orig = String(v);
      const b = KQ.$(`[data-st="${id}"]`); b.className = 'badge ' + (v > 0 ? 'green' : 'gray'); b.textContent = t(v > 0 ? 'menu.available' : 'menu.out');
      KQ.ok('ok.stockSaved');
    });
    stockDirty(id);
  };

  /* =============== ADMIN: VERIFIKASI =============== */
  function pendingCard(r) {
    const V = KQ.V; const u = r.user || {};
    const rec = V.records.find((x) => KQ.norm(x.full_name) === KQ.norm(r.requested_full_name) && KQ.norm(x.class) === KQ.norm(r.requested_class));
    const taken = rec && rec.claimed_by && rec.claimed_by !== r.user_id;
    const match = rec ? (taken ? `<span class="badge red">${esc(t('verify.claimed'))}</span>` : `<span class="badge green">${esc(t('verify.match'))}</span>`) : `<span class="badge red">${esc(t('verify.noMatch'))}</span>`;
    return `<div class="card"><div class="row between"><b>${esc(r.requested_full_name)}</b>${match}</div>
      <div class="muted sm">${esc(t('f.class'))}: ${esc(r.requested_class)} &middot; ${esc(u.username || '')} &middot; ${esc(u.email || '')}</div>
      <div class="muted sm">${esc(fmt(r.created_at))}${r.request_type === 'change' ? ` &middot; <span class="badge pending">${esc(t('verify.change'))}</span> ${esc(t('verify.current'))}: ${esc(u.full_name || '')} (${esc(u.class || '')})` : ''}</div>
      <div class="row" style="margin-top:10px">
        ${rec && !taken ? `<button class="btn small primary" data-act="vapprove" data-id="${r.id}">${ic('check')} ${esc(t('btn.verify'))}</button>` : ''}
        ${!rec ? `<button class="btn small outline" data-act="vapprove" data-id="${r.id}" data-manual="1">${esc(t('btn.verifyManual'))}</button>` : ''}
        <button class="btn small ghost" data-act="vreject" data-id="${r.id}">${ic('x')} ${esc(t('btn.reject'))}</button></div></div>`;
  }
  function vlistHtml() {
    const V = KQ.V; const qs = KQ.norm(V.query);
    const m = (n, c) => !qs || KQ.norm(n + ' ' + (c || '')).includes(qs);
    if (V.tab === 'pending') {
      const a = V.pending.filter((r) => m(r.requested_full_name, r.requested_class));
      return a.length ? `<div class="stack">${a.map(pendingCard).join('')}</div>` : KQ.empty('shield', t('verify.emptyPending'));
    }
    if (V.tab === 'buyers') {
      const a = V.buyers.filter((b) => m(b.full_name, b.class));
      return a.length ? `<div class="stack">${a.map((b) => `<div class="card"><div class="row between"><b>${esc(b.full_name)}</b>${KQ.vBadge(b.verification_status)}</div><div class="muted sm">${esc(b.class || '-')} &middot; ${esc(b.username)} &middot; ${esc(b.email)}</div></div>`).join('')}</div>` : KQ.empty('users', t('verify.emptyBuyers'));
    }
    const a = V.history.filter((r) => m(r.requested_full_name, r.requested_class));
    return a.length ? `<div class="stack">${a.map((r) => `<div class="card"><div class="row between"><b>${esc(r.requested_full_name)}</b>${KQ.vBadge(r.verification_status)}</div><div class="muted sm">${esc(r.requested_class)} &middot; ${esc(fmt(r.verified_at))} &middot; ${esc(t('verify.by'))}: ${esc(r.verifier ? r.verifier.full_name : '-')}${r.method === 'manual' ? ' &middot; ' + esc(t('verify.manual')) : ''}</div>${r.rejection_reason ? `<div class="sm" style="margin-top:4px">${esc(r.rejection_reason)}</div>` : ''}</div>`).join('')}</div>` : KQ.empty('list', t('verify.emptyHistory'));
  }
  KQ.views.verify = async () => {
    const [pending, records, buyers, history] = await Promise.all([
      q(sb.from('verification_requests').select('*, user:users!user_id(username,email,full_name,class)').eq('verification_status', 'pending').order('created_at')),
      q(sb.from('student_records').select('id,full_name,class,claimed_by').limit(5000)),
      q(sb.from('users').select('id,full_name,class,username,email,verification_status').eq('role', 'buyer').order('full_name').limit(1000)),
      q(sb.from('verification_requests').select('*, verifier:users!verified_by(full_name)').neq('verification_status', 'pending').order('verified_at', { ascending: false }).limit(200))
    ]);
    Object.assign(KQ.V, { pending, records, buyers, history, tab: 'pending', query: '' });
    return `<h2>${esc(t('nav.verify'))}</h2>
      <div class="search">${ic('search')}<input type="search" data-input="vsearch" placeholder="${esc(t('verify.search'))}" aria-label="${esc(t('verify.search'))}"></div>
      <div class="chips" id="vtabs" style="margin-top:12px">${['pending', 'buyers', 'history'].map((x) => `<button class="chip ${x === 'pending' ? 'on' : ''}" data-act="vtab" data-v="${x}">${esc(t('verify.tab.' + x))}${x === 'pending' ? ` (${pending.length})` : ''}</button>`).join('')}</div>
      <div id="vlist">${vlistHtml()}</div>`;
  };
  KQ.inputs.vsearch = (el) => { KQ.V.query = el.value; KQ.$('#vlist').innerHTML = vlistHtml(); };
  KQ.acts.vtab = (el) => {
    KQ.V.tab = el.dataset.v;
    KQ.$$('#vtabs .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === KQ.V.tab));
    KQ.$('#vlist').innerHTML = vlistHtml();
  };
  KQ.acts.vapprove = async (el) => {
    const manual = el.dataset.manual === '1';
    const c = await KQ.confirmBox({ title: t(manual ? 'verify.manual.title' : 'verify.confirm.title'), msg: t(manual ? 'verify.manual.msg' : 'verify.confirm.msg'), ok: t('btn.verify') });
    if (!c) return;
    await q(sb.rpc('admin_review', { p_request: el.dataset.id, p_approve: true, p_reason: null, p_manual: manual }));
    KQ.ok('ok.verified'); KQ.render({ keep: true });
  };
  KQ.acts.vreject = async (el) => {
    const c = await KQ.confirmBox({ title: t('verify.reject.title'), field: { label: t('verify.reject.reason'), required: true }, ok: t('btn.reject'), danger: true });
    if (!c) return;
    await q(sb.rpc('admin_review', { p_request: el.dataset.id, p_approve: false, p_reason: c.value, p_manual: false }));
    KQ.ok('ok.rejected'); KQ.render({ keep: true });
  };

  /* =============== ADMIN: DATA SISWA =============== */
  function slistHtml() {
    const V = KQ.V; const qs = KQ.norm(V.query);
    const a = V.students.filter((s) => !qs || KQ.norm(s.full_name + ' ' + s.class + ' ' + (s.student_number || '')).includes(qs));
    return a.length ? `<div class="card scroll-x"><table class="tbl"><thead><tr><th>${esc(t('f.student_number'))}</th><th>${esc(t('f.full_name'))}</th><th>${esc(t('f.class'))}</th><th></th><th></th></tr></thead><tbody>${a.map((s) => `<tr><td>${esc(s.student_number || '-')}</td><td>${esc(s.full_name)}</td><td>${esc(s.class)}</td><td>${s.claimed_by ? `<span class="badge green">${esc(t('vstatus.verified'))}</span>` : ''}</td><td>${s.claimed_by ? '' : `<button class="iconbtn" data-act="sdel" data-id="${s.id}" aria-label="${esc(t('btn.delete'))}">${ic('trash')}</button>`}</td></tr>`).join('')}</tbody></table></div>` : KQ.empty('users', t('students.empty'));
  }
  KQ.views.students = async () => {
    KQ.V.students = await q(sb.from('student_records').select('*').order('class').order('full_name').limit(5000));
    KQ.V.query = '';
    return `<h2>${esc(t('nav.students'))}</h2><p class="muted">${esc(t('students.note'))}</p>
      <form class="card" data-form="studentadd" novalidate><h3>${esc(t('students.add'))}</h3>
        <div class="grid cols1" style="gap:0 12px">${fld('student_number', { req: false })}${fld('full_name')}${fld('class')}</div>
        <div class="form-err" role="alert"></div><button class="btn primary" type="submit">${esc(t('btn.add'))}</button></form>
      <form class="card" style="margin-top:12px" data-form="studentimport" novalidate><h3>${esc(t('students.import'))}</h3>
        ${fld('lines', { tag: 'textarea', rows: 4, max: 20000, label: t('students.importLabel'), ph: '12345;Budi Santoso;X IPA 1', req: false })}
        <div class="form-err" role="alert"></div><button class="btn outline" type="submit">${esc(t('btn.import'))}</button></form>
      <div class="search" style="margin:14px 0">${ic('search')}<input type="search" data-input="ssearch" placeholder="${esc(t('verify.search'))}" aria-label="${esc(t('verify.search'))}"></div>
      <div id="slist">${slistHtml()}</div>`;
  };
  KQ.inputs.ssearch = (el) => { KQ.V.query = el.value; KQ.$('#slist').innerHTML = slistHtml(); };
  KQ.forms.studentadd = async (f) => {
    need(f, ['full_name', 'class']);
    await q(sb.from('student_records').insert({ student_number: val(f, 'student_number') || null, full_name: val(f, 'full_name'), class: val(f, 'class') }));
    KQ.ok('ok.studentAdded'); KQ.render({ keep: true });
  };
  KQ.forms.studentimport = async (f) => {
    const lines = val(f, 'lines').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw bad('err.required');
    const rows = lines.map((l) => {
      const p = l.split(/[;\t]/).map((x) => x.trim());
      if (p.length === 2) return { student_number: null, full_name: p[0], class: p[1] };
      if (p.length === 3) return { student_number: p[0] || null, full_name: p[1], class: p[2] };
      throw bad('err.importFormat');
    });
    if (rows.some((r) => !r.full_name || !r.class)) throw bad('err.importFormat');
    await q(sb.from('student_records').insert(rows));
    KQ.ok('ok.studentsImported', { n: rows.length }); KQ.render({ keep: true });
  };
  KQ.acts.sdel = async (el) => {
    const c = await KQ.confirmBox({ title: t('students.delete.title'), ok: t('btn.delete'), danger: true });
    if (!c) return;
    await q(sb.from('student_records').delete().eq('id', el.dataset.id));
    KQ.ok('ok.studentDeleted'); KQ.render({ keep: true });
  };

  /* =============== ADMIN: LAPORAN BANTUAN =============== */
  function tlistHtml() {
    const V = KQ.V;
    const a = V.tickets.filter((x) => (V.fs === 'all' || x.ticket_status === V.fs) && (V.fc === 'all' || x.category === V.fc));
    return a.length ? `<div class="stack">${a.map((r) => `<a class="card order-card" href="#/support/${r.id}"><div class="row between"><b>${esc(r.ticket_number)}</b>${KQ.tBadge(r.ticket_status)}</div><div>${esc(r.subject)}</div><div class="muted sm">${esc(r.user ? r.user.full_name : '')} (${esc(t('role.' + r.user_role))}) &middot; ${esc(t('tcat.' + r.category))} &middot; ${esc(fmt(r.created_at))}</div></a>`).join('')}</div>` : KQ.empty('msg', t('tickets.empty.admin'));
  }
  KQ.views.support = async ({ a }) => {
    if (a) return KQ.back('#/support') + await KQ.ticketDetail(a, true);
    const V = KQ.V;
    V.tickets = await q(sb.from('support_tickets').select('*, user:users!user_id(full_name)').order('created_at', { ascending: false }).limit(300));
    V.fs = 'all'; V.fc = 'all';
    return `<h2>${esc(t('nav.support'))}</h2>
      <div class="chips" id="tfs">${['all', 'pending', 'in_progress', 'resolved'].map((s) => `<button class="chip ${s === 'all' ? 'on' : ''}" data-act="tfs" data-v="${s}">${esc(s === 'all' ? t('filter.all') : t('tstatus.' + s))}</button>`).join('')}</div>
      <div class="fld">${'<select data-change="tfc" aria-label="' + esc(t('f.category')) + '"><option value="all">' + esc(t('filter.allCategories')) + '</option>' + KQ.TCATS.map((c) => `<option value="${c}">${esc(t('tcat.' + c))}</option>`).join('') + '</select>'}</div>
      <div id="tlist">${tlistHtml()}</div>`;
  };
  KQ.acts.tfs = (el) => {
    KQ.V.fs = el.dataset.v;
    KQ.$$('#tfs .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === KQ.V.fs));
    KQ.$('#tlist').innerHTML = tlistHtml();
  };
  KQ.inputs.tfc = (el) => { KQ.V.fc = el.value; KQ.$('#tlist').innerHTML = tlistHtml(); };
  KQ.acts.tstatus = async (el) => {
    await q(sb.from('support_tickets').update({ ticket_status: el.dataset.s }).eq('id', el.dataset.id));
    KQ.ok('ok.ticketUpdated'); KQ.render({ keep: true });
  };

  /* =============== ADMIN: FAQ =============== */
  const FAQ_CATS = ['b_auth', 'b_verify', 'b_canteen', 'b_order', 'b_cart', 'b_payment', 'b_pickup', 'b_status', 'b_account', 's_auth', 's_canteen', 's_menu', 's_stock', 's_orders', 's_cancel', 's_account'];
  KQ.views.faq = async () => {
    const rows = await q(sb.from('faqs').select('*').order('display_order'));
    KQ.V.faqs = rows; const L = S.lang === 'en' ? 'en' : 'id';
    return `<div class="row between"><h2 style="margin:0">${esc(t('nav.faq'))}</h2><button class="btn small primary" data-act="addfaq">${ic('plus')} ${esc(t('btn.add'))}</button></div>
      <div class="stack" style="margin-top:14px">${rows.length ? rows.map((r) => `<div class="card"><div class="row between"><span class="badge ready">${esc(t('hcat.' + r.category))}</span>${r.is_active ? '' : `<span class="badge gray">${esc(t('faq.inactive'))}</span>`}</div>
        <b>${esc(r['question_' + L])}</b><p class="muted sm" style="margin:4px 0 8px">${esc(r['answer_' + L])}</p>
        <div class="row"><button class="btn small ghost" data-act="editfaq" data-id="${r.id}">${ic('edit')} ${esc(t('btn.edit'))}</button><button class="btn small ghost" data-act="delfaq" data-id="${r.id}">${ic('trash')} ${esc(t('btn.delete'))}</button></div></div>`).join('') : KQ.empty('help', t('faq.empty'))}</div>`;
  };
  function faqModal(r) {
    r = r || {};
    KQ.openModal(`<h3>${esc(t(r.id ? 'btn.edit' : 'btn.add'))} FAQ</h3>
      <form data-form="faq" data-id="${r.id || ''}" novalidate>
        ${KQ.select('category', FAQ_CATS.map((c) => [c, t('hcat.' + c)]), r.category || 'b_order')}
        ${fld('question_id', { val: r.question_id || '', label: t('faq.q') + ' (ID)', max: 200 })}${fld('question_en', { val: r.question_en || '', label: t('faq.q') + ' (EN)', max: 200 })}
        ${fld('answer_id', { val: r.answer_id || '', tag: 'textarea', rows: 3, max: 600, label: t('faq.a') + ' (ID)' })}${fld('answer_en', { val: r.answer_en || '', tag: 'textarea', rows: 3, max: 600, label: t('faq.a') + ' (EN)' })}
        ${fld('display_order', { type: 'number', val: r.display_order ?? 0, attrs: 'step="1"', label: t('faq.order') })}
        ${KQ.select('is_active', [['true', t('faq.active')], ['false', t('faq.inactive')]], String(r.is_active !== false), t('faq.status'))}
        <div class="form-err" role="alert"></div>
        <div class="row end"><button type="button" class="btn ghost" data-act="closemodal">${esc(t('btn.cancel'))}</button><button class="btn primary" type="submit">${esc(t('btn.save'))}</button></div></form>`);
  }
  KQ.acts.addfaq = () => faqModal(null);
  KQ.acts.editfaq = (el) => faqModal(KQ.V.faqs.find((x) => x.id === el.dataset.id));
  KQ.acts.delfaq = async (el) => {
    const c = await KQ.confirmBox({ title: t('faq.delete.title'), ok: t('btn.delete'), danger: true });
    if (!c) return;
    await q(sb.from('faqs').delete().eq('id', el.dataset.id));
    KQ.ok('ok.faqDeleted'); KQ.render({ keep: true });
  };
  KQ.forms.faq = async (f) => {
    need(f, ['question_id', 'question_en', 'answer_id', 'answer_en']);
    const row = { category: val(f, 'category'), question_id: val(f, 'question_id'), question_en: val(f, 'question_en'), answer_id: val(f, 'answer_id'), answer_en: val(f, 'answer_en'), display_order: parseInt(val(f, 'display_order'), 10) || 0, is_active: val(f, 'is_active') === 'true' };
    if (f.dataset.id) await q(sb.from('faqs').update(row).eq('id', f.dataset.id)); else await q(sb.from('faqs').insert(row));
    KQ.closeModals(); KQ.ok('ok.faqSaved'); KQ.render({ keep: true });
  };

  /* =============== ADMIN: PENGATURAN =============== */
  KQ.views.settings = async () => {
    const rows = await q(sb.from('app_settings').select('*'));
    const st = {}; rows.forEach((r) => { st[r.key] = r.value || ''; });
    return `<h2>${esc(t('nav.settings'))}</h2>
      <form class="card" data-form="settings" novalidate><h3>${esc(t('settings.contact'))}</h3><p class="muted sm">${esc(t('settings.contactNote'))}</p>
        ${fld('contact_email', { type: 'email', val: st.contact_email, req: false, label: t('f.email') })}
        ${fld('contact_phone', { type: 'tel', val: st.contact_phone, req: false, label: t('f.phone') })}
        ${fld('contact_note', { tag: 'textarea', rows: 2, max: 300, val: st.contact_note, req: false, label: t('settings.note') })}
        <div class="form-err" role="alert"></div><button class="btn primary" type="submit">${esc(t('btn.save'))}</button></form>
      <div class="stack" style="margin-top:14px"><a class="pill-link" href="#/profile">${ic('user')}<span>${esc(t('nav.profile'))}</span>${ic('chev')}</a></div>`;
  };
  KQ.forms.settings = async (f) => {
    const email = val(f, 'contact_email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw bad('err.email');
    const rows = ['contact_email', 'contact_phone', 'contact_note'].map((k) => ({ key: k, value: val(f, k), updated_at: new Date().toISOString() }));
    await q(sb.from('app_settings').upsert(rows, { onConflict: 'key' }));
    KQ.ok('ok.settingsSaved');
  };
})(window.KQ);
