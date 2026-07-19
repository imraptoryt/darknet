-- ============================================================================
-- MIGRATION v3 — run in the same Supabase project (after schema.sql and
-- migration_v2.sql). Safe to re-run.
--
-- Adds:
--  1. categories.color — hex color used in the Discord embed per category.
--  2. profiles.business — free-text "which business/entreprise are they on".
--  3. messages.image_url — PNG attachments.
--  4. A public "chat-images" storage bucket + policies so PNGs can be uploaded
--     from the browser and displayed inline.
-- ============================================================================

alter table public.categories add column if not exists color text not null default '#00ff9c';
alter table public.profiles add column if not exists business text;
alter table public.messages add column if not exists image_url text;

-- sensible default colors for the 6 seeded categories (safe no-op if renamed)
update public.categories set color = '#e74c3c' where name = 'Gang'  and color = '#00ff9c';
update public.categories set color = '#3498db' where name = 'PF'    and color = '#00ff9c';
update public.categories set color = '#9b59b6' where name = 'Orga'  and color = '#00ff9c';
update public.categories set color = '#e67e22' where name = 'MC'    and color = '#00ff9c';
update public.categories set color = '#2ecc71' where name = 'SP'    and color = '#00ff9c';
update public.categories set color = '#95a5a6' where name = 'Autre' and color = '#00ff9c';

-- ---------------------------------------------------------------------------
-- Storage bucket for PNG attachments
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', true, 5242880, array['image/png'])
on conflict (id) do nothing;

drop policy if exists chat_images_public_read on storage.objects;
create policy chat_images_public_read on storage.objects for select
  using (bucket_id = 'chat-images');

drop policy if exists chat_images_authenticated_upload on storage.objects;
create policy chat_images_authenticated_upload on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.role() = 'authenticated');

-- ============================================================================
-- Done. Sanity check:
--   select name, color from public.categories;
--   select id, public, file_size_limit from storage.buckets where id='chat-images';
-- ============================================================================
