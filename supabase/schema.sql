-- ============================================================
-- ANNOINTED QUEENS - Supabase schema + RLS
-- Apply in the Supabase SQL editor (Project > SQL > New query)
-- ONE MANUAL STEP: after creating your Supabase project, run
-- Authentication > Users > Invite user to create your first
-- admin account, THEN run the block below to promote it:
--   update public.profiles set role = 'admin'
--   where email = 'your-admin@email.com';
-- (The role lives in the profiles TABLE, not JWT metadata - it is
--  always fresh and cannot be user-forged.)
-- ============================================================

create extension if not exists "pgcrypto";

-- NOTE: the helper functions below (is_admin, add_loyalty_points) are
-- defined AFTER the tables, further down this file. is_admin is a
-- LANGUAGE sql function whose body Postgres validates at CREATE time,
-- so it cannot be created before public.profiles exists.

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text default '',
  phone text default '',
  role text not null default 'client' check (role in ('client','admin')),
  loyalty_points integer not null default 0,
  referral_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',
  line1 text not null,
  city text not null,
  province text default '',
  postal text default '',
  country text default 'South Africa',
  is_default boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text default '',
  description text default '',
  category text default 'Totes',
  base_price numeric(10,2) not null default 0,
  deposit_pct integer not null default 50,
  sale_price numeric(10,2),
  featured boolean default false,
  active boolean default true,
  stock integer default 5,
  in_stock boolean default true,
  images text[] default '{}',
  specs jsonb default '{}',
  sort integer default 0,
  seo_title text default '',
  seo_desc text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  group_name text not null,
  value text not null,
  label text not null,
  price_delta numeric(10,2) default 0,
  swatch text,
  in_stock boolean default true
);

