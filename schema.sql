-- ============================================================================
-- GANG CHAT APP — Supabase schema
-- Run this whole file once in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  level int not null check (level between 1 and 10),
  can_move_chats boolean not null default false,
  can_make_subcategories boolean not null default false,
  can_write boolean not null default true,
  can_kick boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Only ONE role may ever hold level 10 (Admin) and ONE role level 9 (Ramsey)
create unique index if not exists roles_reserved_level_idx
  on public.roles (level) where level in (9, 10);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text not null default '#00ff9c',
  created_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

-- Category-level permissions for roles below level 6 (level 6+ always sees
-- every category automatically and doesn't need a grant here).
create table if not exists public.role_categories (
  role_id uuid not null references public.roles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (role_id, category_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  account_type text not null check (account_type in ('staff','client')),
  role_id uuid references public.roles(id),
  business text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- One chat thread ("chat box") per client account
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  subcategory_id uuid references public.subcategories(id),
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_username text not null,
  content text not null,
  -- 'client'   = visible to the client (staff sent it with "!r " prefix, or the client sent it themself)
  -- 'internal' = staff-only note, never shown to the client
  visibility text not null check (visibility in ('client','internal')),
  image_url text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer => safe to call inside RLS policies
-- without causing recursive-policy errors)
-- ----------------------------------------------------------------------------

create or replace function public.is_staff() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_type = 'staff' and is_active = true
  );
$$;

create or replace function public.my_level() returns int
language sql security definer stable as $$
  select coalesce((
    select r.level from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid() and p.is_active = true
  ), 0);
$$;

create or replace function public.my_permission(perm text) returns boolean
language sql security definer stable as $$
  select coalesce((
    select case perm
      when 'can_move_chats' then r.can_move_chats
      when 'can_make_subcategories' then r.can_make_subcategories
      when 'can_write' then r.can_write
      when 'can_kick' then r.can_kick
      when 'can_delete' then r.can_delete
      else false
    end
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid() and p.is_active = true
  ), false);
$$;

-- Category ids explicitly granted to the caller's role (only meaningful for
-- level < 6 — level 6+ bypasses this and always sees every category).
create or replace function public.my_granted_category_ids() returns setof uuid
language sql security definer stable as $$
  select rc.category_id from public.role_categories rc
  join public.profiles p on p.role_id = rc.role_id
  where p.id = auth.uid() and p.is_active = true;
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.roles enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.role_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;

create policy role_categories_select on public.role_categories for select
  using (public.is_staff());
create policy role_categories_insert on public.role_categories for insert
  with check (public.is_staff() and public.my_level() >= 9);
create policy role_categories_delete on public.role_categories for delete
  using (public.is_staff() and public.my_level() >= 9);

-- roles: any staff can read; only level 9/10 can manage
create policy roles_select on public.roles for select
  using (public.is_staff());
create policy roles_insert on public.roles for insert
  with check (public.is_staff() and public.my_level() >= 9);
create policy roles_update on public.roles for update
  using (public.is_staff() and public.my_level() >= 9)
  with check (public.is_staff() and public.my_level() >= 9);
create policy roles_delete on public.roles for delete
  using (public.is_staff() and public.my_level() >= 9);

-- categories: visible if level>=6, or explicitly granted to your role; only
-- level 9/10 can manage
create policy categories_select on public.categories for select
  using (
    public.my_level() >= 6
    or id in (select public.my_granted_category_ids())
  );
create policy categories_insert on public.categories for insert
  with check (public.is_staff() and public.my_level() >= 9);
create policy categories_update on public.categories for update
  using (public.is_staff() and public.my_level() >= 9);
create policy categories_delete on public.categories for delete
  using (public.is_staff() and public.my_level() >= 9);

-- subcategories: same visibility rule as their parent category; create
-- requires can_make_subcategories (or 9/10)
create policy subcategories_select on public.subcategories for select
  using (
    public.my_level() >= 6
    or category_id in (select public.my_granted_category_ids())
  );
create policy subcategories_insert on public.subcategories for insert
  with check (public.is_staff() and (public.my_permission('can_make_subcategories') or public.my_level() >= 9));
create policy subcategories_update on public.subcategories for update
  using (public.is_staff() and (public.my_permission('can_make_subcategories') or public.my_level() >= 9));
create policy subcategories_delete on public.subcategories for delete
  using (public.is_staff() and (public.my_permission('can_delete') or public.my_level() >= 9));

-- profiles: you can always read your own row; level>=6 can read everyone;
-- below level 6, you can also read the owners of threads in categories
-- explicitly granted to your role. Account creation/deletion always goes
-- through the server-side API (service role), never directly from the
-- browser. Level 9/10 (or a can_kick holder toggling a client's is_active)
-- may update existing rows.
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or public.my_level() >= 6
    or id in (
      select t.client_id from public.threads t
      where t.category_id in (select public.my_granted_category_ids())
    )
  );
create policy profiles_admin_update on public.profiles for update
  using (
    public.is_staff() and (
      public.my_level() >= 9
      or (public.my_permission('can_kick') and account_type = 'client')
    )
  )
  with check (
    public.is_staff() and (
      public.my_level() >= 9
      or (public.my_permission('can_kick') and account_type = 'client')
    )
  );

