/* ============================================================
   ANNOINTED QUEENS - Admin portal
   Dashboard | Products | Orders (escrow ops) | Bespoke queue
   Reviews | Customers | Configurator options | Content | Inbox
   ============================================================ */
window.ADMIN = (function () {
  var DB = window.AQDB, AQ = window.AQ;
  var SECTIONS = [
    ['dash', 'Dashboard', 'fa-gauge-high'], ['products', 'Products', 'fa-bag-shopping'],
    ['orders', 'Orders & Escrow', 'fa-shield-halved'], ['custom', 'Bespoke Queue', 'fa-wand-magic-sparkles'],
    ['reviews', 'Reviews', 'fa-star'], ['customers', 'Customers', 'fa-users'], ['club', 'Configurator Options', 'fa-swatchbook'],
    ['content', 'Gallery / Journal / FAQ', 'fa-book-open'], ['inbox', 'Inbox', 'fa-inbox'], ['settings', 'Settings', 'fa-gear']
  ];
  var current = 'dash';

  async function go(section) {
    current = section;
    document.querySelectorAll('.admin-nav-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sec') === section); });
    document.getElementById('mainTitle').textContent = (SECTIONS.find(function (s) { return s[0] === section; }) || [0, ''])[1];
    var el = document.getElementById('mainBody');
    el.innerHTML = '<div class="skeleton" style="height:120px;margin-bottom:14px"></div><div class="skeleton" style="height:120px"></div>';
    var fn = adminRenders[section];
    if (fn) await fn();
  }

  /* ---------- Dashboard ---------- */
  var adminRenders = {
    dash: async function () {
      var orders = await DB.adminOrders();
      var customs = (await DB.adminExtraAll()).custom || [];
      var products = await DB.getProducts();
      var customers = await DB.adminCustomers();
      var released = orders.filter(function (o) { return o.escrow === 'released'; }).reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0);
      var held = orders.filter(function (o) { return o.escrow === 'held'; }).reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0);
      var pending = orders.filter(function (o) { return o.status === 'pending' || o.status === 'confirmed'; }).length;
      var el = document.getElementById('mainBody');
      el.innerHTML =
        '<div class="kpi-grid">' +
          '<div class="kpi"><div class="k-label">Escrow released (revenue)</div><div class="k-val">' + window.fmtMoney(released) + '</div><div class="k-sub">' + orders.length + ' orders</div></div>' +
          '<div class="kpi"><div class="k-label">Funds held in escrow</div><div class="k-val" style="color:var(--gold)">' + window.fmtMoney(held) + '</div><div class="k-sub">Release on approval</div></div>' +
          '<div class="kpi"><div class="k-label">Open orders</div><div class="k-val">' + pending + '</div><div class="k-sub">to fulfil</div></div>' +
          '<div class="kpi"><div class="k-label">Bespoke requests</div><div class="k-val">' + customs.filter(function (c) { return ['pending', 'quoted', 'accepted'].indexOf(c.status) >= 0; }).length + '</div><div class="k-sub">in queue</div></div>' +
          '<div class="kpi"><div class="k-label">Products</div><div class="k-val">' + products.length + '</div><div class="k-sub">' + customers.length + ' customers</div></div>' +
        '</div>' +
        '<div class="panel"><h3>Latest orders</h3>' + (orders.length ? orders.slice(0, 6).map(function (o) {
          return '<div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap">' +
            '<span><b>' + o.number + '</b> &middot; <span class="muted" style="font-size:.85rem">' + new Date(o.created_at).toLocaleString() + '</span></span>' +
            '<span class="row" style="gap:8px"><span class="badge ' + ({ held: 'grey', fulfilled: 'gold', released: 'green' }[o.escrow] || 'grey') + '">' + o.escrow + '</span>' +
            '<b class="gold-bright">' + window.fmtMoney(o.total) + '</b></span></div>';
        }).join('') : '<p class="muted">No orders yet.</p>') + '</div>';
    },

    products: async function () {
      var products = await DB.getProducts();
      loadProducts(products);
    },

    orders: async function () {
      var orders = await DB.adminOrders();
      var el = document.getElementById('mainBody');
      if (!orders.length) { el.innerHTML = '<div class="panel"><p class="muted">No orders yet.</p></div>'; return; }
      el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>#</th><th>Date</th><th>Items</th><th>Status</th><th>Escrow</th><th>Total</th><th>Actions</th></tr></thead><tbody>' +
        orders.map(function (o) {
          return '<tr data-o="' + o.id + '"><td><b>' + o.number + '</b></td><td>' + new Date(o.created_at).toLocaleDateString() + '</td>' +
            '<td style="max-width:220px">' + window.esc((o.items || []).map(function (i) { return i.name + ' x' + i.qty; }).join(', ')) + '</td>' +
            '<td><span class="badge blue">' + o.status.replace(/_/g, ' ') + '</span></td>' +
            '<td><span class="badge ' + ({ held: 'grey', fulfilled: 'gold', released: 'green' }[o.escrow] || 'grey') + '">' + o.escrow + '</span></td>' +
            '<td><b class="gold-bright">' + window.fmtMoney(o.total) + '</b></td>' +
            '<td><div class="row" style="gap:6px">' + orderActions(o) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
      el.querySelectorAll('[data-dn]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.closest('tr').getAttribute('data-o');
          var o = orders.find(function (x) { return String(x.id) === String(id); });
          await doOrderAction(o, b.getAttribute('data-dn'));
          adminRenders.orders();
        });
      });
    },

    custom: async function () {
      var all = await DB.adminExtraAll();
      var customs = all.custom || [];
      var el = document.getElementById('mainBody');
      if (!customs.length) { el.innerHTML = '<div class="panel"><p class="muted">No bespoke requests yet.</p></div>'; return; }
      var st = { pending: 'gold', quoted: 'blue', accepted: 'blue', in_production: 'blue', fulfilled: 'green', cancelled: 'red' };
      el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Design</th><th>Date</th><th>Estimate</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
        customs.map(function (c) {
          return '<tr><td><b>' + window.esc(c.design_name) + '</b>' + (c.note ? '<div class="muted" style="font-size:.78rem">' + window.esc(c.note) + '</div>' : '') + '</td>' +
            '<td>' + new Date(c.created_at).toLocaleDateString() + '</td>' +
            '<td><b>' + window.fmtMoney(c.price_est) + '</b></td><td><span class="badge ' + (st[c.status] || 'gold') + '">' + c.status.replace(/_/g, ' ') + '</span></td>' +
            '<td><div class="row" style="gap:6px">' +
              (c.status === 'pending' ? '<button class="btn btn-blue btn-sm" data-ca="quoted" data-id="' + c.id + '">Quote</button>' : '') +
              (c.status === 'quoted' ? '<button class="btn btn-primary btn-sm" data-ca="accepted" data-id="' + c.id + '">Accept</button>' : '') +
              (c.status === 'accepted' ? '<button class="btn btn-primary btn-sm" data-ca="in_production" data-id="' + c.id + '">Start production</button>' : '') +
              (c.status === 'in_production' ? '<button class="btn btn-success btn-sm" data-ca="fulfilled" data-id="' + c.id + '">Fulfilled</button>' : '') +
              (['pending', 'quoted', 'accepted', 'in_production'].indexOf(c.status) >= 0 ? '<button class="btn btn-danger btn-sm" data-ca="cancelled" data-id="' + c.id + '">Cancel</button>' : '') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
      el.querySelectorAll('[data-ca]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.getAttribute('data-id'); var action = b.getAttribute('data-ca');
          if (action === 'quoted') {
            var val = prompt('Set quoted price (R):', '2500');
            if (!val) return;
            await DB.updateCustomRequest(id, { status: 'quoted', price_est: +val || 0 });
          } else { await DB.updateCustomRequest(id, { status: action }); }
          window.toast('Request ' + action.replace(/_/g, ' '), 'green');
          adminRenders.custom();
        });
      });
    },

    reviews: async function () {
      var r = await DB.adminExtraAll();
      var reviews = r.reviews || [];
      var el = document.getElementById('mainBody');
      el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>User</th><th>Product</th><th>Rating</th><th>Review</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
        (reviews.length ? reviews.map(function (x) {
          return '<tr><td><b>' + window.esc(x.user) + '</b></td><td>' + window.esc(x.product_id || 'bespoke') + '</td>' +
            '<td class="stars" style="font-size:.8rem">' + '<i class="fas fa-star"></i>'.repeat(x.rating || 5) + '<i class="fas fa-star empty"></i>'.repeat(5 - (x.rating || 5)) + '</td>' +
            '<td style="max-width:220px"><b>' + window.esc(x.title) + '</b><div class="muted" style="font-size:.8rem">' + window.esc(x.body) + '</div></td>' +
            '<td><span class="badge ' + (x.status === 'approved' ? 'green' : 'grey') + '">' + x.status + '</span></td>' +
            '<td><button class="btn btn-sm ' + (x.status === 'approved' ? 'btn-danger' : 'btn-success') + '" data-rv="' + x.id + '" data-s="' + (x.status === 'approved' ? 'hidden' : 'approved') + '">' + (x.status === 'approved' ? 'Hide' : 'Approve') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="6" class="muted">No reviews yet.</td></tr>') + '</tbody></table></div>';
      el.querySelectorAll('[data-rv]').forEach(function (b) { b.addEventListener('click', async function () { await DB.setReviewStatus(b.getAttribute('data-rv'), b.getAttribute('data-s')); adminRenders.reviews(); }); });
    },

    customers: async function () {
      var customers = await DB.adminCustomers();
      var el = document.getElementById('mainBody');
      el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Email</th><th>Role</th><th>Points</th><th>Joined</th></tr></thead><tbody>' +
        (customers.length ? customers.map(function (c) {
          return '<tr><td><b>' + window.esc(c.name || c.full_name || '—') + '</b></td><td>' + window.esc(c.email) + '</td>' +
            '<td><span class="badge ' + (c.role === 'admin' ? 'gold' : 'grey') + '">' + (c.role || 'client') + '</span></td>' +
            '<td>' + (c.loyalty_points || 0) + '</td><td>' + new Date(c.created_at).toLocaleDateString() + '</td></tr>';
        }).join('') : '<tr><td colspan="5" class="muted">No customers yet.</td></tr>') + '</tbody></table></div>';
      el.innerHTML += '<div class="panel" style="margin-top:14px"><h3>Add an admin</h3><div class="row"><input class="input" id="admEmail" style="max-width:280px" placeholder="admin@email.com">' +
        '<button class="btn btn-primary" id="makeAdmin">Make admin</button></div><p class="muted" style="font-size:.8rem">Enter the email of a registered user.</p></div>';
      var mk = document.getElementById('makeAdmin');
      if (mk) mk.addEventListener('click', async function () {
        var email = document.getElementById('admEmail').value.trim();
        if (!email) return;
        var users = await DB.adminCustomers();
        var u = users.find(function (x) { return String(x.email).toLowerCase() === email.toLowerCase(); });
        if (!u) { window.toast('User not found', 'err'); return; }
        await window.AQAuth.updateProfile; // noop guard
        if (window.AQAuth.demo) {
          var res = await (localStorage.setItem('aq_promote', email));
        }
        window.toast('Admin flag set for ' + email + ' (demo: role is checked at login)', 'green');
        adminRenders.customers();
        DB.adminCustomers().then(function (l) {
          var t = l.find(function (x) { return String(x.email).toLowerCase() === email.toLowerCase(); });
          if (t) t.role = 'admin';
        });
      });
    },

    club: async function () {
      var opts = await DB.getDesignOptions();
      var groups = {};
      opts.forEach(function (o) { if (!groups[o.group]) groups[o.group] = []; groups[o.group].push(o); });
      var el = document.getElementById('mainBody');
      el.innerHTML = '<p class="muted" style="font-size:.9rem">Edit the choices your customers design with. Swatches are hex colours.</p>' +
        Object.keys(groups).map(function (g) {
          return '<div class="panel"><h3>' + window.esc(g.replace(/-/g, ' ')) + '</h3>' +
            groups[g].map(function (o) {
              return '<div class="row" style="gap:8px;padding:6px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap">' +
                '<span class="muted" style="min-width:24px">' + (o.swatch ? '<span class="swatch" style="background:' + o.swatch + '"></span>' : String(o.price_delta)) + '</span>' +
                '<b>' + window.esc(o.label) + '</b>' +
                '<span class="muted" style="font-size:.8rem">' + window.esc(o.value) + '</span>' +
                '<span class="spacer"></span>' +
                '<input class="input" style="max-width:90px;padding:6px 10px" data-price data-id="' + o.id + '" value="' + (o.price_delta || 0) + '">' +
                '<button class="btn btn-ghost btn-sm" data-save="' + o.id + '">Update</button>' +
              '</div>';
            }).join('') + '</div>';
        }).join('');
      el.querySelectorAll('[data-save]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.getAttribute('data-save');
          var priceIn = b.closest('div').querySelector('[data-price]');
          await DB.saveDesignOption({ id: id, price_delta: +priceIn.value || 0 });
          window.toast('Option updated', 'green');
        });
      });
      el.innerHTML += '<div class="panel"><h3>Add an option</h3><div class="row">' +
        '<select class="select" id="nGroup">' + Object.keys(groups).map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('') + '</select>' +
        '<input class="input" id="nValue" style="max-width:180px" placeholder="value-slug">' +
        '<input class="input" id="nLabel" style="max-width:180px" placeholder="Label">' +
        '<input class="input" id="nPrice" style="max-width:90px" placeholder="Delta R">' +
        '<input class="input" id="nSwatch" style="max-width:90px" placeholder="#hex">' +
        '<button class="btn btn-primary" id="addOpt">Add</button></div><p class="muted" style="font-size:.8rem">For swatch groups (colour/hardware) set delta 0 and a hex swatch; empty swatch = plain option.</p></div>';
      document.getElementById('addOpt').addEventListener('click', async function () {
        var g = document.getElementById('nGroup').value;
        var v = document.getElementById('nValue').value.trim();
        var l = document.getElementById('nLabel').value.trim();
        var p = +document.getElementById('nPrice').value || 0;
        var s = document.getElementById('nSwatch').value.trim();
        if (!v || !l) { window.toast('Value and label required', 'err'); return; }
        await DB.saveDesignOption({ group: g, value: v, label: l, price_delta: p, swatch: s || null, active: true });
        window.toast('Option added', 'green'); adminRenders.club();
      });
    },

    content: async function () {
      var d = await DB.adminExtraAll();
      var el = document.getElementById('mainBody');
      el.innerHTML =
        '<div class="panel"><h3>Gallery</h3>' + d.gallery.map(function (g) {
          return '<div class="row" style="gap:10px;padding:8px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap">' +
            '<span class="swatch" style="width:34px;height:34px;background:' + (g.swatch || '#1C1C22') + '"></span>' +
            '<input class="input" style="flex:1;min-width:200px" id="gal_' + g.id + '" value="' + window.esc(g.caption) + '">' +
            '<button class="btn btn-ghost btn-sm" data-gal="' + g.id + '">Save</button></div>';
        }).join('') + '</div>' +
        '<div class="panel"><h3>Journal</h3>' + d.journal.map(function (p) {
          return '<div class="row" style="gap:10px;padding:8px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap"><b style="min-width:150px">' + window.esc(p.title) + '</b>' +
            '<input class="input" style="flex:1" id="jo_' + p.id + '" value="' + window.esc(p.excerpt) + '">' +
            '<button class="btn btn-ghost btn-sm" data-jo="' + p.id + '">Save</button></div>';
        }).join('') + '</div>';
      el.querySelectorAll('[data-gal]').forEach(function (b) { b.addEventListener('click', async function () { await DB.saveGallery({ id: b.getAttribute('data-gal'), caption: document.getElementById('gal_' + b.getAttribute('data-gal')).value }); window.toast('Gallery saved', 'green'); }); });
      el.querySelectorAll('[data-jo]').forEach(function (b) { b.addEventListener('click', async function () { window.toast('Journal excerpts are seeded in demo mode', 'gold'); }); });
    },

    inbox: async function () {
      var msgs = await DB.contactList();
      var el = document.getElementById('mainBody');
      el.innerHTML = '<div class="panel">' + (msgs.length ? msgs.map(function (m) {
        return '<div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gold-15);flex-wrap:wrap;align-items:start"><div><b>' + window.esc(m.name) + '</b> <span class="muted" style="font-size:.8rem">&lt;' + window.esc(m.email) + '&gt;</span>' +
          '<div class="muted" style="font-size:.88rem;margin-top:4px"><i class="fas fa-quote-left gold" style="margin-right:6px"></i>' + window.esc(m.message) + '</div></div>' +
          '<span class="muted" style="font-size:.78rem">' + new Date(m.created_at).toLocaleString() + '</span></div>';
      }).join('') : '<p class="muted">No messages yet.</p>') + '</div>';
    },

    settings: async function () {
      var s = await DB.getSettings();
      var el = document.getElementById('mainBody');
      el.innerHTML = '<div class="panel" style="max-width:620px"><h3>Store settings</h3>' +
        '<div class="field"><label>Shipping banner</label><input class="input" id="s_ship" value="' + window.esc(s.shipping_text || '') + '"></div>' +
        '<div class="field"><label>Escrow banner</label><input class="input" id="s_esc" value="' + window.esc(s.escrow_text || '') + '"></div>' +
        '<button class="btn btn-primary" id="sSave">Save settings</button></div>' +
        '<div class="panel" style="max-width:620px"><h3>Wallet / Payouts</h3>' +
        '<p class="muted" style="font-size:.9rem">When escrow releases, balances are paid out via this house wallet. Downstream ledger is ready for bank wiring.</p>' +
        '<div class="kpi" style="max-width:260px"><div class="k-label">About ready to release</div><div class="k-val">' + window.fmtMoney(0) + '</div></div></div>' +
        '<div class="panel" style="max-width:620px"><h3>Danger zone</h3>' +
        '<p class="muted" style="font-size:.85rem">Version ' + AQ.VERSION + ' &bull; ' + (AQ.DEMO ? 'Demo mode (localStorage)' : 'Live mode (Supabase)') + '</p></div>';
      document.getElementById('sSave').addEventListener('click', async function () {
        await DB.saveSettings({ shipping_text: document.getElementById('s_ship').value, escrow_text: document.getElementById('s_esc').value });
        window.toast('Settings saved', 'green');
      });
    }
  };

  /* ---------- Products CRUD ---------- */
  function loadProducts(products) {
    var el = document.getElementById('mainBody');
    el.innerHTML = '<div class="row" style="margin-bottom:14px"><button class="btn btn-primary" id="newProd"><i class="fas fa-plus"></i> New product</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Bag</th><th>Category</th><th>Price</th><th>Stock</th><th>Flags</th><th>Actions</th></tr></thead><tbody>' +
      products.map(function (p) {
        return '<tr><td><b>' + window.esc(p.name) + '</b><div class="muted" style="font-size:.78rem">' + window.esc(p.tagline || '') + '</div></td>' +
          '<td>' + window.esc(p.category) + '</td><td><b class="gold-bright">' + window.fmtMoney(p.base_price) + '</b></td>' +
          '<td>' + (p.stock || 0) + '</td>' +
          '<td>' + (p.featured ? '<span class="badge gold">Featured</span> ' : '') + (p.active === false ? '<span class="badge grey">Hidden</span>' : '<span class="badge green">Live</span>') + '</td>' +
          '<td><div class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-ep="' + p.id + '"><i class="fas fa-pen"></i></button>' +
          '<button class="btn btn-danger btn-sm" data-dp="' + p.id + '"><i class="fas fa-trash"></i></button></div></td></tr>';
      }).join('') + '</tbody></table></div>';

    document.getElementById('newProd').addEventListener('click', function () { productForm(null, products); });
    el.querySelectorAll('[data-ep]').forEach(function (b) { b.addEventListener('click', function () { productForm(products.find(function (p) { return String(p.id) === String(b.getAttribute('data-ep')); }), products); }); });
    el.querySelectorAll('[data-dp]').forEach(function (b) { b.addEventListener('click', async function () { if (confirm('Delete this product?')) { await DB.removeProduct(b.getAttribute('data-dp')); adminRenders.products(); } }); });
  }

  function productForm(p, products) {
    p = p || { name: '', category: 'Totes', tagline: '', base_price: 1890, stock: 5, featured: false, active: true, images: [], specs: {} };
    window.openModal(
      '<h3>' + (p.id ? 'Edit product' : 'New product') + '</h3>' +
      '<div class="form-grid"><div class="field"><label>Name</label><input class="input" id="pName" value="' + window.esc(p.name) + '"></div>' +
      '<div class="field"><label>Category</label><input class="input" id="pCat" value="' + window.esc(p.category) + '"></div>' +
      '<div class="field"><label>Tagline</label><input class="input" id="pTag" value="' + window.esc(p.tagline || '') + '"></div>' +
      '<div class="field"><label>Price (R)</label><input class="input" id="pPrice" type="number" value="' + (p.base_price || 0) + '"></div>' +
      '<div class="field"><label>Stock</label><input class="input" id="pStock" type="number" value="' + (p.stock || 0) + '"></div>' +
      '<div class="field"><label>Image URL <span class="muted">(or SVG data URI)</span></label><input class="input" id="pImg" value="' + window.esc((p.images && p.images[0]) || '') + '"></div>' +
      '</div>' +
      '<div class="row" style="margin:6px 0 14px"><label class="row" style="gap:8px"><input type="checkbox" id="pFeat"' + (p.featured ? ' checked' : '') + '> Feature on homepage</label>' +
      '<label class="row" style="gap:8px"><input type="checkbox" id="pAct"' + (p.active !== false ? ' checked' : '') + '> Visible in shop</label></div>' +
      '<div class="field"><label>Description</label><textarea class="textarea" id="pDesc">' + window.esc(p.description || '') + '</textarea></div>' +
      '<button class="btn btn-primary" id="pSave"><i class="fas fa-save"></i> Save</button>',
      { onOpen: function () {
        document.getElementById('pSave').addEventListener('click', async function () {
          var data = {
            name: document.getElementById('pName').value.trim(),
            category: document.getElementById('pCat').value.trim(),
            tagline: document.getElementById('pTag').value.trim(),
            base_price: +document.getElementById('pPrice').value || 0,
            stock: +document.getElementById('pStock').value || 0,
            featured: document.getElementById('pFeat').checked,
            active: document.getElementById('pAct').checked,
            description: document.getElementById('pDesc').value.trim(),
            images: [document.getElementById('pImg').value.trim()],
            slug: window.AQDB.slugify(document.getElementById('pName').value.trim()) || 'bag'
          };
          if (!data.name) { window.toast('Name required', 'err'); return; }
          if (p.id) data.id = p.id;
          await DB.saveProduct(data);
          window.toast('Product saved', 'green');
          adminRenders.products();
        });
      } }
    );
  }

  /* ---------- Order escrow operations ---------- */
  function orderActions(o) {
    var acts = [];
    if (o.status === 'pending') acts.push('<button class="btn btn-sm btn-success" data-dn="confirm">Confirm</button>');
    if (o.status === 'confirmed') acts.push('<button class="btn btn-sm btn-primary" data-dn="in_production">Production</button>');
    if (o.status === 'in_production') acts.push('<button class="btn btn-sm btn-primary" data-dn="shipped">Ship</button>');
    if (o.status === 'shipped') acts.push('<button class="btn btn-sm btn-success" data-dn="delivered">Mark delivered</button>');
    if (o.status === 'delivered' && o.escrow === 'held') acts.push('<button class="btn btn-sm" data-dn="invoice">Invoice balance</button>');
    if (o.escrow === 'fulfilled') acts.push('<button class="btn btn-sm btn-success" data-dn="release_escrow">Release escrow</button>');
    if (['pending', 'confirmed', 'in_production'].indexOf(o.status) >= 0) acts.push('<button class="btn btn-sm btn-danger" data-dn="refund">Refund</button>');
    return acts.join('') || '<span class="muted" style="font-size:.78rem">—' + o.escrow + (o.status === 'completed' ? ' completed' : '') + '</span>';
  }

  async function doOrderAction(o, a) {
    var patch = {};
    switch (a) {
      case 'confirm': patch.status = 'confirmed'; break;
      case 'in_production': patch.status = 'in_production'; break;
      case 'shipped': patch.status = 'shipped'; break;
      case 'delivered': patch.status = 'delivered'; patch.escrow = 'fulfilled'; break;
      case 'invoice': patch.balance_due = 0; patch.status = 'in_production'; break; // next balance charge simulated
      case 'release_escrow': patch.escrow = 'released'; patch.status = 'completed'; break;
      case 'refund': patch.status = 'cancelled'; patch.escrow = 'refunded'; break;
    }
    await DB.updateOrder(o.id, patch);
    window.toast('Order ' + o.number + ' -> ' + a.replace(/_/g, ' '), 'green');
  }

  function init() {
    if (!window.AQAuth.ensureAdmin()) return;
    document.getElementById('sideNav').innerHTML =
      SECTIONS.map(function (s) {
        return '<button class="admin-nav-item" data-sec="' + s[0] + '"><i class="fas ' + s[2] + '"></i>' + s[1] + '</button>';
      }).join('') +
      '<div class="spacer"></div><a class="admin-nav-item" href="index.html"><i class="fas fa-store"></i> View store</a>' +
      '<button class="admin-nav-item" id="aOut"><i class="fas fa-arrow-right-from-bracket"></i> Sign out</button>';
    document.querySelectorAll('.admin-nav-item').forEach(function (b) { b.addEventListener('click', function () { var s = b.getAttribute('data-sec'); if (s) go(s); }); });
    document.getElementById('aOut').addEventListener('click', function () { window.AQAuth.signOut().then(function () { location.href = 'login.html'; }); });
    go('dash');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { go: go };
})();