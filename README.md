# Anointed Queens - Custom Bag House

Handcrafted custom bags — **gold & black** luxury theme. Vanilla JS + Supabase
+ Vercel, with a zero-backend **Demo Mode** so the whole store works instantly.

## Quick start (demo)
```powershell
node harness\build_site.js
node harness\server.js            # http://127.0.0.1:8899
node harness\smoke_all.js          # 51 checks across 3 viewports, expect FAILURES: 0
node harness\profile_flow.js       # end-to-end: design -> order -> escrow -> release
```
Then open http://127.0.0.1:8899 in Chrome. Design a bag, "Sign in" (demo: any
new email), and buy with card `4242 4242 4242 4242`. Admin area:
http://127.0.0.1:8899/admin_test.html (auto-login in demo).

## Pages
`index` (marketing) · `shop` · `product` · `configurator` (design-your-own) ·
`cart` · `checkout` (escrow) · `orders` (tracking) · `wishlist` · `loyalty`
(Anointed Club + referrals) · `login` / `register` · `account` · `about` ·
`journal` · `faq` · `contact` · `admin` (portal)

## Escrow model
- **Ready-to-ship:** full price paid, held in escrow.
- **Bespoke:** 50% deposit opens production; balance invoiced on approval.
- Funds release only when the client confirms (admin can also release/refund).

## Architecture
- `config.js` - keys + feature flags (Demo vs Live). Empty keys = Demo Mode.
- `auth.js` - Supabase Email/Password auth, or demo localStorage accounts.
- `db.js` - data layer: Supabase REST in live, seeded localStorage in demo.
- Feature modules: `shop.js product.js configurator.js cart.js checkout.js
  orders.js loyalty.js account.js admin.js`.
- `style.css` - complete gold/black design system (Sections A/B/G of
  `../ANOINTED_QUEENS-BUILD-AND-PROGRESS-DOC.txt`).

## Going live
See `supabase/SETUP.md`: create a Supabase project, run `supabase/schema.sql`
(RLS included), promote an admin, paste keys into `config.js`. Optionally wire
Stripe via `api/pay.js` (escrow-aware PaymentIntent) — see SETUP section 4.

## Release bumps
Per repo convention: bump every `?v=` token uniformly, `version.json`,
`sw.js CACHE` (`aq-vN`), then commit + push + live-verify with `?cb=`.
Harness steps in: `C:\Users\THANDO~1\AppData\Local\Temp\opencode\aq` (copy of
harness + node_modules).

## Tests
`harness/smoke_all.js` loads every page at 1280/375/320 and fails on any body
horizontal overflow or page error. `harness/profile_flow.js` drives the full
commit lifecycle.