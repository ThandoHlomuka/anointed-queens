/* AQ share widget probe: FAB renders, sheet opens, channel buttons +
   QR box appear, copy-link works, no page errors. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.AQ_BASE || 'http://127.0.0.1:8899';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 375, height: 900 });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 15000 });
  await p.waitForSelector('.share-fab', { timeout: 8000 });
  const fabHrefs = await p.evaluate(() => ({
    fab: document.querySelectorAll('.share-fab').length,
    sheets: document.querySelectorAll('[data-share]').length
  }));
  await p.click('.share-fab');
  await p.waitForSelector('#shareSheet.open', { timeout: 8000 });
  const sheet = await p.evaluate(() => ({
    channelBtns: document.querySelectorAll('.share-sheet-btn').length,
    hasCopy: !!document.getElementById('shareCopy'),
    hasQrBox: !!document.getElementById('shareQr'),
    waHref: document.querySelector('[data-share-ch="wa"]') ? document.querySelector('[data-share-ch="wa"]').href : ''
  }));
  await p.click('#shareCopy');
  await new Promise((r) => setTimeout(r, 400));
  const copiedNote = await p.evaluate(() => (document.getElementById('shareQrNote') || {}).textContent || '');
  await p.close();

  const page2 = await browser.newPage();
  await page2.goto(BASE + '/product.html?id=p1', { waitUntil: 'load', timeout: 15000 });
  await page2.waitForSelector('.share-fab', { timeout: 8000 });
  const prodFab = await page2.evaluate(() => document.querySelectorAll('.share-fab').length);
  await page2.close();

  const out = [];
  out.push(['FAB on index', fabHrefs.fab === 1 && fabHrefs.sheets === 1 ? 'PASS' : 'FAIL ' + JSON.stringify(fabHrefs)]);
  out.push(['Sheet opens', sheet.channelBtns >= 6 ? 'PASS' : 'FAIL ' + sheet.channelBtns]);
  out.push(['Channels built', /whatsapp\.com/.test(sheet.waHref) ? 'PASS' : 'FAIL ' + sheet.waHref]);
  out.push(['Copy + QR present', sheet.hasCopy && sheet.hasQrBox ? 'PASS' : 'FAIL']);
  out.push(['Copy feedback', /copied|Link copied/i.test(copiedNote) ? 'PASS' : 'NOTE: ' + copiedNote]);
  out.push(['FAB on product', prodFab === 1 ? 'PASS' : 'FAIL']);
  out.push(['Page errors', errs.length ? 'FAIL ' + errs.join('|') : 'PASS']);
  let f = 0;
  out.forEach(([k, v]) => { const ok = /^PASS/.test(v); if (!ok) f++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + k + '  ' + (!ok ? v : '')); });
  await browser.close();
  console.log('SHARE PROBE FAILURES: ' + f + ' / ' + out.length);
  process.exit(f ? 1 : 0);
})();