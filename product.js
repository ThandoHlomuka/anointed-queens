/* ============================================================
   ANNOINTED QUEENS - product detail
   ============================================================ */
window.PRODUCT = (function () {
  var DB = window.AQDB, AQ = window.AQ;

  function starsHTML(rating) {
    var out = '', i, r = Math.round(Number(rating) || 0);
    for (i = 1; i <= 5; i++) out += '<span class="' + (i <= r ? '' : 'empty') + '"><i class="fas fa-star"></i></span>';
    return out;
  }

  async function load() {
    var id = new URLSearchParams(location.search).get('id');
    if (!id) { document.getElementById('pageBody').innerHTML = '<div class="empty-state"><i class="fas fa-crown"></i><h3>Product not found</h3></div>'; return; }
    var p = await DB.getProduct(id);
    if (!p) { document.getElementById('pageBody').innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>'; return; }
    document.title = p.seo_title || (p.name + ' | Anointed Queens');

    var img = p.images && p.images[0] ? '<img src="' + p.images[0] + '" alt="' + window.esc(p.name) + '" class="img-round">' : '';
    var reviews = await DB.getReviews(p.id);
    var avg = reviews.reduce(function (s, r) { return s + (r.rating || 0); }, 0) / (reviews.length || 1);

    document.getElementById('pageBody').innerHTML =
      '<div class="wrap section" style="padding-top:28px">' +
        '<div class="row" style="margin-bottom:18px"><a href="shop.html" class="btn btn-ghost btn-sm"><i class="fas fa-arrow-left"></i> Back to shop</a>' +
        '<span class="muted"> &bull; ' + window.esc(p.category) + '</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,400px));grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),400px));gap:26px;align-items:start">' +
          '<div>' + img + '</div>' +
          '<div>' +
            '<span class="eyebrow">' + window.esc(p.category || 'Anointed Queens') + '</span>' +
            '<h1>' + window.esc(p.name) + '</h1>' +
            '<p style="color:var(--text-muted);font-size:1.05rem">' + window.esc(p.tagline || '') + '</p>' +
            '<div class="stars" style="margin-bottom:10px">' + starsHTML(avg) + ' <span class="muted" style="font-size:.82rem">' + reviews.length + ' reviews</span></div>' +
            '<div class="price-row" style="font-size:1.4rem"><span class="price">' + window.fmtMoney(p.base_price) + '</span></div>' +
            '<p style="font-size:.86rem;color:var(--text-muted)"><i class="fas fa-shield-halved gold"></i> Escrow protected &bull; Ships from our atelier &bull; ' + (p.in_stock === false ? 'Sold out' : (p.stock > 0 && p.stock <= 5 ? '<span style="color:var(--gold)"><i class="fas fa-fire"></i> Only ' + p.stock + ' left - order soon</span>' : 'In stock (' + (p.stock || 0) + ')')) + '</p>' +
            '<div class="row" style="margin-top:16px">' +
              '<button class="btn btn-primary" id="addBagBtn"' + (p.in_stock === false ? ' disabled' : '') + '><i class="fas fa-bag-shopping"></i> Add to Bag</button>' +
              '<button class="icon-btn" id="wishToggle" style="width:48px;height:48px" aria-label="Wishlist"><i class="fas fa-heart"></i></button>' +
            '</div>' +
            '<div class="divider"></div>' +
            '<h3>Details</h3>' +
            '<ul style="margin:0;padding-left:18px;color:var(--text-muted);font-size:.92rem">' +
              (p.description ? '<li>' + window.esc(p.description) + '</li>' : '') +
              '<li>Material: ' + window.esc(p.specs && p.specs.leather || 'Full-Grain Leather') + '</li>' +
              '<li>Hardware: ' + window.esc(p.specs && p.specs.hardware || 'Antique Gold') + '</li>' +
              '<li>Sizes: ' + window.esc(p.specs && p.specs.sizes || 'M / L') + '</li>' +
            '</ul>' +
            '<div class="quote-em" style="margin-top:14px"><i class="fas fa-crown gold"></i> Make it yours - ' +
              '<a href="configurator.html" class="gold-bright">design a bespoke piece</a> inspired by ' + window.esc(p.name) + '.</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wrap section" style="padding-top:10px">' +
        '<h2>Verified Reviews</h2>' +
        '<div id="reviewList" class="grid-bes"></div>' +
        '<div class="panel" style="margin-top:18px">' +
          '<h3>Write a review</h3>' + (window.AQAuth.currentUser() ?
            '<div class="row" style="margin-bottom:12px"><label>Rating</label>' +
            '<div class="stars" id="rateStars" style="font-size:1.3rem;cursor:pointer">' + starpicker(5) + '</div></div>' +
            '<div class="field"><input class="input" id="rTitle" placeholder="Headline"></div>' +
            '<div class="field"><textarea class="textarea" id="rBody" placeholder="What did you love?"></textarea></div>' +
            '<button class="btn btn-primary" id="submitReview">Submit review</button>' :
            '<p class="muted">Sign in to leave a review and earn <b class="gold">' + AQ.LOYALTY.perReview + ' points</b>.</p><a class="btn btn-outline btn-sm" href="login.html">Sign in</a>') +
        '</div>' +
      '</div>';

    document.getElementById('addBagBtn').addEventListener('click', async function () {
      var items = await AQCart.hydrate();
      var inCart = items.filter(function (it) { return it.product_id === p.id; }).reduce(function (s, it) { return s + it.qty; }, 0);
      var stock = Number(p.stock) || 0;
      if (inCart + 1 > stock) { window.toast('Only ' + stock + ' available' + (inCart ? ' and you already have ' + inCart + ' in your bag' : ''), 'err'); return; }
      AQCart.addShop(p.id, 1);
      window.toast(p.name + ' added to your bag.', 'green');
    });

    document.getElementById('wishToggle').addEventListener('click', async function () {
      if (!window.AQAuth.currentUser()) { window.toast('Sign in to save to your wishlist', 'err'); return; }
      var now = await DB.wishlistToggle(p.id);
      this.style.color = now ? '#FFD700' : '';
      window.toast(now ? 'Saved to wishlist' : 'Removed from wishlist', now ? 'green' : 'gold');
    });
    DB.wishlistGet().then(function (list) { if (list.indexOf(p.id) >= 0) document.getElementById('wishToggle').style.color = '#FFD700'; });

    var rl = document.getElementById('reviewList');
    rl.innerHTML = reviews.length ? reviews.map(function (r) {
      return '<div class="review-card"><div class="head"><div class="avatar">' + (r.user || '?').charAt(0).toUpperCase() + '</div>' +
        '<div><b>' + window.esc(r.user || 'Guest') + '</b><div class="stars" style="font-size:.8rem">' + starsHTML(r.rating) + '</div></div>' +
        '<span class="badge green" style="margin-left:auto"><i class="fas fa-circle-check"></i> Verified</span></div>' +
        '<b>' + window.esc(r.title || '') + '</b><p style="margin:0;font-size:.9rem;color:var(--text-muted)">' + window.esc(r.body || '') + '</p></div>';
    }).join('') : '<p class="muted">Be the first to review this piece.</p>';

    var sr = document.getElementById('submitReview');
    if (sr) sr.addEventListener('click', async function () {
      var rating = +document.body.getAttribute('data-rate') || 5;
      var title = document.getElementById('rTitle').value.trim();
      var body = document.getElementById('rBody').value.trim();
      if (!title || !body) { window.toast('Add a headline and your thoughts', 'err'); return; }
      var res = await DB.addReview({ product_id: p.id, rating: rating, title: title, body: body });
      if (res && res.error) { window.toast(res.error, 'err'); return; }
      await DB.loyaltyAdd(AQ.LOYALTY.perReview, 'Review for ' + p.name);
      window.toast('Review submitted - you earned ' + AQ.LOYALTY.perReview + ' points!', 'green');
      load();
    });
  }

  function starpicker(n) {
    var out = '';
    for (var i = 1; i <= n; i++) out += '<span data-v="' + i + '"><i class="fas fa-star"></i></span>';
    return out;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var rs = document.getElementById('rateStars');
    if (rs) rs.addEventListener('click', function (e) {
      var v = e.target.closest('span') ? e.target.closest('span').getAttribute('data-v') : null;
      if (!v) return;
      document.body.setAttribute('data-rate', v);
      rs.querySelectorAll('span').forEach(function (s, i) { s.style.color = i < +v ? '' : 'var(--gold-30)'; });
    });
    load();
  });

  return { starsHTML: starsHTML };
})();