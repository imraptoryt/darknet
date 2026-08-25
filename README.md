# Sovereign — Mission Uplink Tablet

Complete rebuild. This is a two-file app now: `index.html` (everything —
splash, hack-in sequence, map, admin panel) and `schema.sql` (the database).
No serverless functions, no `package.json`, no `vercel.json` — it's a static
site talking directly to Supabase.

## 1. Run the schema

Open your Supabase project → SQL Editor → paste the whole contents of
`schema.sql` → Run.

This **drops the entire old chat-app schema** (roles, threads, messages,
categories, the `chat-images` bucket, etc. — everything) and replaces it
with:
- `missions` — one row per mission pin (title, giver, description, reward,
  risk, status, x/y position as a percentage of the map image, icon)
- `app_settings` — a single row holding the current map image URL and the
  self-destruct flag
- a `mission-map` storage bucket (public read) for the map image
- one seeded admin login: `sovereign-admin@tablet.local` / **`raptor`**.
  It's never shown in the UI — the admin login only asks for a password.

Your old `admin` / `ramsey` accounts are left alone in `auth.users` (not
deleted) but have no special power anymore. Note: in this new schema *any*
authenticated user counts as an admin, so if you keep those two accounts
around, their old passwords would also open the admin panel here — delete
them from Authentication → Users if you don't want that.

## 2. Deploy

Push `index.html` (and `schema.sql`, just for reference) to your repo and
redeploy on Vercel as a static site. The old `api/` folder, `package.json`,
and `vercel.json` are gone from this delivery — nothing server-side is
needed anymore, so remove them from your repo too if they're still there.

## How it works

- **Everyone** who opens the site sees a splash screen with a **Connect**
  button. Pressing it plays the hacking-in sequence (blocking Atelis,
  blocking Cerberus, rerouting through secure channels) and then reveals the
  map. No login needed for this — it's flavor, not a gate.
- The map shows glowing mission pins. Click one to open mission details on
  the right (giver, risk, status, briefing, reward).
- **Admin access** is a small, barely-visible dot in the bottom-right corner
  of the screen. Click it, enter the password (`raptor`), and an "ADMIN"
  badge appears with **Panel** and **Exit** buttons.
- The **admin panel** has three tabs:
  - **Missions** — "Place New Mission" lets you click anywhere on the map to
    drop a pin, then fill in the details. Existing missions can be edited or
    deleted from the same list.
  - **Map** — upload/replace the map image. It goes straight to Supabase
    Storage and updates instantly for everyone connected. Mission pins are
    stored as percentages, so they stay correctly placed as long as the new
    map covers the same area as the old one.
  - **Kill Switch** — the self-destruct button. Pressing it immediately locks
    out every non-admin viewer (they see a full "NETWORK COMPROMISED"
    screen) until an admin comes back to this same tab and re-enables it.
    Admins can always still log in during a lockout.
- All of it updates live across open tablets via Supabase Realtime — if one
  admin adds a mission or flips the kill switch, everyone else's screen
  updates without a refresh.

## No map yet?

That's fine — the map area shows a placeholder grid until you upload one via
the admin panel's Map tab. You can even place test missions against the
placeholder; they'll be correctly positioned once you upload the real map
(as long as it has a similar aspect ratio).

## Changing the admin password later

Supabase Dashboard → Authentication → Users → `sovereign-admin@tablet.local`
→ "..." → Reset password. (The schema script only sets the password the
first time it creates that account — re-running `schema.sql` won't reset it
if the account already exists.)
