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
-- 3. Seed the single admin account
--
-- Email is fixed/synthetic (never shown in the UI — the admin login only
-- asks for a password).
--
-- Password: raptor
-- ---------------------------------------------------------------------------
do $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'sovereign-admin@tablet.local') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token
    ) values (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'sovereign-admin@tablet.local', crypt('raptor', gen_salt('bf')),
      now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), new_user_id, new_user_id::text,
      jsonb_build_object('sub', new_user_id::text, 'email', 'sovereign-admin@tablet.local'),
      'email', now(), now(), now()
    );
  end if;
end $$;

-- ============================================================================
-- Done. Sanity check:
--   select * from public.app_settings;
--   select * from public.missions;
--   select email from auth.users where email = 'sovereign-admin@tablet.local';
--
-- If sovereign-admin@tablet.local already existed from a previous run and
-- you want to (re)set its password to "raptor", do it in Supabase Dashboard
-- > Authentication > Users > sovereign-admin@tablet.local > Reset password
-- (this script only sets the password on first creation).
-- ============================================================================
