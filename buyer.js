/* KantinQu - fitur pembeli: kantin, beranda, detail menu, keranjang, checkout */
(function (KQ) {
  'use strict';
  const { t, esc, ic, q, sb, S, money } = KQ;

  KQ.verifyBanner = () => {
    const p = S.profile;
    if (!p || p.role !== 'buyer' || p.verification_status === 'verified') return '';
    const cls = p.verification_status === 'rejected' ? 'bad' : '';
    return `<div class="notice ${cls}" style="margin-bottom:14px">${ic('shield')}<div><b>${esc(t('vstatus.' + p.verification_status))}</b><br>${esc(t('verify.banner.' + p.verification_status))}</div></div>`;
  };

  /* ----- Pilih kantin ----- */
  KQ.views.canteens = async () => {
    const list = await q(sb.from('canteens').select('*').order('canteen_label'));
    return `<p class="muted" style="margin:0">${esc(t('hello', { name: S.profile.full_name }))}</p>
      <h2>${esc(t('canteens.title'))}</h2>
      ${KQ.verifyBanner()}
      ${list.length ? `<div class="grid cols1">${list.map((c) => `
        <article class="card menu-card">
          ${KQ.imgTag(c.image_url ? KQ.publicUrl(c.image_url) : '')}
          <div class="mc-body">
            <div class="meta"><h4>${esc(c.canteen_name)}</h4><span class="badge ready">${esc(c.canteen_label)}</span></div>
            ${c.canteen_location ? `<span class="muted sm">${esc(c.canteen_location)}</span>` : ''}
            <button class="btn primary" data-act="pickcanteen" data-id="${c.id}">${esc(t('btn.viewMenu'))}</button>
          </div></article>`).join('')}</div>`
        : KQ.empty('store', t('canteens.empty'))}`;
  };

  KQ.acts.pickcanteen = async (el) => {
    const id = el.dataset.id;
    if (S.cartCount > 0 && S.cartCanteen && S.cartCanteen !== id) {
      const c = await KQ.confirmBox({ title: t('canteen.switch.title'), msg: t('canteen.switch.msg'), ok: t('btn.clearCart'), danger: true });
      if (!c) return;
      await q(sb.rpc('cart_clear'));
      S.cartCount = 0; S.cartCanteen = null; KQ.updateBadge();
    }
    KQ.setCanteen(id);
    location.hash = '#/home';
  };

  /* ----- Beranda ----- */
  const CATS = ['all', 'food', 'drink', 'snack'];
  function menuCard(m) {
    const out = m.stock <= 0;
    return `<article class="card menu-card ${out ? 'is-out' : ''}">
      ${KQ.imgTag(m.image ? KQ.publicUrl(m.image) : '', '', out ? `<span class="ribbon">${esc(t('menu.out'))}</span>` : '')}
      <div class="mc-body"><h4>${esc(m.menu_name)}</h4><div class="price">${money(m.price)}</div>
        <div class="meta"><span class="badge ${out ? 'gray' : 'green'}">${esc(out ? t('menu.out') : t('menu.available'))}</span><span class="muted sm">${esc(t('menu.stock'))}: ${m.stock}</span></div>
        <a class="btn small outline" href="#/menu/${m.id}">${esc(t('btn.detail'))}</a></div></article>`;
  }
  KQ.menuCard = menuCard;
  function gridHtml() {
    const V = KQ.V; const qs = KQ.norm(V.query);
    const arr = V.menus.filter((m) => (V.cat === 'all' || m.category === V.cat) && (!qs || KQ.norm(m.menu_name).includes(qs)));
    return arr.length ? arr.map(menuCard).join('') : `<div style="grid-column:1/-1">${KQ.empty('search', t('menu.empty.title'), t('menu.empty.sub'))}</div>`;
  }

  KQ.views.home = async () => {
    const [c, menus] = await Promise.all([
      q(sb.from('canteens').select('*').eq('id', S.canteenId).maybeSingle()),
      q(sb.from('menus').select('*').eq('canteen_id', S.canteenId).order('menu_name'))
    ]);
    if (!c) { KQ.setCanteen(null); location.hash = '#/canteens'; return ''; }
    KQ.V.menus = menus; KQ.V.cat = 'all'; KQ.V.query = '';
    return `<div class="row between"><div><p class="muted" style="margin:0">${esc(t('hello', { name: S.profile.full_name }))}</p>
        <h2 style="margin:0">${esc(c.canteen_name)} <span class="badge ready">${esc(c.canteen_label)}</span></h2></div>
        <a class="btn small outline" href="#/canteens">${esc(t('btn.changeCanteen'))}</a></div>
      ${KQ.verifyBanner()}
      <div class="search" style="margin-top:14px">${ic('search')}<input type="search" data-input="search" placeholder="${esc(t('home.search'))}" aria-label="${esc(t('home.search'))}"></div>
      <div class="banner">${ic('store')}<div><h3>${esc(t('home.banner.title'))}</h3><p>${esc(t('home.banner.sub'))}</p></div></div>
      <div class="chips" id="chips">${CATS.map((c2) => `<button class="chip ${c2 === 'all' ? 'on' : ''}" data-act="cat" data-v="${c2}">${esc(t('cat.' + c2))}</button>`).join('')}</div>
      <div class="sec-h"><h3>${esc(t('home.menus'))}</h3><button class="btn small ghost" data-act="seeall">${esc(t('btn.seeAll'))}</button></div>
      <div class="grid" id="grid">${gridHtml()}</div>`;
  };
  KQ.hooks.home = () => {
    KQ.subscribe('rt-menus', 'menus', '*', `canteen_id=eq.${S.canteenId}`, async () => {
      if (KQ.nameOf() !== 'home') return;
      try { KQ.V.menus = await q(sb.from('menus').select('*').eq('canteen_id', S.canteenId).order('menu_name')); const g = KQ.$('#grid'); if (g) g.innerHTML = gridHtml(); } catch (e) { /* abaikan */ }
    });
  };
  KQ.inputs.search = (el) => { KQ.V.query = el.value; const g = KQ.$('#grid'); if (g) g.innerHTML = gridHtml(); };
  KQ.acts.cat = (el) => {
    KQ.V.cat = el.dataset.v;
    KQ.$$('#chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === KQ.V.cat));
    KQ.$('#grid').innerHTML = gridHtml();
  };
  KQ.acts.seeall = () => {
    KQ.V.cat = 'all'; KQ.V.query = '';
    const s = KQ.$('[data-input="search"]'); if (s) s.value = '';
    KQ.$$('#chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === 'all'));
    KQ.$('#grid').innerHTML = gridHtml();
  };

  /* ----- Detail menu ----- */
  KQ.views.menu = async ({ a }) => {
    const m = await q(sb.from('menus').select('*, canteens(canteen_name,canteen_label)').eq('id', a).maybeSingle());
    if (!m) return KQ.back('#/home') + KQ.empty('box', t('menu.notFound'));
    KQ.V.menu = m; KQ.V.qty = m.stock > 0 ? 1 : 0;
    const out = m.stock <= 0;
    return `${KQ.back('#/home')}
      <div class="card" style="padding:0;overflow:hidden">
        ${KQ.imgTag(m.image ? KQ.publicUrl(m.image) : '')}
        <div style="padding:16px">
          <div class="meta"><h2 style="margin:0">${esc(m.menu_name)}</h2><span class="badge ${out ? 'gray' : 'green'}">${esc(out ? t('menu.out') : t('menu.available'))}</span></div>
          <div class="price" style="font-size:1.4rem;margin:6px 0">${money(m.price)}</div>
          ${m.description ? `<p>${esc(m.description)}</p>` : ''}
          <p class="muted sm">${esc(t('menu.stock'))}: <b>${m.stock}</b> &middot; ${esc(m.canteens.canteen_name)} (${esc(m.canteens.canteen_label)})</p>
          <div class="row between" style="margin-top:12px">
            <div class="qty"><button data-act="dqty" data-d="-1" aria-label="${esc(t('btn.minus'))}" ${out ? 'disabled' : ''}>${ic('minus')}</button><input id="qty" class="qty-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" value="${KQ.V.qty}" data-change="qtyset" onfocus="this.select()" aria-label="${esc(t('f.qty'))}" ${out ? 'disabled' : ''}><button data-act="dqty" data-d="1" aria-label="${esc(t('btn.plus'))}" ${out ? 'disabled' : ''}>${ic('plus')}</button></div>
            <button class="btn primary" data-act="addcart" ${out ? 'disabled' : ''}>${ic('cart')} ${esc(t('btn.addToCart'))}</button>
          </div>
        </div></div>`;
  };
  KQ.acts.dqty = (el) => {
    const V = KQ.V; const n = V.qty + Number(el.dataset.d);
    if (n < 1) return;
    if (n > V.menu.stock) return KQ.toast(t('err.EXCEEDS_STOCK'), 'err');
    V.qty = n; KQ.$('#qty').value = n;
  };
  /* Jumlah diketik manual: hanya angka bulat 1..stok. */
  KQ.parseQty = (raw, stock) => {
    const n = parseInt(String(raw).replace(/\D/g, ''), 10);
    if (!n || n < 1) return { n: null };
    if (n > stock) return { n: stock, over: true };
    return { n };
  };
  KQ.inputs.qtyset = (el) => {
    const V = KQ.V; const r = KQ.parseQty(el.value, V.menu.stock);
    if (r.n === null) { el.value = V.qty; return; }
    if (r.over) KQ.toast(t('err.EXCEEDS_STOCK'), 'err');
    V.qty = r.n; el.value = r.n;
  };
  KQ.acts.addcart = async (el) => {
    const qi = KQ.$('#qty'); if (qi) KQ.inputs.qtyset(qi);
    await KQ.busy(el, async () => {
      await q(sb.rpc('cart_set', { p_menu: KQ.V.menu.id, p_qty: KQ.V.qty, p_add: true }));
      await KQ.refreshCart();
      KQ.ok('ok.addedToCart');
    });
  };

  /* ----- Keranjang ----- */
  async function loadCart() {
    return q(sb.from('cart_items').select('id,quantity,menu_id,canteen_id,menus(menu_name,image,price,stock)').order('created_at'));
  }
  const cartTotal = (items) => items.reduce((a, i) => a + i.quantity * i.menus.price, 0);
  const cartProblem = (items) => items.some((i) => i.menus.stock <= 0 || i.quantity > i.menus.stock);

  KQ.views.cart = async () => {
    const items = await loadCart();
    S.cartCount = items.reduce((a, i) => a + i.quantity, 0); KQ.updateBadge();
    if (!items.length) return `<h2>${esc(t('nav.cart'))}</h2>${KQ.empty('cart', t('cart.empty'), t('cart.empty.sub'), `<a class="btn primary" href="${S.canteenId ? '#/home' : '#/canteens'}">${esc(t('btn.viewMenu'))}</a>`)}`;
    const prob = cartProblem(items);
    return `<h2>${esc(t('nav.cart'))}</h2>
      ${KQ.verifyBanner()}
      ${prob ? `<div class="notice bad" style="margin-bottom:12px">${esc(t('cart.stockProblem'))}</div>` : ''}
      <div class="stack">${items.map((i) => {
        const m = i.menus; const low = m.stock <= 0 || i.quantity > m.stock;
        return `<div class="card item">${KQ.imgTag(m.image ? KQ.publicUrl(m.image) : '')}
          <div class="info"><b>${esc(m.menu_name)}</b><span class="muted sm">${money(m.price)}</span>
            ${low ? `<div><span class="badge red">${esc(m.stock <= 0 ? t('menu.out') : t('cart.stockLeft', { n: m.stock }))}</span></div>` : ''}
            <div class="row" style="margin-top:6px"><div class="qty">
              <button data-act="cqty" data-id="${i.menu_id}" data-q="${i.quantity}" data-stock="${m.stock}" data-d="-1" ${i.quantity <= 1 ? 'disabled' : ''} aria-label="${esc(t('btn.minus'))}">${ic('minus')}</button><input class="qty-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" value="${i.quantity}" data-change="cqtyset" data-id="${i.menu_id}" data-q="${i.quantity}" data-stock="${m.stock}" onfocus="this.select()" aria-label="${esc(t('f.qty'))}" ${m.stock <= 0 ? 'disabled' : ''}>
              <button data-act="cqty" data-id="${i.menu_id}" data-q="${i.quantity}" data-stock="${m.stock}" data-d="1" ${i.quantity >= m.stock ? 'disabled' : ''} aria-label="${esc(t('btn.plus'))}">${ic('plus')}</button></div>
              <b>${money(i.quantity * m.price)}</b></div></div>
          <button class="iconbtn" data-act="cdel" data-id="${i.menu_id}" aria-label="${esc(t('btn.delete'))}">${ic('trash')}</button></div>`;
      }).join('')}</div>
      <div class="card" style="margin-top:12px"><div class="total-bar" style="border:0;margin:0;padding:0"><span>${esc(t('total'))}</span><span>${money(cartTotal(items))}</span></div>
        <a class="btn primary lg" style="margin-top:12px" href="#/checkout">${esc(t('btn.checkout'))}</a></div>`;
  };
  KQ.acts.cqty = async (el) => {
    const n = Number(el.dataset.q) + Number(el.dataset.d), st = Number(el.dataset.stock);
    if (n < 1) return;
    if (n > st) return KQ.toast(t('err.EXCEEDS_STOCK'), 'err');
    await q(sb.rpc('cart_set', { p_menu: el.dataset.id, p_qty: n, p_add: false }));
    await KQ.refreshCart(); KQ.render({ keep: true });
  };
  KQ.inputs.cqtyset = async (el) => {
    const stock = Number(el.dataset.stock), cur = Number(el.dataset.q);
    const r = KQ.parseQty(el.value, stock);
    if (r.n === null) { el.value = cur; return; }
    if (r.over) KQ.toast(t('err.EXCEEDS_STOCK'), 'err');
    if (r.n === cur) { el.value = cur; return; }
    try {
      await q(sb.rpc('cart_set', { p_menu: el.dataset.id, p_qty: r.n, p_add: false }));
      await KQ.refreshCart(); KQ.render({ keep: true });
    } catch (e) { el.value = cur; KQ.fail(e); }
  };
  KQ.acts.cdel = async (el) => {
    await q(sb.rpc('cart_set', { p_menu: el.dataset.id, p_qty: 0, p_add: false }));
    await KQ.refreshCart(); KQ.render({ keep: true });
  };

  /* ----- Checkout ----- */
  KQ.views.checkout = async () => {
    const items = await loadCart();
    if (!items.length) { location.hash = '#/cart'; return ''; }
    const p = S.profile;
    const c = await q(sb.from('canteens').select('canteen_name,canteen_label').eq('id', items[0].canteen_id).maybeSingle());
    const verified = p.verification_status === 'verified';
    const prob = cartProblem(items);
    KQ.V.total = cartTotal(items);
    return `${KQ.back('#/cart')}<h2>${esc(t('btn.checkout'))}</h2>
      ${!verified ? `<div class="notice bad" style="margin-bottom:12px">${ic('shield')}<div><b>${esc(t('checkout.notVerified'))}</b><br>${esc(t('verify.banner.' + p.verification_status))}</div></div>` : ''}
      ${prob ? `<div class="notice bad" style="margin-bottom:12px">${esc(t('cart.stockProblem'))}</div>` : ''}
      <div class="card"><h3>${esc(t('checkout.buyer'))}</h3>
        <div class="kv"><span>${esc(t('f.full_name'))}</span><span>${esc(p.full_name)}</span></div>
        <div class="kv"><span>${esc(t('f.class'))}</span><span>${esc(p.class || '-')}</span></div>
        ${p.phone_number ? `<div class="kv"><span>${esc(t('f.phone'))}</span><span>${esc(p.phone_number)}</span></div>` : ''}
        <p class="hint" style="margin:8px 0 0">${esc(t('checkout.identityNote'))}</p></div>
      <div class="card" style="margin-top:12px"><h3>${esc(t('checkout.order'))}</h3>
        <div class="kv"><span>${esc(t('canteen'))}</span><span>${esc(c.canteen_name)} (${esc(c.canteen_label)})</span></div>
        ${items.map((i) => `<div class="item" style="padding:8px 0">${KQ.imgTag(i.menus.image ? KQ.publicUrl(i.menus.image) : '')}<div class="info"><b>${esc(i.menus.menu_name)}</b><span class="muted sm">${i.quantity} &times; ${money(i.menus.price)}</span></div><b>${money(i.quantity * i.menus.price)}</b></div>`).join('')}
        <div class="total-bar"><span>${esc(t('total'))}</span><span>${money(KQ.V.total)}</span></div>
        <div class="kv" style="margin-top:8px"><span>${esc(t('payment'))}</span><span>${esc(t('payment.cash'))}</span></div></div>
      <button class="btn primary lg" style="margin-top:14px" data-act="placeorder" ${!verified || prob ? 'disabled' : ''}>${esc(t('btn.orderNow'))}</button>`;
  };
  KQ.acts.placeorder = async (el) => {
    const c = await KQ.confirmBox({ title: t('checkout.confirm.title'), msg: t('checkout.confirm.msg', { total: money(KQ.V.total) }), ok: t('btn.orderNow') });
    if (!c) return;
    await KQ.busy(el, async () => {
      try {
        const id = await q(sb.rpc('place_order'));
        await KQ.refreshCart();
        KQ.ok('ok.orderCreated');
        location.hash = '#/order/' + id;
      } catch (e) {
        if (/OUT_OF_STOCK|EXCEEDS_STOCK|CART_EMPTY/.test(e.message || '')) { KQ.toast(t('err.orderFailed') + ' ' + KQ.errMsg(e), 'err'); await KQ.refreshCart().catch(() => {}); location.hash = '#/cart'; return; }
        throw e;
      }
    });
  };
})(window.KQ);
