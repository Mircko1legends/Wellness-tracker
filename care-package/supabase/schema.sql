-- Care Package: database schema for Supabase
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Then add the two people at the bottom of this file (app_roles).

create extension if not exists pgcrypto;

-- Who can use the app, and with which role.
--   giver    = the person who buys (sees prices, budget)
--   receiver = the person who wishes (owns her address)
create table if not exists public.app_roles (
  email text primary key,
  role  text not null check (role in ('giver', 'receiver'))
);
alter table public.app_roles enable row level security;
-- No policies: nobody can read or edit this table from the app.

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.app_roles where lower(email) = lower(auth.jwt() ->> 'email')
$$;

-- Wishes (visible to both, never contain prices)
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid not null default auth.uid(),
  title       text not null check (char_length(title) between 1 and 120),
  shop        text,
  link        text,
  image_path  text,
  priority    int  not null default 2 check (priority between 1 and 3),
  note        text,
  wanted_when text,
  status      text not null default 'wished' check (status in ('wished', 'ordered', 'arrived')),
  ordered_at  timestamptz
);
alter table public.wishes enable row level security;
drop policy if exists wishes_read   on public.wishes;
drop policy if exists wishes_insert on public.wishes;
drop policy if exists wishes_update on public.wishes;
drop policy if exists wishes_delete on public.wishes;
create policy wishes_read   on public.wishes for select using (public.my_role() is not null);
create policy wishes_insert on public.wishes for insert with check (public.my_role() = 'receiver');
create policy wishes_update on public.wishes for update using (public.my_role() is not null);
create policy wishes_delete on public.wishes for delete using (
  public.my_role() = 'giver' or (public.my_role() = 'receiver' and status = 'wished')
);

-- Prices: giver only. The receiver can never read this table.
create table if not exists public.prices (
  wish_id   uuid primary key references public.wishes(id) on delete cascade,
  price_zar numeric(10,2)
);
alter table public.prices enable row level security;
drop policy if exists prices_giver on public.prices;
create policy prices_giver on public.prices for all
  using (public.my_role() = 'giver') with check (public.my_role() = 'giver');

-- Budget settings: giver only
create table if not exists public.settings (
  id         int primary key default 1 check (id = 1),
  budget_eur numeric(10,2) not null default 50,
  eur_to_zar numeric(10,4) not null default 20
);
alter table public.settings enable row level security;
drop policy if exists settings_giver on public.settings;
create policy settings_giver on public.settings for all
  using (public.my_role() = 'giver') with check (public.my_role() = 'giver');

-- Delivery address: only its owner. The giver can read it only while shared = true.
create table if not exists public.addresses (
  user_id    uuid primary key default auth.uid(),
  address    text,
  city       text,
  phone      text,
  notes      text,
  shared     boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
drop policy if exists addr_read  on public.addresses;
drop policy if exists addr_write on public.addresses;
create policy addr_read  on public.addresses for select
  using (user_id = auth.uid() or (shared and public.my_role() = 'giver'));
create policy addr_write on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Product photos (private bucket, readable by the two users only)
insert into storage.buckets (id, name, public) values ('wish-images', 'wish-images', false)
  on conflict (id) do nothing;
drop policy if exists wish_img_read  on storage.objects;
drop policy if exists wish_img_write on storage.objects;
drop policy if exists wish_img_del   on storage.objects;
create policy wish_img_read  on storage.objects for select
  using (bucket_id = 'wish-images' and public.my_role() is not null);
create policy wish_img_write on storage.objects for insert
  with check (bucket_id = 'wish-images' and public.my_role() is not null);
create policy wish_img_del   on storage.objects for delete
  using (bucket_id = 'wish-images' and public.my_role() is not null);

-- Live updates
alter publication supabase_realtime add table public.wishes;

-- ▼▼▼ EDIT THESE TWO LINES with the real email addresses, then run ▼▼▼
insert into public.app_roles (email, role) values
  ('TUA-EMAIL@example.com',  'giver'),
  ('EMAIL-DI-LEI@example.com', 'receiver')
on conflict (email) do update set role = excluded.role;
