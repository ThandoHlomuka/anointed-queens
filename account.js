/* ============================================================
   ANNOINTED QUEENS - contact + wishlist + account pages
   ============================================================ */

/* ---------- Contact ---------- */
window.CONTACT = (function () {
  function init() {
    var f = document.getElementById('contactForm');
    if (!f) return;
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = document.getElementById('cSend');
      var name = document.getElementById('cName').value.trim();
      var email = document.getElementById('cEmail').value.trim();
      var subject = document.getElementById('cSubject').value.trim() || 'General';
      var message = document.getElementById('cMessage').value.trim();
      if (!name || !email || !message) { window.toast('Please complete name, email and message', 'err'); return; }
      btn.classList.add('loading'); btn.disabled = true;
      var res = await window.AQDB.contactSend({ name: name, email: email, subject: subject, message: message });
      btn.classList.remove('loading'); btn.disabled = false;
      if (res && res.error) { window.toast(res.error, 'err'); return; }
      window.toast('Message received - our atelier replies within 24h.', 'green');
      f.reset();
    });
  }
  document.addEventListener('DOMContentLoaded', init);
  return { init: init };
})();

/* ---------- Wishlist ---------- */
window.WISH = (function () {
  var DB = window.AQDB;
  async function render() {
    if (!window.AQAuth.currentUser()) { location.href = 'login.html'; return; }
    var ids = await DB.wishlistGet();
    var wrap = document.getElementById('wishWrap');
    var items = [];
    for (var i = 0; i < ids.length; i++) {
      var p = await DB.getProduct(ids[i]);
      if (p) items.push(p);
    }
    if (!items.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="ico"><i class="fas fa-heart"></i></div><h3>Nothing saved yet</h3><p class="muted">Tap the heart on any piece to keep it here.</p><a class="btn btn-primary" href="shop.html">Browse the collection</a></div>';
      return;
    }
    wrap.innerHTML = '<div class="grid-products">' + items.map(function (p) {
      var img = p.images && p.images[0] ? '<img src="' + p.images[0] + '" alt="' + window.esc(p.name) + '" loading="lazy">' : '';
      return '<div class="card card-hover product-card"><div class="thumb">' + img + '</div>' +
        '<div class="body"><div class="cat">' + window.esc(p.category) + '</div><a href="product.html?id=' + p.id + '" class="name" style="color:var(--ivory)">' + window.esc(p.name) + '</a>' +
        '<div class="price-row"><span class="price">' + window.fmtMoney(p.base_price) + '</span></div>' +
        '<div class="row" style="margin-top:8px"><a href="product.html?id=' + p.id + '" class="btn btn-primary btn-sm">View</a>' +
        '<button class="btn btn-danger btn-sm" data-w="' + p.id + '"><i class="fas fa-heart-crack"></i></button></div></div></div>';
    }).join('') + '</div>';
    wrap.querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', async function () { await DB.wishlistToggle(b.getAttribute('data-w')); render(); }); });
  }
  document.addEventListener('DOMContentLoaded', function () { if (document.getElementById('wishWrap')) render(); });
  return { render: render };
})();

/* ---------- Account ---------- */
window.ACCOUNT = (function () {
  var DB = window.AQDB, AQ = window.AQ;
  function render() {
    if (!window.AQAuth.ensureClientOnly()) return;
    var u = window.AQAuth.currentUser();
    document.getElementById('accBody').innerHTML =
      '<div class="wrap section" style="padding-top:28px"><h1>My Profile</h1>' +
      '<div class="panel" style="max-width:560px">' +
        '<div class="row" style="margin-bottom:14px"><div class="avatar" style="width:56px;height:56px;font-size:1.4rem">' + window.esc(u.name.charAt(0).toUpperCase()) + '</div>' +
        '<div><b>' + window.esc(u.name) + '</b><div class="muted" style="font-size:.84rem">' + window.esc(u.email) + '</div></div>' +
        (u.role === 'admin' ? '<span class="badge gold" style="margin-left:auto"><i class="fas fa-crown"></i> Admin</span>' : '') +
        '</div>' +
        '<div class="field"><label>Full name</label><input class="input" id="aName" value="' + window.esc(u.name) + '"></div>' +
        '<div class="field"><label>Phone</label><input class="input" id="aPhone" value="' + window.esc(u.phone || '') + '"></div>' +
        '<div class="row"><button class="btn btn-primary" id="saveAcc"><i class="fas fa-floppy-disk"></i> Save</button>' +
        '<button class="btn btn-ghost" id="signOut"><i class="fas fa-arrow-right-from-bracket"></i> Sign out</button></div>' +
      '</div></div>';
    document.getElementById('saveAcc').addEventListener('click', async function () {
      await window.AQAuth.updateProfile({ name: document.getElementById('aName').value.trim(), phone: document.getElementById('aPhone').value.trim() });
      window.toast('Profile saved', 'green'); render();
    });
    document.getElementById('signOut').addEventListener('click', function () { window.AQAuth.signOut().then(function () { location.href = 'index.html'; }); });
  }
  document.addEventListener('DOMContentLoaded', function () { if (document.getElementById('accBody')) render(); });
  return { render: render };
})();