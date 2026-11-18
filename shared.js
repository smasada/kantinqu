/* KantinQu - fitur bersama: pesanan, profil, pusat bantuan */
(function (KQ) {
  'use strict';
  const { t, esc, ic, fld, pwfld, val, need, q, bad, sb, S, money, fmt } = KQ;
  const USER_RE = /^[A-Za-z0-9_.]{3,20}$/;
  const PHONE_RE = /^[0-9+\-\s]{8,16}$/;
  const STATUSES = ['pending', 'processing', 'ready', 'completed', 'cancelled'];

  /* =============== PESANAN =============== */
  function orderCard(o, role) {
    const items = (o.order_items || []).map((i) => `${i.quantity}× ${i.menu_name_snapshot}`).join(', ');
    return `<a class="card order-card" href="#/order/${o.id}">
      <div class="row between"><b>${esc(o.order_number)}</b>${KQ.statusBadge(o.order_status)}</div>
      <div class="muted sm">${esc(fmt(o.created_at))} &middot; ${role === 'seller' ? esc(o.buyer_name) + (o.buyer_class ? ' (' + esc(o.buyer_class) + ')' : '') : esc(o.canteens ? o.canteens.canteen_name + ' ' + o.canteens.canteen_label : '')}</div>
      <div class="sm" style="margin:6px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(items)}</div>
      <div class="row between"><span class="muted sm">${esc(t('payment.cash'))}</span><b>${money(o.total_price)}</b></div></a>`;
  }
  function olistHtml() {
    const V = KQ.V; const role = S.profile.role;
    const arr = V.orders.filter((o) => V.filter === 'all' || o.order_status === V.filter);
    return arr.length ? `<div class="grid cols1">${arr.map((o) => orderCard(o, role)).join('')}</div>` : KQ.empty('list', t('orders.empty'), role === 'buyer' ? t('orders.empty.sub') : '');
  }
  KQ.views.orders = async () => {
    const role = S.profile.role;
    KQ.V.orders = await q(sb.from('orders').select('*, canteens(canteen_name,canteen_label), order_items(menu_name_snapshot,quantity)').order('created_at', { ascending: false }).limit(300));
    KQ.V.filter = 'all';
    return `<h2>${esc(t('nav.orders'))}</h2>
      ${role === 'seller' ? `<div class="chips" id="ofilters">${['all', ...STATUSES].map((s) => `<button class="chip ${s === 'all' ? 'on' : ''}" data-act="ofilter" data-v="${s}">${esc(s === 'all' ? t('filter.all') : t('status.' + s))}</button>`).join('')}</div>` : ''}
      <div id="olist">${olistHtml()}</div>`;
  };
  KQ.acts.ofilter = (el) => {
    KQ.V.filter = el.dataset.v;
    KQ.$$('#ofilters .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === KQ.V.filter));
    KQ.$('#olist').innerHTML = olistHtml();
  };

  KQ.views.order = async ({ a }) => {
    const role = S.profile.role;
    const o = await q(sb.from('orders').select('*, canteens(canteen_name,canteen_label), order_items(*), order_status_history(*)').eq('id', a).maybeSingle());
    if (!o) return KQ.back('#/orders') + KQ.empty('list', t('order.notFound'));
    const hist = (o.order_status_history || []).sort((x, y) => new Date(x.changed_at) - new Date(y.changed_at));
    const active = ['pending', 'processing', 'ready'].includes(o.order_status);
    const btn = (s, label, cls) => `<button class="btn ${cls || 'primary'}" data-act="ostatus" data-id="${o.id}" data-no="${esc(o.order_number)}" data-s="${s}">${esc(label)}</button>`;
    let actions = '';
    if (role === 'seller' && active) {
      const next = { pending: ['processing', 'btn.process'], processing: ['ready', 'btn.markReady'], ready: ['completed', 'btn.complete'] }[o.order_status];
      actions = `<div class="card" style="margin-top:12px"><div class="row">${btn(next[0], t(next[1]))}${btn('cancelled', t('btn.cancelOrder'), 'outline')}</div></div>`;
    }
    return `${KQ.back('#/orders')}
      <div class="row between"><h2 style="margin:0">${esc(o.order_number)}</h2>${KQ.statusBadge(o.order_status)}</div>
      ${role === 'buyer' && active ? `<div class="code-box" style="margin:12px 0"><span class="sm muted">${esc(t('order.pickupCode'))}</span><div class="qr" id="qr" data-p="${esc('KQ1|' + o.order_number + '|' + o.pickup_code)}" aria-label="QR"></div><b>${esc(o.pickup_code)}</b><span class="sm">${esc(t('order.qrHint'))}</span></div>` : ''}
      ${o.order_status === 'ready' && role === 'buyer' ? `<div class="notice ok" style="margin-bottom:12px">${ic('check')}<span>${esc(t('order.readyHint'))}</span></div>` : ''}
      ${o.order_status === 'cancelled' ? `<div class="notice bad" style="margin:12px 0"><div><b>${esc(t('order.cancelReason'))}</b><br>${esc(o.cancellation_reason || '-')}${role === 'seller' ? `<br><span class="sm">${esc(t('order.stockHint'))}</span>` : ''}</div></div>` : ''}
      <div class="card" style="margin-top:12px">
        <div class="kv"><span>${esc(t('canteen'))}</span><span>${esc(o.canteens.canteen_name)} (${esc(o.canteens.canteen_label)})</span></div>
        <div class="kv"><span>${esc(t('order.date'))}</span><span>${esc(fmt(o.created_at))}</span></div>
        <div class="kv"><span>${esc(t('f.full_name'))}</span><span>${esc(o.buyer_name)}</span></div>
        <div class="kv"><span>${esc(t('f.class'))}</span><span>${esc(o.buyer_class || '-')}</span></div>
        ${o.buyer_phone ? `<div class="kv"><span>${esc(t('f.phone'))}</span><span>${esc(o.buyer_phone)}</span></div>` : ''}
        <div class="kv"><span>${esc(t('payment'))}</span><span>${esc(t('payment.cash'))}</span></div></div>
      <div class="card" style="margin-top:12px"><h3>${esc(t('checkout.order'))}</h3>
        ${(o.order_items || []).map((i) => `<div class="item" style="padding:8px 0">${KQ.imgTag(i.image_snapshot ? KQ.publicUrl(i.image_snapshot) : '')}<div class="info"><b>${esc(i.menu_name_snapshot)}</b><span class="muted sm">${i.quantity} &times; ${money(i.unit_price_snapshot)}</span></div><b>${money(i.subtotal)}</b></div>`).join('')}
        <div class="total-bar"><span>${esc(t('total'))}</span><span>${money(o.total_price)}</span></div></div>
      ${actions}
      <div class="card" style="margin-top:12px"><h3>${esc(t('order.history'))}</h3><ul class="timeline">${hist.map((h) => `<li><b>${esc(t('status.' + h.new_status))}</b> <span class="muted sm">${esc(fmt(h.changed_at))}</span></li>`).join('')}</ul></div>`;
  };

  /* ---- QR pengambilan: tampil di HP pembeli, dipindai di HP penjual ---- */
  const QR_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  const JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

  KQ.hooks.order = () => {
    const el = document.getElementById('qr');
    if (!el) return;
    KQ.loadScript(QR_URL).then(() => {
      const qr = window.qrcode(0, 'M'); qr.addData(el.dataset.p); qr.make();
      el.innerHTML = qr.createSvgTag(4, 2);
      const svg = el.querySelector('svg'); if (!svg) return;
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 ' + parseFloat(svg.getAttribute('width')) + ' ' + parseFloat(svg.getAttribute('height')));
      svg.removeAttribute('width'); svg.removeAttribute('height');
    }).catch(() => el.remove());
  };

  function askPickupCode(orderNo) {
    return new Promise((resolve) => {
      const m = KQ.openModal(`<h3>${esc(t('scan.title'))}</h3>
        <div class="scanbox"><video id="sc-v" playsinline muted autoplay></video></div>
        <p class="muted sm" id="sc-s">${esc(t('scan.starting'))}</p>
        <div id="sc-m" hidden><div class="fld"><label for="sc-c">${esc(t('complete.code'))}</label><input id="sc-c" maxlength="4" inputmode="numeric" autocomplete="off"></div><div class="form-err" id="sc-e"></div></div>
        <div class="row end"><button class="btn ghost" data-r="cancel">${esc(t('btn.cancel'))}</button><button class="btn outline" data-r="manual">${esc(t('scan.manual'))}</button><button class="btn primary" data-r="go" hidden>${esc(t('btn.complete'))}</button></div>`, false);
      const $m = (sel) => m.querySelector(sel);
      let stream = null, done = false, timer = null;
      const finish = (code) => {
        if (done) return; done = true; clearTimeout(timer);
        if (stream) stream.getTracks().forEach((x) => x.stop());
        m.remove(); resolve(code);
      };
      const status = (txt, isBad) => { const s = $m('#sc-s'); if (!s) return; s.textContent = txt; s.classList.toggle('err-text', !!isBad); };
      const showManual = () => { $m('#sc-m').hidden = false; $m('[data-r="go"]').hidden = false; $m('[data-r="manual"]').hidden = true; $m('#sc-c').focus(); };
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        if (b.dataset.r === 'cancel') finish(null);
        else if (b.dataset.r === 'manual') showManual();
        else if (b.dataset.r === 'go') {
          const v = $m('#sc-c').value.trim();
          if (!v) { $m('#sc-e').textContent = t('err.required'); return; }
          finish(v);
        }
      });
      const handle = (text) => {
        const p = String(text || '').split('|');
        if (p.length !== 3 || p[0] !== 'KQ1') { status(t('scan.invalid'), true); return; }
        if (p[1] !== orderNo) { status(t('scan.wrong', { no: orderNo }), true); return; }
        status(t('scan.ok'));
        finish(p[2]);
      };
      (async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
          if (done || !m.isConnected) { stream.getTracks().forEach((x) => x.stop()); return; }
          const v = $m('#sc-v'); v.srcObject = stream; await v.play().catch(() => {});
          status(t('scan.hint'));
          let decode = null;
          if ('BarcodeDetector' in window) {
            try { const det = new window.BarcodeDetector({ formats: ['qr_code'] }); decode = async () => { const r = await det.detect(v); return r[0] ? r[0].rawValue : null; }; } catch (e) { decode = null; }
          }
          if (!decode) {
            await KQ.loadScript(JSQR_URL);
            const cv = document.createElement('canvas'); const cx = cv.getContext('2d', { willReadFrequently: true });
            decode = async () => {
              if (!v.videoWidth) return null;
              const w = Math.min(v.videoWidth, 640), hh = Math.round(w * v.videoHeight / v.videoWidth);
              cv.width = w; cv.height = hh; cx.drawImage(v, 0, 0, w, hh);
              const r = window.jsQR(cx.getImageData(0, 0, w, hh).data, w, hh);
              return r ? r.data : null;
            };
          }
          let last = '';
          const tick = async () => {
            if (done) return;
            if (!m.isConnected) { finish(null); return; }
            try { const txt = await decode(); if (txt && txt !== last) { last = txt; handle(txt); } else if (!txt) last = ''; } catch (e) { /* abaikan */ }
            if (!done) timer = setTimeout(tick, 250);
          };
          tick();
        } catch (e) { status(t('scan.denied'), true); showManual(); }
      })();
    });
  }

  KQ.acts.ostatus = async (el) => {
    const id = el.dataset.id, s = el.dataset.s; let reason = null, code = null;
    if (s === 'cancelled') {
      const c = await KQ.confirmBox({ title: t('cancel.title'), msg: t('cancel.msg'), field: { label: t('cancel.reason'), required: true }, ok: t('btn.cancelOrder'), cancel: t('btn.back'), danger: true });
      if (!c) return; reason = c.value;
    }
    if (s === 'completed') {
      code = await askPickupCode(el.dataset.no);
      if (!code) return;
    }
    await KQ.busy(el, async () => {
      await q(sb.rpc('update_order_status', { p_order: id, p_status: s, p_reason: reason, p_code: code }));
      KQ.ok(s === 'cancelled' ? 'ok.orderCancelled' : 'ok.statusUpdated');
      await KQ.render({ keep: true });
    });
  };

  /* =============== PROFIL =============== */
  KQ.views.profile = async () => {
    const p = S.profile; const role = p.role;
    let extra = '', canteen = null;
    if (role === 'buyer') {
      const r = (await q(sb.from('verification_requests').select('*').eq('user_id', S.uid).order('created_at', { ascending: false }).limit(1)))[0];
      if (r && r.verification_status === 'pending') extra = `<div class="notice" style="margin-bottom:12px">${ic('shield')}<span>${esc(t('profile.pendingReq', { name: r.requested_full_name, cls: r.requested_class }))}</span></div>`;
      else if (r && r.verification_status === 'rejected' && p.verification_status === 'rejected') extra = `<div class="notice bad" style="margin-bottom:12px"><div><b>${esc(t('vstatus.rejected'))}</b><br>${esc(r.rejection_reason || '')}</div></div>`;
      else if (r && r.verification_status === 'rejected') extra = `<div class="notice bad" style="margin-bottom:12px"><div><b>${esc(t('profile.changeRejected'))}</b><br>${esc(r.rejection_reason || '')}</div></div>`;
    }
    if (role === 'seller') canteen = await q(sb.from('canteens').select('*').eq('seller_id', S.uid).maybeSingle());
    const kv = (k, v) => `<div class="kv"><span>${esc(t(k))}</span><span>${esc(v || '-')}</span></div>`;
    return `<h2>${esc(t('nav.profile'))}</h2>
      <div class="card"><div class="row" style="margin-bottom:10px">${KQ.avaHtml(p)}<div><b>${esc(p.full_name)}</b><br><span class="badge gray">${esc(t('role.' + role))}</span> ${role === 'buyer' ? KQ.vBadge(p.verification_status) : ''}</div></div>
        ${extra}
        ${role === 'buyer' ? kv('f.class', p.class) : ''}
        ${kv('f.username', p.username)}${kv('f.email', p.email)}${kv('f.phone', p.phone_number)}
        ${canteen ? `${kv('f.canteen_name', canteen.canteen_name)}${kv('f.canteen_label', canteen.canteen_label)}${kv('f.canteen_location', canteen.canteen_location)}` : ''}</div>
      <div class="stack" style="margin-top:14px">
        <button class="pill-link" data-act="editprofile">${ic('edit')}<span>${esc(t('btn.editProfile'))}</span>${ic('chev')}</button>
        ${role === 'buyer' ? `<button class="pill-link" data-act="identity">${ic('shield')}<span>${esc(t('btn.changeIdentity'))}</span>${ic('chev')}</button>` : ''}
        <button class="pill-link" data-act="pwd">${ic('gear')}<span>${esc(t('btn.changePassword'))}</span>${ic('chev')}</button>
        <div class="pill-link" style="cursor:default">${ic('user')}<span>${esc(t('lang.label'))}</span><div class="seg" style="margin-left:auto"><button data-act="lang" data-v="id" class="${S.lang === 'id' ? 'on' : ''}">Indonesia</button><button data-act="lang" data-v="en" class="${S.lang === 'en' ? 'on' : ''}">English</button></div></div>
        ${role !== 'admin' ? `<a class="pill-link" href="#/help">${ic('help')}<span>${esc(t('help.title'))}</span>${ic('chev')}</a>` : ''}
        <button class="pill-link" data-act="logout">${ic('logout')}<span>${esc(t('btn.logout'))}</span>${ic('chev')}</button></div>`;
  };

  KQ.acts.editprofile = async () => {
    const p = S.profile; const role = p.role;
    const c = role === 'seller' ? await q(sb.from('canteens').select('*').eq('seller_id', S.uid).maybeSingle()) : null;
    KQ.openModal(`<h3>${esc(t('btn.editProfile'))}</h3>
      <form data-form="editprofile" novalidate>
        <div class="row" style="margin-bottom:12px">${KQ.avaHtml(p)}<div class="fld" style="flex:1;margin:0"><label for="f-avatar">${esc(t('f.avatar'))} <span class="muted sm">(${esc(t('f.optional'))})</span></label><input id="f-avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp"><div class="hint">${esc(t('f.avatarHint'))}</div>${p.avatar_url ? `<label class="sm" style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" name="remove_avatar"> ${esc(t('f.removeAvatar'))}</label>` : ''}</div></div>
        ${role === 'buyer' ? `<div class="fld"><label>${esc(t('f.full_name'))} / ${esc(t('f.class'))}</label><input value="${esc(p.full_name)} - ${esc(p.class || '')}" readonly><div class="hint">${esc(t('profile.identityLocked'))}</div></div>` : fld('full_name', { val: p.full_name })}
        ${fld('username', { val: p.username })}
        ${fld('phone', { type: 'tel', val: p.phone_number || '', req: role === 'seller' })}
        ${c ? `${fld('canteen_name', { val: c.canteen_name })}${fld('canteen_label', { val: c.canteen_label })}${fld('canteen_location', { val: c.canteen_location || '', tag: 'textarea', rows: 2, max: 200 })}
          <div class="fld"><label for="f-photo">${esc(t('f.canteen_photo'))} <span class="muted sm">(${esc(t('f.optional'))})</span></label><input id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"><div class="hint">${esc(t('f.photoHint'))}</div></div>` : ''}
        <div class="form-err" role="alert"></div>
        <div class="row end"><button type="button" class="btn ghost" data-act="closemodal">${esc(t('btn.cancel'))}</button><button class="btn primary" type="submit">${esc(t('btn.save'))}</button></div>
      </form>`);
  };
  KQ.forms.editprofile = async (f) => {
    const role = S.profile.role;
    need(f, role === 'buyer' ? ['username'] : role === 'seller' ? ['full_name', 'username', 'phone', 'canteen_name', 'canteen_label'] : ['full_name', 'username']);
    const username = val(f, 'username'), phone = val(f, 'phone');
    if (!USER_RE.test(username)) throw bad('err.username');
    if (phone && !PHONE_RE.test(phone)) throw bad('err.phone');
    const upd = { username, phone_number: phone || null };
    if (role !== 'buyer') upd.full_name = val(f, 'full_name');
    const oldAva = S.profile.avatar_url;
    const avFile = f.elements.avatar && f.elements.avatar.files[0];
    if (avFile) upd.avatar_url = await KQ.upload('avatars', avFile, 2);
    else if (f.elements.remove_avatar && f.elements.remove_avatar.checked) upd.avatar_url = null;
    await q(sb.from('users').update(upd).eq('id', S.uid));
    if (role === 'seller') {
      const cu = { canteen_name: val(f, 'canteen_name'), canteen_label: val(f, 'canteen_label'), canteen_location: val(f, 'canteen_location') || null };
      const file = f.elements.photo && f.elements.photo.files[0];
      if (file) cu.image_url = await KQ.upload('menu-images', file, 2);
      await q(sb.from('canteens').update(cu).eq('seller_id', S.uid));
    }
    if (oldAva && 'avatar_url' in upd && upd.avatar_url !== oldAva) { try { await sb.storage.from('avatars').remove([oldAva]); } catch (e) { /* abaikan */ } }
    await KQ.loadProfile(); KQ.closeModals(); KQ.ok('ok.profileSaved'); KQ.render({ keep: true });
  };

  KQ.acts.identity = () => {
    const p = S.profile;
    KQ.openModal(`<h3>${esc(t('btn.changeIdentity'))}</h3><p class="muted">${esc(t('identity.note'))}</p>
      <form data-form="identity" novalidate>${fld('full_name', { val: p.full_name })}${fld('class', { val: p.class || '', ph: t('ph.class') })}
        <div class="form-err" role="alert"></div>
        <div class="row end"><button type="button" class="btn ghost" data-act="closemodal">${esc(t('btn.cancel'))}</button><button class="btn primary" type="submit">${esc(t('btn.sendRequest'))}</button></div></form>`);
  };
  KQ.forms.identity = async (f) => {
    need(f, ['full_name', 'class']);
    await q(sb.rpc('request_identity_change', { p_name: val(f, 'full_name'), p_class: val(f, 'class') }));
    await KQ.loadProfile(); KQ.closeModals(); KQ.ok('ok.identityRequested'); KQ.render({ keep: true });
  };

  KQ.acts.pwd = () => {
    KQ.openModal(`<h3>${esc(t('btn.changePassword'))}</h3>
      <form data-form="pwd" novalidate>${pwfld('current')}${pwfld('password', 'new-password')}${pwfld('confirm', 'new-password')}
        <div class="form-err" role="alert"></div>
        <div class="row end"><button type="button" class="btn ghost" data-act="closemodal">${esc(t('btn.cancel'))}</button><button class="btn primary" type="submit">${esc(t('btn.save'))}</button></div></form>`);
  };
  KQ.forms.pwd = async (f) => {
    need(f, ['current', 'password', 'confirm']);
    const np = f.elements.password.value;
    if (np.length < 8) throw bad('err.pwShort');
    if (np !== f.elements.confirm.value) throw bad('err.pwMatch');
    const r = await sb.auth.signInWithPassword({ email: S.profile.email, password: f.elements.current.value });
    if (r.error) throw bad('err.currentPw');
    const { error } = await sb.auth.updateUser({ password: np });
    if (error) throw error;
    KQ.closeModals(); KQ.ok('ok.passwordChanged');
  };

  /* =============== PUSAT BANTUAN =============== */
  const B_CATS = ['b_auth', 'b_verify', 'b_canteen', 'b_order', 'b_cart', 'b_payment', 'b_pickup', 'b_status', 'b_account'];
  const S_CATS = ['s_auth', 's_canteen', 's_menu', 's_stock', 's_orders', 's_cancel', 's_account'];
  const TCATS = ['account', 'verification', 'order', 'payment', 'menu_stock', 'orders', 'technical', 'other'];
  KQ.TCATS = TCATS;

  function faqHtml() {
    const V = KQ.V; const qs = KQ.norm(V.query); const L = S.lang === 'en' ? 'en' : 'id';
    const arr = V.faqs.filter((f) => f.category.startsWith(V.aud + '_') && (V.cat === 'all' || f.category === V.cat)
      && (!qs || KQ.norm(f['question_' + L] + ' ' + f['answer_' + L]).includes(qs)));
    return arr.length ? arr.map((f) => `<details class="faq"><summary>${esc(f['question_' + L])}</summary><p>${esc(f['answer_' + L])}</p></details>`).join('')
      : KQ.empty('search', t('help.noResult'), t('help.noResult.sub'));
  }
  function catChips() {
    const V = KQ.V; const cats = V.aud === 's' ? S_CATS : B_CATS;
    return ['all', ...cats].map((c) => `<button class="chip ${V.cat === c ? 'on' : ''}" data-act="hcat" data-v="${c}">${esc(c === 'all' ? t('filter.all') : t('hcat.' + c))}</button>`).join('');
  }

  KQ.views.help = async ({ a, b }) => {
    if (a === 'contact' || a === 'report') return helpForm(a);
    if (a === 'tickets') return ticketList();
    if (a === 'ticket') return ticketDetail(b);
    const role = S.profile && S.profile.role;
    const [faqs, settings] = await Promise.all([
      q(sb.from('faqs').select('*').eq('is_active', true).order('display_order')),
      q(sb.from('app_settings').select('*')).catch(() => [])
    ]);
    const V = KQ.V; V.faqs = faqs; V.query = ''; V.cat = 'all'; V.aud = role === 'seller' ? 's' : 'b';
    const st = {}; settings.forEach((x) => { st[x.key] = x.value; });
    const official = st.contact_email || st.contact_phone || st.contact_note;
    return `<h2>${esc(t('help.title'))}</h2>
      <div class="search">${ic('search')}<input type="search" data-input="hsearch" placeholder="${esc(t('help.search'))}" aria-label="${esc(t('help.search'))}"></div>
      ${role === 'buyer' || role === 'seller' ? '' : `<div class="seg" style="margin-top:12px"><button data-act="haud" data-v="b" class="${V.aud === 'b' ? 'on' : ''}" id="aud-b">${esc(t('help.forBuyer'))}</button><button data-act="haud" data-v="s" class="${V.aud === 's' ? 'on' : ''}" id="aud-s">${esc(t('help.forSeller'))}</button></div>`}
      <div class="chips" id="hchips" style="margin-top:12px">${catChips()}</div>
      <div id="faqlist" style="margin-top:6px">${faqHtml()}</div>
      <div class="card" style="margin-top:18px"><h3>${esc(t('help.needMore'))}</h3>
        ${role === 'buyer' || role === 'seller' ? `<div class="row"><a class="btn primary" href="#/help/contact">${esc(t('btn.contactUs'))}</a><a class="btn outline" href="#/help/report">${esc(t('btn.reportIssue'))}</a><a class="btn ghost" href="#/help/tickets">${esc(t('help.history'))}</a></div>`
          : `<p class="muted">${esc(t('help.loginToContact'))}</p><a class="btn primary" href="#/login/buyer">${esc(t('btn.login'))}</a>`}
        ${official ? `<div style="margin-top:14px"><b>${esc(t('help.official'))}</b>${st.contact_email ? `<div class="kv"><span>${esc(t('f.email'))}</span><span>${esc(st.contact_email)}</span></div>` : ''}${st.contact_phone ? `<div class="kv"><span>${esc(t('f.phone'))}</span><span>${esc(st.contact_phone)}</span></div>` : ''}${st.contact_note ? `<p class="muted sm" style="margin-top:6px">${esc(st.contact_note)}</p>` : ''}</div>` : ''}</div>`;
  };
  KQ.inputs.hsearch = (el) => { KQ.V.query = el.value; KQ.$('#faqlist').innerHTML = faqHtml(); };
  KQ.acts.hcat = (el) => { KQ.V.cat = el.dataset.v; KQ.$('#hchips').innerHTML = catChips(); KQ.$('#faqlist').innerHTML = faqHtml(); };
  KQ.acts.haud = (el) => {
    KQ.V.aud = el.dataset.v; KQ.V.cat = 'all';
    KQ.$$('#aud-b,#aud-s').forEach((b) => b.classList.toggle('on', b.dataset.v === KQ.V.aud));
    KQ.$('#hchips').innerHTML = catChips(); KQ.$('#faqlist').innerHTML = faqHtml();
  };

  async function helpForm(kind) {
    const p = S.profile;
    if (!p || p.role === 'admin') { location.hash = '#/help'; return ''; }
    const orders = await q(sb.from('orders').select('id,order_number,created_at').order('created_at', { ascending: false }).limit(30));
    const defCat = kind === 'report' ? 'order' : 'account';
    return `${KQ.back('#/help')}<h2>${esc(t(kind === 'report' ? 'btn.reportIssue' : 'btn.contactUs'))}</h2>
      <form class="card" data-form="ticket" novalidate>
        ${fld('full_name', { val: p.full_name, ro: true })}${fld('email', { val: p.email, ro: true })}
        ${fld('user_type', { val: t('role.' + p.role), ro: true })}
        ${KQ.select('category', TCATS.map((c) => [c, t('tcat.' + c)]), defCat)}
        ${fld('subject', { max: 120 })}
        ${fld('description', { tag: 'textarea', rows: 5, max: 2000 })}
        <div class="fld"><label for="f-related_order">${esc(t('f.related_order'))} <span class="muted sm">(${esc(t('f.optional'))})</span></label>
          <select id="f-related_order" name="related_order"><option value="">-</option>${orders.map((o) => `<option value="${o.id}">${esc(o.order_number)} - ${esc(fmt(o.created_at))}</option>`).join('')}</select></div>
        <div class="fld"><label for="f-attachment">${esc(t('f.attachment'))} <span class="muted sm">(${esc(t('f.optional'))})</span></label><input id="f-attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp"><div class="hint">${esc(t('f.attachHint'))}</div></div>
        <div class="notice info" style="margin-bottom:12px">${ic('shield')}<span>${esc(t('help.noSecrets'))}</span></div>
        <div class="form-err" role="alert"></div>
        <button class="btn primary block" type="submit">${esc(t('btn.send'))}</button>
      </form>`;
  }
  KQ.forms.ticket = async (f) => {
    need(f, ['subject', 'description']);
    const subject = val(f, 'subject'), description = val(f, 'description');
    if (subject.length < 3 || description.length < 5) throw bad('err.tooShort');
    const file = f.elements.attachment.files[0];
    const attachment = file ? await KQ.upload('support-attachments', file, 3) : null;
    const row = { user_id: S.uid, category: val(f, 'category'), subject, description, attachment, related_order_id: val(f, 'related_order') || null };
    const d = await q(sb.from('support_tickets').insert(row).select('ticket_number').single());
    KQ.ok('ok.ticketSent', { no: d.ticket_number });
    location.hash = '#/help/tickets';
  };

  async function ticketList() {
    const rows = await q(sb.from('support_tickets').select('*').order('created_at', { ascending: false }));
    return `${KQ.back('#/help')}<h2>${esc(t('help.history'))}</h2>
      ${rows.length ? `<div class="stack">${rows.map((r) => `<a class="card order-card" href="#/help/ticket/${r.id}"><div class="row between"><b>${esc(r.ticket_number)}</b>${KQ.tBadge(r.ticket_status)}</div><div>${esc(r.subject)}</div><div class="muted sm">${esc(t('tcat.' + r.category))} &middot; ${esc(fmt(r.created_at))}</div></a>`).join('')}</div>`
        : KQ.empty('msg', t('tickets.empty'), null, `<a class="btn primary" href="#/help/report">${esc(t('btn.reportIssue'))}</a>`)}`;
  }

  KQ.ticketDetail = async (id, admin) => {
    const tk = await q(sb.from('support_tickets').select('*').eq('id', id).maybeSingle());
    if (!tk) return KQ.empty('msg', t('tickets.notFound'));
    const replies = await q(sb.from('support_replies').select('*').eq('ticket_id', id).order('created_at'));
    const url = tk.attachment ? await KQ.signedUrl(tk.attachment) : null;
    let who = '';
    if (admin) { const u = await q(sb.from('users').select('full_name,email,role,class').eq('id', tk.user_id).maybeSingle()); who = u ? `<div class="kv"><span>${esc(t('f.full_name'))}</span><span>${esc(u.full_name)} (${esc(t('role.' + u.role))}${u.class ? ', ' + esc(u.class) : ''})</span></div><div class="kv"><span>${esc(t('f.email'))}</span><span>${esc(u.email)}</span></div>` : ''; }
    return `<div class="row between"><h2 style="margin:0">${esc(tk.ticket_number)}</h2>${KQ.tBadge(tk.ticket_status)}</div>
      <div class="card" style="margin-top:12px"><h3>${esc(tk.subject)}</h3>
        ${who}
        <div class="kv"><span>${esc(t('f.category'))}</span><span>${esc(t('tcat.' + tk.category))}</span></div>
        ${tk.related_order_number ? `<div class="kv"><span>${esc(t('f.related_order'))}</span><span>${esc(tk.related_order_number)}</span></div>` : ''}
        <div class="kv"><span>${esc(t('order.date'))}</span><span>${esc(fmt(tk.created_at))}</span></div>
        <p style="margin-top:10px;white-space:pre-wrap">${esc(tk.description)}</p>
        ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener"><img class="preview" src="${esc(url)}" alt="${esc(t('f.attachment'))}"></a>` : ''}</div>
      <h3 style="margin-top:16px">${esc(t('tickets.replies'))}</h3>
      <div class="stack">${replies.length ? replies.map((r) => `<div class="bubble ${r.sender_role === 'admin' ? 'admin' : ''}"><small>${esc(r.sender_role === 'admin' ? t('tickets.team') : (r.sender_id === S.uid ? t('tickets.you') : t('role.' + r.sender_role)))} &middot; ${esc(fmt(r.created_at))}</small>${esc(r.message).replace(/\n/g, '<br>')}</div>`).join('') : `<p class="muted">${esc(t('tickets.noReplies'))}</p>`}</div>
      <form class="card" style="margin-top:14px" data-form="reply" data-ticket="${tk.id}" novalidate>
        ${fld('message', { tag: 'textarea', rows: 3, max: 2000, label: t('tickets.writeReply') })}
        <div class="form-err" role="alert"></div>
        <div class="row end"><button class="btn primary" type="submit">${esc(t('btn.send'))}</button></div></form>
      ${admin ? `<div class="card" style="margin-top:14px"><h3>${esc(t('tickets.setStatus'))}</h3><div class="row">${['pending', 'in_progress', 'resolved'].map((s) => `<button class="btn small ${tk.ticket_status === s ? 'primary' : 'ghost'}" data-act="tstatus" data-id="${tk.id}" data-s="${s}">${esc(t('tstatus.' + s))}</button>`).join('')}</div></div>` : ''}`;
  };
  async function ticketDetail(id) { return KQ.back('#/help/tickets') + await KQ.ticketDetail(id, false); }

  KQ.forms.reply = async (f) => {
    need(f, ['message']);
    await q(sb.from('support_replies').insert({ ticket_id: f.dataset.ticket, sender_id: S.uid, message: val(f, 'message') }));
    KQ.ok('ok.replySent');
    KQ.render({ keep: true });
  };
})(window.KQ);
