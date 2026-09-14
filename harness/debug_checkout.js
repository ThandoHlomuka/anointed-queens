const puppeteer = require('puppeteer-core');
(async () => {
  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 900 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  const BOOT = function () {
    try {
      var first = !localStorage.getItem('aq_booted');
      if (first) localStorage.setItem('aq_booted', '1');
      localStorage.setItem('aq_demo_users', JSON.stringify([{ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', password: 'secret1', role: 'client', loyalty_points: 480, referral_code: 'AQNOMV', created_at: new Date().toISOString() }]));
      localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }));
      if (first) localStorage.removeItem('aq_cart');
    } catch (e) {}
  };
  await page.evaluateOnNewDocument(BOOT);

  const BASE = 'http://127.0.0.1:8899';
  await page.goto(BASE + '/configurator.html', { waitUntil: 'networkidle0' });
  const groups = ['.opt-pill[data-value="tote"]', '.opt-pill[data-value="full-grain-leather"]', '.opt-pill[data-value="cognac"]', '.opt-pill[data-value="medium"]', '.opt-pill[data-value="antique-gold"]', '.opt-pill[data-value="leather-top"]', '.opt-pill[data-value="cotton"]', '.opt-pill[data-value="initials"]'];
  for (const g of groups) { await page.waitForSelector('#stepBody ' + g, { timeout: 8000 }); await page.click('#stepBody ' + g); await page.click('#nextBtn'); }
  await page.waitForSelector('#addToBagFin', { timeout: 8000 });
  await page.click('#addToBagFin');
  await page.waitForSelector('#toCheckout', { timeout: 8000 });
  await page.click('#toCheckout');
  await page.waitForSelector('#payBtn', { timeout: 8000 });
  await page.type('#cName', 'Queen Nomvula');
  await page.type('#cAddr', '12 Gold Street');
  await page.type('#cCity', 'Johannesburg');
  await page.type('#cCard', '4242424242424242');
  await page.type('#cExp', '12/28');
  await page.type('#cCvc', '123');
  await page.click('#payBtn');
  await page.waitForFunction(() => location.href.includes('orders'), { timeout: 12000 });
  await new Promise((r) => setTimeout(r, 1500));
  const dump = await page.evaluate(() => ({
    url: location.href,
    wrap: document.getElementById('ordersWrap').innerText,
    orders: JSON.parse(localStorage.getItem('aq_orders') || '[]').map((o) => ({ number: o.number, escrow: o.escrow, status: o.status, user_id: o.user_id }))
  }));
  console.log('URL:', dump.url);
  console.log('WRAP TEXT:', JSON.stringify(dump.wrap));
  console.log('ORDERS:', JSON.stringify(dump.orders));
  await browser.close();
})();