// POST /api/discord-notify
// Body: { threadId, content, imageUrl?, visibility }
// Header: Authorization: Bearer <caller's supabase access token>
//
// Fires a Discord webhook notification for a newly-sent message. Runs
// server-side so the Discord webhook URL and role ID never reach the browser,
// and so the category/sender info in the embed can't be spoofed by the
// client — everything is looked up fresh from the database using the
// service role key.
//
// Required env vars (Vercel -> Settings -> Environment Variables):
//   DISCORD_WEBHOOK_URL     the full https://discord.com/api/webhooks/... URL
//   DISCORD_PING_ROLE_ID    the Discord role ID to @mention, e.g. 1528450407783727115
// Optional:
//   DISCORD_NOTIFY_INTERNAL "false" to skip pinging for internal (non-!r) staff notes

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const pingRoleId = process.env.DISCORD_PING_ROLE_ID;
    if (!webhookUrl) {
      // Not configured yet — silently no-op so message sending is never blocked by this.
      res.status(200).json({ skipped: true, reason: 'DISCORD_WEBHOOK_URL not set' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: 'Missing auth token' });
      return;
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      res.status(500).json({ error: 'Server not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' });
      return;
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData || !userData.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    const callerId = userData.user.id;

    const { data: senderProfile } = await admin
      .from('profiles')
      .select('username, business, is_active')
      .eq('id', callerId)
      .single();
    if (!senderProfile || !senderProfile.is_active) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { threadId, content, imageUrl, visibility } = req.body || {};
    if (!threadId) {
      res.status(400).json({ error: 'Missing threadId' });
      return;
    }

    const notifyInternal = (process.env.DISCORD_NOTIFY_INTERNAL || 'true').toLowerCase() !== 'false';
    if (visibility === 'internal' && !notifyInternal) {
      res.status(200).json({ skipped: true, reason: 'internal notifications disabled' });
      return;
    }

    const { data: thread } = await admin
      .from('threads')
      .select('category_id, subcategory_id, title, client_id')
      .eq('id', threadId)
      .single();
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const [{ data: category }, { data: subcategory }, { data: ownerProfile }] = await Promise.all([
      admin.from('categories').select('name, color').eq('id', thread.category_id).single(),
      thread.subcategory_id
        ? admin.from('subcategories').select('name').eq('id', thread.subcategory_id).single()
        : Promise.resolve({ data: null }),
      admin.from('profiles').select('username, business').eq('id', thread.client_id).single(),
    ]);

    const colorHex = (category && category.color) || '#00ff9c';
    const colorInt = parseInt(colorHex.replace('#', ''), 16) || 0x00ff9c;

    const fields = [
      { name: 'Expéditeur / Sender', value: senderProfile.username, inline: true },
      { name: 'Business', value: senderProfile.business || ownerProfile?.business || '—', inline: true },
      { name: 'Catégorie', value: (category ? category.name : '—') + (subcategory ? ' / ' + subcategory.name : ''), inline: true },
      { name: 'Chat de', value: (ownerProfile ? ownerProfile.username : thread.title) || '—', inline: true },
      { name: 'Visibilité', value: visibility === 'internal' ? 'Note interne (staff only)' : 'Visible client', inline: true },
    ];

    const embed = {
      title: '💬 Nouveau message',
      description: (content && content.trim()) ? content.trim().slice(0, 1500) : (imageUrl ? '[Image jointe]' : ''),
      color: colorInt,
      fields,
      timestamp: new Date().toISOString(),
    };
    if (imageUrl) {
      embed.image = { url: imageUrl };
    }

    const payload = {
      content: pingRoleId ? `<@&${pingRoleId}>` : undefined,
      allowed_mentions: pingRoleId ? { parse: [], roles: [pingRoleId] } : { parse: [] },
      embeds: [embed],
    };

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text().catch(() => '');
      res.status(200).json({ success: false, discordStatus: discordRes.status, discordError: text });
      return;
    }

    res.status(200).json({ success: true });
  } catch (e) {
    // Never let a Discord hiccup break message sending — respond 200 with the error noted.
    res.status(200).json({ success: false, error: (e && e.message) || 'Server error' });
  }
};
