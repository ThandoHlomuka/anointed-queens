# Anointed Queens - Supabase Setup

The store ships in **Demo Mode** (100% local, zero backend). This guide wires up
the live production backend in about 15 minutes.

## 1. Create the project
1. Go to https://supabase.com/dashboard and **New project** -> name `anointed-queens`.
   Copy the **Region** nearest to you (e.g. `eu-west-1`).
2. Under **Project Settings > API**, copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public** key
3. **Authentication > Providers > Email**: ensure *Email* is enabled.
4. Create your first (admin) account: **Authentication > Users > Add user**
   with the email you want as the store admin.

## 2. Apply the schema
1. Open **SQL Editor**.
2. Paste the entire contents of `supabase\schema.sql`, run it.
3. Promote yourself to admin (replace email):
   ```sql
   update public.profiles set role = 'admin'
   where email = 'you@example.com';
   ```
4. Verify:
   ```sql
   select email, role from public.profiles;        -- you should see admin
   select count(*) from public.products;           -- 6 seeded bags
   select public.is_admin('00000000-0000-0000-0000-000000000000'); -- false
   ```

> RLS is ON with ownership + admin policies. The admin role lives in the
> `profiles` table (not JWT `user_metadata`, so it can't be forged) and
> `add_loyalty_points()` is SECURITY INVOKER so it respects RLS.

## 3. Switch the app to Live mode
Edit `config.js` at the repo root (NOT the harness copy):
```js
var SUPABASE_URL = 'https://xxxx.supabase.co';
var SUPABASE_ANON_KEY = 'eyJ...anon...';
```
The app automatically leaves Demo Mode when both are present. `auth.js` and
`db.js` use the **same API surface** — no other code changes needed.

Optional live override (keep keys out of git): load `index.html?sb=live` with a
script tag before app scripts that defines
`window.AQ_LIVE = { URL: '...', ANON: '...' }`.

## 4. Payments (production)
Demo Mode accepts any 16-digit card. For live card payments:
1. Create a Stripe account, get your **publishable key** and a **secret key**.
2. Put the publishable key in `config.js` (`STRIPE_PUBLISHABLE_KEY`).
3. Add a Vercel Serverless Function at `api/pay.js` that creates a
   `PaymentIntent` with `stripe.confirmCardPayment`, capturing into escrow.
4. On webhook `payment_intent.succeeded` call:
   ```sql
   update public.orders set escrow = 'held', status = 'confirmed'
   where payment_intent = '<pi_...>';
   ```

## 5. Google / Stripe images (gallery bucket)
Storage bucket `gallery` is created public-read. Upload product photography via
the bucket and set `products.images[0]` to its public URL, or keep using the
inline SVG art (looks great, loads instantly, works offline).

## 6. Verify after switching to live
- `curl https://<site>/version.json` -> `"version": "1.0.0"`
- Sign up a test user; it should create a `profiles` row automatically.
- Buy The Sovereign with card `4242 4242 4242 4242`, confirm the order exists
  with `escrow = 'held'`, then as admin run **Confirm -> Production -> Ship ->
  Delivered**, then release escrow as the client on the orders page.

## Troubleshooting
- **New queries return empty**: your role may not have Data API access. In
  **Settings > API**, enable access for `anon` and `authenticated`, and confirm
  RLS policies exist (they do, in schema.sql).
- **Review rejected**: RLS requires `user_id` to match your auth id; the form
  records it automatically.
- **`is_admin` denied**: the function has EXECUTE for `authenticated` via
  PUBLIC by default; if you tightened grants, re-grant:
  `grant execute on function public.is_admin(uuid) to anon, authenticated;`