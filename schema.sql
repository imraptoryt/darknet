-- ============================================================================
-- SOVEREIGN MISSION TABLET — base schema
--
-- This REPLACES any old chat-app schema entirely. Run this once, whole, in
-- the Supabase SQL editor for your project (fgzmbkomdbggfqforxzn).
--
-- After this, also run migration_v2.sql (adds hide/lock-code support for
-- blips). Both files are idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop any old chat-app schema (safe no-op if it never existed here)
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

-- Note: Supabase blocks direct SQL DELETE on storage.objects/storage.buckets
-- ("Direct deletion from storage tables is not allowed"). If an old
-- chat-images bucket exists, it's harmless to leave — delete it manually via
-- Dashboard > Storage if you want it gone.

-- ---------------------------------------------------------------------------
-- 2. Mission tablet schema
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
-- 3. Admin account — create through the Supabase Dashboard, NOT SQL
--
-- Writing directly into auth.users via raw SQL proved unreliable on this
-- project (the password hash didn't verify). Create it the normal way:
--
--   1. Authentication > Users > "Add user" > "Create new user"
--        Email:    sovereign-ops@tablet.local
--        Password: raptor
--        ✅ Auto Confirm User (must be checked)
--   2. Save.
--
-- The app only ever asks for the password (hidden corner dot); the email is
-- fixed in the code and never shown in the UI.
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Done. Now also run migration_v2.sql.
-- Sanity check:
--   select * from public.app_settings;
--   select * from public.missions;
-- ============================================================================
