
/* ============================================================================
   CONFIG — paste your Supabase project URL + anon (public) key here.
   Find them in Supabase Dashboard -> Project Settings -> API.
   ========================================================================== */
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================================
   MATRIX RAIN BACKGROUND
   ========================================================================== */
(function matrixRain(){
  const canvas = document.getElementById('matrix-canvas');
  const ctx = canvas.getContext('2d');
  let w,h,cols,drops;
  const chars = "アイウエオカキクケコサシスセソ0123456789ABCDEF$#%&";
  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    cols = Math.floor(w/16);
    drops = new Array(cols).fill(1);
  }
  window.addEventListener('resize', resize);
  resize();
  function draw(){
    ctx.fillStyle = 'rgba(6,9,9,0.08)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#00ff9c';
    ctx.font = '14px monospace';
    for(let i=0;i<drops.length;i++){
      const text = chars[Math.floor(Math.random()*chars.length)];
      ctx.fillText(text, i*16, drops[i]*16);
      if(drops[i]*16 > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(draw, 45);
})();

/* ============================================================================
   BOOT SEQUENCE
   ========================================================================== */
function runBootSequence(done){
  const linesEl = document.getElementById('boot-lines');
  const bar = document.getElementById('boot-progress-bar');
  const lines = [
    ["BOOTING SECURE TERMINAL...", false],
    ["ESTABLISHING ENCRYPTED LINK...", false],
    ["BYPASSING PERIMETER FIREWALL... [OK]", true],
    ["DECRYPTING AUTH MODULE...", false],
    ["LOADING USER DATABASE...", false],
    ["VERIFYING NODE INTEGRITY... [OK]", true],
    ["ACCESS POINT READY.", true],
  ];
  let i = 0;
  function next(){
    if(i >= lines.length){
      setTimeout(()=>{
        document.getElementById('boot-screen').classList.add('hidden');
        setTimeout(done, 550);
      }, 300);
      return;
    }
    const [text, ok] = lines[i];
    const div = document.createElement('div');
    div.className = 'line' + (ok ? '' : ' dim');
    div.textContent = text;
    linesEl.appendChild(div);
    bar.style.width = Math.round(((i+1)/lines.length)*100) + '%';
    i++;
    setTimeout(next, 260 + Math.random()*220);
  }
  next();
}

/* ============================================================================
   HELPERS
   ========================================================================== */
function usernameToEmail(username){
  const clean = String(username).trim().toLowerCase().replace(/[^a-z0-9_.-]/g,'');
  return clean + "@chatapp.local";
}
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function fmtTime(ts){
  const d = new Date(ts);
  return d.toLocaleString();
}

const CATEGORY_ORDER = ["Gang","PF","Orga","MC","SP","Autre"];

/* ============================================================================
   GLOBAL STATE
   ========================================================================== */
const state = {
  session: null,
  profile: null,
  role: null,
  roles: [],
  categories: [],
  subcategories: [],
  threads: [],
  accounts: [],
  activeCategoryId: null,
  activeThreadId: null,
  clientThread: null,
  msgChannel: null,
};

/* ============================================================================
   AUTH
   ========================================================================== */
async function attemptLogin(){
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errEl.textContent = '';
  if(!username || !password){
    errEl.textContent = 'ERROR: username and password required.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Authenticating...';
  const email = usernameToEmail(username);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Connect';
  if(error){
    errEl.textContent = 'ACCESS DENIED: invalid credentials.';
    return;
  }
  await onAuthed(data.session);
}

async function onAuthed(session){
  state.session = session;
  const { data: profile, error } = await sb
    .from('profiles')
    .select('*, roles(*)')
    .eq('id', session.user.id)
    .single();

  if(error || !profile){
    document.getElementById('login-error').textContent = 'ERROR: no profile found for this account.';
    await sb.auth.signOut();
    return;
  }
  if(!profile.is_active){
    document.getElementById('login-error').textContent = 'ACCESS DENIED: this account has been disabled.';
    await sb.auth.signOut();
    return;
  }

  state.profile = profile;
  state.role = profile.roles || null;

  document.getElementById('login-screen').classList.remove('visible');

  if(profile.account_type === 'staff'){
    await loadStaffApp();
  } else {
    await loadClientApp();
  }
}

async function logout(){
  if(state.msgChannel){ sb.removeChannel(state.msgChannel); state.msgChannel = null; }
  await sb.auth.signOut();
  location.reload();
}

/* ============================================================================
   STAFF APP
   ========================================================================== */
async function loadStaffApp(){
  document.getElementById('app').classList.add('visible');
  document.getElementById('who-name').textContent = state.profile.display_name || state.profile.username;
  document.getElementById('who-level').textContent =
    (state.role ? state.role.name + ' — level ' + state.role.level : 'no role assigned');

  await refreshAllStaffData();
  renderSidebar();
  renderSettingsRefs();
}

async function refreshAllStaffData(){
  const [rolesRes, catsRes, subcatsRes, threadsRes, accountsRes] = await Promise.all([
    sb.from('roles').select('*').order('level', { ascending:false }),
    sb.from('categories').select('*'),
    sb.from('subcategories').select('*'),
    sb.from('threads').select('*'),
    sb.from('profiles').select('*, roles(name,level)'),
  ]);
  state.roles = rolesRes.data || [];
  state.categories = (catsRes.data || []).slice().sort(
    (a,b)=> CATEGORY_ORDER.indexOf(a.name) - CATEGORY_ORDER.indexOf(b.name)
  );
  state.subcategories = subcatsRes.data || [];
  state.threads = threadsRes.data || [];
  state.accounts = accountsRes.data || [];
}

function myPerm(key){
  if(!state.role) return false;
  if(state.role.level >= 9) return true;
  return !!state.role[key];
}

function renderSidebar(){
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  const settingsItem = el(`<div class="nav-item settings" data-nav="settings">⚙ Settings</div>`);
  settingsItem.onclick = () => openSettings();
  nav.appendChild(settingsItem);

  state.categories.forEach(cat=>{
    const wrap = document.createElement('div');
    const head = el(`<div class="nav-item" data-cat="${cat.id}">${escapeHtml(cat.name)}</div>`);
    head.onclick = () => toggleCategory(cat.id, wrap);
    wrap.appendChild(head);
    const children = document.createElement('div');
    children.className = 'cat-children hidden-el';
    children.dataset.children = cat.id;
    wrap.appendChild(children);
    nav.appendChild(wrap);
  });
}

function toggleCategory(catId, wrap){
  const children = wrap.querySelector('.cat-children');
  const isOpen = !children.classList.contains('hidden-el');
  document.querySelectorAll('.cat-children').forEach(c=>c.classList.add('hidden-el'));
  document.querySelectorAll('.nav-item[data-cat]').forEach(n=>n.classList.remove('active'));
  if(isOpen) return;
  children.classList.remove('hidden-el');
  wrap.querySelector('.nav-item').classList.add('active');
  renderCategoryChildren(catId, children);
}

function renderCategoryChildren(catId, container){
  container.innerHTML = '';
  const subcats = state.subcategories.filter(s=>s.category_id === catId);
  const threadsDirect = state.threads.filter(t=>t.category_id===catId && !t.subcategory_id);

  threadsDirect.forEach(t=> container.appendChild(threadRow(t)));

  subcats.forEach(sc=>{
    container.appendChild(el(`<div class="subcat-label">${escapeHtml(sc.name)}</div>`));
    const scThreads = state.threads.filter(t=>t.subcategory_id === sc.id);
    if(scThreads.length === 0){
      container.appendChild(el(`<div class="thread-item" style="opacity:.5;cursor:default;">(empty)</div>`));
    }
    scThreads.forEach(t=> container.appendChild(threadRow(t)));
  });

  if(subcats.length===0 && threadsDirect.length===0){
    container.appendChild(el(`<div class="thread-item" style="opacity:.5;cursor:default;">(no chats yet)</div>`));
  }
}

function threadRow(t){
  const acc = state.accounts.find(a=>a.id === t.client_id);
  const label = (acc ? acc.username : t.title) || 'chat';
  const inactive = acc && !acc.is_active;
  const row = el(`<div class="thread-item ${inactive?'inactive':''}" data-thread="${t.id}"><span class="dot"></span><span>${escapeHtml(label)}</span></div>`);
  row.onclick = (e)=>{ e.stopPropagation(); openThread(t.id); };
  return row;
}

function openSettings(){
  state.activeThreadId = null;
  document.getElementById('main-empty').style.display = 'none';
  document.getElementById('chat-view').classList.remove('visible');
  document.getElementById('settings-view').classList.add('visible');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelector('.nav-item.settings').classList.add('active');
  renderSettingsAll();
}

function closeSettingsShowChat(){
  document.getElementById('settings-view').classList.remove('visible');
  document.getElementById('main-empty').style.display = 'none';
  document.getElementById('chat-view').classList.add('visible');
}

/* -------- Settings: reference dropdowns -------- */
function renderSettingsRefs(){
  const roleSel = document.getElementById('new-acc-role');
  roleSel.innerHTML = state.roles
    .filter(r=>r.level < 9)
    .map(r=>`<option value="${r.id}">${escapeHtml(r.name)} (lvl ${r.level})</option>`)
    .join('');

  const catSel = document.getElementById('new-acc-category');
  catSel.innerHTML = state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  catSel.onchange = updateNewAccSubcats;
  updateNewAccSubcats();

  document.getElementById('new-subcat-parent').innerHTML =
    state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

function updateNewAccSubcats(){
  const catId = document.getElementById('new-acc-category').value;
  const subs = state.subcategories.filter(s=>s.category_id === catId);
  document.getElementById('new-acc-subcategory').innerHTML =
    '<option value="">—</option>' + subs.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

function renderSettingsAll(){
  renderSettingsRefs();
  renderAccountsTable();
  renderRolesTable();
  renderCategoriesTable();

  const canManage = state.role && state.role.level >= 9;
  document.getElementById('create-account-card').style.display = canManage ? '' : 'none';
  document.querySelectorAll('#tab-roles .panel-card').forEach(c=> c.style.display = canManage ? '' : 'none');
}

function renderAccountsTable(){
  const tbody = document.getElementById('accounts-table-body');
  tbody.innerHTML = '';
  const canManage = state.role && state.role.level >= 9;
  state.accounts
    .slice()
    .sort((a,b)=> (a.account_type<b.account_type?-1:1))
    .forEach(acc=>{
      let roleOrCat = '—';
      if(acc.account_type === 'staff'){
        roleOrCat = acc.roles ? `${acc.roles.name} (lvl ${acc.roles.level})` : '—';
      } else {
        const th = state.threads.find(t=>t.client_id===acc.id);
        if(th){
          const cat = state.categories.find(c=>c.id===th.category_id);
          const sc = state.subcategories.find(s=>s.id===th.subcategory_id);
          roleOrCat = (cat?cat.name:'—') + (sc? ' / '+sc.name : '');
        }
      }
      const isFounder = acc.username === 'admin' || acc.username === 'ramsey';
      const row = el(`<tr>
        <td>${escapeHtml(acc.username)}</td>
        <td>${acc.account_type}</td>
        <td>${escapeHtml(roleOrCat)}</td>
        <td><span class="pill ${acc.is_active?'on':''}">${acc.is_active?'active':'disabled'}</span></td>
        <td class="row-actions"></td>
      </tr>`);
      const actionsTd = row.querySelector('.row-actions');
      if(canManage && acc.id !== state.profile.id){
        const kickBtn = el(`<button class="btn secondary small">${acc.is_active?'Kick':'Restore'}</button>`);
        kickBtn.onclick = ()=> toggleActive(acc);
        actionsTd.appendChild(kickBtn);
        if(!isFounder){
          const delBtn = el(`<button class="btn danger small">Delete</button>`);
          delBtn.onclick = ()=> deleteAccount(acc);
          actionsTd.appendChild(delBtn);
        }
      } else {
        actionsTd.innerHTML = '<span style="color:var(--dim)">—</span>';
      }
      tbody.appendChild(row);
    });
}

function renderRolesTable(){
  const tbody = document.getElementById('roles-table-body');
  tbody.innerHTML = '';
  state.roles.forEach(r=>{
    tbody.appendChild(el(`<tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.level}</td>
      <td><span class="pill ${r.can_write?'on':''}">${r.can_write?'yes':'no'}</span></td>
      <td><span class="pill ${r.can_move_chats?'on':''}">${r.can_move_chats?'yes':'no'}</span></td>
      <td><span class="pill ${r.can_make_subcategories?'on':''}">${r.can_make_subcategories?'yes':'no'}</span></td>
      <td><span class="pill ${r.can_kick?'on':''}">${r.can_kick?'yes':'no'}</span></td>
      <td><span class="pill ${r.can_delete?'on':''}">${r.can_delete?'yes':'no'}</span></td>
    </tr>`));
  });
}

function renderCategoriesTable(){
  const tbody = document.getElementById('categories-table-body');
  tbody.innerHTML = '';
  state.categories.forEach(c=>{
    const subs = state.subcategories.filter(s=>s.category_id===c.id).map(s=>s.name).join(', ') || '—';
    tbody.appendChild(el(`<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(subs)}</td></tr>`));
  });
}

/* -------- Settings: tabs -------- */
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-'+tab.dataset.tab).classList.add('active');
  });
});

document.getElementById('new-acc-type').addEventListener('change', (e)=>{
  const isStaff = e.target.value === 'staff';
  document.getElementById('new-acc-staff-row').classList.toggle('hidden-el', !isStaff);
  document.getElementById('new-acc-client-row').classList.toggle('hidden-el', isStaff);
});

document.getElementById('create-account-btn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('create-account-error');
  const okEl = document.getElementById('create-account-success');
  errEl.textContent = ''; okEl.textContent = '';
  const type = document.getElementById('new-acc-type').value;
  const username = document.getElementById('new-acc-username').value.trim();
  const password = document.getElementById('new-acc-password').value;
  const roleId = document.getElementById('new-acc-role').value;
  const categoryId = document.getElementById('new-acc-category').value;
  const subcategoryId = document.getElementById('new-acc-subcategory').value;

  if(!username || !password){ errEl.textContent = 'Username and password required.'; return; }

  const body = { username, password, type, displayName: username };
  if(type === 'staff') body.roleId = roleId;
  if(type === 'client'){ body.categoryId = categoryId; body.subcategoryId = subcategoryId || null; }

  const res = await fetch('/api/create-account', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+state.session.access_token },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if(!res.ok){ errEl.textContent = 'ERROR: ' + json.error; return; }
  okEl.textContent = 'Account "' + json.username + '" created.';
  document.getElementById('new-acc-username').value = '';
  document.getElementById('new-acc-password').value = '';
  await refreshAllStaffData();
  renderSidebar();
  renderSettingsAll();
});

