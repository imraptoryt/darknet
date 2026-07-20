const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    .from('profiles').select('*, roles(level)').eq('id', callerId).single();
  if (callerErr || !callerProfile) { res.status(403).json({ error: 'Caller profile not found' }); return; }
  const callerLevel = callerProfile.roles ? callerProfile.roles.level : 0;
  if (callerLevel < 9) { res.status(403).json({ error: 'Requires level 9 or 10' }); return; }

  const body = req.body || {};
  const { targetId, username, password, business, avatarColor, roleId, categoryId, subcategoryId } = body;
  if (!targetId) { res.status(400).json({ error: 'targetId is required' }); return; }

  const { data: target, error: targetErr } = await admin.from('profiles').select('*').eq('id', targetId).single();
  if (targetErr || !target) { res.status(404).json({ error: 'Target account not found' }); return; }

  if (roleId) {
    const { data: chosenRole } = await admin.from('roles').select('level').eq('id', roleId).maybeSingle();
    if (chosenRole && chosenRole.level >= 9 && target.username !== 'admin' && target.username !== 'ramsey') {
      res.status(403).json({ error: 'Cannot assign level 9/10 roles to this account' });
      return;
    }
  }

  let finalUsername = target.username;
  if (username && username.trim()) {
    const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!cleanUsername) { res.status(400).json({ error: 'Invalid username' }); return; }
    if (cleanUsername !== target.username) {
      const { data: existing } = await admin.from('profiles').select('id').ilike('username', cleanUsername).neq('id', targetId).maybeSingle();
      if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }
      const newEmail = cleanUsername + '@chatapp.local';
      const { error: emailErr } = await admin.auth.admin.updateUserById(targetId, { email: newEmail, email_confirm: true });
      if (emailErr) { res.status(500).json({ error: 'Failed to update username: ' + emailErr.message }); return; }
      finalUsername = cleanUsername;
    }
  }

  if (password && password.trim()) {
    if (password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
    const { error: pwErr } = await admin.auth.admin.updateUserById(targetId, { password });
    if (pwErr) { res.status(500).json({ error: 'Failed to update password: ' + pwErr.message }); return; }
  }

  const profileUpdate = { username: finalUsername };
  if (business !== undefined) profileUpdate.business = business || null;
  if (avatarColor !== undefined) profileUpdate.avatar_color = avatarColor || null;
  if (roleId !== undefined && roleId) profileUpdate.role_id = roleId;

  const { error: profUpdErr } = await admin.from('profiles').update(profileUpdate).eq('id', targetId);
  if (profUpdErr) { res.status(500).json({ error: 'Failed to update profile: ' + profUpdErr.message }); return; }

  if (categoryId) {
    const { data: existingThread } = await admin.from('threads').select('id').eq('client_id', targetId).maybeSingle();
    if (existingThread) {
      const { error: thUpdErr } = await admin.from('threads')
        .update({ category_id: categoryId, subcategory_id: subcategoryId || null })
        .eq('id', existingThread.id);
      if (thUpdErr) { res.status(500).json({ error: 'Failed to move thread: ' + thUpdErr.message }); return; }
    } else {
      const { error: thInsErr } = await admin.from('threads').insert({
        client_id: targetId, category_id: categoryId, subcategory_id: subcategoryId || null, title: finalUsername,
      });
      if (thInsErr) { res.status(500).json({ error: 'Failed to create thread: ' + thInsErr.message }); return; }
    }
  }

  res.status(200).json({ ok: true, username: finalUsername });
};
