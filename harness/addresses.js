/* ANOINTED QUEENS saved-addresses probe.
   Exercises the previously-unused `addresses` table end to end in demo mode
   through the real account.html UI (add, list, make default, delete). */
const puppeteer = require('puppeteer-core');
const http = require('http');

const BASE = 'http://127.0.0.1:8899';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function up() {
  return new Promise((resolve) => {
    http.get(BASE + '/index.html', (r) => { resolve(); r.resume(); })
      .on('error', () => new Promise((res) => setTimeout(res, 800)).then(up));
  });
}

(async () => {
  await up();
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message)));

  let pass = 0, fail = 0;
  const check = (name, ok, extra) => {
    if (ok) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (extra ? ' -> ' + JSON.stringify(extra) : '')); }
  };

  /* Seed a signed-in client + clean slate, then load the real account page. */
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('aq_demo_users', JSON.stringify([{
      id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', password: 'secret1',
      role: 'client', loyalty_points: 480, referral_code: 'AQNOMV', created_at: new Date().toISOString()
    }]));
    localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }));
    localStorage.removeItem('aq_addresses');
  });

  await page.goto(BASE + '/account.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('document.getElementById("addrWrap") && document.getElementById("ad_add")', { timeout: 30000 });

  /* ---------- empty state ---------- */
  r = await page.evaluate(() => ({    empty: /No saved addresses yet/.test(document.getElementById('addrWrap').innerHTML),
    form: !!document.getElementById('ad_add')
  }));
  check('empty state + add form rendered', r.empty && r.form, r);

  /* ---------- add via the real form ---------- */
  r = await page.evaluate(async () => {
    document.getElementById('ad_line1').value = '12 Queen Street';
    document.getElementById('ad_city').value = 'Cape Town';
    document.getElementById('ad_province').value = 'Western Cape';
    document.getElementById('ad_postal').value = '8001';
    document.getElementById('ad_default').checked = true;
    document.getElementById('ad_add').click();
    await new Promise((r2) => setTimeout(r2, 700));
    const list = await window.AQDB.addressList();
    return {
      count: list.length,
      line1: list[0] && list[0].line1,
      city: list[0] && list[0].city,
      isDefault: list[0] && list[0].is_default,
      rendered: /12 Queen Street/.test(document.getElementById('addrWrap').innerHTML)
    };
  });
  check('address added via form', r.count === 1 && r.line1 === '12 Queen Street' && r.city === 'Cape Town', r);
  check('address rendered in account UI', r.rendered, r);
  check('first address auto-default', r.isDefault === true, r);

  /* ---------- validation ---------- */
  r = await page.evaluate(async () => {
    document.getElementById('ad_line1').value = '';
    document.getElementById('ad_city').value = '';
    document.getElementById('ad_add').click();
    await new Promise((r2) => setTimeout(r2, 500));
    const list = await window.AQDB.addressList();
    return { count: list.length };
  });
  check('blank address rejected', r.count === 1, r);

  /* ---------- make default swaps the flag ---------- */
  r = await page.evaluate(async () => {
    await window.AQDB.addressSave({ label: 'Work', line1: '5 Long Street', city: 'Durban', is_default: false });
    window.ACCOUNT.renderAddresses();
    await new Promise((r2) => setTimeout(r2, 700));
    const list0 = await window.AQDB.addressList();
    const work = list0.find((a) => a.label === 'Work');
    if (!work) return { err: 'work address missing' };
    const btn = document.querySelector('[data-addr-default="' + work.id + '"]');
    if (!btn) return { err: 'no default button for Work' };
    if (btn.disabled) return { err: 'Work default button unexpectedly disabled' };
    btn.click();
    await new Promise((r2) => setTimeout(r2, 700));
    const list = await window.AQDB.addressList();
    return {
      defaults: list.filter((a) => a.is_default).length,
      workIsDefault: (list.find((a) => a.label === 'Work') || {}).is_default
    };
  });
  check('exactly one default address', r.defaults === 1, r);
  check('new address became default', r.workIsDefault === true, r);

  /* ---------- addresses are scoped to the signed-in user ---------- */
  r = await page.evaluate(async () => {
    const mine = await window.AQDB.addressList();
    const sess = JSON.parse(localStorage.getItem('aq_session'));
    sess.id = 'someone_else';
    localStorage.setItem('aq_session', JSON.stringify(sess));
    const theirs = await window.AQDB.addressList();
    localStorage.setItem('aq_session', JSON.stringify(Object.assign(sess, { id: 'aq_client' })));
    return { mine: mine.length, theirs: theirs.length };
  });
  check('other user sees no addresses', r.theirs === 0 && r.mine === 2, r);

  /* ---------- delete ---------- */
  r = await page.evaluate(async () => {
    const list = await window.AQDB.addressList();
    const target = list.find((a) => a.label === 'Work');
    const res = await window.AQDB.addressDelete(target.id);
    const after = await window.AQDB.addressList();
    return { err: res.error, count: after.length };
  });
  check('address deleted', !r.err && r.count === 1, r);

  r = await page.evaluate(async () => {
    const sess = JSON.parse(localStorage.getItem('aq_session'));
    sess.id = 'aq_client';
    localStorage.setItem('aq_session', JSON.stringify(sess));
    window.ACCOUNT.renderAddresses();
    await new Promise((r2) => setTimeout(r2, 700));
    return { gone: !/5 Long Street/.test(document.getElementById('addrWrap').innerHTML), kept: /12 Queen Street/.test(document.getElementById('addrWrap').innerHTML) };
  });
  check('deleted address removed from UI', r.gone && r.kept, r);

  /* ---------- signed out sees nothing ---------- */
  r = await page.evaluate(async () => {
    localStorage.removeItem('aq_session');
    const list = await window.AQDB.addressList();
    return { count: list.length };
  });
  check('signed-out user gets empty list', r.count === 0, r);

  check('no uncaught page errors', pageErrors.length === 0, pageErrors);

  console.log('');
  console.log('PASS ' + pass + ' / ' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
