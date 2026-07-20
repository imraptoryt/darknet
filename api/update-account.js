// POST /api/update-account
// Body: { targetId, username?, password?, business?, avatarColor?, roleId?, categoryId?, subcategoryId? }
// Header: Authorization: Bearer <caller's supabase access token>
//
// Only a signed-in level 9/10 account may edit another account. Runs
// server-side with the service role key because changing the login email
// (derived from username) or password requires Supabase admin rights.

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

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id, is_active, roles(level)')
      .eq('id', callerId)
      .single();
    if (!callerProfile || !callerProfile.is_active) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    const callerLevel = (callerProfile.roles && callerProfile.roles.level) || 0;
    if (callerLevel < 9) {
      res.status(403).json({ error: 'Only level 9 or 10 accounts can edit accounts' });
      return;
    }

    const { targetId, username, password, business, avatarColor, roleId, categoryId, subcategoryId } = req.body || {};
    if (!targetId) {
      res.status(400).json({ error: 'Missing targetId' });
      return;
    }

    const { data: target, error: targetErr } = await admin.from('profiles').select('*').eq('id', targetId).single();
    if (targetErr || !target) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (roleId) {
      const { data: roleRow } = await admin.from('roles').select('level').eq('id', roleId).single();
      if (roleRow && roleRow.level >= 9 && !['admin', 'ramsey'].includes(target.username)) {
        res.status(403).json({ error: 'Level 9/10 roles are reserved for the founding admin accounts' });
        return;
      }
    }

    // --- username / email change ---
    let newUsername = target.username;
    if (username && username.trim()) {
      const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      if (!cleanUsername) {
        res.status(400).json({ error: 'Invalid username' });
        return;
      }
      if (cleanUsername !== target.username) {
        const { data: clash } = await admin
          .from('profiles')
          .select('id')
          .ilike('username', cleanUsername)
          .neq('id', targetId)
          .maybeSingle();
        if (clash) {
          res.status(400).json({ error: 'That username is already taken' });
          return;
        }
        const newEmail = `${cleanUsername}@chatapp.local`;
        const { error: emailErr } = await admin.auth.admin.updateUserById(targetId, { email: newEmail, email_confirm: true });
        if (emailErr) {
          res.status(400).json({ error: 'Could not update username/login: ' + emailErr.message });
          return;
        }
        newUsername = cleanUsername;
      }
    }

    // --- password change ---
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }
      const { error: pwErr } = await admin.auth.admin.updateUserById(targetId, { password: password.trim() });
      if (pwErr) {
        res.status(400).json({ error: 'Could not update password: ' + pwErr.message });
        return;
      }
    }

    // --- profile fields ---
    const profileUpdate = { username: newUsername };
    if (business !== undefined) profileUpdate.business = business || null;
    if (avatarColor !== undefined) profileUpdate.avatar_color = avatarColor || null;
    if (roleId) profileUpdate.role_id = roleId;

    const { error: profErr } = await admin.from('profiles').update(profileUpdate).eq('id', targetId);
    if (profErr) {
      res.status(400).json({ error: 'Could not update profile: ' + profErr.message });
      return;
    }

    // --- thread / category move ---
    if (categoryId) {
      const { data: existingThread } = await admin.from('threads').select('id').eq('client_id', targetId).maybeSingle();
      if (existingThread) {
        const { error: threadErr } = await admin
          .from('threads')
          .update({ category_id: categoryId, subcategory_id: subcategoryId || null })
          .eq('id', existingThread.id);
        if (threadErr) {
          res.status(400).json({ error: 'Could not move chat: ' + threadErr.message });
          return;
        }
      } else {
        const { error: threadErr } = await admin.from('threads').insert({
          client_id: targetId,
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          title: newUsername,
        });
        if (threadErr) {
          res.status(400).json({ error: 'Could not create chat: ' + threadErr.message });
          return;
        }
      }
    }

    res.status(200).json({ success: true, username: newUsername });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Server error' });
  }
};
