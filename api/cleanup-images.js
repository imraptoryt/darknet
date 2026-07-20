// POST /api/cleanup-images
//
// Deletes PNG attachments older than 5 days: removes the file from the
// "chat-images" storage bucket and clears messages.image_url (the message
// text itself, if any, is kept — only the picture is removed).
//
// Can be triggered two ways:
//   1. Vercel Cron (see vercel.json) — runs once a day automatically. Vercel
//      cron requests are recognized by their user-agent.
//   2. A signed-in level 9/10 account, via the "Clear images older than 5
//      days" button in Settings -> Accounts -> Maintenance.

const { createClient } = require('@supabase/supabase-js');

const MAX_AGE_DAYS = 5;
const BUCKET = 'chat-images';

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      res.status(500).json({ error: 'Server not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' });
      return;
    }
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const userAgent = req.headers['user-agent'] || '';
    const isVercelCron = /vercel-cron/i.test(userAgent);

    if (!isVercelCron) {
      // Manual trigger — require a valid level 9/10 session.
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (!token) {
        res.status(401).json({ error: 'Missing auth token' });
        return;
      }
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData || !userData.user) {
        res.status(401).json({ error: 'Invalid session' });
        return;
      }
      const { data: callerProfile } = await admin
        .from('profiles')
        .select('is_active, roles(level)')
        .eq('id', userData.user.id)
        .single();
      const level = (callerProfile && callerProfile.roles && callerProfile.roles.level) || 0;
      if (!callerProfile || !callerProfile.is_active || level < 9) {
        res.status(403).json({ error: 'Only level 9 or 10 accounts can run cleanup manually' });
        return;
      }
    }

    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldMessages, error: fetchErr } = await admin
      .from('messages')
      .select('id, image_url')
      .not('image_url', 'is', null)
      .lt('created_at', cutoff);

    if (fetchErr) {
      res.status(500).json({ error: fetchErr.message });
      return;
    }
    if (!oldMessages || oldMessages.length === 0) {
      res.status(200).json({ cleared: 0 });
      return;
    }

    const paths = [];
    const marker = `/${BUCKET}/`;
    for (const m of oldMessages) {
      const idx = (m.image_url || '').indexOf(marker);
      if (idx !== -1) paths.push(m.image_url.slice(idx + marker.length));
    }

    if (paths.length > 0) {
      // storage.remove() accepts up to ~1000 paths per call; chunk defensively.
      const chunkSize = 100;
      for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        const { error: rmErr } = await admin.storage.from(BUCKET).remove(chunk);
        if (rmErr) console.error('storage remove error', rmErr.message);
      }
    }

    const ids = oldMessages.map(m => m.id);
    const { error: updErr } = await admin.from('messages').update({ image_url: null }).in('id', ids);
    if (updErr) {
      res.status(500).json({ error: updErr.message });
      return;
    }

    res.status(200).json({ cleared: oldMessages.length });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Server error' });
  }
};