create table if not exists public.design_options (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,           -- style|fabric|colour|size|hardware|handle|lining|personalisation
  value text not null,
  label text not null,
  price_delta numeric(10,2) default 0,
  swatch text,                        -- hex for swatch groups
  active boolean default true,
  sort integer default 0
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  number text unique not null,
  status text not null default 'pending',
  escrow text not null default 'held',  -- held | fulfilled | released | refunded
  items jsonb not null default '[]',
  subtotal numeric(10,2) default 0,
  shipping numeric(10,2) default 0,
  total numeric(10,2) default 0,
  points_discount numeric(10,2) default 0,
  balance_due numeric(10,2) default 0,
  deposit_paid numeric(10,2) default 0,
  address jsonb default '{}',
  email text default '',
  phone text default '',
  payment_method text default 'card',
  payment_intent text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id text default '',
  product_id uuid references public.products(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_name text default 'Guest',        -- "user" is reserved in Postgres
  rating integer not null check (rating between 1 and 5),
  title text default '',
  body text default '',
  images text[] default '{}',
  status text not null default 'pending',  -- pending | approved | hidden
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.loyalty_txn (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance integer not null default 0,
  reason text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text unique not null,
  used_by uuid references auth.users(id) on delete set null,
  points_earned integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  design_name text default '',
  config jsonb default '{}',
  price_est numeric(10,2) default 0,
  deposit_paid numeric(10,2) default 0,
  status text not null default 'pending',  -- pending|quoted|accepted|in_production|fulfilled|cancelled
  admin_note text default '',
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_txn (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  delta numeric(10,2) not null default 0,
  reason text default '',
  ref text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  caption text default '',
  image text default '',
  swatch text default '',
  sort integer default 0
);

create table if not exists public.journal (
  id uuid primary key default gen_random_uuid(),
  slug text unique default '',
  title text not null,
  excerpt text default '',
  body text default '',
  image text default '',
  author text default 'Anointed Queens',
  published timestamptz default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  q text not null,
  a text not null,
  sort integer default 0
);

create table if not exists public.site_settings (
  key text primary key,
  value text default ''
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text default '',
  message text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions (AFTER tables: is_admin's body is validated by
-- Postgres at CREATE time, so public.profiles must already exist)
-- ============================================================
-- ---------- helper: is the CURRENT user an admin? ----------
-- SECURITY DEFINER is required, not optional: this function is called
-- from inside the profiles SELECT policies, so an INVOKER body would
-- re-enter those policies and Postgres would raise
-- "infinite recursion detected in policy for relation profiles".
-- Definer privileges bypass RLS, which is what breaks the cycle.
-- It takes no argument so it cannot be used to probe other users'
-- roles, and it pins search_path so it cannot be hijacked.
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
     where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------- helper: add/consume loyalty points ----------
create or replace function public.add_loyalty_points(uid uuid, d integer, reason_text text)
returns integer language plpgsql security invoker as $$
declare nb integer;
begin
  update public.profiles
     set loyalty_points = coalesce(loyalty_points, 0) + d
   where id = uid
  returning loyalty_points into nb;
  insert into public.loyalty_txn (user_id, delta, balance, reason)
  values (uid, d, coalesce(nb, 0), reason_text);
  return nb;
end $$;

grant execute on function public.add_loyalty_points(uuid, integer, text) to authenticated;

-- ============================================================
-- RLS (enable on every table; policies below match access model)
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.addresses        enable row level security;
alter table public.products         enable row level security;
alter table public.product_options  enable row level security;
alter table public.design_options   enable row level security;
alter table public.orders           enable row level security;
alter table public.reviews          enable row level security;
alter table public.wishlist         enable row level security;
alter table public.loyalty_txn      enable row level security;
alter table public.referrals        enable row level security;
alter table public.custom_requests  enable row level security;
alter table public.wallet_txn       enable row level security;
alter table public.gallery          enable row level security;
alter table public.journal          enable row level security;
alter table public.faqs             enable row level security;
alter table public.site_settings    enable row level security;
alter table public.contact_messages enable row level security;

-- profiles: own row read/update; admins see all
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select
  to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles select admin" on public.profiles;
create policy "profiles select admin" on public.profiles for select
  to authenticated using (public.is_admin());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert
  to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin" on public.profiles for update
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- addresses: own
drop policy if exists "addresses select own" on public.addresses;
create policy "addresses select own" on public.addresses for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "addresses mutate own" on public.addresses;
create policy "addresses mutate own" on public.addresses for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- products: public read (active), admin write
drop policy if exists "products select public" on public.products;
create policy "products select public" on public.products for select
  to anon, authenticated using (active = true);
drop policy if exists "products select all admin" on public.products;
create policy "products select all admin" on public.products for select
  to authenticated using (public.is_admin());
drop policy if exists "products write admin" on public.products;
create policy "products write admin" on public.products for all
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- product_options / design_options: public read, admin write
drop policy if exists "product_options select public" on public.product_options;
create policy "product_options select public" on public.product_options for select
  to anon, authenticated using (true);
drop policy if exists "product_options write admin" on public.product_options;
create policy "product_options write admin" on public.product_options for all
  to authenticated using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "design_options select public" on public.design_options;
create policy "design_options select public" on public.design_options for select
  to anon, authenticated using (true);
drop policy if exists "design_options write admin" on public.design_options;
create policy "design_options write admin" on public.design_options for all
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- orders: own select; admin all + write; insert own (client pays)
drop policy if exists "orders select own" on public.orders;
create policy "orders select own" on public.orders for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "orders select all admin" on public.orders;
create policy "orders select all admin" on public.orders for select
  to authenticated using (public.is_admin());
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "orders update own release" on public.orders;
create policy "orders update own release" on public.orders for update
  to authenticated using ((select auth.uid()) = user_id and status = 'delivered' and escrow = 'fulfilled')
  with check ((select auth.uid()) = user_id);
drop policy if exists "orders update admin" on public.orders;
create policy "orders update admin" on public.orders for update
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- reviews: public approved read; write own; admin moderate
drop policy if exists "reviews select public" on public.reviews;
create policy "reviews select public" on public.reviews for select
  to anon, authenticated using (status = 'approved');
drop policy if exists "reviews select admin" on public.reviews;
create policy "reviews select admin" on public.reviews for select
  to authenticated using (public.is_admin());
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert
  to authenticated with check ((select auth.uid()) = user_id or user_id is null);
drop policy if exists "reviews update admin" on public.reviews;
create policy "reviews update admin" on public.reviews for update
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- wishlist: own
drop policy if exists "wishlist all own" on public.wishlist;
create policy "wishlist all own" on public.wishlist for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- loyalty_txn: own select; insert via add_loyalty_points only (own row)
drop policy if exists "loyalty_txn select own" on public.loyalty_txn;
create policy "loyalty_txn select own" on public.loyalty_txn for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "loyalty_txn insert own" on public.loyalty_txn;
create policy "loyalty_txn insert own" on public.loyalty_txn for insert
  to authenticated with check ((select auth.uid()) = user_id);

-- referrals: own select, own insert/update on own rows
drop policy if exists "referrals select own" on public.referrals;
create policy "referrals select own" on public.referrals for select
  to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "referrals mutate own" on public.referrals;
create policy "referrals mutate own" on public.referrals for all
  to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- custom_requests: own select/insert; admin all + write
drop policy if exists "custom select own" on public.custom_requests;
create policy "custom select own" on public.custom_requests for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "custom select admin" on public.custom_requests;
create policy "custom select admin" on public.custom_requests for select
  to authenticated using (public.is_admin());
drop policy if exists "custom insert own" on public.custom_requests;
create policy "custom insert own" on public.custom_requests for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "custom update admin" on public.custom_requests;
create policy "custom update admin" on public.custom_requests for update
  to authenticated using (public.is_admin())
  with check (public.is_admin());

-- wallet_txn: own select; insert only via admin/engine
drop policy if exists "wallet select own" on public.wallet_txn;
create policy "wallet select own" on public.wallet_txn for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "wallet insert admin" on public.wallet_txn;
create policy "wallet insert admin" on public.wallet_txn for insert
  to authenticated with check (public.is_admin());
drop policy if exists "wallet insert owner" on public.wallet_txn;
create policy "wallet insert owner" on public.wallet_txn for insert
  to authenticated with check ((select auth.uid()) = user_id);

-- catalog extras: public read, admin write
drop policy if exists "gallery select public" on public.gallery;
create policy "gallery select public" on public.gallery for select to anon, authenticated using (true);
drop policy if exists "gallery write admin" on public.gallery;
create policy "gallery write admin" on public.gallery for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "journal select public" on public.journal;
create policy "journal select public" on public.journal for select to anon, authenticated using (true);
drop policy if exists "journal write admin" on public.journal;
create policy "journal write admin" on public.journal for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "faqs select public" on public.faqs;
create policy "faqs select public" on public.faqs for select to anon, authenticated using (true);
drop policy if exists "faqs write admin" on public.faqs;
create policy "faqs write admin" on public.faqs for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings select public" on public.site_settings;
create policy "settings select public" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "settings write admin" on public.site_settings;
create policy "settings write admin" on public.site_settings for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact insert public" on public.contact_messages;
create policy "contact insert public" on public.contact_messages for insert
  to anon, authenticated with check (true);
drop policy if exists "contact select admin" on public.contact_messages;
create policy "contact select admin" on public.contact_messages for select
  to authenticated using (public.is_admin());
drop policy if exists "contact delete admin" on public.contact_messages;
create policy "contact delete admin" on public.contact_messages for delete
  to authenticated using (public.is_admin());

-- ============================================================
-- Auto-create a profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, referral_code)
  values (new.id,
          coalesce(new.email, ''),
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          upper(substr(coalesce(new.raw_user_meta_data ->> 'full_name', 'Q'), 1, 6)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Storage: 'gallery' bucket for product/review photography
-- Public read; uploads require auth. Scope per-upload client-side.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "gallery storage public read" on storage.objects;
create policy "gallery storage public read" on storage.objects
  for select using (bucket_id = 'gallery');
drop policy if exists "gallery storage auth upload" on storage.objects;
create policy "gallery storage auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery');

-- ============================================================
-- Seed: launch catalog (6 flagship bags) + design options
-- ============================================================
-- Seed is idempotent: products dedupe on their unique slug, and
-- design_options dedupe on this unique index. Without it the
-- "on conflict" below could never fire, because id is a fresh
-- gen_random_uuid() on every insert, and re-running this file would
-- duplicate all 49 design options.
create unique index if not exists design_options_group_value_key
  on public.design_options (group_name, value);

insert into public.products (slug, name, tagline, category, base_price, deposit_pct, featured, stock, description, seo_title, seo_desc)
values
  ('sovereign-tote', 'The Sovereign', 'Our flagship full-grain leather tote.', 'Totes', 2490, 50, true, 12, 'A structured everyday tote in full-grain leather with antique gold hardware.', 'The Sovereign Tote | Anointed Queens', 'Flagship full-grain leather tote.'),
  ('the-empress', 'The Empress', 'Evening clutch adorned in polished gold.', 'Clutches', 1690, 50, true, 8, 'An evening clutch with polished gold detailing and pebble leather.', 'The Empress Clutch | Anointed Queens', 'Gold-adorned evening clutch.'),
  ('the-duke', 'The Duke', 'Structured satchel with clean chrome lines.', 'Satchels', 2150, 50, true, 10, 'A structured satchel in full-grain leather with polished silver hardware.', 'The Duke Satchel | Anointed Queens', 'Structured mens satchel.'),
  ('crown-jewel-mini', 'The Crown Jewel', 'Mini bag with maximum presence.', 'Mini', 1290, 50, false, 15, 'A compact mini bag in suede and leather with antique gold hardware.', 'The Crown Jewel Mini | Anointed Queens', 'Mini bag in suede and leather.'),
  ('the-marquise', 'The Marquise', 'Hands-free heritage crossbody.', 'Crossbody', 1980, 50, false, 9, 'A heritage crossbody in full-grain leather with gunmetal hardware.', 'The Marquise Crossbody | Anointed Queens', 'Heritage crossbody bag.'),
  ('the-legacy', 'The Legacy', 'A weekender backpack built for decades.', 'Backpacks', 3250, 50, true, 6, 'A heritage weekender backpack in full-grain leather.', 'The Legacy Backpack | Anointed Queens', 'Heritage weekender backpack.')
on conflict (slug) do nothing;

insert into public.design_options (group_name, value, label, price_delta, swatch, active, sort)
values
  ('style','tote','Tote',0,null,true,1),('style','satchel','Satchel',0,null,true,2),
  ('style','crossbody','Crossbody',0,null,true,3),('style','clutch','Clutch',0,null,true,4),
  ('style','mini-bag','Mini Bag',0,null,true,5),('style','weekender','Weekender',300,null,true,6),
  ('fabric','full-grain-leather','Full-Grain Leather',0,null,true,1),('fabric','pebble-leather','Pebble Leather',-200,null,true,2),
  ('fabric','suede','Suede',-150,null,true,3),('fabric','vegan-pebble','Vegan Pebble',-600,null,true,4),('fabric','boucle','Boucle',-350,null,true,5),
  ('colour','noir','Noir Black',0,'#191A1F',true,1),('colour','cognac','Cognac',0,'#8B5A2B',true,2),
  ('colour','ivory','Ivory Cream',0,'#F2EBD8',true,3),('colour','blush','Blush',0,'#E8C4C4',true,4),
  ('colour','bottle-green','Bottle Green',0,'#14453B',true,5),('colour','royal-gold','Royal Gold',0,'#C9A227',true,6),
  ('colour','burgundy','Burgundy',0,'#6D1F33',true,7),('colour','navy','Navy',0,'#1F2A44',true,8),
  ('size','mini','Mini',-700,null,true,1),('size','small','Small',-400,null,true,2),
  ('size','medium','Medium',0,null,true,3),('size','large','Large',450,null,true,4),('size','xl','XL',900,null,true,5),
  ('hardware','antique-gold','Antique Gold',0,'#B8860B',true,1),('hardware','polished-gold','Polished Gold',0,'#FFD700',true,2),
  ('hardware','silver','Polished Silver',0,'#C0C5CE',true,3),('hardware','gunmetal','Gunmetal',0,'#5A6472',true,4),
  ('hardware','black-matte','Black Matte',0,'#222428',true,5),
  ('handle','leather-top','Leather Top Handle',0,null,true,1),('handle','chain','Gold Chain Drop',350,null,true,2),
  ('handle','wooden','Wooden Handle',250,null,true,3),('handle','long-strap','Long Shoulder Strap',300,null,true,4),
  ('handle','crossover','Crossover Body Strap',380,null,true,5),
  ('lining','cotton','Classic Cotton',0,null,true,1),('lining','monogrammed','Monogrammed Cotton',150,null,true,2),
  ('lining','suede-lining','Suede Lining',280,null,true,3),
  ('personalisation','none','No Personalisation',0,null,true,1),('personalisation','initials','Gold-Foil Initials (3 letters)',120,null,true,2),
  ('personalisation','monogram','Hand Monogram',220,null,true,3),('personalisation','engraved','Hardware Engraving',180,null,true,4)
on conflict (group_name, value) do nothing;

-- ============================================================
-- Inventory control RPCs.
-- SECURITY DEFINER lets stock move even though the products policies
-- are read-only for non-admins. Both functions accept only ids and
-- quantities, so a caller can never write arbitrary columns.
--
-- KNOWN LIMITATION: sell_stock is granted to any authenticated user
-- because checkout decrements stock client-side. A hostile client can
-- therefore drive stock toward zero without paying. Locking this down
-- properly means moving checkout settlement into an Edge Function
-- using the service role and revoking this grant. Not done here, to
-- avoid breaking checkout.
-- ============================================================
create or replace function public.sell_stock(items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb; nd integer;
begin
  for it in select jsonb_array_elements(items)
  loop
    if it->>'kind' = 'custom' or it->>'product_id' is null then continue; end if;
    update public.products
       set stock = greatest(0, coalesce(stock, 0) - coalesce((it->>'qty')::int, 1))
     where id = (it->>'product_id')::uuid
     returning stock into nd;
    if nd is null then
      raise exception 'unknown product %', it->>'product_id';
    end if;
  end loop;
end $$;

grant execute on function public.sell_stock(jsonb) to authenticated;

-- Restocking is an ADMIN action: it is only ever reached from the
-- admin order screen when an order is cancelled. It is restricted to
-- admins AND to orders that are actually cancelled, so a client
-- cannot inflate stock by calling this directly against an order
-- they have already received.
create or replace function public.restock_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb; o_items jsonb; o_status text; o_user uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select items, status::text, user_id into o_items, o_status, o_user
    from public.orders where id = p_order_id;
  if o_items is null then return; end if;
  if o_status is distinct from 'cancelled' then
    raise exception 'only cancelled orders can be restocked (order is %)', o_status;
  end if;

  for it in select jsonb_array_elements(o_items)
  loop
    if it->>'kind' = 'custom' or it->>'product_id' is null then continue; end if;
    update public.products
       set stock = coalesce(stock, 0) + coalesce((it->>'qty')::int, 1)
     where id = (it->>'product_id')::uuid;
  end loop;
end $$;

grant execute on function public.restock_order(uuid) to authenticated;

-- Note about add_loyalty_points being SECURITY INVOKER: it respects the
-- caller's row-level policies (own profile row + own loyalty_txn insert).
-- Do NOT change it to SECURITY DEFINER to fix a permission error.