document.getElementById('create-role-btn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('create-role-error');
  errEl.textContent = '';
  const name = document.getElementById('new-role-name').value.trim();
  let level = parseInt(document.getElementById('new-role-level').value, 10);
  if(!name){ errEl.textContent = 'Name required.'; return; }
  if(!(level>=1 && level<=8)){ errEl.textContent = 'Level must be between 1 and 8.'; return; }

  const payload = {
    name, level,
    can_write: document.getElementById('perm-write').checked,
    can_move_chats: document.getElementById('perm-move').checked,
    can_make_subcategories: document.getElementById('perm-subcat').checked,
    can_kick: document.getElementById('perm-kick').checked,
    can_delete: document.getElementById('perm-delete').checked,
  };
  const { error } = await sb.from('roles').insert(payload);
  if(error){ errEl.textContent = 'ERROR: ' + error.message; return; }
  document.getElementById('new-role-name').value = '';
  await refreshAllStaffData();
  renderSettingsAll();
});

document.getElementById('create-subcat-btn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('create-subcat-error');
  errEl.textContent = '';
  const catId = document.getElementById('new-subcat-parent').value;
  const name = document.getElementById('new-subcat-name').value.trim();
  if(!name){ errEl.textContent = 'Name required.'; return; }
  const { error } = await sb.from('subcategories').insert({ category_id: catId, name });
  if(error){ errEl.textContent = 'ERROR: ' + error.message; return; }
  document.getElementById('new-subcat-name').value = '';
  await refreshAllStaffData();
  renderSidebar();
  renderSettingsAll();
});

