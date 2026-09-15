/* AQ ecommerce/inventory probe: stock display, low-stock badge, sold-out
   state, add-to-bag oversell guard, cart sold-out line, checkout pay
   validation, stock decrement on purchase, restock on refund, and admin
   quick-restock. Runs in DEMO mode against the local harness server. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.AQ_BASE || 'http://127.0.0.1:8899';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setStock(page, pid, stock) {
  await page.evaluate((a) => { const k='aq_products'; const ps=JSON.parse(localStorage.getItem(k)||'[]'); const i=ps.findIndex(x=>x.id===a.pid); if(i>=0) ps[i].stock=a.stock; localStorage.setItem(k,JSON.stringify(ps)); }, { pid, stock });
}
async function getStock(page, pid) {
  return page.evaluate((pid) => { const ps=JSON.parse(localStorage.getItem('aq_products')||'[]'); const i=ps.findIndex(x=>x.id===pid); return i>=0?Number(ps[i].stock)||0:-1; }, pid);
}
async function setCart(page, items) { await page.evaluate((items) => localStorage.setItem('aq_cart', JSON.stringify(items)), items); }
async function setClient(page) {
  await page.evaluate(() => {
    localStorage.setItem('aq_demo_users', JSON.stringify([{ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }]));
    localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', role: 'client', demo: true, loyalty_points: 480 }));
  });
}
async function setAdmin(page) {
  await page.evaluate(() => {
    localStorage.setItem('aq_demo_users', JSON.stringify([{ id: 'aq_admin', email: 'admin@anointedqueens.test', name: 'House Admin', role: 'admin', demo: true, loyalty_points: 0 }]));
    localStorage.setItem('aq_session', JSON.stringify({ id: 'aq_admin', email: 'admin@anointedqueens.test', name: 'House Admin', role: 'admin', demo: true, loyalty_points: 0 }));
  });
}
async function fillCheckout(page) {
  await page.evaluate(() => {
    document.getElementById('cName').value = 'Queen Nomvula';
    document.getElementById('cEmail').value = 'queen@test.co.za';
    document.getElementById('cAddr').value = '12 Gold Street';
    document.getElementById('cCity').value = 'Johannesburg';
    document.getElementById('cProv').value = 'Gauteng';
    document.getElementById('cPostal').value = '2001';
    document.getElementById('cCard').value = '4242424242424242';
    document.getElementById('cExp').value = '12/28';
    document.getElementById('cCvc').value = '123';
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME, args: ['--no-sandbox', '--disable-service-worker'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));

  const results = [];
  const check = (label, ok, extra) => { if (!ok) results.push(['FAIL', label + (extra ? ' :: ' + extra : '')]); else results.push(['PASS', label]); };
  const stable = async (url) => { await p.goto(BASE + url, { waitUntil: 'load', timeout: 30000 }); await sleep(250); };

  /* 1. Seed + product page stock count */
  await stable('/index.html');
  await setClient(p);
  await stable('/product.html?id=p1');
  text = await p.evaluate(() => document.body.textContent);
  check('product page shows stock count', /In stock \(12\)/.test(text), text.slice(0, 200));

  /* 2. Low-stock badge in shop */
  await stable('/index.html');
  await setStock(p, 'p1', 4);
  await stable('/shop.html');
  text = await p.evaluate(() => document.body.textContent);
  check('low-stock badge in shop', text.includes('Only 4 left'), 'missing "Only 4 left"');

  /* 3. Add-to-bag works, then blocked at stock limit */
  await stable('/index.html');
  await setCart(p, []);
  await setStock(p, 'p1', 1);
  await stable('/product.html?id=p1');
  await p.click('#addBagBtn');
  await sleep(400);
  text = await p.evaluate(() => document.body.textContent);
  check('add to bag succeeds', /added to your bag/.test(text), 'no add toast');
  await p.click('#addBagBtn');
  await sleep(400);
  text = await p.evaluate(() => document.body.textContent);
  check('oversell guarded on product page', /Only 1 available/.test(text), 'expected "Only 1 available"');
  let qty = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('aq_cart') || '[]'); return c.find((i) => i.product_id === 'p1').qty; });
  check('cart qty stays at 1', qty === 1, 'qty=' + qty);

  /* 4. Sold-out product state */
  await stable('/index.html');
  await setStock(p, 'p2', 0);
  await stable('/product.html?id=p2');
  const so = await p.evaluate(() => ({ t: document.body.textContent, b: document.getElementById('addBagBtn') ? document.getElementById('addBagBtn').disabled : true }));
  check('sold-out product page + disabled CTA', so.t.includes('Sold out') && so.b, 'btn disabled=' + so.b);

  /* 5. Cart shows sold-out line + disables qty + */
  await stable('/index.html');
  await setCart(p, [{ key: 's_t1', kind: 'shop', product_id: 'p1', qty: 1 }, { key: 's_t2', kind: 'shop', product_id: 'p2', qty: 1 }]);
  await stable('/cart.html');
  const cart = await p.evaluate(() => ({
    notice: document.body.textContent.includes('Sold out - remove this item'),
    plus: document.querySelectorAll('[data-d="1"]:disabled').length
  }));
  check('cart sold-out line notice', cart.notice);
  check('cart + disabled for full/sold-out lines', cart.plus === 2, 'disabled + count=' + cart.plus);

  /* 6. Checkout blocks oversell at payment */
  await stable('/index.html');
  await setCart(p, [{ key: 's_t1', kind: 'shop', product_id: 'p1', qty: 2 }]);
  await stable('/checkout.html');
  await fillCheckout(p);
  const ordersBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('aq_orders') || '[]').length);
  await p.click('#payBtn');
  await sleep(2500);
  const payBlocked = await p.evaluate(() => ({
    url: location.pathname,
    orders: JSON.parse(localStorage.getItem('aq_orders') || '[]').length
  }));
  check('checkout blocks oversell at payment', payBlocked.url.includes('checkout') && payBlocked.orders === ordersBefore, JSON.stringify(payBlocked));

  /* 7. Purchase decrements stock */
  await stable('/index.html');
  await setStock(p, 'p3', 5);
  await setCart(p, [{ key: 's_t3', kind: 'shop', product_id: 'p3', qty: 2 }]);
  await stable('/checkout.html');
  await fillCheckout(p);
  await p.click('#payBtn');
  try { await p.waitForFunction(() => location.pathname.includes('orders'), { timeout: 12000 }); }
  catch (e) { errs.push('purchase did not navigate to orders'); }
  await sleep(600);

  /* 8. Refund restores stock */
  await stable('/index.html');
  let p3stock = await getStock(p, 'p3');
  check('stock decremented after purchase (5 - 2 = 3)', p3stock === 3, 'got ' + p3stock);

  /* 8. Refund restores stock */
  await p.evaluate(async () => {
    const orders = JSON.parse(localStorage.getItem('aq_orders') || '[]');
    if (orders.length) await window.AQDB.updateOrder(orders[0].id, { status: 'cancelled', escrow: 'refunded' });
  });
  p3stock = await getStock(p, 'p3');
  check('stock restored after refund (3 + 2 = 5)', p3stock === 5, 'got ' + p3stock);

  /* 9. Admin quick-restock */
  await setAdmin(p);
  await stable('/admin.html');
  await p.evaluate(() => { document.querySelector('[data-sec="products"]') && document.querySelector('[data-sec="products"]').click(); });
  await p.waitForFunction(() => !!document.querySelector('[data-rs]'), { timeout: 8000 });
  await p.evaluate(() => { const b = document.querySelector('[data-rs="p3"][data-rsq="20"]'); if (b) b.click(); });
  await sleep(800);
  p3stock = await getStock(p, 'p3');
  check('admin +20 restock works (5 + 20 = 25)', p3stock === 25, 'got ' + p3stock);

  for (const [s, l] of results) console.log(s + '  ' + l);
  if (errs.length) console.log('PAGE ERRORS: ' + errs.join(' | '));
  const f = results.filter((r) => r[0] === 'FAIL').length;
  await browser.close();
  console.log('ECOM PROBE FAILURES: ' + f + ' / ' + results.length);
  process.exit(f || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });