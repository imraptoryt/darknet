const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PING_ROLE_ID = process.env.DISCORD_PING_ROLE_ID;

function squareEmojiFor(hex) {
  if (!hex) return '⬜';
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  const palette = [
    { e: '🟥', c: [220, 40, 40] }, { e: '🟧', c: [230, 140, 30] }, { e: '🟨', c: [230, 210, 40] },
    { e: '🟩', c: [40, 200, 100] }, { e: '🟦', c: [40, 130, 230] }, { e: '🟪', c: [150, 60, 220] },
    { e: '🟫', c: [140, 90, 50] }, { e: '⬛', c: [20, 20, 20] }, { e: '⬜', c: [235, 235, 235] },
  ];
  let best = palette[0], bestDist = Infinity;
  for (const p of palette) {
    const d = Math.pow(r - p.c[0], 2) + Math.pow(g - p.c[1], 2) + Math.pow(b - p.c[2], 2);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best.e;
}
function prettyName(str) {
  if (!str) return '';
  return String(str).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}
function hexToInt(hex) {
  if (!hex) return 0x00ff9c;
  return parseInt(hex.replace('#', ''), 16) || 0x00ff9c;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData || !userData.user) { res.status(401).json({ error: 'Invalid session' }); return; }
  const callerId = userData.user.id;

  const { data: callerProfile } = await admin.from('profiles').select('username, business, avatar_color').eq('id', callerId).single();
  if (!callerProfile) { res.status(403).json({ error: 'Caller profile not found' }); return; }

  const body = req.body || {};
  const { threadId, content, imageUrl } = body;
  if (!threadId) { res.status(400).json({ error: 'threadId is required' }); return; }

  const { data: thread } = await admin.from('threads').select('*').eq('id', threadId).single();
  if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }

  // Only notify when the message is from the thread's own owner — staff replies (internal
  // or !r) never trigger a webhook ping.
  if (thread.client_id !== callerId) {
    res.status(200).json({ skipped: true, reason: 'staff reply — not notified' });
    return;
  }

  const { data: category } = await admin.from('categories').select('*').eq('id', thread.category_id).maybeSingle();
  const { data: subcategory } = thread.subcategory_id
    ? await admin.from('subcategories').select('*').eq('id', thread.subcategory_id).maybeSingle()
    : { data: null };

  const webhookUrl = (category && category.webhook_url) || DEFAULT_WEBHOOK_URL;
  if (!webhookUrl) { res.status(200).json({ skipped: true, reason: 'no webhook configured' }); return; }

  const colorHex = (category && category.color) || '#00ff9c';
  const senderName = prettyName(callerProfile.username);
  const catLabel = (category ? category.name : 'Unknown') + (subcategory ? ' / ' + subcategory.name : '');

  const embed = {
    title: `${squareEmojiFor(colorHex)}  Nouveau message — ${catLabel}`,
    description: content ? `**${content}**` : (imageUrl ? '*[Image]*' : ''),
    color: hexToInt(colorHex),
    fields: [
      { name: 'Expéditeur', value: senderName, inline: true },
      { name: 'Business', value: callerProfile.business || '—', inline: true },
    ],
    image: imageUrl ? { url: imageUrl } : undefined,
    footer: { text: '🕶️ Terminal Sécurisé' },
    timestamp: new Date().toISOString(),
  };

  const payload = { embeds: [embed] };
  if (PING_ROLE_ID) {
    payload.content = `<@&${PING_ROLE_ID}>`;
    payload.allowed_mentions = { roles: [PING_ROLE_ID] };
  }

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!discordRes.ok) {
      const text = await discordRes.text();
      res.status(200).json({ ok: false, discordStatus: discordRes.status, discordBody: text });
      return;
    }
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
    return;
  }

  res.status(200).json({ ok: true });
};
