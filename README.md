# Setup: Supabase + Vercel

Files:
- `index.html` — the whole app (boot screen, login, sidebar/settings, chat, EN/FR toggle, PNG attachments, avatars)
- `schema.sql` — run once, for a **brand-new** Supabase project
- `migration_v2.sql` — category-level permissions + default "Member" role (run if you already had `schema.sql` applied)
- `migration_v3.sql` — categories.color, profiles.business, PNG attachments + storage bucket, Discord webhook support
- `migration_v4.sql` — profiles.avatar_color, categories.webhook_url (per-category Discord routing)
- `api/create-account.js`, `api/delete-account.js`, `api/discord-notify.js` — Vercel serverless functions (privileged actions, need the secret key)
- `package.json` — dependency for the functions above

If you're picking this up mid-setup, skip to **Step 0**.

## Step 0 — you already have a project set up

Run, in order, whichever of these you haven't run yet (all safe to re-run, additive only, won't touch existing accounts or messages):
1. `migration_v2.sql` — category-level permissions + default "Member" role.
2. `migration_v3.sql` — category colors, business field, PNG attachment storage bucket.
3. `migration_v4.sql` — avatar colors, per-category Discord webhook routing.

All three go in Supabase → SQL Editor → New query, paste the whole file, Run.

## 1. Create the Supabase project (new projects only)

1. Go to supabase.com → New project. Note the database password you set.
2. **SQL Editor** → New query, paste the entire contents of `schema.sql`, run it.
   - Creates all tables, RLS, the 6 categories (Gang, PF, Orga, MC, SP, Autre), three roles (Admin = level 10, Ramsey = level 9, Member = level 1 — the default for new accounts), and the two accounts `admin` / `raptorgoat` and `ramsey` / `younes`.
   - **If the seed block at the bottom errors**: Authentication → Users → Add user, create `admin@chatapp.local` / `raptorgoat` and `ramsey@chatapp.local` / `younes` (check "Auto Confirm User"), then run:
     ```sql
     insert into public.profiles (id, username, display_name, account_type, role_id)
     select u.id, 'admin', 'Admin', 'staff', r.id from auth.users u, public.roles r
     where u.email='admin@chatapp.local' and r.name='Admin';

     insert into public.profiles (id, username, display_name, account_type, role_id)
     select u.id, 'ramsey', 'Ramsey', 'staff', r.id from auth.users u, public.roles r
     where u.email='ramsey@chatapp.local' and r.name='Ramsey';
     ```
3. **Project Settings → API**: copy the **Project URL**, the **publishable/anon** key, and the **secret/service_role** key (keep this last one out of `index.html` — it only ever goes into Vercel).

## 2. Configure the front end

