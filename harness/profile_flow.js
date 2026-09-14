/* End-to-end commit flow: design a bag -> checkout (escrow) -> admin escrow
   ops -> client releases escrow. Expect all steps pass with zero PAGEERROR. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:8899';

const BOOT = function () {
  try {
    var first = !localStorage.getItem('aq_booted');
    if (first) localStorage.setItem('aq_booted', '1');
    localStorage.setItem('aq_demo_users', JSON.stringify([{
      id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', password: 'secret1',
      role: 'client', loyalty_points: 480, referral_code: 'AQNOMV', created_at: new Date().toISOString()
    }]));
    localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }));
    if (first) localStorage.removeItem('aq_cart');
  } catch (e) {}
};
const BOOT_STR = '(' + BOOT.toString() + ')();';
const H = 900;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox'] });
  const results = [];
  const run = async (name, fn) => {
    try { await fn(); results.push([name, 'PASS']); }
    catch (e) { results.push([name, 'FAIL: ' + (e && e.message || e)]); }
  };
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: H });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.evaluateOnNewDocument(BOOT_STR);

  await run('configurator design + add to bag', async () => {
    await page.goto(BASE + '/configurator.html', { waitUntil: 'networkidle0' });
    const pick = async (cls) => { await page.waitForSelector('#stepBody ' + cls, { timeout: 8000 }); await page.click('#stepBody ' + cls); };
    const groups = ['.opt-pill[data-value="tote"]', '.opt-pill[data-value="full-grain-leather"]', '.opt-pill[data-value="cognac"]', '.opt-pill[data-value="medium"]', '.opt-pill[data-value="antique-gold"]', '.opt-pill[data-value="leather-top"]', '.opt-pill[data-value="cotton"]', '.opt-pill[data-value="initials"]'];
    for (const g of groups) {
      await pick(g);
      await page.click('#nextBtn');
    }
    await page.waitForSelector('#addToBagFin', { timeout: 8000 });
    await page.click('#addToBagFin');
    await page.waitForFunction(() => location.pathname.endsWith('cart.html'), { timeout: 8000 });
  });

  await run('checkout with demo card (escrow held)', async () => {
    await page.waitForSelector('#toCheckout', { timeout: 8000 });
    await page.click('#toCheckout');
    await page.waitForSelector('#payBtn', { timeout: 8000 });
    const set = async (sel, val) => { await page.type(sel, val); };
    await page.type('#cName', 'Queen Nomvula');
    await page.type('#cAddr', '12 Gold Street');
    await page.type('#cCity', 'Johannesburg');
    await page.type('#cCard', '4242424242424242');
    await page.type('#cExp', '12/28');
    await page.type('#cCvc', '123');
    await page.click('#payBtn');
    await page.waitForFunction(() => location.pathname.endsWith('orders.html'), { timeout: 12000 });
    await page.waitForSelector('#ordersWrap .panel', { timeout: 8000 });
    const txt = (await page.evaluate(() => document.querySelector('#ordersWrap').innerText)).toLowerCase();
    if (!txt.includes('escrow held')) throw new Error('order not showing escrow held');
  });

  await run('admin escrow lifecycle', async () => {
    await page.goto(BASE + '/admin_test.html', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.admin-nav-item[data-sec="orders"]', { timeout: 8000 });
    await page.click('.admin-nav-item[data-sec="orders"]');
    const acts = ['confirm', 'in_production', 'shipped', 'delivered'];
    for (const a of acts) {
      await page.waitForSelector('button[data-dn="' + a + '"]', { timeout: 8000 });
      await page.click('button[data-dn="' + a + '"]');
      await new Promise((r) => setTimeout(r, 300));
    }
  });

  await run('client releases escrow', async () => {
    await page.evaluateOnNewDocument(BOOT_STR);
    await page.goto(BASE + '/orders.html', { waitUntil: 'networkidle0' });
    await page.waitForSelector('button[data-release]', { timeout: 8000 });
    await page.click('button[data-release]');
    await new Promise((r) => setTimeout(r, 600));
    const rel = (await page.evaluate(() => document.querySelector('#ordersWrap').innerText)).toLowerCase();
    if (!rel.includes('released') && !rel.includes('completed')) throw new Error('escrow did not release');
    results.push(['escrow release', 'PASS']);
  });

  if (errs.length) results.push(['PAGEERRORs', 'FAIL: ' + errs.join(' | ')]);
  else results.push(['PAGEERRORs', 'PASS: none']);

  await browser.close();
  let f = 0;
  results.forEach(([k, v]) => { const ok = v.indexOf('PASS') === 0; console.log((ok ? 'PASS' : 'FAIL').padEnd(5) + ' ' + k + '  ' + (ok ? '' : v)); if (!ok) f++; });
  console.log('FLOW FAILURES: ' + f + ' / ' + results.length);
  process.exit(f ? 1 : 0);
})();