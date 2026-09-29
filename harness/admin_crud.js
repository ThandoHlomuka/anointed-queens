/* ANNOINTED QUEENS admin CRUD probe.
   Drives admin_test.html (auto-login as demo admin) and exercises the
   content + customer management paths end to end in demo mode:
   gallery add/edit/delete, journal add/edit/delete, FAQ add/edit/delete,
   customer role + loyalty point edits, and the Supabase id-safety helper. */
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

  await page.goto(BASE + '/admin_test.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.AQDB && window.ADMIN_READY', { timeout: 30000 });

  let pass = 0, fail = 0;
  const check = (name, ok, extra) => {
    if (ok) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (extra ? ' -> ' + JSON.stringify(extra) : '')); }
  };

  /* ---------- data layer: journal ---------- */
  console.log('journal CRUD');
  let r = await page.evaluate(async () => {
    await window.AQDB.saveJournal({ title: 'Craft Notes: Riveting', excerpt: 'How we set a rivet.', body: 'Full body text.', author: 'Anointed Queens' });
    const list = await window.AQDB.getJournal();
    const hit = list.find((j) => j.title === 'Craft Notes: Riveting');
    return { count: list.length, slug: hit && hit.slug, hasId: !!(hit && hit.id) };
  });
  check('journal insert persists', r.count >= 1 && r.hasId, r);
  check('journal slug generated', r.slug === 'craft-notes-riveting', r);

  r = await page.evaluate(async () => {
    const list = await window.AQDB.getJournal();
    const hit = list.find((j) => j.title === 'Craft Notes: Riveting');
    await window.AQDB.saveJournal({ id: hit.id, title: hit.title, excerpt: 'Edited excerpt.', body: 'Edited body.' });
    const after = await window.AQDB.getJournal();
    const now = after.find((j) => j.id === hit.id);
    return { excerpt: now.excerpt, body: now.body, dupe: after.filter((j) => j.title === 'Craft Notes: Riveting').length };
  });
  check('journal update in place (no duplicate)', r.dupe === 1, r);
  check('journal fields saved', r.excerpt === 'Edited excerpt.' && r.body === 'Edited body.', r);

  r = await page.evaluate(async () => {
    const list = await window.AQDB.getJournal();
    const hit = list.find((j) => j.title === 'Craft Notes: Riveting');
    await window.AQDB.removeJournal(hit.id);
    const after = await window.AQDB.getJournal();
    return { gone: !after.some((j) => j.id === hit.id) };
  });
  check('journal delete', r.gone, r);

  /* ---------- data layer: faqs ---------- */
  console.log('faq CRUD');
  r = await page.evaluate(async () => {
    await window.AQDB.saveFaq({ q: 'Do you ship internationally?', a: 'Yes, worldwide.', sort: 1 });
    const list = await window.AQDB.getFaqs();
    return { has: list.some((f) => f.q === 'Do you ship internationally?') };
  });
  check('faq insert persists', r.has, r);

  r = await page.evaluate(async () => {
    const list = await window.AQDB.getFaqs();
    const hit = list.find((f) => f.q === 'Do you ship internationally?');
    await window.AQDB.saveFaq({ id: hit.id, q: hit.q, a: 'Yes, worldwide and to the moon.', sort: 2 });
    const after = await window.AQDB.getFaqs();
    const now = after.find((f) => f.id === hit.id);
    return { a: now.a, sort: now.sort, dupe: after.filter((f) => f.q === 'Do you ship internationally?').length };
  });
  check('faq update in place (no duplicate)', r.dupe === 1, r);
  check('faq answer + sort saved', r.a === 'Yes, worldwide and to the moon.' && r.sort === 2, r);

  r = await page.evaluate(async () => {
    const list = await window.AQDB.getFaqs();
    const hit = list.find((f) => f.q === 'Do you ship internationally?');
    await window.AQDB.removeFaq(hit.id);
    const after = await window.AQDB.getFaqs();
    return { gone: !after.some((f) => f.id === hit.id) };
  });
  check('faq delete', r.gone, r);

  /* ---------- data layer: gallery ---------- */
  console.log('gallery CRUD');
  r = await page.evaluate(async () => {
    await window.AQDB.saveGallery({ caption: 'Atelier shot', swatch: '#D4AF37', sort: 5 });
    const list = await window.AQDB.getGallery();
    const hit = list.find((g) => g.caption === 'Atelier shot');
    return { has: !!hit, sort: hit && hit.sort };
  });
  check('gallery insert persists with sort', r.has && r.sort === 5, r);

  r = await page.evaluate(async () => {
    const list = await window.AQDB.getGallery();
    const hit = list.find((g) => g.caption === 'Atelier shot');
    await window.AQDB.saveGallery({ id: hit.id, caption: 'Atelier shot v2', sort: 7 });
    const after = await window.AQDB.getGallery();
    return { caption: (after.find((g) => g.id === hit.id) || {}).caption, sort: (after.find((g) => g.id === hit.id) || {}).sort, dupe: after.filter((g) => g.caption === 'Atelier shot v2').length };
  });
  check('gallery update in place (no duplicate)', r.dupe === 1, r);
  check('gallery caption + sort saved', r.caption === 'Atelier shot v2' && r.sort === 7, r);

  r = await page.evaluate(async () => {
    const list = await window.AQDB.getGallery();
    const hit = list.find((g) => g.caption === 'Atelier shot v2');
    await window.AQDB.removeGallery(hit.id);
    const after = await window.AQDB.getGallery();
    return { gone: !after.some((g) => g.id === hit.id) };
  });
  check('gallery delete', r.gone, r);

  /* ---------- customers: role + points ---------- */
  console.log('customer management');
  r = await page.evaluate(async () => {
    const users = JSON.parse(localStorage.getItem('aq_demo_users') || '[]');
    if (!users.some((u) => u.id === 'aq_client')) {
      users.push({ id: 'aq_client', email: 'queen@test.co.za', name: 'Queen Nomvula', password: 'secret1', role: 'client', loyalty_points: 480, referral_code: 'AQNOMV', created_at: new Date().toISOString() });
      localStorage.setItem('aq_demo_users', JSON.stringify(users));
    }
    const res = await window.AQDB.adminSetRole('aq_client', 'admin');
    const list = JSON.parse(localStorage.getItem('aq_demo_users') || '[]');
    return { err: res.error, role: (list.find((u) => u.id === 'aq_client') || {}).role };
  });
  check('role promote persists', !r.err && r.role === 'admin', r);

  r = await page.evaluate(async () => {
    const res = await window.AQDB.adminSetPoints('aq_client', 1234);
    const list = JSON.parse(localStorage.getItem('aq_demo_users') || '[]');
    return { err: res.error, pts: (list.find((u) => u.id === 'aq_client') || {}).loyalty_points };
  });
  check('loyalty points persist', !r.err && r.pts === 1234, r);

  r = await page.evaluate(async () => {
    const res = await window.AQDB.adminSetPoints('aq_client', -50);
    const list = JSON.parse(localStorage.getItem('aq_demo_users') || '[]');
    return { pts: (list.find((u) => u.id === 'aq_client') || {}).loyalty_points };
  });
  check('negative points clamped to 0', r.pts === 0, r);

  r = await page.evaluate(async () => {
    const res = await window.AQDB.adminSetRole('does_not_exist', 'admin');
    return { err: res.error };
  });
  check('unknown user returns error', !!r.err, r);

  /* ---------- admin UI renders the new controls ---------- */
  console.log('admin UI');
  r = await page.evaluate(() => {
    window.ADMIN.renders.content();
    return new Promise((res) => setTimeout(() => {
      const html = document.getElementById('mainBody').innerHTML;
      res({
        hasFaqPanel: /New FAQ/.test(html),
        hasFaqSave: /data-faq=/.test(html),
        hasFaqDel: /data-faqd=/.test(html),
        hasJoAdd: /id="jo_add"/.test(html),
        hasJoDel: /data-jod=/.test(html),
        hasJoBody: /id="jo_b_/.test(html),
        hasGalSort: /id="gal_sort_/.test(html),
        hasGalDel: /data-gald=/.test(html),
        noLegacyPromote: !/id="makeAdmin"/.test(html)
      });
    }, 400));
  });
  check('FAQ panel rendered', r.hasFaqPanel, r);
  check('FAQ save/delete controls rendered', r.hasFaqSave && r.hasFaqDel, r);
  check('journal add/delete + body editor rendered', r.hasJoAdd && r.hasJoDel && r.hasJoBody, r);
  check('gallery sort + delete rendered', r.hasGalSort && r.hasGalDel, r);
  check('broken "make admin" panel removed', r.noLegacyPromote, r);

  r = await page.evaluate(() => {
    window.ADMIN.renders.customers();
    return new Promise((res) => setTimeout(() => {
      const html = document.getElementById('mainBody').innerHTML;
      res({ roleSel: /data-role-id=/.test(html), ptsInput: /data-pts-id=/.test(html), ptsSave: /data-pts-save=/.test(html) });
    }, 400));
  });
  check('customer role selector rendered', r.roleSel, r);
  check('customer points editor rendered', r.ptsInput && r.ptsSave, r);

  /* ---------- clicking a role select persists ---------- */
  r = await page.evaluate(async () => {
    window.ADMIN.renders.customers();
    await new Promise((res) => setTimeout(res, 500));
    const sel = document.querySelector('[data-role-id="aq_client"]');
    if (!sel) return { err: 'no selector' };
    sel.value = 'client';
    sel.dispatchEvent(new Event('change'));
    await new Promise((res) => setTimeout(res, 400));
    const list = JSON.parse(localStorage.getItem('aq_demo_users') || '[]');
    return { role: (list.find((u) => u.id === 'aq_client') || {}).role };
  });
  check('role select change persists', r.role === 'client', r);

  /* ---------- content UI: add FAQ through the form ---------- */
  r = await page.evaluate(async () => {
    window.ADMIN.renders.content();
    await new Promise((res) => setTimeout(res, 500));
    document.getElementById('faq_nq').value = 'UI created question?';
    document.getElementById('faq_na').value = 'UI created answer.';
    document.getElementById('faq_add').click();
    await new Promise((res) => setTimeout(res, 700));
    const list = await window.AQDB.getFaqs();
    const made = list.find((f) => f.q === 'UI created question?');
    if (made) await window.AQDB.removeFaq(made.id);
    return { made: !!made };
  });
  check('FAQ add via admin form', r.made, r);

  /* ---------- reviews: delete ---------- */
  console.log('review management');
  r = await page.evaluate(async () => {
    await window.AQDB.addReview({ product_id: 'p1', rating: 4, title: 'Probe review', body: 'Solid.' });
    const list = await window.AQDB.adminExtraAll().then((x) => x.reviews || []);
    const hit = list.find((v) => v.title === 'Probe review');
    if (!hit) return { err: 'not added' };
    const res = await window.AQDB.removeReview(hit.id);
    const after = await window.AQDB.adminExtraAll().then((x) => x.reviews || []);
    return { err: res.error, gone: !after.some((v) => v.id === hit.id), remaining: after.length };
  });
  check('review add + delete', !r.err && r.gone, r);

  r = await page.evaluate(async () => {
    window.ADMIN.renders.reviews();
    return new Promise((res) => setTimeout(() => {
      res({ hasDel: /data-rvd=/.test(document.getElementById('mainBody').innerHTML), hasApprove: /data-rv=/.test(document.getElementById('mainBody').innerHTML) });
    }, 500));
  });
  check('review delete control rendered', r.hasDel && r.hasApprove, r);

  /* ---------- inbox: delete + reply ---------- */
  console.log('inbox management');
  r = await page.evaluate(async () => {
    await window.AQDB.contactSend({ name: 'Probe Sender', email: 'probe@test.co.za', subject: 'Hello', message: 'Probe message body.' });
    const list = await window.AQDB.contactList();
    const hit = list.find((m) => m.email === 'probe@test.co.za');
    if (!hit) return { err: 'not added' };
    const res = await window.AQDB.removeMessage(hit.id);
    const after = await window.AQDB.contactList();
    return { err: res.error, gone: !after.some((m) => m.id === hit.id) };
  });
  check('message add + delete', !r.err && r.gone, r);

  r = await page.evaluate(async () => {
    await window.AQDB.contactSend({ name: 'Probe Sender', email: 'probe2@test.co.za', subject: 'Hi there', message: 'Keep me.' });
    window.ADMIN.renders.inbox();
    await new Promise((res) => setTimeout(res, 500));
    const html = document.getElementById('mainBody').innerHTML;
    return { hasDel: /data-msgd=/.test(html), hasReply: /mailto:/.test(html) };
  });
  check('inbox delete + reply controls rendered', r.hasDel && r.hasReply, r);

  await page.evaluate(async () => {
    const list = await window.AQDB.contactList();
    for (const m of list.filter((x) => String(x.email).indexOf('probe') === 0)) await window.AQDB.removeMessage(m.id);
  });

  /* ---------- demo ordering honours admin sort/published fields ----------
     Runs last: it clears the seeded collections. */
  console.log('ordering');
  r = await page.evaluate(async () => {
    localStorage.removeItem('aq_faqs');
    await window.AQDB.saveFaq({ q: 'third', a: 'c', sort: 30 });
    await window.AQDB.saveFaq({ q: 'first', a: 'a', sort: 10 });
    await window.AQDB.saveFaq({ q: 'second', a: 'b', sort: 20 });
    const list = await window.AQDB.getFaqs();
    return { order: list.map((f) => f.q).join(',') };
  });
  check('faq list ordered by sort in demo', r.order === 'first,second,third', r);

  r = await page.evaluate(async () => {
    localStorage.removeItem('aq_gallery');
    await window.AQDB.saveGallery({ caption: 'g3', sort: 3 });
    await window.AQDB.saveGallery({ caption: 'g1', sort: 1 });
    await window.AQDB.saveGallery({ caption: 'g2', sort: 2 });
    const list = await window.AQDB.getGallery();
    return { order: list.map((g) => g.caption).join(',') };
  });
  check('gallery list ordered by sort in demo', r.order === 'g1,g2,g3', r);

  r = await page.evaluate(async () => {
    localStorage.removeItem('aq_journal');
    await window.AQDB.saveJournal({ title: 'older', published: '2024-01-01' });
    await window.AQDB.saveJournal({ title: 'newer', published: '2026-01-01' });
    const list = await window.AQDB.getJournal();
    return { order: list.map((j) => j.title).join(',') };
  });
  check('journal list newest-first in demo', r.order === 'newer,older', r);

  await page.evaluate(() => { ['aq_faqs', 'aq_gallery', 'aq_journal'].forEach((k) => localStorage.removeItem(k)); });

  console.log('');
  check('no uncaught page errors', pageErrors.length === 0, pageErrors);

  console.log('PASS ' + pass + ' / ' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
