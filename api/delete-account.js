// POST /api/delete-account
// Body: { targetId }
// Header: Authorization: Bearer <caller's supabase access token>
//
// Only a signed-in staff member with role level 9 or 10 (can_delete permission)
// may permanently delete an account. Deleting the auth.users row cascades and
// removes the profile, their chat thread, and every message in it.
// The two founding accounts (admin / ramsey) can never be deleted this way.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: 'Missing auth token' });
      return;
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      res.status(500).json({ error: 'Server not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars)' });
      return;
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData || !userData.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    const callerId = userData.user.id;

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id, account_type, is_active, roles(level, can_delete)')
      .eq('id', callerId)
      .single();

    if (!callerProfile || callerProfile.account_type !== 'staff' || !callerProfile.is_active) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    const level = (callerProfile.roles && callerProfile.roles.level) || 0;
    const canDelete = !!(callerProfile.roles && callerProfile.roles.can_delete);
    if (level < 9 && !canDelete) {
      res.status(403).json({ error: 'You do not have permission to delete accounts' });
      return;
    }

    const { targetId } = req.body || {};
    if (!targetId) {
      res.status(400).json({ error: 'Missing targetId' });
      return;
    }

    const { data: targetProfile } = await admin.from('profiles').select('username').eq('id', targetId).single();
    if (targetProfile && ['admin', 'ramsey'].includes(targetProfile.username)) {
      res.status(403).json({ error: 'The founding admin accounts cannot be deleted' });
      return;
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      res.status(400).json({ error: delErr.message });
      return;
    }

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Server error' });
  }
};
