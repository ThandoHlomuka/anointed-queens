/* ============================================================
   ANNOINTED QUEENS - authentication
   LIVE: Supabase Email/Password auth (roles from profiles).
   DEMO: localStorage accounts so the whole flow is testable
   with zero backend. Same API surface.
   ============================================================ */
window.AQAuth = (function () {
  var AQ = window.AQ;
  var KEY = 'aq_session';
  var USERS_KEY = 'aq_demo_users';
  var PREFS_KEY = 'aq_prefs';

  var supabase = null;
  if (!AQ.DEMO && window.supabase) {
    supabase = window.supabase.createClient(AQ.SUPABASE_URL, AQ.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  function demoUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
  }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  function demoCreate(name, email, password, role) {
    var users = demoUsers();
    if (users.some(function (u) { return u.email === email; })) return { error: 'An account with that email already exists.' };
    var token = 'demo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    var user = {
      id: token, email: email, name: name || email.split('@')[0], password: password,
      role: role || 'client', loyalty_points: 0, referral_code: genCode(name), created_at: new Date().toISOString()
    };
    users.push(user); saveUsers(users);
    return { user: user };
  }

  function genCode(name) {
    var base = (name || 'queen').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    return base + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function demoLogin(email, password) {
    var u = demoUsers().find(function (x) { return x.email.toLowerCase() === String(email).toLowerCase(); });
    if (!u || u.password !== password) return { error: 'Invalid email or password.' };
    localStorage.setItem(KEY, JSON.stringify({ id: u.id, email: u.email, name: u.name, role: u.role, demo: true }));
    return { user: u };
  }

  function demoSignOut() { localStorage.removeItem(KEY); }

  async function liveSignIn(email, password) {
    var r = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (r.error) return { error: r.error.message };
    var res = await supabase.from('profiles').select('*').eq('id', r.data.user.id).single();
    localStorage.setItem(KEY, JSON.stringify({ id: r.data.user.id, email: email, name: (res.data && res.data.full_name) || email.split('@')[0], role: (res.data && res.data.role) || 'client' }));
    return { user: { id: r.data.user.id, email: email, name: r.data.user.user_metadata && r.data.user.user_metadata.full_name, role: 'client' } };
  }

  function liveCurrent() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  return {
    demo: AQ.DEMO,
    currentUser: function () {
      if (supabase) return liveCurrent();
      try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
    },
    isAdmin: function () {
      var u = this.currentUser(); return !!(u && u.role === 'admin');
    },
    signUp: function (name, email, password) {
      if (supabase) {
        return supabase.auth.signUp({ email: email, password: password, options: { data: { full_name: name } } }).then(function (r) {
          if (r.error) return { error: r.error.message };
          var prof = { id: r.data.user.id, full_name: name, email: email, role: 'client', loyalty_points: 0, referral_code: genCode(name) };
          return supabase.from('profiles').upsert(prof).then(function () { return { error: null }; });
        });
      }
      return Promise.resolve(demoCreate(name, email, password, 'client'));
    },
    signIn: function (email, password) {
      if (supabase) return liveSignIn(email, password);
      var r = demoLogin(email, password); return Promise.resolve(r);
    },
    signOut: function () {
      if (supabase) return supabase.auth.signOut().then(function () { demoSignOut(); });
      demoSignOut(); return Promise.resolve();
    },
    updateProfile: function (patch) {
      var u = this.currentUser();
      if (!u) return Promise.resolve({ error: 'Not signed in' });
      if (supabase) return supabase.from('profiles').update(patch).eq('id', u.id).then(function (r) { return { error: r.error ? r.error.message : null }; });
      var users = demoUsers();
      var i = users.findIndex(function (x) { return x.id === u.id; });
      if (i >= 0) {
        users[i] = Object.assign({}, users[i], patch);
        saveUsers(users);
        localStorage.setItem(KEY, JSON.stringify(Object.assign({}, u, patch)));
      }
      return Promise.resolve({ error: null });
    },
    ensureClientOnly: function () {
      if (!this.currentUser()) { location.href = 'login.html'; return false; }
      return true;
    },
    ensureAdmin: function () {
      if (!this.isAdmin()) { location.href = this.currentUser() ? 'index.html' : 'login.html'; return false; }
      return true;
    },
    pref: function (k, v) {
      var p = {}; try { p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) {}
      if (v === undefined) return p[k];
      p[k] = v; localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    }
  };
})();