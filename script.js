/* ============================================================
   ANNOINTED QUEENS - shared runtime
   Loaded on every page after config.js / auth.js / db.js
   ============================================================ */
(function () {
  var AQ = window.AQ;

  /* Money formatting (ZAR) */
  window.fmtMoney = function (n) {
    var v = Number(n) || 0;
    return new Intl.NumberFormat(AQ.LOCALE || 'en-ZA', {
      style: 'currency', currency: AQ.CURRENCY || 'ZAR', maximumFractionDigits: 0
    }).format(v);
  };

  window.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  window.debounce = function (fn, ms) {
    var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 250); };
  };

  /* Toast */
  window.toast = function (msg, kind) {
    var w = document.getElementById('toastWrap');
    if (!w) { w = document.createElement('div'); w.id = 'toastWrap'; document.body.appendChild(w); }
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || 'gold');
    var ico = { gold: 'fa-crown', err: 'fa-circle-exclamation', green: 'fa-circle-check' }[kind || 'gold'] || 'fa-crown';
    t.innerHTML = '<span class="t-ico"><i class="fas ' + ico + '"></i></span><div>' + window.esc(msg) + '</div>';
    w.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 320); }, 3600);
  };

  /* Modal helper */
  window.openModal = function (html, opts) {
    var existing = document.querySelector('.modal-backdrop');
    if (existing) existing.remove();
    var b = document.createElement('div'); b.className = 'modal-backdrop open';
    b.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' +
      '<button class="close-x" aria-label="Close"><i class="fas fa-xmark"></i></button>' +
      html + '</div>';
    document.body.appendChild(b);
    b.addEventListener('click', function (e) { if (e.target === b) b.remove(); });
    b.querySelector('.close-x').addEventListener('click', function () { b.remove(); });
    if (opts && opts.onOpen) opts.onOpen(b.querySelector('.modal'));
    return b;
  };

  /* Nav builder (desktop + mobile) */
  window.renderNav = function (active) {
    var links = [
      { href: 'index.html', label: 'Home', icon: 'fa-house' },
      { href: 'shop.html', label: 'Shop', icon: 'fa-bag-shopping' },
      { href: 'configurator.html', label: 'Design Your Own', icon: 'fa-wand-magic-sparkles' },
      { href: 'about.html', label: 'Our Story', icon: 'fa-crown' },
      { href: 'journal.html', label: 'Journal', icon: 'fa-book-open' },
      { href: 'faq.html', label: 'FAQ', icon: 'fa-circle-question' }
    ];
    var html = links.map(function (l) {
      return '<a href="' + l.href + '" class="nav-link' + (active === l.label ? ' active' : '') + '">' + l.label + '</a>';
    }).join('');

    var wrap = document.getElementById('navSite');
    if (!wrap) return;
    wrap.innerHTML = '<div class="nav">' +
      '<div class="nav-inner">' +
        '<a href="index.html" class="brand"><span class="mark"><i class="fas fa-crown"></i></span><span>Anointed Queens</span></a>' +
        '<nav class="nav-links" aria-label="Main">' + html + '</nav>' +
        '<div class="nav-cta">' +
          '<button class="icon-btn" id="wishBtn" aria-label="Wishlist" type="button"><i class="fas fa-heart"></i></button>' +
          '<button class="icon-btn" id="cartBtn" aria-label="Cart" type="button"><i class="fas fa-bag-shopping"></i><span class="badge" id="cartBadge" style="display:none">0</span></button>' +
          '<button class="icon-btn burger" id="burgerBtn" aria-label="Menu" type="button"><i class="fas fa-bars"></i></button>' +
        '</div>' +
      '</div>' +
      '<nav class="mobile-menu" id="mobileMenu" aria-label="Mobile">' + html + '</nav>' +
    '</div>';
    document.getElementById('wishBtn').addEventListener('click', function () {
      if (!window.AQAuth || !AQAuth.currentUser()) { toast('Sign in to view your wishlist', 'err'); return; }
      location.href = 'wishlist.html';
    });
    document.getElementById('cartBtn').addEventListener('click', function () { location.href = 'cart.html'; });
    var mb = document.getElementById('mobileMenu');
    document.getElementById('burgerBtn').addEventListener('click', function () { mb.classList.toggle('open'); });
    window.updateCartBadge = function () {
      var n = AQCart.count();
      var render = function (v) {
        if (v > 0) { document.getElementById('cartBadge').style.display = 'grid'; document.getElementById('cartBadge').textContent = v; }
        else { document.getElementById('cartBadge').style.display = 'none'; }
      };
      if (n && typeof n.then === 'function') n.then(render); else render(n);
    };
    window.renderNav.wasCalled = true;
  };

  /* Footer builder */
  window.renderFooter = function () {
    var f = document.getElementById('footerSite');
    if (!f) return;
    var y = new Date().getFullYear();
    f.innerHTML =
      '<footer class="footer">' +
        '<div class="footer-grid">' +
          '<div><h4>Anointed Queens</h4><p style="font-size:.9rem;color:var(--text-muted)">Handcrafted custom bags for the discerning. Every piece is designed, cut and finished by hand in our atelier.</p></div>' +
          '<div><h4>Shop</h4><ul><li><a href="shop.html">All Bags</a></li><li><a href="configurator.html">Design Your Own</a></li><li><a href="wishlist.html">Wishlist</a></li><li><a href="loyalty.html">Anointed Club</a></li></ul></div>' +
          '<div><h4>House</h4><ul><li><a href="about.html">Our Story</a></li><li><a href="journal.html">Journal</a></li><li><a href="faq.html">FAQ</a></li><li><a href="contact.html">Contact</a></li></ul></div>' +
          '<div><h4>Account</h4><ul>' +
            (window.AQAuth && AQAuth.currentUser() ? '<li><a href="orders.html">My Orders</a></li><li><a href="account.html">Profile</a></li><li><a href="#" id="footLogout">Sign out</a></li>' : '<li><a href="login.html">Sign in</a></li><li><a href="register.html">Join the Club</a></li>') +
          '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>&copy; ' + y + ' Anointed Queens. All rights reserved. Crowned in craft.</span>' +
          '<span>Escrow protected &bull; Handcrafted in South Africa</span>' +
        '</div>' +
      '</footer>';
    var lo = document.getElementById('footLogout');
    if (lo) lo.addEventListener('click', function (e) { e.preventDefault(); if (window.AQAuth) AQAuth.signOut().then(function () { location.href = 'index.html'; }); });
  };

  window.renderPageShell = function (active) {
    window.renderNav(active);
    window.renderFooter();
  };

  /* Common init */
  document.addEventListener('DOMContentLoaded', function () {
    window.renderPageShell(window.BODY_ACTIVE || '');
    if (window.AQCart) window.updateCartBadge();

    /* theme toggle (body.light) */
    var tt = document.getElementById('themeToggle');
    if (tt) tt.addEventListener('click', function () { document.body.classList.toggle('light'); });

    /* footer fixed: keep body flex */
    var w = document.getElementById('footerSite');
    if (w) w.classList.add('footer-flex');
  });
})();