`index.html`, near the top of the `<script>` block:
```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-PUBLISHABLE-OR-ANON-KEY";
```
(Already filled in for your project if you're continuing from earlier in this build.)

## 3. Deploy to Vercel

1. Folder with `index.html`, `package.json`, `api/create-account.js`, `api/delete-account.js`, `api/discord-notify.js`.
2. `vercel` CLI (`npm i -g vercel`, `vercel login`, `vercel`) or connect the repo through the dashboard.
3. **Settings → Environment Variables** — add these, and make sure **all three environments are checked** (Production, Preview, Development), not just Production:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (the secret key)
   - `DISCORD_WEBHOOK_URL` — your webhook: `https://discord.com/api/webhooks/1528450992184496138/bbUtVKnPVOmIV6aTK2ej9JBOfd3ji-V_rWF8oI8hvRykuflIc2cPhu0QiXL2xupeDV3N`
   - `DISCORD_PING_ROLE_ID` — `1528450407783727115`
   - `DISCORD_NOTIFY_INTERNAL` (optional) — set to `false` if you don't want a Discord ping for internal staff notes (messages sent without `!r`), only for messages actually visible to the chat owner. Defaults to `true` (pings on every message).
4. **Redeploy after saving the env vars** — they only apply to deployments made after they're saved, not retroactively. `vercel --prod` or use "Redeploy" in the dashboard.

Treat that webhook URL like a password — anyone who has it can post to your Discord channel. It only ever lives in the Vercel env var, never in `index.html` or in the repo.

### If "create account" fails / doesn't confirm

This is almost always one of:
- Env vars were saved but you never redeployed afterwards → redeploy.
- Env vars were only checked for "Production" but you're testing a preview URL → recheck all three environments, save, redeploy.
- You're not logged in as a level 9/10 account → only `admin` or `ramsey` (or any role you set to level 9) can create accounts.

The app now shows the exact HTTP status + error message under the Create button, and logs the full response to the browser console (F12) — that'll tell you exactly which of the above it is.

## 4. Log in

`admin` / `raptorgoat` (level 10) or `ramsey` / `younes` (level 9). It's structurally impossible for anyone, including admin, to create a second role at level 9 or 10 — a database constraint enforces that those two levels only ever belong to one role each.

## How the permission model works

Every account has a **role** (level 1–10) and, as of this version, **every account automatically gets its own personal chat** — no more separate "staff vs client" account type to pick when creating someone.

**Level 9–10** (Admin, Ramsey, or any role you set to that level): full control. Sees every category, every chat, can create/kick/delete accounts and roles, can reply anywhere.

**Level 6–8**: sees *every* category and every chat automatically (same as 9/10 for visibility), can reply anywhere their role's "Can write" toggle allows, but can't create accounts, create roles, or touch level 9/10-gated actions unless also given `can_kick` / `can_delete` explicitly on their role.

**Level 1–5**: this is the new part. Their role can be granted specific categories (Settings → Roles → "Visible categories"). If granted:
- Those categories show up in their sidebar and they can **view** every chat inside them.
- They can **write freely in their own personal chat** (shown as "💬 My Chat"), no restrictions, no `!r` needed.
- They **cannot** reply inside anyone else's chat, even in a category they were granted — viewing someone else's chat is read-only below level 6. Only level 6+ can actually respond in a chat that isn't their own.

If a level 1–5 role has **no categories granted**, the account sees no sidebar at all — just their own personal chat, full-screen, exactly like a support ticket. They can write in it all they want; whether staff replies show up depends on `!r` (see below).

When creating an account (Settings → Accounts, level 9/10 only), you now just pick a **category** (required — that's where their personal chat lives) and, optionally, a **role**. Leave the role blank and it defaults to "Member" (level 1, no category grants — the plain support-chat experience).

## The `!r` reply mechanic

This only matters when a level 6+ account is replying inside **someone else's** chat (not their own):
- Type `!r your message` (or check "Reply to client (!r)" next to the input, which does the same thing) → the client sees it.
- Type without `!r` → it's an internal note, visible to every staff member with access to that chat, invisible to the chat's owner. Staff can coordinate freely this way before actually replying.

Your own chat never has this restriction — everything you post there is always visible (there's no one to hide it from).

## Language switch

EN/FR toggle, top-right corner, on the login screen and inside the app. Saved in the browser (`localStorage`) so it's remembered next visit.

## PNG image attachments

The 🖼 button next to the chat input opens a file picker restricted to `.png`, max 5MB. It uploads to a public Supabase Storage bucket called `chat-images` (created by `schema.sql` / `migration_v3.sql`) and posts the message with the image attached — the same `!r` / own-chat visibility rules apply to images as to text. Images are shown as clickable thumbnails in the chat.

## Business field

Level 9/10 accounts can set a free-text "Business" on any account — either when creating it, or afterwards via the "Edit" button next to it in Settings → Accounts. Shows up in the accounts table and gets included in the Discord notification embed.

## Creating categories

Settings → Categories now has a "Create Category" panel (level 9/10 only) — pick a name and a color. The color is used both for the sidebar and for the Discord embed color when a message comes in from that category. Sub-categories work as before, underneath whichever category you pick.

## Chat look — avatars

Every message now shows a small colored circle avatar instead of a plain text line:
- In the full staff view, the circle is colored by the sender's own **avatar color** (set per-account in Settings → Accounts → the round swatch button, or defaults to their category's color) and shows the first letter of their **group** (the category their own personal chat belongs to — e.g. a Gang member shows a red "G").
- In the restricted (scoped/solo) view, your own messages use your avatar color; everyone else's messages show a neutral circle colored like the category, since restricted accounts don't see real staff identities (by design).

Consecutive messages from the same person within a few minutes are visually grouped (avatar only shown once), and a day separator ("Today" / "Yesterday" / date) appears when the day changes — same idea as most modern chat apps.

## Discord notifications

Every new message (text or image) fires a webhook: an embed with a colored-square emoji + category name as the author line, the sender's name and business bolded in the description, fields for whose chat it is and whether the message is client-visible or an internal note, and a footer. It pings the role you set in `DISCORD_PING_ROLE_ID`.

**Per-category channels**: each category can have its own Discord webhook (Settings → Categories → Edit → "Discord webhook for this category"). If set, that category's notifications go to that channel instead of the shared one — handy if you want Gang, MC, PF etc. each posting to their own channel. Leave it blank to keep using the shared `DISCORD_WEBHOOK_URL`.

This runs from `api/discord-notify.js` after the message is successfully saved — it looks up the category/sender fresh from the database using the service role key, so nothing in the embed can be spoofed by tampering with the browser. If Discord is temporarily unreachable or no webhook is configured for that category, it fails silently (logged to the browser console) rather than blocking the chat.

To test the webhook independently of the app, run this from any terminal with your real values swapped in:
```
curl -X POST "https://discord.com/api/webhooks/1528450992184496138/bbUtVKnPVOmIV6aTK2ej9JBOfd3ji-V_rWF8oI8hvRykuflIc2cPhu0QiXL2xupeDV3N" \
  -H "Content-Type: application/json" \
  -d '{"content":"<@&1528450407783727115>","allowed_mentions":{"parse":[],"roles":["1528450407783727115"]},"embeds":[{"title":"Test","description":"webhook check","color":15158332}]}'
```
A `204` response (empty body) means it worked — check the Discord channel. I wasn't able to run this myself from here (this sandbox's network doesn't allow reaching discord.com), so please run it once yourself to confirm before relying on it in the app.

## Notes / things worth knowing

- Usernames map internally to `username@chatapp.local` for Supabase's email/password auth — nothing is actually emailed.
- "Kick" flips `is_active` to false (reversible, blocks login). "Delete" is permanent and cascades — auth account, profile, thread, and every message all removed.
- `admin` and `ramsey` can never be deleted, only kicked/restored.
- Realtime is enabled on `messages` — an open chat updates live for everyone viewing it.
- Permissions are enforced in Postgres Row Level Security, not just hidden in the UI — even a technically-inclined user poking at the API directly can't see or do more than their role allows.
- The `chat-images` storage bucket is public-read (needed so images load without extra signed-URL plumbing) but only logged-in users can upload to it, and only `.png` up to 5MB.
- If Discord notifications feel too noisy, set `DISCORD_NOTIFY_INTERNAL=false` in Vercel to only ping for messages that are actually visible to the chat's owner.