async function toggleActive(acc){
  const { error } = await sb.from('profiles').update({ is_active: !acc.is_active }).eq('id', acc.id);
  if(error){ alert('ERROR: ' + error.message); return; }
  await refreshAllStaffData();
  renderSidebar();
  renderSettingsAll();
}

async function deleteAccount(acc){
  if(!confirm('Permanently delete "' + acc.username + '"? This cannot be undone.')) return;
  const res = await fetch('/api/delete-account', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+state.session.access_token },
    body: JSON.stringify({ targetId: acc.id })
  });
  const json = await res.json();
  if(!res.ok){ alert('ERROR: ' + json.error); return; }
  if(state.activeThreadId){
    const th = state.threads.find(t=>t.id===state.activeThreadId);
    if(th && th.client_id === acc.id){ state.activeThreadId = null; closeSettingsShowChat(); document.getElementById('chat-view').classList.remove('visible'); document.getElementById('main-empty').style.display='block'; }
  }
  await refreshAllStaffData();
  renderSidebar();
  renderSettingsAll();
}

/* -------- Chat (staff side) -------- */
async function openThread(threadId){
  state.activeThreadId = threadId;
  document.getElementById('settings-view').classList.remove('visible');
  document.getElementById('main-empty').style.display = 'none';
  document.getElementById('chat-view').classList.add('visible');
  document.querySelectorAll('.thread-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll(`.thread-item[data-thread="${threadId}"]`).forEach(n=>n.classList.add('active'));

  const thread = state.threads.find(t=>t.id===threadId);
  const acc = state.accounts.find(a=>a.id === thread.client_id);
  document.getElementById('chat-title').textContent = acc ? acc.username : (thread.title || 'chat');
  const cat = state.categories.find(c=>c.id===thread.category_id);
  const sc = state.subcategories.find(s=>s.id===thread.subcategory_id);
  document.getElementById('chat-meta').textContent =
    (cat?cat.name:'') + (sc?' / '+sc.name:'') + (acc && !acc.is_active ? '  [DISABLED]' : '');

  const canMove = myPerm('can_move_chats');
  const moveSel = document.getElementById('chat-move-select');
  moveSel.classList.toggle('hidden-el', !canMove);
  if(canMove){
    let opts = [];
    state.categories.forEach(c=>{
      opts.push(`<option value="cat:${c.id}" ${thread.category_id===c.id && !thread.subcategory_id?'selected':''}>${escapeHtml(c.name)}</option>`);
      state.subcategories.filter(s=>s.category_id===c.id).forEach(s=>{
        opts.push(`<option value="sub:${s.id}:${c.id}" ${thread.subcategory_id===s.id?'selected':''}>${escapeHtml(c.name)} / ${escapeHtml(s.name)}</option>`);
      });
    });
    moveSel.innerHTML = opts.join('');
    moveSel.onchange = async ()=>{
      const [kind, id, parentCat] = moveSel.value.split(':');
      const update = kind==='cat' ? { category_id:id, subcategory_id:null } : { category_id:parentCat, subcategory_id:id };
      const { error } = await sb.from('threads').update(update).eq('id', threadId);
      if(error){ alert('ERROR: '+error.message); return; }
      await refreshAllStaffData();
      renderSidebar();
    };
  }

  const canKick = myPerm('can_kick');
  const kickBtn = document.getElementById('chat-kick-btn');
  kickBtn.classList.toggle('hidden-el', !canKick);
  kickBtn.textContent = acc && acc.is_active ? 'Kick' : 'Restore';
  kickBtn.onclick = ()=> acc && toggleActive(acc);

  const canDelete = myPerm('can_delete');
  const delBtn = document.getElementById('chat-delete-btn');
  delBtn.classList.toggle('hidden-el', !canDelete);
  delBtn.onclick = ()=> acc && deleteAccount(acc);

  const canWrite = myPerm('can_write');
  document.getElementById('chat-input').disabled = !canWrite;
  document.getElementById('chat-send-btn').disabled = !canWrite;
  document.getElementById('reply-toggle-wrap').classList.toggle('hidden-el', !canWrite);

  await loadMessagesForThread(threadId, true);
  subscribeToThread(threadId, true);
}

async function loadMessagesForThread(threadId, isStaffView){
  const { data, error } = await sb.from('messages').select('*').eq('thread_id', threadId).order('created_at', { ascending:true });
  if(error){ console.error(error); return; }
  renderMessages(data || [], isStaffView);
}

function renderMessages(msgs, isStaffView){
  const container = document.getElementById(isStaffView ? 'chat-messages' : 'client-messages');
  container.innerHTML = '';
  msgs.forEach(m=>{
    let cls = 'msg';
    if(isStaffView){
      cls += m.visibility === 'internal' ? ' internal' : ' client-reply';
      const isMine = m.sender_id === state.profile.id;
    } else {
      cls += (m.sender_id === state.profile.id) ? ' from-client' : ' client-reply';
    }
    const senderLabel = isStaffView
      ? escapeHtml(m.sender_username) + (m.visibility==='internal' ? ' (internal note)' : ' (sent to client)')
      : (m.sender_id === state.profile.id ? 'You' : 'Staff');
    const div = el(`<div class="${cls}">
      <div class="meta">${senderLabel} · ${fmtTime(m.created_at)}</div>
      <div class="body"></div>
      ${isStaffView ? '<span class="del">✕</span>' : ''}
    </div>`);
    div.querySelector('.body').textContent = m.content;
    if(isStaffView){
      const delSpan = div.querySelector('.del');
      if(myPerm('can_delete')){
        delSpan.onclick = async ()=>{
          const { error } = await sb.from('messages').delete().eq('id', m.id);
          if(error){ alert('ERROR: '+error.message); return; }
        };
      } else {
        delSpan.style.display = 'none';
      }
    }
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function subscribeToThread(threadId, isStaffView){
  if(state.msgChannel){ sb.removeChannel(state.msgChannel); state.msgChannel = null; }
  state.msgChannel = sb.channel('messages-'+threadId)
    .on('postgres_changes', { event:'*', schema:'public', table:'messages', filter:'thread_id=eq.'+threadId }, ()=>{
      loadMessagesForThread(threadId, isStaffView);
    })
    .subscribe();
}

async function sendStaffMessage(){
  const threadId = state.activeThreadId;
  if(!threadId) return;
  const input = document.getElementById('chat-input');
  let text = input.value;
  if(!text.trim()) return;
  const toggle = document.getElementById('reply-toggle').checked;

  let visibility = 'internal';
  if(toggle && !/^!r\s/i.test(text)){ text = '!r ' + text; }
  if(/^!r\s+/i.test(text)){
    visibility = 'client';
    text = text.replace(/^!r\s+/i, '');
  }
  if(!text.trim()) return;

  const { error } = await sb.from('messages').insert({
    thread_id: threadId,
    sender_id: state.profile.id,
    sender_username: state.profile.username,
    content: text.trim(),
    visibility
  });
  if(error){ alert('ERROR: ' + error.message); return; }
  input.value = '';
  await loadMessagesForThread(threadId, true);
}

document.getElementById('chat-send-btn').addEventListener('click', sendStaffMessage);
document.getElementById('chat-input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendStaffMessage(); });
document.getElementById('reply-toggle').addEventListener('change', (e)=>{
  document.getElementById('reply-toggle-wrap').classList.toggle('on', e.target.checked);
});

document.getElementById('logout-btn').addEventListener('click', logout);

/* ============================================================================
   CLIENT (chat-only) APP
   ========================================================================== */
async function loadClientApp(){
  document.getElementById('client-app').classList.add('visible');
  const { data: thread, error } = await sb.from('threads').select('*').eq('client_id', state.profile.id).single();
  if(error || !thread){
    document.getElementById('client-messages').innerHTML = '<div style="color:var(--dim);margin:auto;">No chat assigned yet. Contact staff.</div>';
    return;
  }
  state.clientThread = thread;
  await loadMessagesForThread(thread.id, false);
  subscribeToThread(thread.id, false);
}

async function sendClientMessage(){
  if(!state.clientThread) return;
  const input = document.getElementById('client-input');
  const text = input.value.trim();
  if(!text) return;
  const { error } = await sb.from('messages').insert({
    thread_id: state.clientThread.id,
    sender_id: state.profile.id,
    sender_username: state.profile.username,
    content: text,
    visibility: 'client'
  });
  if(error){ alert('ERROR: ' + error.message); return; }
  input.value = '';
  await loadMessagesForThread(state.clientThread.id, false);
}

document.getElementById('client-send-btn').addEventListener('click', sendClientMessage);
document.getElementById('client-input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendClientMessage(); });
document.getElementById('client-logout-btn').addEventListener('click', logout);

/* ============================================================================
   BOOTSTRAP
   ========================================================================== */
document.getElementById('login-btn').addEventListener('click', attemptLogin);
document.getElementById('login-password').addEventListener('keydown', (e)=>{ if(e.key==='Enter') attemptLogin(); });

window.addEventListener('load', async ()=>{
  runBootSequence(async ()=>{
    const { data } = await sb.auth.getSession();
    if(data && data.session){
      await onAuthed(data.session);
    } else {
      document.getElementById('login-screen').classList.add('visible');
    }
  });
});
