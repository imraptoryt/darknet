-- ============================================================================
-- MIGRATION v2 — run after schema.sql. Safe to re-run.
--
-- Adds "hide from map" and "lock behind a code" support for mission blips:
--   - is_hidden   : blip never renders for anyone except admins (still
--                   listed in the admin panel with a HIDDEN tag).
--   - lock_code   : blip renders as a generic 🔒 marker until the correct
--                   code is entered on the map; admins always see the real
--                   icon/details, no code needed.
--
-- Heads up — this check is done client-side (there's no server backend in
-- this app), so the missions table's SELECT policy still returns
-- lock_code/is_hidden data to anyone with the anon key who queries the
-- REST API directly. It stops casual players from seeing something on the
-- map they shouldn't, but it is not resistant to someone deliberately
-- inspecting network requests. Good enough for RP purposes; not a real
-- security boundary.
-- ============================================================================

alter table public.missions add column if not exists is_hidden boolean not null default false;
alter table public.missions add column if not exists lock_code text;

-- ============================================================================
-- Done. Sanity check:
--   select id, title, is_hidden, lock_code from public.missions;
-- ============================================================================
