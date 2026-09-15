/* ============================================================
   ANNOINTED QUEENS - app configuration
   ============================================================
   DEMO MODE: leave SUPABASE_URL / SUPABASE_ANON_KEY empty and the
   store runs fully in localStorage demo mode (seeded catalog,
   demo payment, simulated escrow) - zero backend required.

   LIVE MODE: paste your Supabase project url + anon key, apply
   supabase/schema.sql (see supabase/SETUP.md), set
   STRIPE_PUBLISHABLE_KEY if using card payments.
   ============================================================ */
window.AQ = (function () {
  var SUPABASE_URL = '';
  var SUPABASE_ANON_KEY = '';
  var STRIPE_PUBLISHABLE_KEY = '';
  /* Optional live overrides: line above wins if empty; fall back
     to ?sb= param on the URL for quick harness toggling. */
  try {
    var qs = new URLSearchParams(window.location.search);
    if (qs.get('sb') === 'live' && window.AQ_LIVE) {
      SUPABASE_URL = window.AQ_LIVE.URL || SUPABASE_URL;
      SUPABASE_ANON_KEY = window.AQ_LIVE.ANON || SUPABASE_ANON_KEY;
    }
  } catch (e) {}
  return {
    NAME: 'Anointed Queens',
    TAGLINE: 'Handcrafted custom bags, crowned in craft.',
    VERSION: '1.2.0',
    THEME: { gold: '#D4AF37', goldBright: '#FFD700', black: '#0A0A0A' },
    CURRENCY: 'ZAR',
    LOCALE: 'en-ZA',
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    STRIPE_PUBLISHABLE_KEY: STRIPE_PUBLISHABLE_KEY,
    DEMO: !SUPABASE_URL || !SUPABASE_ANON_KEY,
    ESCROW_DEPOSIT_PCT: 50,
    LOYALTY: { perSpend: 0.1, perReview: 50, perReferral: 100, redeemRate: 0.05 },
    FREE_SHIPPING_OVER: 1500,
    SHIPPING: { courier: 120, express: 260 },
    DEMO_CARD: '4242424242424242'
  };
})();
window.AQ_CONFIG = window.AQ;