-- threads: visible to full staff (level>=6), to viewers with a category grant,
-- and always to the thread's own owner.
-- Moving requires can_move_chats (or 9/10). Deleting requires can_delete (or 9/10).
create policy threads_select on public.threads for select
  using (
    public.my_level() >= 6
    or category_id in (select public.my_granted_category_ids())
    or client_id = auth.uid()
  );
create policy threads_update on public.threads for update
  using (public.is_staff() and (public.my_permission('can_move_chats') or public.my_level() >= 9))
  with check (public.is_staff() and (public.my_permission('can_move_chats') or public.my_level() >= 9));
create policy threads_delete on public.threads for delete
  using (public.is_staff() and (public.my_permission('can_delete') or public.my_level() >= 9));

-- messages:
--  level>=6 sees everything in any thread.
--  a category-grant viewer (level<6) sees only client-visible messages inside
--  the categories they were granted (never internal notes).
--  everyone always sees the client-visible messages in their own thread.
create policy messages_select on public.messages for select
  using (
    public.my_level() >= 6
    or (
      visibility = 'client'
      and exists (
        select 1 from public.threads t
        where t.id = messages.thread_id
        and t.category_id in (select public.my_granted_category_ids())
      )
    )
    or exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and t.client_id = auth.uid() and messages.visibility = 'client'
    )
  );

--  level>=6 can reply inside ANY thread, gated by can_write.
--  everyone (any level) can always post inside their OWN thread, always as a
--  visible message — replying inside someone else's thread below level 6 is
--  not possible even with a category grant (that grant is view-only).
create policy messages_insert on public.messages for insert
  with check (
    (public.my_level() >= 6 and public.my_permission('can_write') and sender_id = auth.uid())
    or
    (
      sender_id = auth.uid()
      and visibility = 'client'
      and exists (select 1 from public.threads t where t.id = thread_id and t.client_id = auth.uid())
    )
  );

create policy messages_delete on public.messages for delete
  using (public.is_staff() and (public.my_permission('can_delete') or public.my_level() >= 9));

-- ----------------------------------------------------------------------------
-- REALTIME (so open chats update live)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ----------------------------------------------------------------------------
-- STORAGE — public bucket for PNG chat attachments
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', true, 5242880, array['image/png'])
on conflict (id) do nothing;

create policy chat_images_public_read on storage.objects for select
  using (bucket_id = 'chat-images');
create policy chat_images_authenticated_upload on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- SEED DATA — fixed categories (with distinct Discord-embed colors) + the
-- two founding roles
-- ----------------------------------------------------------------------------

insert into public.categories (name, color) values
  ('Gang', '#e74c3c'), ('PF', '#3498db'), ('Orga', '#9b59b6'),
  ('MC', '#e67e22'), ('SP', '#2ecc71'), ('Autre', '#95a5a6')
on conflict (name) do nothing;

insert into public.roles (name, level, can_move_chats, can_make_subcategories, can_write, can_kick, can_delete)
values
  ('Admin',  10, true, true, true, true, true),
  ('Ramsey', 9,  true, true, true, true, true),
  ('Member', 1,  false, false, true, false, false)
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- SEED ACCOUNTS — admin / raptorgoat  and  ramsey / younes
--
-- This writes directly into auth.users using the same bcrypt hashing GoTrue
-- uses. This is a well-known Supabase seeding trick, but Supabase occasionally
-- tweaks the auth schema. If this block errors out, use the fallback in the
-- README instead (create the two users from Authentication -> Users in the
-- Supabase Dashboard, then run just the two "insert into public.profiles"
-- statements at the bottom of this block by hand).
-- ----------------------------------------------------------------------------

do $$
declare
  admin_role_id   uuid;
  ramsey_role_id  uuid;
  admin_uid       uuid := gen_random_uuid();
  ramsey_uid      uuid := gen_random_uuid();
begin
  select id into admin_role_id  from public.roles where name = 'Admin';
  select id into ramsey_role_id from public.roles where name = 'Ramsey';

  if not exists (select 1 from auth.users where email = 'admin@chatapp.local') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_uid, 'authenticated', 'authenticated',
      'admin@chatapp.local', crypt('raptorgoat', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'admin@chatapp.local'),
      'email', admin_uid::text, now(), now(), now()
    );

    insert into public.profiles (id, username, display_name, account_type, role_id, is_active)
    values (admin_uid, 'admin', 'Admin', 'staff', admin_role_id, true);
  end if;

  if not exists (select 1 from auth.users where email = 'ramsey@chatapp.local') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', ramsey_uid, 'authenticated', 'authenticated',
      'ramsey@chatapp.local', crypt('younes', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), ramsey_uid,
      jsonb_build_object('sub', ramsey_uid::text, 'email', 'ramsey@chatapp.local'),
      'email', ramsey_uid::text, now(), now(), now()
    );

    insert into public.profiles (id, username, display_name, account_type, role_id, is_active)
    values (ramsey_uid, 'ramsey', 'Ramsey', 'staff', ramsey_role_id, true);
  end if;
end $$;

-- ============================================================================
-- Done. Verify with:
--   select username, account_type, role_id from public.profiles;
--   select name, level from public.roles;
-- ============================================================================
