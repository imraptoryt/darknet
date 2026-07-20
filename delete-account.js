const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROTECTED_USERNAMES = ['admin', 'ramsey'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData || !userData.user) { res.status(401).json({ error: 'Invalid session' }); return; }
  const callerId = userData.user.id;

  const { data: callerProfile, error: callerErr } = await admin
    .from('profiles').select('*, roles(level, can_delete)').eq('id', callerId).single();
  if (callerErr || !callerProfile) { res.status(403).json({ error: 'Caller profile not found' }); return; }
  const callerLevel = callerProfile.roles ? callerProfile.roles.level : 0;
  const canDelete = callerLevel >= 9 || (callerProfile.roles && callerProfile.roles.can_delete);
  if (!canDelete) { res.status(403).json({ error: 'Not authorized to delete accounts' }); return; }

  const body = req.body || {};
  const { targetId } = body;
  if (!targetId) { res.status(400).json({ error: 'targetId is required' }); return; }

  const { data: target, error: targetErr } = await admin.from('profiles').select('username').eq('id', targetId).single();
  if (targetErr || !target) { res.status(404).json({ error: 'Target account not found' }); return; }

  // Founding accounts (admin / ramsey) can never be deleted, by anyone, ever.
  // Also enforced at the database level (migration_v6.sql trigger) as a backstop.
  if (PROTECTED_USERNAMES.includes(target.username)) {
    res.status(403).json({ error: 'This account is protected and cannot be deleted.' });
    return;
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) { res.status(500).json({ error: 'Failed to delete user: ' + delErr.message }); return; }

  res.status(200).json({ ok: true });
};
