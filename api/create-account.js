// POST /api/create-account
// Body: { username, password, categoryId, subcategoryId?, roleId?, displayName? }
// Header: Authorization: Bearer <caller's supabase access token>
//
// Every account now gets its own personal chat thread (in `categoryId`), and
// a role — if roleId is omitted, the account falls back to the default
// "Member" role (level 1, no category grants: solo chat-only view).
//
// Only a signed-in account with role level 9 or 10 may create accounts.
// This runs server-side with the Supabase SERVICE ROLE key (never exposed to
// the browser) because creating an auth.users row requires admin rights.

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
      res.status(500).json({ error: 'Server not configured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are missing on this deployment. Set them in Vercel -> Settings -> Environment Variables for the Production environment, then redeploy.' });
      return;
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData || !userData.user) {
      res.status(401).json({ error: 'Invalid session. Try logging out and back in.' });
      return;
    }
    const callerId = userData.user.id;

    const { data: callerProfile, error: profErr } = await admin
      .from('profiles')
      .select('id, is_active, roles(level)')
      .eq('id', callerId)
      .single();

    if (profErr || !callerProfile) {
      res.status(403).json({ error: 'Profile not found for the calling account: ' + (profErr ? profErr.message : 'unknown') });
      return;
    }
    if (!callerProfile.is_active) {
      res.status(403).json({ error: 'Your account is disabled' });
      return;
    }
    const callerLevel = (callerProfile.roles && callerProfile.roles.level) || 0;
    if (callerLevel < 9) {
      res.status(403).json({ error: 'Only level 9 or 10 accounts can create new accounts' });
      return;
    }

    const { username, password, roleId, categoryId, subcategoryId, displayName, business, avatarColor } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    if (!categoryId) {
      res.status(400).json({ error: 'A category is required (every account gets its own chat, filed under a category)' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!cleanUsername) {
      res.status(400).json({ error: 'Invalid username — use letters, numbers, underscores, dots or dashes only' });
      return;
    }
    const email = `${cleanUsername}@chatapp.local`;

    // Resolve the role: use the one provided, or fall back to the default "Member" role.
    let finalRoleId = roleId || null;
    if (!finalRoleId) {
      const { data: memberRole, error: memberRoleErr } = await admin.from('roles').select('id').eq('name', 'Member').single();
      if (memberRoleErr || !memberRole) {
        res.status(500).json({ error: 'No role was provided and the default "Member" role does not exist. Run migration_v2.sql, or pick a role explicitly.' });
        return;
      }
      finalRoleId = memberRole.id;
    } else {
      const { data: roleRow, error: roleRowErr } = await admin.from('roles').select('level').eq('id', finalRoleId).single();
      if (roleRowErr || !roleRow) {
        res.status(400).json({ error: 'Selected role does not exist' });
        return;
      }
      if (roleRow.level >= 9) {
        res.status(403).json({ error: 'Level 9/10 roles are reserved for the founding admin accounts' });
        return;
      }
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr) {
      res.status(400).json({ error: 'Could not create the login: ' + createErr.message });
      return;
    }

    const newId = created.user.id;

    const { error: insertProfileErr } = await admin.from('profiles').insert({
      id: newId,
      username: cleanUsername,
      display_name: displayName || cleanUsername,
      account_type: 'staff',
      role_id: finalRoleId,
      business: business || null,
      avatar_color: avatarColor || null,
      is_active: true
    });
    if (insertProfileErr) {
      await admin.auth.admin.deleteUser(newId);
      res.status(400).json({ error: 'Could not create the profile: ' + insertProfileErr.message });
      return;
    }

    const { error: threadErr } = await admin.from('threads').insert({
      client_id: newId,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      title: displayName || cleanUsername
    });
    if (threadErr) {
      await admin.auth.admin.deleteUser(newId);
      res.status(400).json({ error: 'Could not create the chat thread: ' + threadErr.message });
      return;
    }

    res.status(200).json({ success: true, id: newId, username: cleanUsername });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Server error' });
  }
};
