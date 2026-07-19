-- ============================================================================
-- SEED — one chat account per group (MC / Organisation / Gang), from the
-- "Liste Des Groupes" list. Run once in Supabase -> SQL Editor -> New query.
--
-- Each account:
--   - username/password as in the recap the assistant sent alongside this file
--   - role: Member (level 1) — plain support-chat account, no category access
--   - business: the full group name (e.g. "MC - Undead Vikings")
--   - a personal chat thread filed under the matching category (MC / Orga / Gang)
--
-- Safe to re-run: skips any username that already exists.
-- Requires migration_v2.sql and migration_v3.sql to already be applied
-- (needs the "Member" role and the profiles.business column).
-- ============================================================================

do $$
declare
  member_role_id uuid;
  cat_id uuid;
  new_uid uuid;
  item jsonb;
  accounts jsonb := '[
    {"username":"undead_vikings","password":"766403","business":"MC - Undead Vikings","category":"MC"},
    {"username":"quetzal_lords","password":"210983","business":"MC - Quetzal Lords","category":"MC"},
    {"username":"black_vultures","password":"401757","business":"MC - Black Vultures","category":"MC"},
    {"username":"kara_ambar","password":"626438","business":"MC - Kara Ambar","category":"MC"},
    {"username":"angels_of_death","password":"231338","business":"MC - Angels Of Death","category":"MC"},
    {"username":"duggan_crime_family","password":"744156","business":"Organisation - Duggan Crime Family","category":"Orga"},
    {"username":"milicia_vencedores_26st","password":"260399","business":"Organisation - Milicia Vencedores 26st","category":"Orga"},
    {"username":"zwarte_haven_union","password":"718234","business":"Organisation - Zwarte Haven Union","category":"Orga"},
    {"username":"van_der_wilde","password":"849598","business":"Organisation - Van Der Wilde","category":"Orga"},
    {"username":"milicia_kryfos","password":"176578","business":"Organisation - Milicia Kryfos","category":"Orga"},
    {"username":"clan_saryarka","password":"725509","business":"Organisation - Clan Saryarka","category":"Orga"},
    {"username":"ikhwat_al-barbar","password":"988843","business":"Organisation - Ikhwat Al-Barbar","category":"Orga"},
    {"username":"schweiz_gegen_verrater","password":"789901","business":"Organisation - Schweiz Gegen Verräter","category":"Orga"},
    {"username":"cartel_madrazo","password":"313294","business":"Organisation - Cartel Madrazo","category":"Orga"},
    {"username":"barrio_viejo_locos","password":"258712","business":"Organisation - Barrio Viejo Locos","category":"Orga"},
    {"username":"famille_mckenzi","password":"554024","business":"Organisation - Famille McKenzi","category":"Orga"},
    {"username":"duister_surinaams_kartel","password":"412695","business":"Organisation - Duister Surinaams Kartel","category":"Orga"},
    {"username":"ballas","password":"577135","business":"Gang - Ballas","category":"Gang"},
    {"username":"marabunta_grande","password":"781457","business":"Gang - Marabunta Grande","category":"Gang"},
    {"username":"regii_strazii","password":"422819","business":"Gang - Regii Strazii","category":"Gang"},
    {"username":"chamberlain_families","password":"215092","business":"Gang - Chamberlain Families","category":"Gang"},
    {"username":"klan_saigon","password":"820799","business":"Gang - Klan Saigon","category":"Gang"},
    {"username":"vagos","password":"565168","business":"Gang - Vagos","category":"Gang"}
  ]'::jsonb;
begin
  select id into member_role_id from public.roles where name = 'Member';
  if member_role_id is null then
    raise exception 'Role "Member" not found — run migration_v2.sql first.';
  end if;

  for item in select * from jsonb_array_elements(accounts)
  loop
    if exists (select 1 from auth.users where email = (item->>'username') || '@chatapp.local') then
      continue;
    end if;

    select id into cat_id from public.categories where name = item->>'category';
    if cat_id is null then
      raise notice 'Category % not found, skipping %', item->>'category', item->>'username';
      continue;
    end if;

    new_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
      (item->>'username') || '@chatapp.local', crypt(item->>'password', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', (item->>'username') || '@chatapp.local'),
      'email', new_uid::text, now(), now(), now()
    );

    insert into public.profiles (id, username, display_name, account_type, role_id, business, is_active)
    values (new_uid, item->>'username', item->>'business', 'staff', member_role_id, item->>'business', true);

    insert into public.threads (client_id, category_id, title)
    values (new_uid, cat_id, item->>'business');
  end loop;
end $$;

-- ============================================================================
-- Verify:
--   select p.username, p.business, c.name as category
--   from public.profiles p
--   join public.threads t on t.client_id = p.id
--   join public.categories c on c.id = t.category_id
--   order by c.name, p.username;
-- ============================================================================
