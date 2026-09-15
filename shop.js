/* ============================================================
   ANNOINTED QUEENS - shop catalog
   ============================================================ */
window.SHOP = (function () {
  var DB = window.AQDB;

  function cardHTML(p) {
    var flags = '';
    if (p.featured) flags += '<span class="tag">Signature</span>';
    if (p.in_stock === false) flags += '<span class="tag sold">Sold out</span>';
    else if (p.stock > 0 && p.stock <= 5) flags += '<span class="tag low">Only ' + p.stock + ' left</span>';
    var img = p.images && p.images[0] ? '<img src="' + p.images[0] + '" alt="' + window.esc(p.name) + '" loading="lazy">' : '';
    return '<a href="product.html?id=' + p.id + '" class="card card-hover product-card">' +
      '<div class="thumb"><div class="flags">' + flags + '</div>' + img + '</div>' +
      '<div class="body">' +
      '<div class="cat">' + window.esc(p.category || 'Custom') + '</div>' +
      '<div class="name">' + window.esc(p.name) + '</div>' +
      '<div class="muted" style="font-size:.86rem">' + window.esc(p.tagline || '') + '</div>' +
      '<div class="price-row"><span class="price">' + window.fmtMoney(p.base_price) + '</span>' +
        (p.sale_price ? '<span class="price old">' + window.fmtMoney(p.sale_price) + '</span>' : '') +
      '</div></div></a>';
  }

  async function render() {
    var wrap = document.getElementById('productGrid');
    var count = document.getElementById('prodCount');
    var q = { search: (document.getElementById('q') || {}).value || '', category: (document.getElementById('cat') || {}).value || '', sort: (document.getElementById('sort') || {}).value || 'featured' };

    var categories = await DB.getCategories();
    var tabs = document.getElementById('catTabs');
    if (tabs) {
      var btns = '<button class="filter-tab' + (!q.category ? ' active' : '') + '" data-cat="">All</button>';
      categories.forEach(function (c) { btns += '<button class="filter-tab' + (q.category === c ? ' active' : '') + '" data-cat="' + window.esc(c) + '">' + window.esc(c) + '</button>'; });
      tabs.innerHTML = btns;
      tabs.querySelectorAll('.filter-tab').forEach(function (b) {
        b.addEventListener('click', function () {
          var cat = b.getAttribute('data-cat');
          var sel = document.getElementById('cat'); sel.value = cat;
          render();
        });
      });
    }

    var list = await DB.getProducts({ category: q.category || '', search: q.search });
    if (q.sort === 'price-asc') list.sort(function (a, b) { return a.base_price - b.base_price; });
    else if (q.sort === 'price-desc') list.sort(function (a, b) { return b.base_price - a.base_price; });
    else list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });

    if (count) count.textContent = list.length;
    if (wrap) {
      wrap.innerHTML = list.length ? list.map(cardHTML).join('') :
        '<div class="empty-state" style="grid-column:1/-1"><div class="ico"><i class="fas fa-crown"></i></div><h3>Nothing matched</h3><p class="muted">Try another search or category.</p></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var submit = document.getElementById('filterForm');
    if (submit) submit.addEventListener('submit', function (e) { e.preventDefault(); render(); });
    var q = document.getElementById('q');
    if (q) q.addEventListener('input', window.debounce(render, 350));
    var sort = document.getElementById('sort');
    if (sort) sort.addEventListener('change', render);
    render();
  });

  return { render: render, cardHTML: cardHTML };
})();