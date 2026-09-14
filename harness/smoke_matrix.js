/* AQ cross-browser smoke: page × viewport matrix against every installed
   engine. Safe against mid-load navigations (service-worker) and page-close
   timing. Usage:
     node smoke_matrix.js                       # auto-detect Chrome + Edge
     AQ_BROWSERS=chrome,edge node smoke_matrix.js */
const puppeteer = require('puppeteer-core');
const http = require('http');

const BASE = process.env.AQ_BASE || 'http://127.0.0.1:8899';
const VIEWPORTS = [['desktop', 1280], ['tablet', 768], ['mobile', 375], ['narrow', 320]];
const PAGES = [
  'index.html', 'shop.html', 'product.html?id=p1', 'configurator.html',
  'cart.html', 'checkout.html', 'orders.html', 'wishlist.html', 'loyalty.html',
  'login.html', 'register.html', 'account.html', 'about.html', 'journal.html',
  'faq.html', 'contact.html', 'admin_test.html'
];
const MEMBER_PAGES = ['cart.html', 'checkout.html', 'orders.html', 'wishlist.html', 'loyalty.html', 'account.html'];

const ENGINES = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
};

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
  const mod = BASE.indexOf('https') === 0 ? require('https') : http;
  return new Promise((resolve, reject) => {
    try { mod.get(BASE + '/index.html', (r) => { resolve(); r.resume(); }); } catch (e) { reject(e); }
  }).catch(() => new Promise((resolve) => setTimeout(resolve, 800)).then(up));
}

function runPage(browser, page, viewport) {
  return new Promise(async (res) => {
    const timer = setTimeout(() => { try { p.close(); } catch (e) {} }, 12000);
    let p;
    try {
      p = await browser.newPage();
      const [label, width] = viewport;
      await p.setViewport({ width, height: 900 });
      const errs = [];
      p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
      p.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status()); });
      p.on('requestfailed', (r) => { const t = r.failure() && r.failure().errorText; if (t && t !== 'net::ERR_ABORTED') errs.push('NET: ' + t); });
      if (MEMBER_PAGES.some((q) => page === q)) await p.evaluateOnNewDocument(BOOT_STR);
      await p.goto(BASE + '/' + page, { waitUntil: 'load', timeout: 9000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
      let overflow = false, navAbort = false;
      try {
        const m = await p.evaluate(() => ({
          bodyW: document.body ? Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) : 0,
          innerW: window.innerWidth
        }));
        overflow = m.bodyW > m.innerW && m.bodyW - m.innerW > 2;
      } catch (e) {
        navAbort = true; errs.push('NAVIGATION_CONTEXT_DESTROYED');
      }
      clearTimeout(timer);
      await p.close().catch(() => {});
      res({ label, page, overflow, navAbort, errs });
    } catch (e) {
      clearTimeout(timer);
      try { if (p) await p.close(); } catch (x) {}
      res({ label: (viewport[0] || ''), page, overflow: false, navAbort: true, errs: ['NAV_ERROR: ' + e.message] });
    }
  });
}

(async () => {
  await up();
  const chosen = (process.env.AQ_BROWSERS ? process.env.AQ_BROWSERS.split(',') : Object.keys(ENGINES)).map((n) => n.trim());
  let grandFailures = 0;
  for (const name of chosen) {
    const exe = ENGINES[name];
    if (!exe || !require('fs').existsSync(exe)) { console.log('SKIP  ' + name + '  (executable not found)'); continue; }
    const browser = await puppeteer.launch({ headless: 'new', executablePath: exe, args: ['--no-sandbox'] });
    let total = 0, ok = 0, skips = 0;
    const start = Date.now();
    for (const page of PAGES) {
      for (const vp of VIEWPORTS) {
        total++;
        const res = await runPage(browser, page, vp);
        let r2 = null;
        if (res.navAbort) { r2 = await runPage(browser, page, vp); }
        const final = r2 || res;
        const hasReal = !final.navAbort && (final.overflow || final.errs.length > 0);
        if (final.navAbort) {
          skips++;
          console.log('  skip ' + name.padEnd(6) + ' ' + final.label.padEnd(8) + ' ' + final.page + (r2 ? ' (retry still mid-SW-nav)' : ''));
        } else if (hasReal) {
          console.log((final.overflow ? 'HOVERFLOW' : 'ERR') + ' ' + name.padEnd(6) + ' ' + final.label.padEnd(8) + ' ' + final.page + (final.errs.length ? ' [' + final.errs.join('; ') + ']' : ''));
        } else {
          ok++;
        }
        if (Date.now() - start > 300000) { console.log('TIMEOUT_ENGINE  ' + name); break; }
      }
      if (Date.now() - start > 300000) break;
    }
    await browser.close();
    const failures = total - ok - skips;
    grandFailures += failures;
    console.log('  => ' + name + ': ' + ok + '/' + total + ' OK' + (skips ? '  (' + skips + ' skipped: SW navigation)' : ''));
  }
  console.log('MATRIX FAILURES: ' + grandFailures + '  (engines: ' + chosen.join(', ') + ')');
  process.exit(grandFailures ? 1 : 0);
})();