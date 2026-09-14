/* ============================================================
   ANNOINTED QUEENS - cart + checkout (escrow-aware)
   ============================================================ */
window.CHECKOUT = (function () {
  var DB = window.AQDB, AQ = window.AQ;

  function fmt(n) { return window.fmtMoney(n); }

  function lineHTML(it) {
    var badge = it.kind === 'custom'
      ? '<span class="badge gold"><i class="fas fa-wand-magic-sparkles"></i> Bespoke</span>'
      : '<span class="badge green"><i class="fas fa-shield-halved"></i> Ready</span>';
    var img = it.image ? '<img src="' + it.image + '" style="width:64px;height:64px;object-fit:cover;border-radius:10px" alt="">' : '<div style="width:64px;height:64px;border-radius:10px;background:var(--gold-15);display:grid;place-items:center"><i class="fas fa-crown gold"></i></div>';
    var unitLine = it.kind === 'custom' ? 'Deposit ' + it.deposit_pct + '%' : 'Full price';
    return '<div class="card" style="padding:16px;display:flex;gap:14px;align-items:center;margin-bottom:12px">' +
      img +
      '<div style="flex:1;min-width:0">' +
        '<div class="row" style="gap:8px"><b>' + window.esc(it.name) + '</b>' + badge + '</div>' +
        '<div class="muted" style="font-size:.82rem">' + unitLine + ' &middot; ' + fmt(it.unit) + ' each</div>' +
      '</div>' +
      (it.kind === 'custom'
        ? '<div class="muted" style="font-size:.82rem">' + fmt(it.unit) + '</div>'
        : '<div class="row">' +
            '<button class="btn btn-ghost btn-sm" data-d="-1" data-k="' + it.key + '">-</button>' +
            '<b>' + it.qty + '</b>' +
            '<button class="btn btn-ghost btn-sm" data-d="1" data-k="' + it.key + '">+</button>' +
          '</div>') +
      '<button class="btn btn-danger btn-sm" data-del="' + it.key + '"><i class="fas fa-trash"></i></button>' +
    '</div>';
  }

  function totals(items) {
    var subtotal = AQCart.subtotal(items);
    var shop = items.filter(function (i) { return i.kind !== 'custom'; }).reduce(function (s, i) { return s + i.unit * i.qty; }, 0);
    var customDeposit = items.filter(function (i) { return i.kind === 'custom'; }).reduce(function (s, i) { return s + i.unit * (i.deposit_pct || AQ.ESCROW_DEPOSIT_PCT) / 100; }, 0);
    var customTotal = items.filter(function (i) { return i.kind === 'custom'; }).reduce(function (s, i) { return s + i.unit * i.qty; }, 0);
    var dueNow = shop + customDeposit;
    var shipping = items.some(function (i) { return i.kind === 'custom'; }) ? 0 : (subtotal >= AQ.FREE_SHIPPING_OVER ? 0 : AQ.SHIPPING.standard || 120);
    return { subtotal: subtotal, shop: shop, customDeposit: customDeposit, customTotal: customTotal, dueNow: dueNow, shipping: shipping, balanceDue: customTotal - customDeposit };
  }

  async function renderCart() {
    var wrap = document.getElementById('cartWrap');
    var items = await AQCart.hydrate();
    if (!items.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="ico"><i class="fas fa-crown"></i></div><h3>Your bag is empty</h3><p class="muted">Explore the collection or design your own.</p><div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="shop.html">Shop the collection</a><a class="btn btn-outline" href="configurator.html">Design your own</a></div></div>';
      return;
    }
    var t = totals(items);
    wrap.innerHTML = items.map(lineHTML).join('') +
      '<div class="panel" style="margin-top:16px">' +
        '<div class="row" style="justify-content:space-between"><span class="muted">Subtotal</span><b>' + fmt(t.subtotal) + '</b></div>' +
        '<div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted">Now to secure (shop + ' + AQ.ESCROW_DEPOSIT_PCT + '% bespoke deposit)</span><b>' + fmt(t.dueNow) + '</b></div>' +
        (t.shipping ? '<div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted">Shipping</span><b>' + fmt(t.shipping) + '</b></div>' : '<div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted">Shipping</span><b class="gold">FREE</b></div>') +
        (t.balanceDue > 0 ? '<div class="row" style="justify-content:space-between;margin-top:6px"><span class="muted">Balance due on fulfilment</span><b>' + fmt(t.balanceDue) + '</b></div>' : '') +
        '<div class="row" style="justify-content:space-between;margin-top:10px"><span style="font-weight:800">Total today</span><span style="font-weight:800;color:var(--gold-bright);font-size:1.2rem">' + fmt(t.dueNow + t.shipping) + '</span></div>' +
        '<p style="font-size:.8rem;color:var(--text-muted)"><i class="fas fa-shield-halved gold"></i> Bespoke orders: your deposit opens production; the balance is only charged when your piece is ready and you approve it - funds are held in escrow.</p>' +
        '<button class="btn btn-primary btn-block" id="toCheckout" style="margin-top:6px"><i class="fas fa-lock"></i> Secure checkout</button>' +
      '</div>';

    wrap.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { AQCart.qty(b.getAttribute('data-k'), +b.getAttribute('data-d')); renderCart(); }); });
    wrap.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { AQCart.remove(b.getAttribute('data-del')); renderCart(); }); });
    document.getElementById('toCheckout').addEventListener('click', function () {
      if (!window.AQAuth.ensureClientOnly()) return;
      localStorage.setItem('aq_checkout', JSON.stringify({ t: t }));
      location.href = 'checkout.html';
    });
  }

  async function renderCheckout() {
    var items = await AQCart.hydrate();
    if (!items.length) { location.href = 'cart.html'; return; }
    var u = window.AQAuth.currentUser();
    var t = totals(items);
    var bal = await DB.loyaltyBalance();

    var html =
      '<div class="wrap section" style="padding-top:28px"><h1>Secure Checkout</h1>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,420px));grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),420px));gap:24px;align-items:start">' +
      '<div>' +
        '<div class="panel"><h3><i class="fas fa-truck-fast gold"></i> Delivery</h3>' +
        '<div class="form-grid">' +
          '<div class="field"><label>Full name</label><input class="input" id="cName" value="' + window.esc(u ? u.name : '') + '"></div>' +
          '<div class="field"><label>Email</label><input class="input" id="cEmail" value="' + window.esc(u ? u.email : '') + '"></div>' +
          '<div class="field"><label>Phone</label><input class="input" id="cPhone"></div>' +
          '<div class="field"><label>Street address</label><input class="input" id="cAddr"></div>' +
          '<div class="field"><label>City</label><input class="input" id="cCity"></div>' +
          '<div class="field"><label>Province</label><input class="input" id="cProv"></div>' +
          '<div class="field"><label>Postal code</label><input class="input" id="cPostal"></div>' +
        '</div>' +
        '<div class="field"><label>Shipping</label>' +
          '<select class="select" id="cShip" style="width:100%">' +
            '<option value="courier">Courier - ' + fmt(AQ.SHIPPING.courier) + (t.subtotal >= AQ.FREE_SHIPPING_OVER ? ' (FREE)' : '') + '</option>' +
            '<option value="express">Express - ' + fmt(AQ.SHIPPING.express) + '</option>' +
          '</select>' +
        '</div>' +
        '<div class="field"><label>Notes (optional)</label><textarea class="textarea" id="cNotes" placeholder="Gift wrapping, delivery instructions..."></textarea></div>' +
        '</div>' +
        '<div class="panel"><h3><i class="fas fa-coins gold"></i> Anointed Club points</h3>' +
        '<p class="muted" style="font-size:.86rem">You have <b class="gold">' + bal + '</b> points. Redeem up to ' + fmt(Math.min(t.dueNow, Math.floor(bal * AQ.LOYALTY.redeemRate))) + ' at checkout.</p>' +
        '<button class="btn btn-outline btn-sm" id="applyPts">Apply ' + Math.floor(bal * AQ.LOYALTY.redeemRate) + ' pts</button></div>' +
      '</div>' +

      '<div>' +
        '<div class="panel"><h3><i class="fas fa-bag-shopping gold"></i> Your order</h3>' +
        items.map(function (it) {
          return '<div class="row" style="justify-content:space-between;font-size:.9rem;padding:6px 0;border-bottom:1px solid var(--gold-15)">' +
            '<span>' + window.esc(it.name) + (it.kind === 'custom' ? ' <span class="badge gold">Bespoke</span>' : '') + ' &times; ' + it.qty + '</span>' +
            '<b>' + fmt(it.unit * it.qty) + '</b></div>';
        }).join('') +
        '<div class="row" style="justify-content:space-between;font-weight:800;padding-top:10px"><span>Total today (all held in escrow)</span><span id="payTotal" style="color:var(--gold-bright)">' + fmt(t.dueNow + t.shipping) + '</span></div>' +
        (t.balanceDue > 0 ? '<p style="font-size:.8rem;color:var(--text-muted)">Balance of ' + fmt(t.balanceDue) + ' invoiced only after your bespoke piece is ready and you approve it.</p>' : '') +
        '</div>' +
        '<div class="panel"><h3><i class="fas fa-lock gold"></i> Payment</h3>' +
        '<div class="field"><label>Card number</label><input class="input" id="cCard" placeholder="4242 4242 4242 4242" inputmode="numeric" autocomplete="cc-number"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>Expiry</label><input class="input" id="cExp" placeholder="12 / 28"></div>' +
          '<div class="field"><label>CVC</label><input class="input" id="cCvc" placeholder="123"></div>' +
        '</div>' +
        '<div id="payStatus" class="quote-em" style="font-size:.82rem"><i class="fas fa-shield-halved gold"></i> Your payment is held in escrow and only released to our atelier once you confirm receipt.</div>' +
        (AQ.DEMO ? '<p style="font-size:.78rem;color:var(--text-muted)">Demo mode: use card 4242 or any 16-digit number.</p>' : '') +
        '<button class="btn btn-primary btn-block" id="payBtn" style="margin-top:10px"><i class="fas fa-crown"></i> Pay ' + fmt(t.dueNow + t.shipping) + '</button>' +
        '</div>' +
      '</div></div></div>';

    document.getElementById('checkoutWrap').innerHTML = html;
    var ptsApplied = false;
    document.getElementById('applyPts').addEventListener('click', function () {
      var pts = Math.floor(bal * AQ.LOYALTY.redeemRate);
      if (ptsApplied || pts < 10) { window.toast('Not enough points to redeem yet', 'err'); return; }
      ptsApplied = true;
      var newTotal = Math.max(0, t.dueNow + AQ.SHIPPING.courier - Math.min(t.dueNow, pts * AQ.LOYALTY.redeemRate));
      document.getElementById('payTotal').textContent = fmt(newTotal);
      document.getElementById('payBtn').innerHTML = '<i class="fas fa-crown"></i> Pay ' + fmt(newTotal);
      window.toast(pts + ' points applied - you saved ' + fmt(pts * AQ.LOYALTY.redeemRate) + '!', 'green');
    });

    document.getElementById('payBtn').addEventListener('click', async function () {
      var btn = this;
      var name = (document.getElementById('cName') || {}).value;
      var emailEl = document.getElementById('cEmail');
      var email = (emailEl || {}).value;
      var addr = [(document.getElementById('cAddr') || {}).value].join(' ');
      var city = (document.getElementById('cCity') || {}).value;
      var prov = (document.getElementById('cProv') || {}).value;
      var postal = (document.getElementById('cPostal') || {}).value;
      if (!name || !email || !addr || !city) { window.toast('Fill in your delivery details', 'err'); return; }
      var card = (document.getElementById('cCard') || {}).value.replace(/\s/g, '');
      if (!/^[0-9]{13,19}$/.test(card)) { window.toast('Enter a valid card number', 'err'); return; }

      var chosenShip = AQ.SHIPPING.courier;
      var shipSel = document.getElementById('cShip');
      if (shipSel && shipSel.value === 'express') chosenShip = AQ.SHIPPING.express;
      if (t.subtotal >= AQ.FREE_SHIPPING_OVER) chosenShip = 0;

      btn.classList.add('loading'); btn.disabled = true;
      /* demo gateway delay */
      await new Promise(function (r) { setTimeout(r, 900); });

      var chargedNow = t.dueNow + chosenShip - (ptsApplied ? Math.min(t.dueNow, Math.floor(bal * AQ.LOYALTY.redeemRate)) : 0);
      var res = await DB.placeOrder({
        user_id: window.AQAuth.currentUser().id,
        email: email, phone: (document.getElementById('cPhone') || {}).value,
        address: { name: name, line1: addr, city: city, prov: prov, postal: postal },
        items: items.map(function (it) { return { name: it.name, kind: it.kind, product_id: it.product_id, qty: it.qty, unit: it.unit, deposit_pct: it.deposit_pct, config: it.config }; }),
        subtotal: t.subtotal, shipping: chosenShip, total: chargedNow,
        points_discount: ptsApplied ? Math.min(t.dueNow, Math.floor(bal * AQ.LOYALTY.redeemRate)) : 0,
        balance_due: t.balanceDue, deposit_paid: t.customDeposit,
        escrow: 'held', payment_method: 'card', payment_intent: 'pi_demo_' + Date.now(),
        notes: (document.getElementById('cNotes') || {}).value || ''
      });
      if (res && res.error) { window.toast(res.error, 'err'); btn.classList.remove('loading'); btn.disabled = false; return; }

      /* loyalty earned */
      await DB.loyaltyAdd(Math.floor(chargedNow * AQ.LOYALTY.perSpend), 'Purchase ' + res.order.number);
      if (ptsApplied) await DB.loyaltyAdd(-Math.floor(bal * AQ.LOYALTY.redeemRate), 'Redeemed at checkout');
      AQCart.clear();
      window.toast('Order placed - payment held in escrow!', 'green');
      location.href = 'orders.html?placed=' + res.order.number;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cartWrap')) renderCart();
    if (document.getElementById('checkoutWrap')) renderCheckout();
  });

  return { totals: totals };
})();