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
    .from('profiles').select('*, roles(level, can_write)').eq('id', callerId).single();
  if (callerErr || !callerProfile) { res.status(403).json({ error: 'Caller profile not found' }); return; }
  const callerLevel = callerProfile.roles ? callerProfile.roles.level : 0;
  if (callerLevel < 9) { res.status(403).json({ error: 'Requires level 9 or 10' }); return; }

  const body = req.body || {};
  const { username, password, categoryId, subcategoryId, roleId, displayName, business, avatarColor } = body;
  if (!username || !password || !categoryId) {
    res.status(400).json({ error: 'username, password, and categoryId are required' });
    return;
  }
  if (password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }

  const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (!cleanUsername) { res.status(400).json({ error: 'Invalid username' }); return; }
  const email = cleanUsername + '@chatapp.local';

  const { data: existing } = await admin.from('profiles').select('id').ilike('username', cleanUsername).maybeSingle();
  if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }

  let finalRoleId = roleId || null;
  if (!finalRoleId) {
    const { data: memberRole } = await admin.from('roles').select('id, level').eq('name', 'Member').maybeSingle();
    if (memberRole) finalRoleId = memberRole.id;
  } else {
    const { data: chosenRole } = await admin.from('roles').select('level').eq('id', finalRoleId).maybeSingle();
    if (chosenRole && chosenRole.level >= 9) { res.status(403).json({ error: 'Cannot assign level 9/10 roles here' }); return; }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true
  });
  if (createErr || !created || !created.user) {
    res.status(500).json({ error: 'Failed to create auth user: ' + (createErr ? createErr.message : 'unknown') });
    return;
  }
  const newUserId = created.user.id;

  const { error: profErr } = await admin.from('profiles').insert({
    id: newUserId,
    username: cleanUsername,
    display_name: displayName || cleanUsername,
    role_id: finalRoleId,
    business: business || null,
    avatar_color: avatarColor || null,
    is_active: true,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(newUserId);
    res.status(500).json({ error: 'Failed to create profile: ' + profErr.message });
    return;
  }

  const { error: threadErr } = await admin.from('threads').insert({
    client_id: newUserId,
    category_id: categoryId,
    subcategory_id: subcategoryId || null,
    title: displayName || cleanUsername,
  });
  if (threadErr) {
    await admin.auth.admin.deleteUser(newUserId);
    res.status(500).json({ error: 'Failed to create thread: ' + threadErr.message });
    return;
  }

  res.status(200).json({ ok: true, id: newUserId, username: cleanUsername });
};
