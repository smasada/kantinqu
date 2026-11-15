/* KantinQu - halaman awal, login, pendaftaran, lupa password */
(function (KQ) {
  'use strict';
  const { t, esc, ic, fld, pwfld, val, need, q, bad, sb, S } = KQ;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const USER_RE = /^[A-Za-z0-9_.]{3,20}$/;
  const PHONE_RE = /^[0-9+\-\s]{8,16}$/;

  KQ.views.landing = async () => `
    <section class="hero">
      <div class="logo-lg">${ic('store')}</div>
      <h1>KantinQu</h1>
      <p class="tag">${esc(t('app.tagline'))}</p>
      <div class="stack">
        <a class="btn primary lg" href="#/login/buyer">${esc(t('landing.buyer'))}</a>
        <a class="btn outline lg" href="#/login/seller">${esc(t('landing.seller'))}</a>
      </div>
      <p class="muted sm" style="margin-top:20px"><a href="#/login/admin">${esc(t('landing.admin'))}</a> &middot; <a href="#/help">${esc(t('help.title'))}</a></p>
    </section>`;

  KQ.views.login = async ({ a }) => {
    const role = ['buyer', 'seller', 'admin'].includes(a) ? a : 'buyer';
    return `<div class="auth card">
      ${KQ.back('#/')}
      <h2>${esc(t('login.title.' + role))}</h2>
      <form data-form="login" data-role="${role}" novalidate>
        ${fld('identifier', { ac: 'username' })}
        ${pwfld('password')}
        <div class="form-err" role="alert"></div>
        <button class="btn primary block" type="submit">${esc(t('btn.login'))}</button>
      </form>
      <p class="center" style="margin-top:14px"><a href="#/forgot">${esc(t('login.forgot'))}</a></p>
      ${role !== 'admin' ? `<p class="center muted">${esc(t('login.noAccount'))} <a href="#/register/${role}"><b>${esc(t('btn.register'))}</b></a></p>` : ''}
    </div>`;
  };

  KQ.forms.login = async (f) => {
    const role = f.dataset.role;
    need(f, ['identifier', 'password']);
    const id = val(f, 'identifier');
    let email = id;
    if (!id.includes('@')) {
      email = await q(sb.rpc('login_email', { p_identifier: id }));
      if (!email) throw { message: 'Invalid login credentials' };
    }
    const { error } = await sb.auth.signInWithPassword({ email, password: f.elements.password.value });
    if (error) throw error;
    await KQ.loadProfile();
    if (S.profile.role !== role) { await sb.auth.signOut(); S.profile = null; S.uid = null; throw { message: 'WRONG_ROLE' }; }
    KQ.ok('ok.login');
    await KQ.afterLogin();
  };

  KQ.views.register = async ({ a }) => {
    const role = a === 'seller' ? 'seller' : 'buyer';
    const buyer = role === 'buyer';
    return `<div class="auth card">
      ${KQ.back('#/login/' + role)}
      <h2>${esc(t('register.title.' + role))}</h2>
      <form data-form="register" data-role="${role}" novalidate>
        ${fld('full_name', { ac: 'name' })}
        ${buyer ? fld('class', { ph: t('ph.class'), hint: t('reg.classHint') }) : ''}
        ${fld('phone', { type: 'tel', req: buyer ? false : true, ac: 'tel' })}
        ${buyer ? '' : `${fld('canteen_name')}${fld('canteen_label', { ph: t('ph.label') })}${fld('canteen_location', { tag: 'textarea', rows: 2, max: 200, ph: t('ph.location') })}`}
        ${fld('username', { ac: 'username' })}
        ${fld('email', { type: 'email', ac: 'email' })}
        ${pwfld('password', 'new-password')}
        ${pwfld('confirm', 'new-password')}
        ${buyer ? `<div class="notice info" style="margin-bottom:12px">${ic('shield')}<span>${esc(t('reg.verifyNote'))}</span></div>` : ''}
        <div class="form-err" role="alert"></div>
        <button class="btn primary block" type="submit">${esc(t('btn.register'))}</button>
      </form>
    </div>`;
  };

  KQ.forms.register = async (f) => {
    const role = f.dataset.role;
    const buyer = role === 'buyer';
    need(f, buyer ? ['full_name', 'class', 'username', 'email', 'password', 'confirm'] : ['full_name', 'phone', 'canteen_name', 'canteen_label', 'username', 'email', 'password', 'confirm']);
    const email = val(f, 'email'), username = val(f, 'username'), phone = val(f, 'phone');
    const pw = f.elements.password.value;
    if (!EMAIL_RE.test(email)) throw bad('err.email');
    if (!USER_RE.test(username)) throw bad('err.username');
    if (phone && !PHONE_RE.test(phone)) throw bad('err.phone');
    if (pw.length < 8) throw bad('err.pwShort');
    if (pw !== f.elements.confirm.value) throw bad('err.pwMatch');
    const av = await q(sb.rpc('check_availability', { p_username: username, p_email: email, p_canteen_name: buyer ? null : val(f, 'canteen_name'), p_canteen_label: buyer ? null : val(f, 'canteen_label') }));
    if (av.username_taken) throw bad('err.usernameTaken');
    if (av.email_taken) throw bad('err.emailTaken');
    if (av.canteen_taken) throw bad('err.canteenTaken');
    const data = { role, full_name: val(f, 'full_name'), username, phone, lang: S.lang };
    if (buyer) data.class = val(f, 'class');
    else { data.canteen_name = val(f, 'canteen_name'); data.canteen_label = val(f, 'canteen_label'); data.canteen_location = val(f, 'canteen_location'); }
    const { data: res, error } = await sb.auth.signUp({ email, password: pw, options: { data } });
    if (error) throw error;
    if (res.session) {
      await KQ.loadProfile();
      KQ.ok(buyer ? 'ok.registeredBuyer' : 'ok.registered');
      await KQ.afterLogin();
    } else {
      f.parentElement.innerHTML = `<div class="center">${ic('check')}<h2>${esc(t('reg.checkEmail.title'))}</h2><p class="muted">${esc(t('reg.checkEmail.msg'))}</p><a class="btn primary" href="#/login/${role}">${esc(t('btn.login'))}</a></div>`;
    }
  };

  KQ.views.forgot = async () => `<div class="auth card">
    ${KQ.back('#/login/buyer')}
    <h2>${esc(t('forgot.title'))}</h2>
    <form data-form="forgot" novalidate>
      ${fld('email', { type: 'email', ac: 'email' })}
      <div class="form-err" role="alert"></div>
      <button class="btn primary block" type="submit">${esc(t('btn.sendLink'))}</button>
    </form></div>`;

  KQ.forms.forgot = async (f) => {
    need(f, ['email']);
    const email = val(f, 'email');
    if (!EMAIL_RE.test(email)) throw bad('err.email');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
    f.parentElement.innerHTML = `<div class="center">${ic('check')}<h2>${esc(t('forgot.sent.title'))}</h2><p class="muted">${esc(t('forgot.sent.msg'))}</p><a class="btn outline" href="#/">${esc(t('btn.back'))}</a></div>`;
  };

  KQ.views.reset = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return `<div class="auth card">${KQ.empty('help', t('reset.invalid'), null, `<a class="btn primary" href="#/forgot">${esc(t('login.forgot'))}</a>`)}</div>`;
    return `<div class="auth card"><h2>${esc(t('reset.title'))}</h2>
      <form data-form="reset" novalidate>${pwfld('password', 'new-password')}${pwfld('confirm', 'new-password')}
      <div class="form-err" role="alert"></div><button class="btn primary block" type="submit">${esc(t('btn.save'))}</button></form></div>`;
  };
  KQ.forms.reset = async (f) => {
    need(f, ['password', 'confirm']);
    const pw = f.elements.password.value;
    if (pw.length < 8) throw bad('err.pwShort');
    if (pw !== f.elements.confirm.value) throw bad('err.pwMatch');
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) throw error;
    KQ.ok('ok.passwordChanged');
    await KQ.loadProfile();
    if (S.profile) await KQ.afterLogin(); else location.hash = '#/';
  };
})(window.KQ);
