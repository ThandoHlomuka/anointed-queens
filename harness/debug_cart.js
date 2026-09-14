const puppeteer = require('puppeteer-core');
(async () => {
  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 900 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  page.on('console', async (m) => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });
  await page.evaluateOnNewDocument(function () {
    try {
      localStorage.setItem('aq_demo_users', JSON.stringify([{ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', password: 'secret1', role: 'client', loyalty_points: 480, referral_code: 'AQNOMV', created_at: new Date().toISOString() }]));
      localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }));
      localStorage.removeItem('aq_cart');
    } catch (e) {}
  });
  const BASE = 'http://127.0.0.1:8899';
  await page.goto(BASE + '/configurator.html', { waitUntil: 'networkidle0' });
  const groups = ['.opt-pill[data-value="tote"]', '.opt-pill[data-value="full-grain-leather"]', '.opt-pill[data-value="cognac"]', '.opt-pill[data-value="medium"]', '.opt-pill[data-value="antique-gold"]', '.opt-pill[data-value="leather-top"]', '.opt-pill[data-value="cotton"]', '.opt-pill[data-value="initials"]'];
  for (const g of groups) {
    await page.waitForSelector('#stepBody ' + g, { timeout: 8000 });
    await page.click('#stepBody ' + g);
    await page.click('#nextBtn');
  }
  await page.waitForSelector('#addToBagFin', { timeout: 8000 });
  await page.click('#addToBagFin');
  await new Promise((r) => setTimeout(r, 2500));
  console.log('URL NOW:', page.url());
  const state = await page.evaluate(() => ({
    cart: localStorage.getItem('aq_cart'),
    auth: window.AQAuth ? window.AQAuth.currentUser() : null,
    est: (document.getElementById('estPrice') || {}).textContent
  }));
  console.log('STATE:', JSON.stringify(state, null, 1));
  await browser.close();
})();