-- ============================================================================
-- SOVEREIGN MISSION TABLET — fresh schema
--
-- This REPLACES the old chat-app schema entirely (per your "fresh start"
-- choice). Run this once, whole, in the Supabase SQL editor.
--
-- Everything below is idempotent (safe to re-run) EXCEPT it will not
-- re-drop things twice — dropping is safe to re-run too since every drop
-- uses IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the old chat-app schema
-- ---------------------------------------------------------------------------
drop table if exists public.audit_log cascade;
drop table if exists public.thread_reads cascade;
drop view if exists public.thread_last_message cascade;
drop table if exists public.messages cascade;
drop table if exists public.threads cascade;
drop table if exists public.role_categories cascade;
drop table if exists public.subcategories cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.roles cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.my_level() cascade;
drop function if exists public.my_permission(text) cascade;
drop function if exists public.my_granted_category_ids() cascade;
drop function if exists public.protect_founder_accounts_update() cascade;
drop function if exists public.protect_founder_accounts_delete() cascade;

-- Supabase blocks direct SQL DELETE on storage.objects/storage.buckets
-- ("Direct deletion from storage tables is not allowed") — it has to go
-- through the Storage API instead. The old chat-images bucket is harmless
-- to leave in place (nothing in the new app references it), but if you want
-- it gone: Dashboard > Storage > chat-images > "..." > Delete bucket.

-- Old founder accounts (admin/ramsey) are left in auth.users untouched —
-- harmless leftovers. Delete them yourself in Supabase Dashboard >
-- Authentication > Users if you want them fully gone. They have no special
-- power in the new schema (see the RLS policies below: ANY authenticated
-- user is treated as an admin here, so if you keep admin/ramsey around,
-- their old passwords would also unlock the mission tablet's admin panel —
-- delete them if that's not what you want).

-- ---------------------------------------------------------------------------
-- 2. New schema
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  giver text not null default 'Sovereign',
  description text default '',
  reward text default '',
  risk text not null default 'medium' check (risk in ('low','medium','high','extreme')),
  status text not null default 'open' check (status in ('open','in_progress','completed','failed')),
  x numeric not null,      -- percentage 0-100 from left edge of the map image
  y numeric not null,      -- percentage 0-100 from top edge of the map image
  icon text not null default '🎯',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.missions enable row level security;

drop policy if exists missions_select on public.missions;
create policy missions_select on public.missions for select using (true);
drop policy if exists missions_insert on public.missions;
create policy missions_insert on public.missions for insert with check (auth.role() = 'authenticated');
drop policy if exists missions_update on public.missions;
create policy missions_update on public.missions for update using (auth.role() = 'authenticated');
drop policy if exists missions_delete on public.missions;
create policy missions_delete on public.missions for delete using (auth.role() = 'authenticated');

create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  map_image_url text,
  self_destruct boolean not null default false,
  self_destruct_message text default 'NETWORK COMPROMISED — SOVEREIGN UPLINK SEVERED',
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select using (true);
drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update on public.app_settings for update using (auth.role() = 'authenticated');

insert into public.app_settings (id, map_image_url)
values (1, 'https://imgg.fr/r/NesguhGF.png')
on conflict (id) do nothing;
-- Note: "do nothing" means this won't overwrite map_image_url if the row
-- already exists from a previous run. The app also has this same URL baked
-- in as a client-side fallback, so the map shows either way. To change the
-- map later, just use the admin panel's Map tab.

-- realtime (idempotent — only adds if not already a publication member)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'missions'
  ) then
    alter publication supabase_realtime add table public.missions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

-- storage bucket for the map image (public read, admin-only write)
insert into storage.buckets (id, name, public)
values ('mission-map', 'mission-map', true)
on conflict (id) do nothing;

drop policy if exists "mission-map public read" on storage.objects;
create policy "mission-map public read" on storage.objects
  for select using (bucket_id = 'mission-map');
drop policy if exists "mission-map admin upload" on storage.objects;
create policy "mission-map admin upload" on storage.objects
  for insert with check (bucket_id = 'mission-map' and auth.role() = 'authenticated');
drop policy if exists "mission-map admin update" on storage.objects;
create policy "mission-map admin update" on storage.objects
  for update using (bucket_id = 'mission-map' and auth.role() = 'authenticated');
drop policy if exists "mission-map admin delete" on storage.objects;
create policy "mission-map admin delete" on storage.objects
  for delete using (bucket_id = 'mission-map' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 3. Admin account — create this through the Supabase Dashboard, NOT SQL
--
-- Earlier versions of this script tried to insert/update the admin account
-- directly in auth.users via raw SQL (crypt()/gen_salt()). That turned out
-- to be unreliable — the password hash it wrote didn't verify correctly
-- against this project's Auth service ("Invalid login credentials" even
-- with the right password). Writing straight into auth.users bypasses
-- Supabase's own password-hashing path, so don't do it that way.
--
-- Instead, create the account through the Dashboard, which goes through
-- the real Auth API and is guaranteed to work:
--
--   1. Authentication > Users > "Add user" > "Create new user"
--        Email:    sovereign-ops@tablet.local
--        Password: raptor
--        ✅ Auto Confirm User (must be checked, or password login won't work)
--   2. Save.
--
-- (We switched the fixed email from sovereign-admin@tablet.local to
-- sovereign-ops@tablet.local — the first one got created with a broken
-- password via the old SQL approach and couldn't be deleted, so rather than
-- fight that, the app now points at a fresh email instead. The old broken
-- account is harmless to leave sitting there — its password doesn't work
-- for anyone, including you.)
--
-- That's it — no SQL needed for this step. The app only ever asks for the
-- password (via the hidden corner button); the email is fixed in the code
-- and never shown in the UI.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Done. Sanity check:
--   select * from public.app_settings;
--   select * from public.missions;
--
-- Don't forget step 3 above (create the admin account via the Dashboard,
-- not SQL) — this script no longer touches auth.users at all.
-- ============================================================================
