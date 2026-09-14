/* ANNOINTED QUEENS smoke: open every page, scan body horizontal overflow at
   1280 / 375 / 320. Expect every page OK. Also logs pageerror/warn summary. */
const puppeteer = require('puppeteer-core');
const http = require('http');

const BASE = 'http://127.0.0.1:8899';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VIEWPORTS = [['desktop', 1280], ['mobile', 375], ['narrow', 320]];

const PAGES = [
  'index.html', 'shop.html', 'product.html?id=p1', 'configurator.html',
  'cart.html', 'checkout.html', 'orders.html', 'wishlist.html', 'loyalty.html',
  'login.html', 'register.html', 'account.html', 'about.html', 'journal.html',
  'faq.html', 'contact.html', 'admin_test.html'
];
const MEMBER_PAGES = ['cart.html', 'checkout.html', 'orders.html', 'wishlist.html', 'loyalty.html', 'account.html'];

/* Demo-mode bootstrap injected before page scripts run. */
const BOOT = function () {
  try {
    if (!JSON.parse(localStorage.getItem('aq_demo_users') || '[]').length) {
      localStorage.setItem('aq_demo_users', JSON.stringify([{
        id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', password: 'secret1',
        role: 'client', loyalty_points: 480, referral_code: 'AQNOMV', created_at: new Date().toISOString()
      }]));
    }
    localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }));
    localStorage.setItem('aq_cart', JSON.stringify([{ key: 's_smoke1', kind: 'shop', product_id: 'p1', qty: 1 }]));
  } catch (e) {}
};
const BOOT_STR = '(' + BOOT.toString() + ')();';

function up() {
  return new Promise((resolve, reject) => {
    try {
      http.get(BASE + '/index.html', (r) => { resolve(); r.resume(); });
    } catch (e) { reject(e); }
  }).catch(() => new Promise((resolve) => setTimeout(resolve, 800)).then(up));
}

(async () => {
  await up();
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox'] });
  let total = 0, failures = 0, errors = [];
  try {
    for (const page of PAGES) {
      for (const [label, width] of VIEWPORTS) {
        const p = await browser.newPage();
        await p.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        const errs = [];
        p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
        p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
        if (MEMBER_PAGES.some((q) => page === q)) {
          await p.evaluateOnNewDocument(BOOT_STR);
        }
        await p.goto(BASE + '/' + page, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 350));
        const m = await p.evaluate(() => ({
          bodyW: document.body ? Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) : 0,
          innerW: window.innerWidth,
          clientW: document.documentElement.clientWidth
        }));
        total++;
        const wrapped = m.bodyW > m.innerW && m.bodyW - m.innerW > 2;
        const hasErr = errs.length > 0;
        if (wrapped || hasErr) { failures++; }
        if (wrapped || hasErr) {
          console.log((wrapped ? 'HOVERFLOW' : 'ERR') + '  ' + label.padEnd(8) + ' ' + page + ' scrollW=' + m.bodyW + ' innerW=' + m.innerW + (hasErr ? ' [' + errs.join('; ') + ']' : ''));
        } else {
          console.log(label.padEnd(8) + '  ' + page + '    OK {} scrollW=' + m.bodyW);
        }
        if (hasErr) errors.push({ page, label, errs });
        await p.close();
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  console.log('FAILURES: ' + failures + ' / ' + total);
  if (errors.length) {
    console.log('ERROR DETAILS:');
    errors.forEach((e) => console.log('  ' + e.label + ' ' + e.page + ' -> ' + e.errs.join(' | ')));
  }
  process.exit(failures ? 1 : 0);
})();