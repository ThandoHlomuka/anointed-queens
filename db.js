/* ============================================================
   ANNOINTED QUEENS - data layer
   LIVE: Supabase REST when configured. DEMO: localStorage with
   a seeded catalog so the entire store works with zero backend.
   Same async API surface for both.
   ============================================================ */
window.AQDB = (function () {
  var AQ = window.AQ;
  var FK = 'aq_'; // local collection prefix

  var supabase = null;
  if (!AQ.DEMO && window.supabase) {
    supabase = window.supabase.createClient(AQ.SUPABASE_URL, AQ.SUPABASE_ANON_KEY);
  }

  function ls(t) {
    try { return JSON.parse(localStorage.getItem(FK + t)) || []; } catch (e) { return []; }
  }
  function ss(t, v) { localStorage.setItem(FK + t, JSON.stringify(v)); }
  function nid() { return 'aq_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function from(arr, id) { return arr.find(function (x) { return String(x.id) === String(id); }); }
  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* ---------- inline SVG bag art for the demo catalog ---------- */
  function bagSvg(color, hw, accent) {
    var c = color || '#1C1C22', h = hw || '#D4AF37';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0.72"/></linearGradient></defs>' +
      '<rect width="200" height="230" fill="#0A0A0A"/>' +
      '<ellipse cx="100" cy="100" rx="64" ry="76" fill="url(#g)"/>' +
      '<ellipse cx="100" cy="40" rx="34" ry="18" fill="none" stroke="' + h + '" stroke-width="7"/>' +
      '<rect x="92" y="96" width="16" height="10" rx="3" fill="' + h + '"/>' +
      (accent ? '<text x="100" y="150" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="16" fill="' + h + '">' + accent + '</text>' : '') +
      '<ellipse cx="100" cy="100" rx="64" ry="76" fill="none" stroke="' + h + '" stroke-width="1.5" opacity="0.55"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- DEMO SEED ---------- */
  function seedProducts() {
    if (localStorage.getItem(FK + 'products_seeded')) return;
    var P = [
      { id: 'p1', slug: 'sovereign-tote', name: 'The Sovereign', category: 'Totes', tagline: 'Our flagship full-grain leather tote.', base_price: 2490, deposit_pct: 50, featured: true, stock: 12, images: [bagSvg('#2A2118', '#D4AF37', 'AQ')], specs: { leather: 'Full-Grain', hardware: 'Antique Gold', sizes: 'M / L' }, seo_title: 'The Sovereign Tote | Anointed Queens', seo_desc: 'Flagship full-grain leather tote, handcrafted.' },
      { id: 'p2', slug: 'the-empress', name: 'The Empress', category: 'Clutches', tagline: 'Evening clutch adorned in polished gold.', base_price: 1690, deposit_pct: 50, featured: true, stock: 8, images: [bagSvg('#3A2E20', '#FFD700', 'E')], specs: { leather: 'Pebble Leather', hardware: 'Polished Gold', sizes: 'One size' }, seo_title: 'The Empress Clutch | Anointed Queens', seo_desc: 'Gold-adorned evening clutch.' },
      { id: 'p3', slug: 'the-duke', name: 'The Duke', category: 'Satchels', tagline: 'Structured satchel with clean chrome lines.', base_price: 2150, deposit_pct: 50, featured: true, stock: 10, images: [bagSvg('#111318', '#C0C5CE', 'D')], specs: { leather: 'Full-Grain', hardware: 'Polished Silver', sizes: 'M / L' }, seo_title: 'The Duke Satchel | Anointed Queens', seo_desc: 'Structured men\u2019s satchel.' },
      { id: 'p4', slug: 'crown-jewel-mini', name: 'The Crown Jewel', category: 'Mini', tagline: 'Mini bag with maximum presence.', base_price: 1290, deposit_pct: 50, featured: false, stock: 15, images: [bagSvg('#0B1F16', '#D4AF37', '\u2661')], specs: { leather: 'Suede + Leather', hardware: 'Antique Gold', sizes: 'Mini' }, seo_title: 'The Crown Jewel Mini | Anointed Queens', seo_desc: 'Mini bag in suede and leather.' },
      { id: 'p5', slug: 'the-marquise', name: 'The Marquise', category: 'Crossbody', tagline: 'Hands-free heritage crossbody.', base_price: 1980, deposit_pct: 50, featured: false, stock: 9, images: [bagSvg('#181820', '#D4AF37', 'AQ')], specs: { leather: 'Full-Grain', hardware: 'Gunmetal', sizes: 'S / M' }, seo_title: 'The Marquise Crossbody | Anointed Queens', seo_desc: 'Heritage crossbody bag.' },
      { id: 'p6', slug: 'the-legacy', name: 'The Legacy', category: 'Backpacks', tagline: 'A weekender backpack built for decades.', base_price: 3250, deposit_pct: 50, featured: true, stock: 6, images: [bagSvg('#2A2118', '#FFD700', 'AQ')], specs: { leather: 'Full-Grain', hardware: 'Antique Gold', sizes: 'One size' }, seo_title: 'The Legacy Backpack | Anointed Queens', seo_desc: 'Heritage weekender backpack.' }
    ];
    ss('products', P);
    localStorage.setItem(FK + 'products_seeded', '1');
  }

  function seedDesignOptions() {
    if (localStorage.getItem(FK + 'opts_seeded')) return;
    var groups = [
      { group: 'style', label: 'Bag Style', values: [['tote', 'Tote', 0], ['satchel', 'Satchel', 0], ['crossbody', 'Crossbody', 0], ['clutch', 'Clutch', 0], ['mini-bag', 'Mini Bag', 0], ['weekender', 'Weekender', 300]] },
      { group: 'fabric', label: 'Material', values: [['full-grain-leather', 'Full-Grain Leather', 0], ['pebble-leather', 'Pebble Leather', -200], ['suede', 'Suede', -150], ['vegan-pebble', 'Vegan Pebble', -600], ['boucle', 'Boucl\u00e9', -350]] },
      { group: 'colour', label: 'Colour', swatches: [['noir', 'Noir Black', '#191A1F'], ['cognac', 'Cognac', '#8B5A2B'], ['ivory', 'Ivory Cream', '#F2EBD8'], ['blush', 'Blush', '#E8C4C4'], ['bottle-green', 'Bottle Green', '#14453B'], ['royal-gold', 'Royal Gold', '#C9A227'], ['burgundy', 'Burgundy', '#6D1F33'], ['navy', 'Navy', '#1F2A44']] },
      { group: 'size', label: 'Size', values: [['mini', 'Mini', -700], ['small', 'Small', -400], ['medium', 'Medium', 0], ['large', 'Large', 450], ['xl', 'XL', 900]] },
      { group: 'hardware', label: 'Hardware', swatches: [['antique-gold', 'Antique Gold', '#B8860B'], ['polished-gold', 'Polished Gold', '#FFD700'], ['silver', 'Polished Silver', '#C0C5CE'], ['gunmetal', 'Gunmetal', '#5A6472'], ['black-matte', 'Black Matte', '#222428']] },
      { group: 'handle', label: 'Handle / Strap', values: [['leather-top', 'Leather Top Handle', 0], ['chain', 'Gold Chain Drop', 350], ['wooden', 'Wooden Handle', 250], ['long-strap', 'Long Shoulder Strap', 300], ['crossover', 'Crossover Body Strap', 380]] },
      { group: 'lining', label: 'Lining', values: [['cotton', 'Classic Cotton', 0], ['monogrammed', 'Monogrammed Cotton', 150], ['suede-lining', 'Suede Lining', 280]] },
      { group: 'personalisation', label: 'Personalisation', values: [['none', 'No Personalisation', 0], ['initials', 'Gold-Foil Initials (3 letters)', 120], ['monogram', 'Hand Monogram', 220], ['engraved', 'Hardware Engraving', 180]] }
    ];
    var out = [];
    groups.forEach(function (g) {
      if (g.swatches) {
        g.swatches.forEach(function (s) { out.push({ id: g.group + '_' + s[0], group: g.group, value: s[0], label: s[1], price_delta: 0, swatch: s[2] }); });
      } else {
        g.values.forEach(function (v) { out.push({ id: g.group + '_' + v[0], group: g.group, value: v[0], label: v[1], price_delta: v[2] }); });
      }
    });
    ss('design_options', out);
    localStorage.setItem(FK + 'opts_seeded', '1');
  }

  function seedExtras() {
    if (localStorage.getItem(FK + 'extras_seeded')) return;
    ss('gallery', [
      { id: 'g1', caption: 'The Sovereign in Cognac, antique gold hardware', sort: 1, swatch: '#8B5A2B' },
      { id: 'g2', caption: 'The Empress clutch, polished gold chain', sort: 2, swatch: '#FFD700' },
      { id: 'g3', caption: 'The Duke satchel - full grain, chrome hardware', sort: 3, swatch: '#C0C5CE' },
      { id: 'g4', caption: 'Crown Jewel mini in bottle green', sort: 4, swatch: '#14453B' },
      { id: 'g5', caption: 'The Legacy weekender in noir', sort: 5, swatch: '#191A1F' }
    ]);
    ss('journal', [
      { id: 'j1', slug: 'how-to-care-for-your-leather', title: 'Care & Keeping: Your Leather Bag', excerpt: 'A simple routine that keeps your bag gorgeous for years.', body: 'Leather loves consistent, gentle care. Keep your bag dusted, store it in the cotton dust bag away from direct heat, and condition it a few times a year with a quality leather balm. Avoid soaking or harsh cleaners - a soft dry cloth goes a long way. With a little routine, your bag ages beautifully.', author: 'House Care Guide', image: null, published: '2026-09-01' },
      { id: 'j2', slug: 'what-makes-it-custom', title: 'What Makes a Bag Truly Custom?', excerpt: 'From pockets to personal touches - the details that make it yours.', body: 'A true custom bag starts with your day, not a catalogue. It means the right size for your laptop or nappies, a pocket for your phone and cards, a handle height that suits how you carry, materials you love, and the small touches - a name, initials, ribbon colours - that make it unmistakably yours.', author: 'Queens Atelier', image: null, published: '2026-08-18' },
      { id: 'j3', slug: 'the-art-of-meaningful-gifting', title: 'The Art of Meaningful Gifting', excerpt: 'Why a handmade, personalised gift stays remembered long after the occasion.', body: 'Anyone can buy something off a shelf. A gift made to order - with the recipient\u2019s name stitched in, in colours that match their life - does something different. It says you noticed. That is why our corporate clients and personal shoppers alike choose custom: the memory lasts as long as the bag.', author: 'Anointed Queens', image: null, published: '2026-08-02' }
    ]);
    ss('faqs', [
      { id: 'f1', q: 'Do you make bags in South Africa?', a: 'Yes - every Anointed Queens bag is designed, cut and finished by hand in our South African atelier using responsibly sourced premium materials.' },
      { id: 'f2', q: 'Can I buy a ready-to-ship bag?', a: 'Definitely. The shop offers ready-to-ship styles that leave our atelier within 2 business days of your order.' },
      { id: 'f3', q: 'Do you make custom bags?', a: 'Yes - fully custom orders are our specialty. Tell us about your day, choose your materials, and we build the bag around your life. Allow 2-4 weeks from design confirmation.' },
      { id: 'f4', q: 'What materials do you use?', a: 'Premium full-grain leather, gold-toned hardware (antique or polished), sturdy lining and quality zips and straps. Materials can be personalised on custom orders.' },
      { id: 'f5', q: 'What does a custom bag cost?', a: 'Custom pieces start around R1,500 depending on size, materials and details. You receive a quote before we start, and pay a 50% deposit to confirm your order.' },
      { id: 'f6', q: 'How do payments work?', a: 'You pay a 50% deposit to begin your order; the balance is due only once your bag is complete and you approve it.' },
      { id: 'f7', q: 'How long will my order take?', a: 'Ready-to-ship pieces ship within 2 business days. Custom orders generally take 2-4 weeks from when your design is confirmed.' },
      { id: 'f8', q: 'How will my bag be delivered?', a: 'We deliver across South Africa via The Courier Guy. Delivery is free on orders over R1,500, and pickup is available from our Sandton atelier by appointment.' },
      { id: 'f9', q: 'Can I return or exchange a bag?', a: 'Ready-to-ship bags can be returned or exchanged unused within 7 days of delivery. Custom pieces, being made to your design, are non-refundable once production begins.' },
      { id: 'f10', q: 'Do you supply corporate or bulk orders?', a: 'Yes - we make branded and bulk batches from 20 units for client gifts, staff appreciation and corporate programmes. See the corporate page or contact us for a quote.' },
      { id: 'f11', q: 'Can I add my name or initials?', a: 'Yes, on custom orders you can add a name, initials or a short message, and choose ribbon colours and lining to match.' }
    ]);
    ss('site_settings', { shipping_text: 'Complimentary courier on orders over R1,500', escrow_text: 'Every order is escrow-protected. Funds release only when you confirm.' });
    ss('reviews', [
      { id: 'r1', order_id: 'seed', product_id: 'p1', user: 'Nomvula K.', rating: 5, title: 'Worth every rand', body: 'Stitching is flawless and the antique gold hardware is stunning. The wait was worth it.', status: 'approved', created_at: '2026-08-20' },
      { id: 'r2', order_id: 'seed', product_id: 'p2', user: 'Tshepo M.', rating: 5, title: 'The Empress is unreal', body: 'Receives compliments every time. Polished gold is exactly as pictured.', status: 'approved', created_at: '2026-08-11' },
      { id: 'r3', order_id: 'seed', product_id: 'p3', user: 'Lehlogonolo D.', rating: 4, title: 'Excellent craft', body: 'Beautifully made. Slight delay but communication was great.', status: 'approved', created_at: '2026-07-28' },
      { id: 'r4', order_id: 'seed', product_id: 'p1', user: 'Amahle S.', rating: 5, title: 'Heirloom quality', body: 'You can feel the full-grain leather. This will outlive trends.', status: 'approved', created_at: '2026-07-15' },
      { id: 'r5', order_id: 'seed', product_id: 'p6', user: 'Kwanele N.', rating: 5, title: 'Built for travel', body: 'The weekender fits a full trip and looks regal doing it.', status: 'approved', created_at: '2026-06-30' }
    ]);
    localStorage.setItem(FK + 'extras_seeded', '1');
  }

  function seed() { if (AQ.DEMO) { seedProducts(); seedDesignOptions(); seedExtras(); } }

  /* ---------- stock helpers (local demo) ---------- */
  function sellStockLocal(items) {
    var list = ls('products');
    items.forEach(function (it) {
      if (it.kind === 'custom' || !it.product_id) return;
      var idx = list.findIndex(function (x) { return String(x.id) === String(it.product_id); });
      if (idx >= 0) list[idx].stock = Math.max(0, (Number(list[idx].stock) || 0) - (it.qty || 1));
    });
    ss('products', list);
  }
  function restockLocal(items) {
    var list = ls('products');
    items.forEach(function (it) {
      if (it.kind === 'custom' || !it.product_id) return;
      var idx = list.findIndex(function (x) { return String(x.id) === String(it.product_id); });
      if (idx >= 0) list[idx].stock = (Number(list[idx].stock) || 0) + (it.qty || 1);
    });
    ss('products', list);
  }
  function shopItems(order) { return (order.items || []).filter(function (it) { return it.kind !== 'custom' && it.product_id; }); }
  function findOrder(id) { return ls('orders').find(function (x) { return String(x.id) === String(id); }) || null; }

  /* ---------- PUBLIC API ---------- */
  function norm(p) {
    return Object.assign({}, p, { images: p.images || [], in_stock: p.in_stock !== false && (p.stock == null || p.stock > 0) });
  }

  return {
    init: seed,

    /* Products */
    getProducts: function (opts) {
      opts = opts || {};
      if (supabase) return supabase.from('products').select('*').eq('active', true).then(function (r) {
        var list = (r.data || []).map(norm);
        if (opts.category) list = list.filter(function (p) { return p.category === opts.category; });
        if (opts.search) list = list.filter(function (p) { return (p.name + ' ' + (p.tagline || '')).toLowerCase().includes(opts.search.toLowerCase()); });
        return list;
      });
      return Promise.resolve(ls('products').map(norm).filter(function (p) { return p.active !== false; }));
    },
    getProduct: function (id) {
      if (supabase) return supabase.from('products').select('*').eq('id', id).single().then(function (r) { return r.data ? norm(r.data) : null; });
      var p = from(ls('products'), id); return Promise.resolve(p ? norm(p) : null);
    },
    getProductBySlug: function (slug) {
      if (supabase) return supabase.from('products').select('*').eq('slug', slug).single().then(function (r) { return r.data ? norm(r.data) : null; });
      return Promise.resolve(from(ls('products'), undefined) || ls('products').find(function (p) { return p.slug === slug; }) || null);
    },
    getCategories: function () {
      if (supabase) return supabase.from('products').select('category').eq('active', true).then(function (r) {
        var seen = {}; (r.data || []).forEach(function (p) { seen[p.category] = 1; });
        return Object.keys(seen);
      });
      var seen = {}; ls('products').forEach(function (p) { if (p.active !== false) seen[p.category] = 1; });
      return Promise.resolve(Object.keys(seen));
    },
    saveProduct: function (p) {
      if (supabase) return supabase.from('products').upsert(p.id && String(p.id).length > 3 ? p : Object.assign({}, p, { id: nid() })).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('products'); var i = list.findIndex(function (x) { return String(x.id) === String(p.id); });
      if (i >= 0) list[i] = Object.assign({}, list[i], p); else list.unshift(Object.assign({}, p, { id: nid() }));
      ss('products', list); return Promise.resolve({ error: null });
    },
    removeProduct: function (id) {
      if (supabase) return supabase.from('products').delete().eq('id', id).then(function (r) { return { error: r.error ? r.error.message : null }; });
      ss('products', ls('products').filter(function (x) { return String(x.id) !== String(id); })); return Promise.resolve({ error: null });
    },
    getStock: function (productId) {
      if (supabase) return supabase.from('products').select('stock').eq('id', productId).single().then(function (r) { return r.data ? Number(r.data.stock) || 0 : 0; });
      var p = from(ls('products'), productId); return Promise.resolve(p ? Number(p.stock) || 0 : 0);
    },

    /* Design options */
    getDesignOptions: function (group) {
      if (supabase) {
        var q = supabase.from('design_options').select('*').eq('active', true);
        if (group) q = q.eq('group', group);
        return q.order('sort').then(function (r) { return r.data || []; });
      }
      var list = ls('design_options');
      if (group) list = list.filter(function (o) { return o.group === group; });
      return Promise.resolve(list);
    },
    saveDesignOption: function (o) {
      if (supabase) return supabase.from('design_options').upsert(o.id ? o : Object.assign({}, o, { id: nid() })).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('design_options'); var i = list.findIndex(function (x) { return String(x.id) === String(o.id); });
      if (i >= 0) list[i] = Object.assign({}, list[i], o); else list.push(Object.assign({}, o, { id: nid(), active: true }));
      ss('design_options', list); return Promise.resolve({ error: null });
    },
    removeDesignOption: function (id) {
      if (supabase) return supabase.from('design_options').delete().eq('id', id).then(function (r) { return { error: r.error ? r.error.message : null }; });
      ss('design_options', ls('design_options').filter(function (x) { return String(x.id) !== String(id); })); return Promise.resolve({ error: null });
    },

    /* Cart (always local until checkout) */
    cartGet: function () { try { return JSON.parse(localStorage.getItem(FK + 'cart')) || []; } catch (e) { return []; } },
    cartSet: function (items) { localStorage.setItem(FK + 'cart', JSON.stringify(items)); if (window.AQCart) window.updateCartBadge(); },
    cartCount: function () { return this.cartGet().reduce(function (n, i) { return n + (i.qty || 1); }, 0); },

    /* Reviews */
    getReviews: function (productId) {
      if (supabase) {
        var q = supabase.from('reviews').select('*').eq('status', 'approved').order('created_at', { ascending: false });
        if (productId) q = q.eq('product_id', productId);
        return q.then(function (r) { return r.data || []; });
      }
      return Promise.resolve(ls('reviews').filter(function (r) { return r.status === 'approved' && (!productId || r.product_id === productId); }));
    },
    addReview: function (rev) {
      var u = window.AQAuth.currentUser();
      rev = Object.assign({ id: nid(), created_at: new Date().toISOString(), status: 'approved', user: u ? u.name : 'Guest' }, rev);
      if (supabase) return supabase.from('reviews').insert(rev).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('reviews'); list.unshift(rev); ss('reviews', list); return Promise.resolve({ error: null });
    },
    setReviewStatus: function (id, status) {
      if (supabase) return supabase.from('reviews').update({ status: status }).eq('id', id).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('reviews'); var i = list.findIndex(function (x) { return String(x.id) === String(id); });
      if (i >= 0) { list[i].status = status; ss('reviews', list); }
      return Promise.resolve({ error: null });
    },

    /* Wishlist */
    wishlistGet: function () {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve([]);
      if (supabase) return supabase.from('wishlist').select('product_id').eq('user_id', u.id).then(function (r) { return (r.data || []).map(function (w) { return w.product_id; }); });
      return Promise.resolve(ls('wishlist_' + u.id) || []);
    },
    wishlistToggle: function (productId) {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve(false);
      if (supabase) {
        return supabase.from('wishlist').select('product_id').eq('user_id', u.id).eq('product_id', productId).then(function (r) {
          if (r.data && r.data.length) return supabase.from('wishlist').delete().eq('user_id', u.id).eq('product_id', productId).then(function () { return false; });
          return supabase.from('wishlist').insert({ user_id: u.id, product_id: productId }).then(function () { return true; });
        });
      }
      var key = 'wishlist_' + u.id; var list = ls(key);
      var has = list.indexOf(productId) >= 0;
      if (has) list = list.filter(function (p) { return p !== productId; }); else list.push(productId);
      ss(key, list); return Promise.resolve(!has);
    },

    /* Loyalty */
    loyaltyBalance: function () {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve(0);
      if (supabase) return supabase.from('profiles').select('loyalty_points').eq('id', u.id).single().then(function (r) { return (r.data && r.data.loyalty_points) || 0; });
      return Promise.resolve(Number(u.loyalty_points) || 0);
    },
    loyaltyHist: function () {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve([]);
      if (supabase) return supabase.from('loyalty_txn').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).then(function (r) { return r.data || []; });
      return Promise.resolve(ls('loyalty_' + u.id) || []);
    },
    loyaltyAdd: function (delta, reason) {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve();
      if (supabase) return supabase.rpc('add_loyalty_points', { uid: u.id, d: delta, reason_text: reason }).then(function () {});
      var hist = ls('loyalty_' + u.id); var bal = this.loyaltyBalance;
      var list = hist.slice(); var cur = Number(u.loyalty_points) || 0;
      list.unshift({ id: nid(), delta: delta, balance: cur + delta, reason: reason, created_at: new Date().toISOString() });
      ss('loyalty_' + u.id, list);
      sessionStorage.setItem('aq_bump', String(cur + delta));
      window.AQAuth.updateProfile({ loyalty_points: cur + delta });
      return Promise.resolve();
    },

    /* Referrals */
    myReferral: function () {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve(null);
      if (supabase) return supabase.from('referrals').select('*').eq('owner_id', u.id).maybeSingle().then(function (r) { return r.data || null; });
      var list = ls('referrals').filter(function (r) { return r.owner_id === u.id; });
      return Promise.resolve(list[0] || null);
    },
    setReferral: function (code) {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve({ error: 'Sign in first' });
      if (supabase) return supabase.from('referrals').upsert({ owner_id: u.id, code: code }).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('referrals'); list = list.filter(function (r) { return r.owner_id !== u.id; }); list.push({ owner_id: u.id, code: code });
      ss('referrals', list); return Promise.resolve({ error: null });
    },

    /* Custom requests */
    createCustomRequest: function (req) {
      var u = window.AQAuth.currentUser();
      req = Object.assign({ id: nid(), user_id: u ? u.id : null, status: 'pending', created_at: new Date().toISOString() }, req);
      if (supabase) return supabase.from('custom_requests').insert(req).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('custom_requests'); list.unshift(req); ss('custom_requests', list); return Promise.resolve({ error: null });
    },
    myCustomRequests: function () {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve([]);
      if (supabase) return supabase.from('custom_requests').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).then(function (r) { return r.data || []; });
      return Promise.resolve(ls('custom_requests').filter(function (r) { return r.user_id === u.id; }));
    },
    updateCustomRequest: function (id, patch) {
      if (supabase) return supabase.from('custom_requests').update(patch).eq('id', id).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('custom_requests'); var i = list.findIndex(function (x) { return String(x.id) === String(id); });
      if (i >= 0) { list[i] = Object.assign({}, list[i], patch); ss('custom_requests', list); }
      return Promise.resolve({ error: null });
    },

    /* Orders */
    placeOrder: function (order) {
      order = Object.assign({ id: nid(), number: 'AQ-' + Date.now().toString().slice(-6), created_at: new Date().toISOString(), status: 'pending', escrow: 'held' }, order);
      var items = shopItems(order);
      if (supabase) return supabase.from('orders').insert(order).then(function (r) {
        if (r.error) return { error: r.error.message };
        return supabase.rpc('sell_stock', { items: items }).then(function () { return { error: null, order: r.data[0] }; });
      });
      var list = ls('orders'); list.unshift(order); ss('orders', list);
      sellStockLocal(items);
      return Promise.resolve({ error: null, order: order });
    },
    myOrders: function () {
      var u = window.AQAuth.currentUser(); if (!u) return Promise.resolve([]);
      if (supabase) return supabase.from('orders').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).then(function (r) { return r.data || []; });
      return Promise.resolve(ls('orders').filter(function (o) { return o.user_id === u.id; }));
    },
    adminOrders: function () {
      if (supabase) return supabase.from('orders').select('*').order('created_at', { ascending: false }).then(function (r) { return r.data || []; });
      return Promise.resolve(ls('orders'));
    },
    updateOrder: function (id, patch) {
      if (supabase) return supabase.from('orders').update(patch).eq('id', id).then(function (r) {
        if (r.error) return { error: r.error.message };
        if (patch.status === 'cancelled') return supabase.rpc('restock_order', { p_order_id: id }).then(function () { return { error: null }; });
        return { error: null };
      });
      var list = ls('orders'); var i = list.findIndex(function (x) { return String(x.id) === String(id); });
      if (i >= 0) { list[i] = Object.assign({}, list[i], patch); ss('orders', list); }
      if (patch.status === 'cancelled') { var o = findOrder(id); if (o) restockLocal(shopItems(o)); }
      return Promise.resolve({ error: null });
    },

    /* Customers (admin) */
    adminCustomers: function () {
      if (supabase) return supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(function (r) { return r.data || []; });
      try { return Promise.resolve(JSON.parse(localStorage.getItem('aq_demo_users')) || []); } catch (e) { return Promise.resolve([]); }
    },

    /* Gallery / journal / faqs / settings / contact */
    getGallery: function () { return supabase ? supabase.from('gallery').select('*').order('sort').then(function (r) { return r.data || []; }) : Promise.resolve(ls('gallery')); },
    saveGallery: function (g) {
      if (supabase) return supabase.from('gallery').upsert(g.id ? g : Object.assign({}, g, { id: nid() })).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('gallery'); var i = list.findIndex(function (x) { return String(x.id) === String(g.id); });
      if (i >= 0) list[i] = Object.assign({}, list[i], g); else list.push(Object.assign({}, g, { id: nid() }));
      ss('gallery', list); return Promise.resolve({ error: null });
    },
    getJournal: function () { return supabase ? supabase.from('journal').select('*').order('published', { ascending: false }).then(function (r) { return r.data || []; }) : Promise.resolve(ls('journal')); },
    getFaqs: function () { return supabase ? supabase.from('faqs').select('*').order('sort').then(function (r) { return r.data || []; }) : Promise.resolve(ls('faqs')); },
    getSettings: function () {
      if (supabase) return supabase.from('site_settings').select('*').then(function (r) {
        var s = {}; (r.data || []).forEach(function (row) { s[row.key] = row.value; }); return s;
      });
      return Promise.resolve(Object.assign({}, ls('site_settings')) || {});
    },
    saveSettings: function (patches) {
      if (supabase) return supabase.from('site_settings').upsert(patches).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var s = Object.assign({}, ls('site_settings'), patches); ss('site_settings', s); return Promise.resolve({ error: null });
    },
    contactSend: function (msg) {
      msg = Object.assign({ id: nid(), created_at: new Date().toISOString() }, msg);
      if (supabase) return supabase.from('contact_messages').insert(msg).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var list = ls('contact_messages'); if (!list) list = []; list.unshift(msg); ss('contact_messages', list); return Promise.resolve({ error: null });
    },
    contactList: function () { return supabase ? supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).then(function (r) { return r.data || []; }) : Promise.resolve(ls('contact_messages') || []); },
    adminExtraAll: function () { return Promise.all([this.getGallery(), this.getJournal(), this.getFaqs(), ls('custom_requests') || []].concat(supabase ? [] : [ls('reviews')])).then(function (r) {
        return { gallery: r[0], journal: r[1], faqs: r[2], custom: r[3], reviews: r[4] || null };
      }); },

    slugify: slugify,
    detach: function (obj) { return JSON.parse(JSON.stringify(obj)); }
  };
})();