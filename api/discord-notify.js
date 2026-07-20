// POST /api/discord-notify
// Body: { threadId, content, imageUrl?, visibility }
// Header: Authorization: Bearer <caller's supabase access token>
//
// Fires a Discord webhook notification, but ONLY when the message was
// written by the thread's own owner (a "user" writing in their personal
// chat) — staff replies (including !r replies) never ping Discord, since
// staff already see those in the app. Runs server-side so the webhook URL,
// role ID, and category/sender info can't be spoofed by the client.
//
// Required env vars (Vercel -> Settings -> Environment Variables):
//   DISCORD_WEBHOOK_URL     default https://discord.com/api/webhooks/... URL
//   DISCORD_PING_ROLE_ID    the Discord role ID to @mention, e.g. 1528450407783727115
//
// Each category can also have its own webhook_url (set in Settings -> Categories
// in the app) — if present, that category's notifications go to that channel
// instead of the default DISCORD_WEBHOOK_URL.

const { createClient } = require('@supabase/supabase-js');

const SQUARES = [
  { hex: '#e74c3c', emoji: '🟥' }, { hex: '#e67e22', emoji: '🟧' },
  { hex: '#f1c40f', emoji: '🟨' }, { hex: '#2ecc71', emoji: '🟩' },
  { hex: '#3498db', emoji: '🟦' }, { hex: '#9b59b6', emoji: '🟪' },
  { hex: '#8d6748', emoji: '🟫' }, { hex: '#2c2f33', emoji: '⬛' },
  { hex: '#f5f5f5', emoji: '⬜' },
];
function squareEmojiFor(hex){
  if (!hex) return '⬜';
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  let best = SQUARES[0], bestDist = Infinity;
  for (const s of SQUARES) {
    const sh = s.hex.replace('#', '');
    const sr = parseInt(sh.substring(0, 2), 16), sg = parseInt(sh.substring(2, 4), 16), sb = parseInt(sh.substring(4, 6), 16);
    const dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return best.emoji;
}
function prettyName(str){
  if (!str) return '';
  return String(str).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const defaultWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const pingRoleId = process.env.DISCORD_PING_ROLE_ID;

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

    const { data: thread } = await admin
      .from('threads')
      .select('category_id, subcategory_id, title, client_id')
      .eq('id', threadId)
      .single();
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    // Only the thread's own owner writing in their own chat triggers a ping —
    // staff replies (with or without !r) never notify Discord.
    if (thread.client_id !== callerId) {
      res.status(200).json({ skipped: true, reason: 'staff reply — not notified' });
      return;
    }

    const [{ data: category }, { data: subcategory }] = await Promise.all([
      admin.from('categories').select('name, color, webhook_url').eq('id', thread.category_id).single(),
      thread.subcategory_id
        ? admin.from('subcategories').select('name').eq('id', thread.subcategory_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const targetWebhookUrl = (category && category.webhook_url) || defaultWebhookUrl;
    if (!targetWebhookUrl) {
      res.status(200).json({ skipped: true, reason: 'No webhook configured (neither category.webhook_url nor DISCORD_WEBHOOK_URL is set)' });
      return;
    }

    const colorHex = (category && category.color) || '#00ff9c';
    const colorInt = parseInt(colorHex.replace('#', ''), 16) || 0x00ff9c;
    const square = squareEmojiFor(colorHex);

    const categoryLine = (category ? category.name : '—') + (subcategory ? ' / ' + subcategory.name : '');
    const prettySender = prettyName(senderProfile.username);
    const bodyText = (content && content.trim()) ? content.trim().slice(0, 1500) : (imageUrl ? '_[Image jointe]_' : '_(vide)_');

    const embed = {
      author: { name: `${square}  ${categoryLine}` },
      description: [
        `**${prettySender}**${senderProfile.business ? '  ·  _' + senderProfile.business + '_' : ''}`,
        bodyText,
      ].join('\n'),
      color: colorInt,
      fields: [
        { name: '💬 Chat', value: prettySender, inline: true },
      ],
      footer: { text: '🕶️ Terminal Sécurisé' },
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

    const discordRes = await fetch(targetWebhookUrl, {
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
    res.status(200).json({ success: false, error: (e && e.message) || 'Server error' });
  }
};
