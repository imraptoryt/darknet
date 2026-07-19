-- ============================================================================
-- MIGRATION v4 — run in the same Supabase project (after v1/v2/v3). Safe to
-- re-run.
--
-- Adds:
--  1. profiles.avatar_color — optional per-account color for their chat
--     avatar circle (falls back to their category's color if not set).
--  2. categories.webhook_url — optional per-category Discord webhook so each
--     category (Gang, PF, MC, ...) can post to its own Discord channel
--     instead of one shared channel.
-- ============================================================================

alter table public.profiles add column if not exists avatar_color text;
alter table public.categories add column if not exists webhook_url text;

-- ============================================================================
-- Done. Sanity check:
--   select username, avatar_color from public.profiles;
--   select name, webhook_url from public.categories;
-- ============================================================================
