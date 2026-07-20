const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_AGE_DAYS = 5;
const BUCKET = 'chat-images';

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const ua = req.headers['user-agent'] || '';
  const isCron = /vercel-cron/i.test(ua);

  if (!isCron) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData || !userData.user) { res.status(401).json({ error: 'Invalid session' }); return; }
    const { data: callerProfile } = await admin.from('profiles').select('*, roles(level)').eq('id', userData.user.id).single();
    const callerLevel = callerProfile && callerProfile.roles ? callerProfile.roles.level : 0;
    if (callerLevel < 9) { res.status(403).json({ error: 'Requires level 9 or 10' }); return; }
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: selErr } = await admin
    .from('messages')
    .select('id, image_url, created_at')
    .not('image_url', 'is', null)
    .lt('created_at', cutoff);

  if (selErr) { res.status(500).json({ error: 'Query failed: ' + selErr.message }); return; }
  if (!rows || rows.length === 0) { res.status(200).json({ cleared: 0 }); return; }

  const paths = [];
  const idsToNull = [];
  for (const row of rows) {
    idsToNull.push(row.id);
    const marker = `/${BUCKET}/`;
    const idx = row.image_url.indexOf(marker);
    if (idx !== -1) {
      paths.push(decodeURIComponent(row.image_url.slice(idx + marker.length)));
    }
  }

  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    if (chunk.length) {
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(chunk);
      if (rmErr) console.warn('storage remove error', rmErr.message);
    }
  }

  for (let i = 0; i < idsToNull.length; i += 200) {
    const chunk = idsToNull.slice(i, i + 200);
    const { error: updErr } = await admin.from('messages').update({ image_url: null }).in('id', chunk);
    if (updErr) console.warn('update image_url null error', updErr.message);
  }

  res.status(200).json({ cleared: rows.length });
};
