/* ============================================================
   ANNOINTED QUEENS - cart helpers (shared: nav badge, cart page)
   ============================================================ */
window.AQCart = (function () {
  var DB = window.AQDB;

  async function hydrate() {
    var items = DB.cartGet();
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var p = it.product_id ? await DB.getProduct(it.product_id) : null;
      out.push({
        key: it.key,
        product_id: it.product_id,
        kind: it.kind || 'shop',           // 'shop' | 'custom'
        product: p,
        name: it.name || (p ? p.name : 'Custom Design'),
        image: it.image || (p && p.images[0]) || '',
        qty: it.qty || 1,
        unit: Number(it.unit) || 0,
        custom: it.custom || null,         // config snapshot for custom
        config: it.config || null,
        deposit_pct: it.deposit_pct != null ? it.deposit_pct : (p ? (p.deposit_pct || AQ.ESCROW_DEPOSIT_PCT) : AQ.ESCROW_DEPOSIT_PCT)
      });
    }
    return out;
  }

  return {
    count: function () { return DB.cartCount(); },
    hydrate: hydrate,
    subtotal: function (items) { return items.reduce(function (s, i) { return s + i.unit * i.qty; }, 0); },
    qty: function (key, delta) {
      var items = DB.cartGet();
      var it = items.find(function (x) { return x.key === key; });
      if (!it) return;
      it.qty = Math.max(1, (it.qty || 1) + delta);
      DB.cartSet(items);
    },
    remove: function (key) { DB.cartSet(DB.cartGet().filter(function (x) { return x.key !== key; })); },
    clear: function () { DB.cartSet([]); },
    addShop: function (productId, qty) {
      var items = DB.cartGet();
      var ik = items.find(function (i) { return i.product_id === productId && i.kind === 'shop'; });
      if (ik) ik.qty = (ik.qty || 1) + (qty || 1);
      else items.push({ key: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'shop', product_id: productId, qty: qty || 1 });
      DB.cartSet(items);
    },
    addCustom: function (cartItem) {
      var items = DB.cartGet();
      items.push(Object.assign({ key: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'custom', qty: 1 }, cartItem));
      DB.cartSet(items);
    },
    total: function (items) { return items.reduce(function (s, i) { return s + i.unit * i.qty; }, 0); }
  };
})();