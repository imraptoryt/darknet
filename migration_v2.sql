-- ============================================================================
-- MIGRATION v2 — run this in the SAME Supabase project that already has
-- schema.sql applied. Safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP-then-
-- CREATE for policies).
--
-- What this adds:
--  1. Category-level permissions for roles below level 6 ("give this role a
--     view into the Gang chats without making them a full admin").
--  2. Every account can now always write freely in its OWN personal chat,
--     regardless of role — no !r needed for your own chat.
--  3. Replying inside someone ELSE's chat now requires level >= 6 (which also
--     automatically sees every category, no grant needed).
--  4. A default "Member" role (level 1) so account creation no longer forces
--     you to pick a role — category is now the only required field.
--  5. Hardens permission checks so a kicked/disabled account can't keep using
--     its still-valid session token to read data it shouldn't.
-- ============================================================================

create table if not exists public.role_categories (
  role_id uuid not null references public.roles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (role_id, category_id)
);
alter table public.role_categories enable row level security;

insert into public.roles (name, level, can_write, can_move_chats, can_make_subcategories, can_kick, can_delete)
values ('Member', 1, true, false, false, false, false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Helper functions — re-created with an is_active guard + the new lookup
-- ---------------------------------------------------------------------------

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

create or replace function public.my_granted_category_ids() returns setof uuid
language sql security definer stable as $$
  select rc.category_id from public.role_categories rc
  join public.profiles p on p.role_id = rc.role_id
  where p.id = auth.uid() and p.is_active = true;
$$;

-- ---------------------------------------------------------------------------
-- role_categories policies
-- ---------------------------------------------------------------------------
drop policy if exists role_categories_select on public.role_categories;
create policy role_categories_select on public.role_categories for select
  using (public.is_staff());

drop policy if exists role_categories_insert on public.role_categories;
create policy role_categories_insert on public.role_categories for insert
  with check (public.is_staff() and public.my_level() >= 9);

drop policy if exists role_categories_delete on public.role_categories;
create policy role_categories_delete on public.role_categories for delete
  using (public.is_staff() and public.my_level() >= 9);

-- ---------------------------------------------------------------------------
-- categories — visible if level >= 6, or explicitly granted to your role
-- ---------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select
  using (
    public.my_level() >= 6
    or id in (select public.my_granted_category_ids())
  );

-- ---------------------------------------------------------------------------
-- subcategories — same visibility rule as their parent category
-- ---------------------------------------------------------------------------
drop policy if exists subcategories_select on public.subcategories;
create policy subcategories_select on public.subcategories for select
  using (
    public.my_level() >= 6
    or category_id in (select public.my_granted_category_ids())
  );

-- ---------------------------------------------------------------------------
-- profiles — full roster to level >= 6; otherwise only yourself, plus the
-- owners of threads inside categories you were granted (so you can see who
-- you're looking at)
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or public.my_level() >= 6
    or id in (
      select t.client_id from public.threads t
      where t.category_id in (select public.my_granted_category_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- threads — visible to full staff (level>=6), to granted-category viewers,
-- and always to the thread's own owner
-- ---------------------------------------------------------------------------
drop policy if exists threads_select on public.threads;
create policy threads_select on public.threads for select
  using (
    public.my_level() >= 6
    or category_id in (select public.my_granted_category_ids())
    or client_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- messages — full staff sees everything; granted-category viewers see only
-- the client-visible messages in their categories (never internal notes);
-- everyone always sees the client-visible messages (and can post) in their
-- own thread
-- ---------------------------------------------------------------------------
drop policy if exists messages_select on public.messages;
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

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (
    -- reply as full staff (level>=6) into ANY thread, gated by can_write
    (public.my_level() >= 6 and public.my_permission('can_write') and sender_id = auth.uid())
    or
    -- everyone may always post in their OWN thread, always as a visible message
    (
      sender_id = auth.uid()
      and visibility = 'client'
      and exists (select 1 from public.threads t where t.id = thread_id and t.client_id = auth.uid())
    )
  );

-- messages_delete / threads_update / threads_delete are unchanged from schema.sql
-- (still gated to level>=9 or the can_delete / can_move_chats role toggle).

-- ============================================================================
-- Done. Sanity check:
--   select * from public.role_categories;
--   select name, level from public.roles;
-- ============================================================================
