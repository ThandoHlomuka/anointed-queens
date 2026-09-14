/* ============================================================
   ANNOINTED QUEENS - my orders + tracking timeline + custom
   ============================================================ */
window.ORDERS = (function () {
  var DB = window.AQDB, AQ = window.AQ;

  var ORDER_THEMES = {
    pending: ['gold', 'Awaiting'], confirmed: ['blue', 'Confirmed'],
    in_production: ['blue', 'In production'], shipped: ['gold', 'Shipped'],
    delivered: ['green', 'Delivered'], cancelled: ['red', 'Cancelled']
  };
  var ESCROW_THEMES = { held: 'grey', fulfilled: 'gold', released: 'green' };

  function timeline(o) {
    var now = new Date(o.created_at || Date.now());
    var d = function (n) { var x = new Date(now); x.setDate(x.getDate() + n); return x.toDateString(); };
    var steps = [
      { t: 'Order placed', d: d(0), done: true },
      { t: 'Payment held in escrow', d: 'Funds secure', active: o.escrow === 'held', done: o.escrow !== 'held' },
      { t: 'Crafting your piece', d: o.status === 'in_production' ? 'Now crafting' : d(2), active: o.status === 'in_production', done: ['shipped', 'delivered'].indexOf(o.status) >= 0 },
      { t: 'Shipped', d: o.status === 'shipped' ? 'In transit' : d(4), active: o.status === 'shipped', done: o.status === 'delivered' },
      { t: 'Delivered & approved', d: 'Escrow released', done: o.escrow === 'released' }
    ];
    var rows = steps.map(function (s, i) {
      return '<div class="tl-item' + (s.done ? ' done' : '') + (s.active ? ' active' : '') + '">' +
        '<div class="tl-dot"><i class="fas ' + (s.done ? 'fa-check' : 'fa-circle-notch') + '"></i></div>' +
        '<div class="tl-body"><div class="tl-title">' + s.t + '</div><p>' + s.d + '</p></div></div>';
    }).join('');
    return '<div class="timeline">' + rows + '</div>';
  }

  function lineItemsHTML(items) {
    return (items || []).map(function (i) {
      return '<div class="row" style="justify-content:space-between;font-size:.9rem;padding:5px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap">' +
        '<span>' + window.esc(i.name) + (i.kind === 'custom' ? ' <span class="badge gold">Bespoke</span>' : '') + ' &times; ' + i.qty + '</span><b>' + window.fmtMoney(i.unit * i.qty) + '</b></div>';
    }).join('');
  }

  async function renderOrders() {
    var placed = new URLSearchParams(location.search).get('placed');
    if (placed) window.toast('Order ' + placed + ' placed - payment held in escrow.', 'green');
    var u = window.AQAuth.currentUser();
    var orders = await DB.myOrders();
    var customs = await DB.myCustomRequests();

    var wrap = document.getElementById('ordersWrap');
    var ids = (document.getElementById('ordersSection') || { id: '' }).id;
    var body = '';

    if (!orders.length && !customs.length) {
      body = '<div class="empty-state"><div class="ico"><i class="fas fa-box-open"></i></div><h3>No orders yet</h3><p class="muted">Your bespoke and ready-to-ship orders will live here with live escrow tracking.</p>' +
        '<div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="shop.html">Shop the collection</a><a class="btn btn-outline" href="configurator.html">Design your own</a></div></div>';
    } else {
      body = orders.map(function (o) {
        var th = ORDER_THEMES[o.status] || ORDER_THEMES.pending;
        var eh = ESCROW_THEMES[o.escrow] || 'grey';
        var totalLine = '<div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted">Total charged</span><b>' + window.fmtMoney(o.total) + '</b></div>';
        var due = Number(o.balance_due) || 0;
        var action = '';
        if (o.escrow === 'fulfilled' && o.status === 'delivered') {
          action = '<button class="btn btn-primary btn-sm" data-release="' + o.id + '"><i class="fas fa-check"></i> Confirm & release escrow</button>';
        } else if (o.escrow === 'held') {
          action = '<span class="muted" style="font-size:.8rem"><i class="fas fa-lock gold"></i> Funds protected - released on your confirmation</span>';
        }
        return '<div class="panel">' +
          '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">' +
            '<div class="row" style="gap:10px"><b>' + o.number + '</b><span class="badge ' + th[0] + '">' + th[1] + '</span>' +
            '<span class="badge ' + eh + '"><i class="fas fa-shield-halved"></i> Escrow ' + o.escrow + '</span></div>' +
            '<span class="muted" style="font-size:.82rem">' + new Date(o.created_at).toLocaleDateString() + '</span>' +
          '</div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:start">' +
            '<div style="flex:1;min-width:260px">' + timeline(o) + '</div>' +
            '<div style="flex:1;min-width:280px">' +
              lineItemsHTML(o.items) +
              '<div class="row" style="justify-content:space-between;font-weight:800;margin-top:8px"><span>Today</span><span style="color:var(--gold-bright)">' + window.fmtMoney(o.total) + '</span></div>' +
            '</div>' +
          '</div>' +
          (due > 0 ? '<div class="quote-em" style="font-size:.84rem"><i class="fas fa-hourglass-half gold"></i> Bespoke balance due on approval: ' + window.fmtMoney(due) + '. To be invoiced once your piece is ready.</div>' : '') +
          '<div class="row" style="margin-top:10px">' + action + '</div>' +
        '</div>';
      }).join('') +

      (customs.length ? '<h2 style="margin-top:22px">Bespoke design requests</h2>' + customs.map(function (c) {
        var st = { pending: 'gold', quoted: 'blue', accepted: 'blue', in_production: 'blue', fulfilled: 'green', cancelled: 'red' }[c.status] || 'gold';
        return '<div class="panel"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><div class="row" style="gap:10px"><b>' + window.esc(c.design_name || 'Design') + '</b><span class="badge ' + st + '">' + c.status.replace(/_/g, ' ') + '</span></div><span class="muted" style="font-size:.82rem">' + new Date(c.created_at).toLocaleDateString() + '</span></div>' +
          '<p class="muted" style="font-size:.86rem;margin:10px 0 0">Estimate: <b class="gold">' + window.fmtMoney(c.price_est) + '</b>' + (c.note ? ' &mdash; ' + window.esc(c.note) : '') + '</p></div>';
      }).join('') : '');
    }

    wrap.innerHTML = body;
    wrap.querySelectorAll('[data-release]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var id = b.getAttribute('data-release');
        await DB.updateOrder(id, { escrow: 'released', status: 'completed' });
        await DB.loyaltyAdd(AQ.LOYALTY.perSpend * 100, 'Bonus: escrow release'); // capped in real engine
        window.toast('Escrow released - thank you!', 'green');
        renderOrders();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.AQAuth.ensureClientOnly()) return;
    renderOrders();
  });

  return { timeline: timeline, lineItemsHTML: lineItemsHTML };
})();