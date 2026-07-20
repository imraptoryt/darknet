# Update notes — Edit modal, quieter Discord, nicer chat, image cleanup

No new SQL this round — your database is already up to date (schema.sql +
migration_v2/v3/v4). Just redeploy these files to Vercel:

- `index.html` (updated)
- `api/create-account.js`, `api/delete-account.js`, `api/discord-notify.js` (updated)
- `api/update-account.js`, `api/cleanup-images.js` (new)
- `vercel.json` (new — enables the daily image cleanup cron)
- `package.json` (unchanged)

## New env var? No

Everything below reuses the env vars you already have (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_WEBHOOK_URL`, `DISCORD_PING_ROLE_ID`).
Nothing new to add — just deploy and redeploy.

## 1. Edit Account — now a proper modal

Settings → Accounts → "Edit" on any row opens a modal where you can change:
username, password (leave blank to keep the current one), role, avatar
color, category/sub-category (moves their chat), and business — all in one
place, one Save button. Runs through the new `api/update-account.js`
(level 9/10 only), which handles the tricky parts (changing the login
email when username changes, resetting the password via Supabase admin)
server-side.

## 2. Discord only pings for real user messages

Previously every message pinged Discord (with an option to mute internal
notes). Now: **only the chat owner writing in their own chat triggers a
Discord ping.** Staff replies — whether internal notes or `!r` replies —
never hit Discord anymore, since staff already see those live in the app.
This is enforced in `api/discord-notify.js` by checking that the sender is
actually the thread's owner, not just trusting the client.

## 3. Nicer chat: names and avatars

- Sender names are now prettified everywhere in the chat: `undead_vikings`
  → `Undead Vikings`, `MC - Undead Vikings` → styled cleanly with the dash
  gone and each word capitalized.
- Avatars got a gradient + glow matching their color instead of a flat
  circle, and scale up slightly on hover.
- The sender's name in each message is now bold and colored to match their
  avatar, so it reads faster at a glance.

## 4. Image cleanup

PNG attachments older than 5 days are removed automatically — the file is
deleted from storage and the image is cleared from the message (the text,
if any, stays). Two ways this runs:

- **Automatically**: `vercel.json` now defines a daily cron job (4am UTC)
  hitting `/api/cleanup-images`. Vercel picks this up on deploy — nothing
  to configure.
- **Manually**: Settings → Accounts → "Maintenance" → "Clear images older
  than 5 days" button (level 9/10 only) runs the same cleanup immediately.

Note: Vercel's free (Hobby) plan supports daily cron jobs; if you're on
Hobby and it doesn't fire, check Vercel's dashboard → your project →
Settings → Cron Jobs to confirm it's registered after deploying
`vercel.json`.

## Reminder — the rest of the app is unchanged

Permission model (levels, category grants, `!r`), PNG upload, business
field, category creation with per-category webhook, EN/FR toggle — all
still work exactly as before. If you ever need the SQL files again
(`schema.sql`, `migration_v2/v3/v4.sql`, `seed_groups.sql`), just ask and
I'll regenerate them — nothing in your database needs to change for this
update.
