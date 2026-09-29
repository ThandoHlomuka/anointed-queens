/* ============================================================
   ANNOINTED QUEENS - Design Your Own configurator (flagship)
   Live price, live bag preview, add to bag or save for quote.
   ============================================================ */
window.CONFIG = (function () {
  var DB = window.AQDB, AQ = window.AQ;
  var STEPS = [
    ['style', 'Style'], ['fabric', 'Material'], ['colour', 'Colour'], ['size', 'Size'],
    ['hardware', 'Hardware'], ['handle', 'Handle'], ['lining', 'Lining'], ['personalisation', 'Personalise']
  ];
  var sel = {};      // group -> option
  var BASE = 1890;   // bespoke base price (R)
  var cur = 0;

  /* Real photos (Pexels, free license) bundled locally in assets/designer */
  var IMG = {
    style: { tote: 'assets/designer/tote-c1.jpg', satchel: 'assets/designer/satchel-v1.jpg', crossbody: 'assets/designer/crossbody-c1.jpg', clutch: 'assets/designer/clutch-c2.jpg', 'mini-bag': 'assets/designer/mini-c1.jpg', weekender: 'assets/designer/weekender-c1.jpg' },
    fabric: { 'full-grain-leather': 'assets/designer/leather-c2.jpg', 'pebble-leather': 'assets/designer/leather-c1.jpg', suede: 'assets/designer/suede-c1.jpg', 'vegan-pebble': 'assets/designer/leather-c1.jpg', boucle: 'assets/designer/boucle-c1.jpg' },
    handle: { 'leather-top': 'assets/designer/strap-c1.jpg', chain: 'assets/designer/chain-c1.jpg', wooden: 'assets/designer/wooden-c1.jpg', 'long-strap': 'assets/designer/longstrap-c1.jpg', crossover: 'assets/designer/crossover-c1.jpg' },
    hardware: { 'antique-gold': 'assets/designer/harness-c1.jpg', 'polished-gold': 'assets/designer/harness-c1.jpg', silver: 'assets/designer/harness-c1.jpg', gunmetal: 'assets/designer/harness-c1.jpg', 'black-matte': 'assets/designer/harness-c1.jpg' },
    lining: { cotton: 'assets/designer/cotton-c1.jpg', monogrammed: 'assets/designer/cotton-c1.jpg', 'suede-lining': 'assets/designer/suede-c1.jpg' }
  };

  function pickHTML(group, opts) {
    return opts.map(function (o) {
      var img = (IMG[group] || {})[o.value];
      var sw = o.swatch ? '<span class="swatch" style="background:' + o.swatch + '"></span>' : '';
      var th = img ? '<span class="opt-img" style="background-image:url(' + img + ')"></span>' : '';
      var delta = o.price_delta ? '<span class="muted" style="font-size:.76rem">' + (o.price_delta > 0 ? '+' + window.fmtMoney(o.price_delta) : '-' + window.fmtMoney(-o.price_delta)) + '</span>' : '';
      var active = sel[group] === o.value;
      return '<button type="button" class="opt-pill' + (active ? ' active' : '') + '" data-value="' + o.value + '">' + (th || sw) + window.esc(o.label) + delta + '</button>';
    }).join('');
  }

  function partHTML(img, role, label) {
    return '<div class="part-chip"><div class="part-chip-img" style="background-image:url(' + img + ')" role="img" aria-label="' + window.esc(label) + '"></div><span class="part-chip-role">' + role + '</span><span class="part-chip-label">' + window.esc(label) + '</span></div>';
  }

  function stageMarkup(all) {
    var pick = function (g) { return all.find(function (x) { return x.group === g && x.value === sel[g]; }); };
    var col = pick('colour'), hw = pick('hardware'), style = pick('style'), fabric = pick('fabric'), handle = pick('handle');
    var colSw = (col && col.swatch) || '#2A2118';
    return '<div class="bag-show">' +
        '<img class="bag-show-img" src="' + (IMG.style[sel.style] || IMG.style.tote) + '" alt="' + window.esc((style && style.label) || 'Bespoke bag') + '" loading="lazy">' +
        '<div class="bag-show-tint" style="background:' + colSw + '"></div>' +
        '<span class="bag-show-label">' + (sel.style ? window.esc(style ? style.label : 'Bespoke') : 'Bespoke') + '</span>' +
      '</div>' +
      '<div class="parts-rail">' +
        partHTML(IMG.fabric[sel.fabric] || IMG.fabric['full-grain-leather'], 'Material', (fabric && fabric.label) || 'Full-Grain Leather') +
        partHTML(IMG.handle[sel.handle] || IMG.handle['leather-top'], 'Strap', (handle && handle.label) || 'Leather Top Handle') +
        partHTML(IMG.hardware[sel.hardware] || IMG.hardware['antique-gold'], 'Hardware', (hw && hw.label) || 'Antique Gold') +
      '</div>';
  }

  function renderStep() {
    var g = STEPS[cur];
    var stepper = document.getElementById('stepper');
    stepper.innerHTML = STEPS.map(function (s, i) {
      var cls = i === cur ? 'step active' : (i < cur ? 'step done' : 'step');
      return '<div class="' + cls + '"><span class="dot">' + (i < cur ? '<i class="fas fa-check"></i>' : (i + 1)) + '</span>' + s[1] +
        (i < STEPS.length - 1 ? '<span class="line"></span>' : '') + '</div>';
    }).join('');

    var body = document.getElementById('stepBody');
    body.innerHTML = '<div class="eyebrow">Step ' + (cur + 1) + ' of ' + STEPS.length + '</div><h3>' + g[1] + '</h3>';
    DB.getDesignOptions(g[0]).then(function (opts) {
      if (!opts.length) { opts = [{ value: 'custom', label: 'Let the atelier decide', price_delta: 0 }]; }
      body.querySelector('p.empty') && body.querySelector('p.empty').remove();
      var wrap = document.createElement('div');
      wrap.className = 'opt-grid';
      wrap.innerHTML = pickHTML(g[0], opts);
      body.appendChild(wrap);
      wrap.querySelectorAll('.opt-pill').forEach(function (b) {
        b.addEventListener('click', function () {
          sel[g[0]] = b.getAttribute('data-value');
          wrap.querySelectorAll('.opt-pill').forEach(function (x) { x.classList.toggle('active', x === b); });
          updatePreview();
        });
      });
    });

    var st = document.getElementById('stepTitle');
    if (st) st.textContent = 'Design Your Own';
    document.getElementById('backBtn').style.visibility = cur === 0 ? 'hidden' : 'visible';
    document.getElementById('nextBtn').textContent = cur === STEPS.length - 1 ? 'Review & Finish' : 'Continue';
  }

  function totals() {
    var total = BASE;
    return DB.getDesignOptions().then(function (all) {
      Object.keys(sel).forEach(function (g) {
        var o = all.find(function (x) { return x.group === g && x.value === sel[g]; });
        if (o) total += Number(o.price_delta) || 0;
      });
      return { total: total, base: BASE };
    });
  }

  function updatePreview() {
    var stage = document.getElementById('bagStage');
    var info = document.getElementById('bagInfo');
    if (!stage) return;
    DB.getDesignOptions().then(function (all) {
      stage.innerHTML = stageMarkup(all);
      totals().then(function (t) { if (info) info.textContent = 'Current estimate: ' + window.fmtMoney(t.total); });
    });
  }

  function summaryHTML(all) {
    var rows = STEPS.map(function (s) {
      var o = all.find(function (x) { return x.group === s[0] && x.value === sel[s[0]]; });
      return '<tr><td style="text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-size:.74rem">' + s[1] + '</td><td>' + window.esc(o ? o.label : '-') + (o && o.price_delta ? (' <span class="muted">' + (o.price_delta > 0 ? '+' : '-') + window.fmtMoney(Math.abs(o.price_delta)) + '</span>') : '') + '</td></tr>';
    }).join('');
    return totals().then(function (t) {
      return '<div class="table-wrap"><table>' + rows +
        '<tr><td style="font-weight:800;color:var(--gold-bright)">Estimated total</td><td style="font-weight:800">' + window.fmtMoney(t.total) + '</td></tr>' +
        '</table></div>' +
        '<p style="font-size:.84rem;color:var(--text-muted);margin-top:12px"><i class="fas fa-shield-halved gold"></i> Start with a ' + AQ.ESCROW_DEPOSIT_PCT + '% deposit (' + window.fmtMoney(t.total * AQ.ESCROW_DEPOSIT_PCT / 100) + ') - the balance is invoiced only once your bag is made and you approve it. Escrow protected from start to finish.</p>';
    });
  }

  function designName() {
    var style = sel.style ? ' ' + String(sel.style).replace(/-/g, ' ').split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ') : '';
    var col = sel.colour ? '-' + String(sel.colour).replace(/-/g, ' ') : '';
    return 'Bespoke' + style + col;
  }

  async function finish() {
    var t = await totals();
    var all = await DB.getDesignOptions();
    var preview = document.getElementById('previewBody');
    preview.innerHTML = '<div class="eyebrow">Your design</div><h3>' + window.esc(designName()) + '</h3>' +
      '<div class="bag-stage" id="bagCopy" style="max-width:360px;margin:0 auto 16px">' + stageMarkup(all) + '</div>' +
      (await summaryHTML(all)) +
      '<div class="row" style="margin-top:18px">' +
        '<button class="btn btn-primary" id="addToBagFin"><i class="fas fa-bag-shopping"></i> Add to Bag</button>' +
        '<button class="btn btn-outline" id="reqQuoteFin"><i class="fas fa-file-signature"></i> Save & Request Quote</button>' +
      '</div>' +
      '<div class="field" style="margin-top:14px"><label>Reference (optional)</label><input class="input" id="designRef" placeholder="e.g. Wedding gift, Graduation 2026"></div>';

    document.getElementById('addToBagFin').addEventListener('click', async function () {
      var ref = (document.getElementById('designRef') || {}).value || '';
      AQCart.addCustom({
        kind: 'custom', name: designName() + (ref ? ' (' + ref + ')' : ''),
        unit: t.total, deposit_pct: AQ.ESCROW_DEPOSIT_PCT,
        custom: { version: AQ.VERSION, base: t.base, total: t.total, ref: ref, design_name: designName() },
        config: window.AQDB.detach(sel)
      });
      window.toast('Your design is in the bag!', 'green');
      location.href = 'cart.html';
    });

    document.getElementById('reqQuoteFin').addEventListener('click', async function () {
      if (!window.AQAuth.ensureClientOnly()) return;
      var ref = (document.getElementById('designRef') || {}).value || '';
      var res = await DB.createCustomRequest({
        design_name: designName(), config: window.AQDB.detach(sel), price_est: t.total, note: ref
      });
      if (res && res.error) { window.toast(res.error, 'err'); return; }
      window.toast('Design saved - the atelier will be in touch with a quote.', 'green');
      location.href = 'orders.html';
    });

    document.getElementById('cancelFin').addEventListener('click', function () { renderStep(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('stepBody')) return;
    document.getElementById('nextBtn').addEventListener('click', function () {
      if (cur < STEPS.length - 1) {
        var g = STEPS[cur];
        if (!sel[g[0]]) { window.toast('Pick a ' + g[1].toLowerCase() + ' to continue', 'err'); return; }
        cur++; renderStep();
      } else if (cur === STEPS.length - 1) {
        finish();
      }
    });
    document.getElementById('backBtn').addEventListener('click', function () { if (cur > 0) { cur--; renderStep(); } });
    renderStep();
    updatePreview();
  });

  return { sel: function () { return window.AQDB.detach(sel); }, totals: totals };
})();