# Sovereign — Mission Uplink Tablet

Two-file static app: `index.html` (everything) + Supabase for data/storage/auth.
`schema.sql` sets up the database, `migration_v2.sql` adds the newer
hide/lock-code blip features on top of it.

## Setup

1. Run `schema.sql` in the Supabase SQL editor (project: `fgzmbkomdbggfqforxzn`).
2. Run `migration_v2.sql` after it.
3. Create the admin account manually in **Authentication → Users → Add user**:
   email `sovereign-ops@tablet.local`, password `raptor`, check **Auto Confirm User**.
   (Do this through the Dashboard, not SQL — writing straight into `auth.users`
   proved unreliable on this project.)
4. Deploy `index.html` as a static site.

## How it works

- Splash screen → **Connect** → hacking-in sequence (English + Russian lines,
  blocking Atelis/Cerberus, rerouting through secure channels) → map.
- Map fills the screen responsively (percentage-scaled, not raw pixel size),
  so pin positions land the same on any resolution/aspect ratio.
- **Scroll wheel** zooms in/out toward the cursor; the 🔍 indicator
  bottom-left shows current zoom and resets it on click.
- **Hold left or right click and drag** to pan around when zoomed in.
- Click a pin to see mission details in a panel that slides in from the
  right — it's an overlay now, so it never shifts/resizes the map underneath.
- **Admin access**: a small pulsing dot bottom-right (bottom-left on the
  lockout screen) opens a password prompt. No account is ever pre-authenticated
  on page load — it's asked fresh every visit.
- **Admin panel**: place/edit/delete missions, upload a new map image, and a
  self-destruct kill switch that locks out everyone except admins until
  reversed.
- **Hidden blips**: a mission can be marked "hidden" in the edit form —
  it never renders on the map for non-admins at all, but stays visible (with
  a HIDDEN tag) in the admin panel's mission list.
- **Locked blips**: a mission can have a lock code — it shows as a plain 🔒
  marker until someone clicks it and enters the correct code, at which point
  it unlocks permanently for that browser (stored locally) and shows normally.
  Admins always see locked missions in full, no code needed.

## Known limitation on hidden/locked blips

There's no server backend in this app — the missions table is readable by
anyone with the public anon key, including `lock_code` and `is_hidden`
values. This is fine for stopping a casual player from noticing something on
the map, but someone who deliberately inspects network requests could read
codes directly. If that ever matters, the fix is moving the reveal check into
a small serverless function so codes never reach the client until verified —
say the word and I'll add it.

## Default map

Baked in as a fallback (`https://imgg.fr/r/NesguhGF.png`) so the tablet never
shows empty. Upload a different one anytime via the admin panel's Map tab —
it overrides the default immediately for everyone.
