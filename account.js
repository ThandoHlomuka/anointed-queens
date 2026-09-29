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

  function addressRow(a) {
    return '<div class="row" style="gap:10px;padding:9px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap;align-items:start">' +
      '<div style="flex:1;min-width:200px"><b>' + window.esc(a.label || 'Address') + '</b>' + (a.is_default ? ' <span class="badge gold">Default</span>' : '') +
      '<div class="muted" style="font-size:.86rem">' + window.esc(a.line1) + '<br>' + window.esc(a.city) + (a.province ? ', ' + window.esc(a.province) : '') + (a.postal ? ' ' + window.esc(a.postal) : '') + '<br>' + window.esc(a.country || 'South Africa') + '</div></div>' +
      '<div class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-addr-default="' + window.esc(a.id) + '"' + (a.is_default ? ' disabled' : '') + '>Make default</button>' +
      '<button class="btn btn-danger btn-sm" data-addr-del="' + window.esc(a.id) + '">Del</button></div></div>';
  }

  function renderAddresses() {
    var wrap = document.getElementById('addrWrap');
    if (!wrap) return;
    DB.addressList().then(function (list) {
      wrap.innerHTML = (list.length ? list.map(addressRow).join('') : '<p class="muted">No saved addresses yet.</p>') +
        '<div class="panel" style="margin-top:12px"><h4>Add an address</h4>' +
        '<div class="row"><input class="input" id="ad_label" style="max-width:150px" placeholder="Label (Home)" value="Home">' +
        '<input class="input" id="ad_line1" style="flex:1;min-width:180px" placeholder="Street address"></div>' +
        '<div class="row" style="margin-top:8px"><input class="input" id="ad_city" style="max-width:150px" placeholder="City">' +
        '<input class="input" id="ad_province" style="max-width:130px" placeholder="Province">' +
        '<input class="input" id="ad_postal" style="max-width:110px" placeholder="Postal code"></div>' +
        '<div class="row" style="margin-top:8px;align-items:center"><input type="checkbox" id="ad_default" style="width:auto"><label for="ad_default" style="margin:0">Set as default</label>' +
        '<button class="btn btn-primary btn-sm" id="ad_add">Add address</button></div></div>';

      wrap.querySelectorAll('[data-addr-del]').forEach(function (b) {
        b.addEventListener('click', async function () {
          if (!confirm('Delete this address?')) return;
          var res = await DB.addressDelete(b.getAttribute('data-addr-del'));
          if (res && res.error) { window.toast(res.error, 'err'); return; }
          window.toast('Address deleted', 'green'); renderAddresses();
        });
      });
      wrap.querySelectorAll('[data-addr-default]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var list2 = await DB.addressList();
          var cur = list2.find(function (x) { return String(x.id) === b.getAttribute('data-addr-default'); });
          if (!cur) return;
          var res = await DB.addressSave(Object.assign({}, cur, { is_default: true }));
          if (res && res.error) { window.toast(res.error, 'err'); return; }
          window.toast('Default address updated', 'green'); renderAddresses();
        });
      });
      var add = document.getElementById('ad_add');
      if (add) add.addEventListener('click', async function () {
        var line1 = document.getElementById('ad_line1').value.trim();
        var city = document.getElementById('ad_city').value.trim();
        if (!line1 || !city) { window.toast('Street address and city are required', 'err'); return; }
        var res = await DB.addressSave({
          label: document.getElementById('ad_label').value.trim() || 'Home',
          line1: line1, city: city,
          province: document.getElementById('ad_province').value.trim(),
          postal: document.getElementById('ad_postal').value.trim(),
          is_default: document.getElementById('ad_default').checked
        });
        if (res && res.error) { window.toast(res.error, 'err'); return; }
        window.toast('Address saved', 'green'); renderAddresses();
      });
    });
  }

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
      '</div>' +
      '<div class="panel" style="max-width:560px"><h3>Saved addresses</h3><div id="addrWrap"></div></div>' +
      '</div>';
    document.getElementById('saveAcc').addEventListener('click', async function () {
      await window.AQAuth.updateProfile({ name: document.getElementById('aName').value.trim(), phone: document.getElementById('aPhone').value.trim() });
      window.toast('Profile saved', 'green'); render();
    });
    document.getElementById('signOut').addEventListener('click', function () { window.AQAuth.signOut().then(function () { location.href = 'index.html'; }); });
    renderAddresses();
  }
  document.addEventListener('DOMContentLoaded', function () { if (document.getElementById('accBody')) render(); });
  return { render: render, renderAddresses: renderAddresses };
})();