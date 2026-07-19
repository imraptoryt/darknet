
/* ============================================================================
   CONFIG — paste your Supabase project URL + anon (public) key here.
   Find them in Supabase Dashboard -> Project Settings -> API.
   ========================================================================== */
const SUPABASE_URL = "https://taawronqapxbhndqwfng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7JdOFQql8jafMJz_SnwOTQ_h_Wvb1RP";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================================
   I18N
   ========================================================================== */
const TRANSLATIONS = {
  en: {
    appTitle: "SECURE ACCESS TERMINAL",
    appSubtitle: "AUTHORIZED PERSONNEL ONLY // ENTER CREDENTIALS",
    loginUsername: "Username",
    loginPassword: "Password",
    loginBtn: "Connect",
    loginConnecting: "Authenticating...",
    errFields: "ERROR: username and password required.",
    errInvalidCreds: "ACCESS DENIED: invalid credentials.",
    errNoProfile: "ERROR: no profile found for this account.",
    errDisabled: "ACCESS DENIED: this account has been disabled.",
    disconnectBtn: "Disconnect",
    emptyStateSelect: "Select a category or chat from the left.",
    noChatsYet: "(no chats yet)",
    empty: "(empty)",
    tabAccounts: "Accounts",
    tabRoles: "Roles",
    tabCategories: "Categories",
    createAccountTitle: "Create Account",
    fieldUsername: "Username",
    fieldPassword: "Password",
    fieldCategory: "Category (their personal chat)",
    fieldSubcategory: "Sub-category (optional)",
    fieldRole: "Role (optional)",
    roleDefaultOption: "— Member (default) —",
    createBtn: "Create",
    allAccountsTitle: "All Accounts",
    thUsername: "Username", thRole: "Role", thCategory: "Category", thBusiness: "Business", thStatus: "Status", thActions: "Actions",
    active: "active", disabled: "disabled",
    kick: "Kick", restore: "Restore", deleteBtn: "Delete", cancelBtn: "Cancel", editBtn2: "Edit",
    confirmDelete: 'Permanently delete "{u}"? This cannot be undone.',
    fieldBusiness: "Business (optional)",
    promptBusiness: "Business for {u}:",
    createCategoryTitle: "Create Category",
    fieldCategoryName: "Name",
    fieldColor: "Color",
    thColor: "Color",
    imageBtn: "🖼",
    imageOnlyPng: "Only .png images are supported.",
    imageTooBig: "Image is too large (max 5MB).",
    uploading: "Uploading...",
    createRoleTitle: "Create Role",
    editRoleTitle: "Edit Role",
    fieldName: "Name", fieldLevel: "Level (1-8)",
    permWrite: "Can write in chats",
    permMove: "Can move chats between categories",
    permSubcat: "Can create sub-categories",
    permKick: "Can kick (disable) accounts — level 9/10 always can",
    permDelete: "Can delete accounts/messages — level 9/10 always can",
    permCategories: "Visible categories (only applies if level is below 6)",
    permCategoriesNote: "Levels 9 and 10 are permanently reserved for the two founding accounts and can't be assigned to a new role.",
    createRoleBtn: "Create Role",
    saveChangesBtn: "Save Changes",
    existingRolesTitle: "Existing Roles",
    thName: "Name", thLevel: "Level", thWrite: "Write", thMove: "Move", thSubcat: "Sub-cat", thKick: "Kick", thDeleteCol: "Delete", thCategories: "Categories",
    editBtn: "Edit",
    addSubcatTitle: "Add Sub-category",
    fieldParentCategory: "Parent Category",
    fieldSubcatName: "Name",
    addBtn: "Add",
    categoriesTitle: "Categories",
    thCategoryCol: "Category", thSubcategories: "Sub-categories",
    chatReplyToggle: "Reply to client (!r)",
    chatPlaceholderStaff: "Type a message... prefix with !r to send to the client",
    chatPlaceholderOwn: "Type a message...",
    sendBtn: "Send",
    readOnlyNote: "View only — replying here requires level 6+.",
    myChat: "💬 My Chat",
    settingsNav: "⚙ Settings",
    yes: "yes", no: "no",
    internalNote: "(internal note)",
    sentToClient: "(sent to client)",
    you: "You",
    staff: "Staff",
  },
  fr: {
    appTitle: "TERMINAL D'ACCÈS SÉCURISÉ",
    appSubtitle: "PERSONNEL AUTORISÉ UNIQUEMENT // ENTREZ VOS IDENTIFIANTS",
    loginUsername: "Nom d'utilisateur",
    loginPassword: "Mot de passe",
    loginBtn: "Connexion",
    loginConnecting: "Authentification...",
    errFields: "ERREUR : nom d'utilisateur et mot de passe requis.",
    errInvalidCreds: "ACCÈS REFUSÉ : identifiants invalides.",
    errNoProfile: "ERREUR : aucun profil trouvé pour ce compte.",
    errDisabled: "ACCÈS REFUSÉ : ce compte a été désactivé.",
    disconnectBtn: "Déconnexion",
    emptyStateSelect: "Sélectionnez une catégorie ou un chat à gauche.",
    noChatsYet: "(aucun chat pour l'instant)",
    empty: "(vide)",
    tabAccounts: "Comptes",
    tabRoles: "Rôles",
    tabCategories: "Catégories",
    createAccountTitle: "Créer un compte",
    fieldUsername: "Nom d'utilisateur",
    fieldPassword: "Mot de passe",
    fieldCategory: "Catégorie (son chat personnel)",
    fieldSubcategory: "Sous-catégorie (optionnel)",
    fieldRole: "Rôle (optionnel)",
    roleDefaultOption: "— Membre (par défaut) —",
    createBtn: "Créer",
    allAccountsTitle: "Tous les comptes",
    thUsername: "Nom d'utilisateur", thRole: "Rôle", thCategory: "Catégorie", thBusiness: "Business", thStatus: "Statut", thActions: "Actions",
    active: "actif", disabled: "désactivé",
    kick: "Exclure", restore: "Restaurer", deleteBtn: "Supprimer", cancelBtn: "Annuler", editBtn2: "Modifier",
    confirmDelete: 'Supprimer définitivement "{u}" ? Cette action est irréversible.',
    fieldBusiness: "Business (optionnel)",
    promptBusiness: "Business pour {u} :",
    createCategoryTitle: "Créer une catégorie",
    fieldCategoryName: "Nom",
    fieldColor: "Couleur",
    thColor: "Couleur",
    imageBtn: "🖼",
    imageOnlyPng: "Seules les images .png sont supportées.",
    imageTooBig: "Image trop volumineuse (5 Mo max).",
    uploading: "Envoi en cours...",
    createRoleTitle: "Créer un rôle",
    editRoleTitle: "Modifier le rôle",
    fieldName: "Nom", fieldLevel: "Niveau (1-8)",
    permWrite: "Peut écrire dans les chats",
    permMove: "Peut déplacer les chats entre catégories",
    permSubcat: "Peut créer des sous-catégories",
    permKick: "Peut exclure (désactiver) des comptes — niveau 9/10 toujours autorisé",
    permDelete: "Peut supprimer comptes/messages — niveau 9/10 toujours autorisé",
    permCategories: "Catégories visibles (seulement si niveau inférieur à 6)",
    permCategoriesNote: "Les niveaux 9 et 10 sont réservés en permanence aux deux comptes fondateurs et ne peuvent pas être attribués à un nouveau rôle.",
    createRoleBtn: "Créer le rôle",
    saveChangesBtn: "Enregistrer",
    existingRolesTitle: "Rôles existants",
    thName: "Nom", thLevel: "Niveau", thWrite: "Écrire", thMove: "Déplacer", thSubcat: "Sous-cat.", thKick: "Exclure", thDeleteCol: "Supprimer", thCategories: "Catégories",
    editBtn: "Modifier",
    addSubcatTitle: "Ajouter une sous-catégorie",
    fieldParentCategory: "Catégorie parente",
    fieldSubcatName: "Nom",
    addBtn: "Ajouter",
    categoriesTitle: "Catégories",
    thCategoryCol: "Catégorie", thSubcategories: "Sous-catégories",
    chatReplyToggle: "Répondre au client (!r)",
    chatPlaceholderStaff: "Écrire un message... préfixez avec !r pour l'envoyer au client",
    chatPlaceholderOwn: "Écrire un message...",
    sendBtn: "Envoyer",
    readOnlyNote: "Lecture seule — répondre ici nécessite le niveau 6+.",
    myChat: "💬 Mon Chat",
    settingsNav: "⚙ Paramètres",
    yes: "oui", no: "non",
    internalNote: "(note interne)",
    sentToClient: "(envoyé au client)",
    you: "Vous",
    staff: "Staff",
  }
};

function t(key){
  const lang = state.lang || 'en';
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
}

function applyTranslations(){
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(elx=>{
    elx.textContent = t(elx.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(elx=>{
    elx.setAttribute('placeholder', t(elx.getAttribute('data-i18n-placeholder')));
  });
  document.getElementById('lang-en').classList.toggle('active', state.lang==='en');
  document.getElementById('lang-fr').classList.toggle('active', state.lang==='fr');
}

function setLang(lang){
  state.lang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
  if(document.getElementById('app').classList.contains('visible')){
    renderSidebar();
    if(document.getElementById('settings-view').classList.contains('visible')) renderSettingsAll();
    if(state.activeThreadId) renderChatHeader(state.activeThreadId);
  }
}

document.getElementById('lang-en').addEventListener('click', ()=>setLang('en'));
document.getElementById('lang-fr').addEventListener('click', ()=>setLang('fr'));

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
function bootLines(lang){
  if(lang === 'fr'){
    return [
      ["DÉMARRAGE DU TERMINAL SÉCURISÉ...", false],
      ["ÉTABLISSEMENT D'UNE LIAISON CHIFFRÉE...", false],
      ["CONTOURNEMENT DU PARE-FEU... [OK]", true],
      ["DÉCRYPTAGE DU MODULE D'AUTHENTIFICATION...", false],
      ["CHARGEMENT DE LA BASE UTILISATEURS...", false],
      ["VÉRIFICATION DE L'INTÉGRITÉ DU NŒUD... [OK]", true],
      ["POINT D'ACCÈS PRÊT.", true],
    ];
  }
  return [
    ["BOOTING SECURE TERMINAL...", false],
    ["ESTABLISHING ENCRYPTED LINK...", false],
    ["BYPASSING PERIMETER FIREWALL... [OK]", true],
    ["DECRYPTING AUTH MODULE...", false],
    ["LOADING USER DATABASE...", false],
    ["VERIFYING NODE INTEGRITY... [OK]", true],
    ["ACCESS POINT READY.", true],
  ];
}

function runBootSequence(done){
  const linesEl = document.getElementById('boot-lines');
  const bar = document.getElementById('boot-progress-bar');
  const lines = bootLines(state.lang);
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
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
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
  lang: localStorage.getItem('lang') || 'en',
  session: null,
  profile: null,
  role: null,
  level: 0,
  mode: 'solo', // 'full' | 'scoped' | 'solo'
  grantedCategoryIds: [],
  roles: [],
  categories: [],
  subcategories: [],
  roleCategories: [], // [{role_id, category_id}]
  threads: [],
  accounts: [],
  myThreadId: null,
  activeCategoryId: null,
  activeThreadId: null,
  editingRoleId: null,
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
    errEl.textContent = t('errFields');
    return;
  }
  btn.disabled = true;
  btn.textContent = t('loginConnecting');
  const email = usernameToEmail(username);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = t('loginBtn');
  if(error){
    errEl.textContent = t('errInvalidCreds');
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
    document.getElementById('login-error').textContent = t('errNoProfile');
    await sb.auth.signOut();
    return;
  }
  if(!profile.is_active){
    document.getElementById('login-error').textContent = t('errDisabled');
    await sb.auth.signOut();
    return;
  }

  state.profile = profile;
  state.role = profile.roles || null;
  state.level = state.role ? state.role.level : 0;

  document.getElementById('login-screen').classList.remove('visible');
  await loadApp();
}

async function logout(){
  if(state.msgChannel){ sb.removeChannel(state.msgChannel); state.msgChannel = null; }
  await sb.auth.signOut();
  location.reload();
}

/* ============================================================================
   APP BOOTSTRAP — figures out full / scoped / solo mode then renders
   ========================================================================== */
async function loadApp(){
  // find my own personal thread (if any)
  const { data: myThread } = await sb.from('threads').select('id').eq('client_id', state.profile.id).maybeSingle();
  state.myThreadId = myThread ? myThread.id : null;

  // granted categories for my role (empty array if level>=6, since irrelevant)
  if(state.role && state.level < 6){
    const { data: grants } = await sb.from('role_categories').select('category_id').eq('role_id', state.role.id);
    state.grantedCategoryIds = (grants || []).map(g=>g.category_id);
  } else {
    state.grantedCategoryIds = [];
  }

  state.mode = state.level >= 6 ? 'full' : (state.grantedCategoryIds.length > 0 ? 'scoped' : 'solo');

  document.getElementById('app').classList.add('visible');
  document.getElementById('who-name').textContent = state.profile.display_name || state.profile.username;
  document.getElementById('who-level').textContent =
    (state.role ? state.role.name + ' — lvl ' + state.role.level : '—');

  await refreshAllData();
  applyTranslations();
  renderSidebar();

  if(state.mode === 'solo'){
    // jump straight into their own chat, full-screen feel (sidebar just shows "My Chat")
    if(state.myThreadId) openThread(state.myThreadId);
  }
}

async function refreshAllData(){
  const catsQ = sb.from('categories').select('*');
  const subcatsQ = sb.from('subcategories').select('*');
  const threadsQ = sb.from('threads').select('*');

  const queries = [catsQ, subcatsQ, threadsQ];
  if(state.mode === 'full'){
    queries.push(sb.from('roles').select('*').order('level', { ascending:false }));
    queries.push(sb.from('profiles').select('*, roles(name,level)'));
    queries.push(sb.from('role_categories').select('*'));
  }

  const results = await Promise.all(queries);
  state.categories = ((results[0].data) || []).slice().sort(
    (a,b)=> CATEGORY_ORDER.indexOf(a.name) - CATEGORY_ORDER.indexOf(b.name)
  );
  state.subcategories = results[1].data || [];
  state.threads = results[2].data || [];

  if(state.mode === 'full'){
    state.roles = results[3].data || [];
    state.accounts = results[4].data || [];
    state.roleCategories = results[5].data || [];
  } else {
    state.roles = [];
    state.accounts = [];
    state.roleCategories = [];
  }

  if(state.mode === 'full') renderSettingsRefs();
}

function myPerm(key){
  if(!state.role) return false;
  if(state.role.level >= 9) return true;
  return !!state.role[key];
}

/* ============================================================================
   SIDEBAR
   ========================================================================== */
function renderSidebar(){
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  if(state.mode === 'full'){
    const settingsItem = el(`<div class="nav-item settings" data-nav="settings">${escapeHtml(t('settingsNav'))}</div>`);
    settingsItem.onclick = () => openSettings();
    nav.appendChild(settingsItem);
  }

  if(state.mode !== 'full' && state.myThreadId){
    const mine = el(`<div class="nav-item mychat" data-nav="mychat">${escapeHtml(t('myChat'))}</div>`);
    mine.onclick = () => openThread(state.myThreadId);
    nav.appendChild(mine);
  }

  const visibleCategories = state.mode === 'full'
    ? state.categories
    : state.categories.filter(c => state.grantedCategoryIds.includes(c.id));

  visibleCategories.forEach(cat=>{
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
      container.appendChild(el(`<div class="thread-item" style="opacity:.5;cursor:default;">${escapeHtml(t('empty'))}</div>`));
    }
    scThreads.forEach(t=> container.appendChild(threadRow(t)));
  });

  if(subcats.length===0 && threadsDirect.length===0){
    container.appendChild(el(`<div class="thread-item" style="opacity:.5;cursor:default;">${escapeHtml(t('noChatsYet'))}</div>`));
  }
}

function threadLabel(th){
  const acc = state.accounts.find(a=>a.id === th.client_id);
  if(acc) return acc.username;
  if(th.client_id === state.profile.id) return state.profile.username;
  return th.title || 'chat';
}

function threadRow(th){
  const acc = state.accounts.find(a=>a.id === th.client_id);
  const label = threadLabel(th);
  const inactive = acc && !acc.is_active;
  const row = el(`<div class="thread-item ${inactive?'inactive':''}" data-thread="${th.id}"><span class="dot"></span><span>${escapeHtml(label)}</span></div>`);
  row.onclick = (e)=>{ e.stopPropagation(); openThread(th.id); };
  return row;
}

function openSettings(){
  state.activeThreadId = null;
  document.getElementById('main-empty').style.display = 'none';
  document.getElementById('chat-view').classList.remove('visible');
  document.getElementById('settings-view').classList.add('visible');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const s = document.querySelector('.nav-item.settings');
  if(s) s.classList.add('active');
  renderSettingsAll();
}

/* -------- Settings: reference dropdowns -------- */
function renderSettingsRefs(){
  const roleSel = document.getElementById('new-acc-role');
  roleSel.innerHTML = `<option value="">${escapeHtml(t('roleDefaultOption'))}</option>` + state.roles
    .filter(r=>r.level < 9)
    .map(r=>`<option value="${r.id}">${escapeHtml(r.name)} (lvl ${r.level})</option>`)
    .join('');

  const catSel = document.getElementById('new-acc-category');
  catSel.innerHTML = state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  catSel.onchange = updateNewAccSubcats;
  updateNewAccSubcats();

  document.getElementById('new-subcat-parent').innerHTML =
    state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  const grid = document.getElementById('new-role-categories');
  grid.innerHTML = state.categories.map(c=>`
    <label><input type="checkbox" class="role-cat-check" value="${c.id}"> ${escapeHtml(c.name)}</label>
  `).join('');
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

  const canManage = state.level >= 9;
  document.getElementById('create-account-card').style.display = canManage ? '' : 'none';
  document.querySelectorAll('#tab-roles .panel-card').forEach(c=> c.style.display = canManage ? '' : 'none');
}

function renderAccountsTable(){
  const tbody = document.getElementById('accounts-table-body');
  tbody.innerHTML = '';
  const canManage = state.level >= 9;
  state.accounts
    .slice()
    .sort((a,b)=> (a.username<b.username?-1:1))
    .forEach(acc=>{
      const roleLabel = acc.roles ? `${acc.roles.name} (lvl ${acc.roles.level})` : '—';
      const th = state.threads.find(th2=>th2.client_id===acc.id);
      let catLabel = '—';
      if(th){
        const cat = state.categories.find(c=>c.id===th.category_id);
        const sc = state.subcategories.find(s=>s.id===th.subcategory_id);
        catLabel = (cat?cat.name:'—') + (sc? ' / '+sc.name : '');
      }
      const isFounder = acc.username === 'admin' || acc.username === 'ramsey';
      const row = el(`<tr>
        <td>${escapeHtml(acc.username)}</td>
        <td>${escapeHtml(roleLabel)}</td>
        <td>${escapeHtml(catLabel)}</td>
        <td>${escapeHtml(acc.business || '—')}</td>
        <td><span class="pill ${acc.is_active?'on':''}">${acc.is_active?t('active'):t('disabled')}</span></td>
        <td class="row-actions"></td>
      </tr>`);
      const actionsTd = row.querySelector('.row-actions');
      if(canManage){
        const bizBtn = el(`<button class="btn secondary small">${escapeHtml(t('editBtn2'))}</button>`);
        bizBtn.onclick = ()=> editBusiness(acc);
        actionsTd.appendChild(bizBtn);
      }
      if(canManage && acc.id !== state.profile.id){
        const kickBtn = el(`<button class="btn secondary small">${acc.is_active?escapeHtml(t('kick')):escapeHtml(t('restore'))}</button>`);
        kickBtn.onclick = ()=> toggleActive(acc);
        actionsTd.appendChild(kickBtn);
        if(!isFounder){
          const delBtn = el(`<button class="btn danger small">${escapeHtml(t('deleteBtn'))}</button>`);
          delBtn.onclick = ()=> deleteAccount(acc);
          actionsTd.appendChild(delBtn);
        }
      }
      if(actionsTd.children.length === 0){
        actionsTd.innerHTML = '<span style="color:var(--dim)">—</span>';
      }
      tbody.appendChild(row);
    });
}

function renderRolesTable(){
  const tbody = document.getElementById('roles-table-body');
  tbody.innerHTML = '';
  const canManage = state.level >= 9;
  state.roles.forEach(r=>{
    const grantedNames = state.roleCategories
      .filter(rc=>rc.role_id===r.id)
      .map(rc=>{ const c = state.categories.find(cc=>cc.id===rc.category_id); return c?c.name:null; })
      .filter(Boolean);
    const catText = r.level>=6 ? 'ALL' : (grantedNames.join(', ') || '—');
    const row = el(`<tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.level}</td>
      <td><span class="pill ${r.can_write?'on':''}">${r.can_write?t('yes'):t('no')}</span></td>
      <td><span class="pill ${r.can_move_chats?'on':''}">${r.can_move_chats?t('yes'):t('no')}</span></td>
      <td><span class="pill ${r.can_make_subcategories?'on':''}">${r.can_make_subcategories?t('yes'):t('no')}</span></td>
      <td><span class="pill ${r.can_kick?'on':''}">${r.can_kick?t('yes'):t('no')}</span></td>
      <td><span class="pill ${r.can_delete?'on':''}">${r.can_delete?t('yes'):t('no')}</span></td>
      <td>${escapeHtml(catText)}</td>
      <td></td>
    </tr>`);
    if(canManage && r.level < 9){
      const editBtn = el(`<button class="btn secondary small">${escapeHtml(t('editBtn'))}</button>`);
      editBtn.onclick = ()=> startEditRole(r);
      row.lastElementChild.appendChild(editBtn);
    } else {
      row.lastElementChild.innerHTML = '<span style="color:var(--dim)">—</span>';
    }
    tbody.appendChild(row);
  });
}

function startEditRole(role){
  state.editingRoleId = role.id;
  document.getElementById('role-form-title').textContent = t('editRoleTitle');
  document.getElementById('new-role-name').value = role.name;
  document.getElementById('new-role-level').value = role.level;
  document.getElementById('perm-write').checked = role.can_write;
  document.getElementById('perm-move').checked = role.can_move_chats;
  document.getElementById('perm-subcat').checked = role.can_make_subcategories;
  document.getElementById('perm-kick').checked = role.can_kick;
  document.getElementById('perm-delete').checked = role.can_delete;
  const granted = state.roleCategories.filter(rc=>rc.role_id===role.id).map(rc=>rc.category_id);
  document.querySelectorAll('.role-cat-check').forEach(cb=>{ cb.checked = granted.includes(cb.value); });
  document.getElementById('create-role-btn').textContent = t('saveChangesBtn');
  document.getElementById('cancel-edit-role-btn').classList.remove('hidden-el');
  document.getElementById('tab-roles').scrollIntoView({behavior:'smooth'});
}

function cancelEditRole(){
  state.editingRoleId = null;
  document.getElementById('role-form-title').textContent = t('createRoleTitle');
  document.getElementById('new-role-name').value = '';
  document.getElementById('new-role-level').value = 1;
  document.getElementById('perm-write').checked = true;
  document.getElementById('perm-move').checked = false;
  document.getElementById('perm-subcat').checked = false;
  document.getElementById('perm-kick').checked = false;
  document.getElementById('perm-delete').checked = false;
  document.querySelectorAll('.role-cat-check').forEach(cb=> cb.checked = false);
  document.getElementById('create-role-btn').textContent = t('createRoleBtn');
  document.getElementById('cancel-edit-role-btn').classList.add('hidden-el');
}
document.getElementById('cancel-edit-role-btn').addEventListener('click', cancelEditRole);

function renderCategoriesTable(){
  const tbody = document.getElementById('categories-table-body');
  tbody.innerHTML = '';
  state.categories.forEach(c=>{
    const subs = state.subcategories.filter(s=>s.category_id===c.id).map(s=>s.name).join(', ') || '—';
    const swatch = `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${escapeHtml(c.color||'#00ff9c')};border:1px solid var(--border);"></span>`;
    tbody.appendChild(el(`<tr><td>${swatch}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(subs)}</td></tr>`));
  });
}

/* -------- Settings: tabs -------- */
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(tb=>tb.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-'+tab.dataset.tab).classList.add('active');
  });
});

document.getElementById('create-account-btn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('create-account-error');
  const okEl = document.getElementById('create-account-success');
  errEl.textContent = ''; okEl.textContent = '';
  const username = document.getElementById('new-acc-username').value.trim();
  const password = document.getElementById('new-acc-password').value;
  const roleId = document.getElementById('new-acc-role').value;
  const categoryId = document.getElementById('new-acc-category').value;
  const subcategoryId = document.getElementById('new-acc-subcategory').value;
  const business = document.getElementById('new-acc-business').value.trim();

  if(!username || !password){ errEl.textContent = 'Username and password required.'; return; }
  if(!categoryId){ errEl.textContent = 'Category required.'; return; }

  const body = { username, password, categoryId, subcategoryId: subcategoryId || null, displayName: username };
  if(roleId) body.roleId = roleId;
  if(business) body.business = business;

  let res, json;
  try{
    res = await fetch('/api/create-account', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+state.session.access_token },
      body: JSON.stringify(body)
    });
    json = await res.json();
  } catch(e){
    errEl.textContent = 'NETWORK ERROR: could not reach /api/create-account. Is it deployed? (' + e.message + ')';
    return;
  }
  if(!res.ok){
    errEl.textContent = 'ERROR (' + res.status + '): ' + (json && json.error ? json.error : 'unknown error');
    console.error('create-account failed', res.status, json);
    return;
  }
  okEl.textContent = 'Account "' + json.username + '" created.';
  document.getElementById('new-acc-username').value = '';
  document.getElementById('new-acc-password').value = '';
  document.getElementById('new-acc-business').value = '';
  await refreshAllData();
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
  const selectedCats = Array.from(document.querySelectorAll('.role-cat-check:checked')).map(cb=>cb.value);

  let roleId = state.editingRoleId;
  if(roleId){
    const { error } = await sb.from('roles').update(payload).eq('id', roleId);
    if(error){ errEl.textContent = 'ERROR: ' + error.message; return; }
    await sb.from('role_categories').delete().eq('role_id', roleId);
  } else {
    const { data, error } = await sb.from('roles').insert(payload).select('id').single();
    if(error){ errEl.textContent = 'ERROR: ' + error.message; return; }
    roleId = data.id;
  }
  if(selectedCats.length){
    const rows = selectedCats.map(catId=>({ role_id: roleId, category_id: catId }));
    const { error: rcErr } = await sb.from('role_categories').insert(rows);
    if(rcErr){ errEl.textContent = 'Role saved, but category grants failed: ' + rcErr.message; }
  }

  cancelEditRole();
  await refreshAllData();
  renderSettingsAll();
});

document.getElementById('create-cat-btn').addEventListener('click', async ()=>{
  const errEl = document.getElementById('create-cat-error');
  errEl.textContent = '';
  const name = document.getElementById('new-cat-name').value.trim();
  const color = document.getElementById('new-cat-color').value;
  if(!name){ errEl.textContent = 'Name required.'; return; }
  const { error } = await sb.from('categories').insert({ name, color });
  if(error){ errEl.textContent = 'ERROR: ' + error.message; return; }
  document.getElementById('new-cat-name').value = '';
  await refreshAllData();
  renderSidebar();
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
  await refreshAllData();
  renderSidebar();
  renderSettingsAll();
});

async function editBusiness(acc){
  const val = prompt(t('promptBusiness').replace('{u}', acc.username), acc.business || '');
  if(val === null) return;
  const { error } = await sb.from('profiles').update({ business: val.trim() || null }).eq('id', acc.id);
  if(error){ alert('ERROR: ' + error.message); return; }
  await refreshAllData();
  renderSettingsAll();
}

async function toggleActive(acc){
  const { error } = await sb.from('profiles').update({ is_active: !acc.is_active }).eq('id', acc.id);
  if(error){ alert('ERROR: ' + error.message); return; }
  await refreshAllData();
  renderSidebar();
  renderSettingsAll();
}

async function deleteAccount(acc){
  if(!confirm(t('confirmDelete').replace('{u}', acc.username))) return;
  const res = await fetch('/api/delete-account', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+state.session.access_token },
    body: JSON.stringify({ targetId: acc.id })
  });
  const json = await res.json();
  if(!res.ok){ alert('ERROR: ' + json.error); return; }
  if(state.activeThreadId){
    const th = state.threads.find(x=>x.id===state.activeThreadId);
    if(th && th.client_id === acc.id){
      state.activeThreadId = null;
      document.getElementById('chat-view').classList.remove('visible');
      document.getElementById('main-empty').style.display='block';
    }
  }
  await refreshAllData();
  renderSidebar();
  renderSettingsAll();
}

/* -------- Chat -------- */
function isOwnThread(threadId){
  const th = state.threads.find(x=>x.id===threadId);
  return th && th.client_id === state.profile.id;
}

async function openThread(threadId){
  state.activeThreadId = threadId;
  document.getElementById('settings-view').classList.remove('visible');
  document.getElementById('main-empty').style.display = 'none';
  document.getElementById('chat-view').classList.add('visible');
  document.querySelectorAll('.thread-item, .nav-item.mychat').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll(`.thread-item[data-thread="${threadId}"]`).forEach(n=>n.classList.add('active'));
  if(isOwnThread(threadId)){
    const mc = document.querySelector('.nav-item.mychat');
    if(mc) mc.classList.add('active');
  }

  renderChatHeader(threadId);

  await loadMessagesForThread(threadId);
  subscribeToThread(threadId);
}

function renderChatHeader(threadId){
  const th = state.threads.find(x=>x.id===threadId);
  if(!th) return;
  const own = isOwnThread(threadId);
  document.getElementById('chat-title').textContent = threadLabel(th);
  const cat = state.categories.find(c=>c.id===th.category_id);
  const sc = state.subcategories.find(s=>s.id===th.subcategory_id);
  const acc = state.accounts.find(a=>a.id===th.client_id);
  document.getElementById('chat-meta').textContent =
    (cat?cat.name:'') + (sc?' / '+sc.name:'') + (acc && !acc.is_active ? '  [DISABLED]' : '');

  const canReplyHere = own || (state.level >= 6 && myPerm('can_write'));

  const canMove = state.mode==='full' && myPerm('can_move_chats');
  const moveSel = document.getElementById('chat-move-select');
  moveSel.classList.toggle('hidden-el', !canMove);
  if(canMove){
    let opts = [];
    state.categories.forEach(c=>{
      opts.push(`<option value="cat:${c.id}" ${th.category_id===c.id && !th.subcategory_id?'selected':''}>${escapeHtml(c.name)}</option>`);
      state.subcategories.filter(s=>s.category_id===c.id).forEach(s=>{
        opts.push(`<option value="sub:${s.id}:${c.id}" ${th.subcategory_id===s.id?'selected':''}>${escapeHtml(c.name)} / ${escapeHtml(s.name)}</option>`);
      });
    });
    moveSel.innerHTML = opts.join('');
    moveSel.onchange = async ()=>{
      const [kind, id, parentCat] = moveSel.value.split(':');
      const update = kind==='cat' ? { category_id:id, subcategory_id:null } : { category_id:parentCat, subcategory_id:id };
      const { error } = await sb.from('threads').update(update).eq('id', threadId);
      if(error){ alert('ERROR: '+error.message); return; }
      await refreshAllData();
      renderSidebar();
    };
  }

  const canKick = state.mode==='full' && myPerm('can_kick') && !own;
  const kickBtn = document.getElementById('chat-kick-btn');
  kickBtn.classList.toggle('hidden-el', !canKick);
  kickBtn.textContent = acc && acc.is_active ? t('kick') : t('restore');
  kickBtn.onclick = ()=> acc && toggleActive(acc);

  const canDelete = state.mode==='full' && myPerm('can_delete') && !own;
  const delBtn = document.getElementById('chat-delete-btn');
  delBtn.classList.toggle('hidden-el', !canDelete);
  delBtn.onclick = ()=> acc && deleteAccount(acc);

  document.getElementById('chat-input').disabled = !canReplyHere;
  document.getElementById('chat-send-btn').disabled = !canReplyHere;
  document.getElementById('chat-input-row').classList.toggle('hidden-el', !canReplyHere);
  document.getElementById('chat-readonly-note').classList.toggle('hidden-el', canReplyHere);
  document.getElementById('reply-toggle-wrap').classList.toggle('hidden-el', own || !canReplyHere);
  document.getElementById('chat-input').setAttribute('placeholder', own ? t('chatPlaceholderOwn') : t('chatPlaceholderStaff'));
}

async function loadMessagesForThread(threadId){
  const { data, error } = await sb.from('messages').select('*').eq('thread_id', threadId).order('created_at', { ascending:true });
  if(error){ console.error(error); return; }
  renderMessages(data || [], threadId);
}

function renderMessages(msgs, threadId){
  const container = document.getElementById('chat-messages');
  const own = isOwnThread(threadId);
  const fullView = state.mode === 'full';
  container.innerHTML = '';
  msgs.forEach(m=>{
    let cls = 'msg';
    const mine = m.sender_id === state.profile.id;
    if(fullView){
      cls += m.visibility === 'internal' ? ' internal' : ' client-reply';
    } else {
      cls += mine ? ' from-client' : ' client-reply';
    }
    let senderLabel;
    if(fullView){
      senderLabel = escapeHtml(m.sender_username) + (m.visibility==='internal' ? ' ' + t('internalNote') : ' ' + t('sentToClient'));
    } else {
      senderLabel = mine ? t('you') : t('staff');
    }
    const div = el(`<div class="${cls}">
      <div class="meta">${senderLabel} · ${fmtTime(m.created_at)}</div>
      <div class="body"></div>
      ${fullView ? '<span class="del">✕</span>' : ''}
    </div>`);
    div.querySelector('.body').textContent = m.content;
    if(m.image_url){
      const img = el(`<img class="attach" src="${escapeHtml(m.image_url)}" />`);
      img.onclick = ()=> window.open(m.image_url, '_blank');
      div.appendChild(img);
    }
    if(fullView){
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

function subscribeToThread(threadId){
  if(state.msgChannel){ sb.removeChannel(state.msgChannel); state.msgChannel = null; }
  state.msgChannel = sb.channel('messages-'+threadId)
    .on('postgres_changes', { event:'*', schema:'public', table:'messages', filter:'thread_id=eq.'+threadId }, ()=>{
      loadMessagesForThread(threadId);
    })
    .subscribe();
}

function resolveVisibility(threadId, text){
  const own = isOwnThread(threadId);
  let visibility = 'client';
  let cleanText = text;
  if(!own){
    // replying inside someone else's chat: level>=6 required, !r governs visibility
    const toggle = document.getElementById('reply-toggle').checked;
    visibility = 'internal';
    if(toggle && !/^!r\s/i.test(cleanText)){ cleanText = '!r ' + cleanText; }
    if(/^!r\s+/i.test(cleanText)){
      visibility = 'client';
      cleanText = cleanText.replace(/^!r\s+/i, '');
    }
  }
  return { visibility, cleanText };
}

async function notifyDiscord(threadId, content, imageUrl, visibility){
  try{
    await fetch('/api/discord-notify', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+state.session.access_token },
      body: JSON.stringify({ threadId, content, imageUrl, visibility })
    });
  } catch(e){
    console.warn('discord-notify failed', e);
  }
}

async function sendMessage(){
  const threadId = state.activeThreadId;
  if(!threadId) return;
  const input = document.getElementById('chat-input');
  let text = input.value;
  if(!text.trim()) return;

  const { visibility, cleanText } = resolveVisibility(threadId, text);
  if(!cleanText.trim()) return;

  const { error } = await sb.from('messages').insert({
    thread_id: threadId,
    sender_id: state.profile.id,
    sender_username: state.profile.username,
    content: cleanText.trim(),
    visibility
  });
  if(error){ alert('ERROR: ' + error.message); return; }
  input.value = '';
  await loadMessagesForThread(threadId);
  notifyDiscord(threadId, cleanText.trim(), null, visibility);
}

async function sendImage(file){
  const threadId = state.activeThreadId;
  if(!threadId || !file) return;
  if(file.type !== 'image/png'){ alert(t('imageOnlyPng')); return; }
  if(file.size > 5*1024*1024){ alert(t('imageTooBig')); return; }

  const imageBtn = document.getElementById('chat-image-btn');
  const prevLabel = imageBtn.textContent;
  imageBtn.textContent = '...';
  imageBtn.disabled = true;

  try{
    const path = `${threadId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.png`;
    const { error: upErr } = await sb.storage.from('chat-images').upload(path, file, { contentType:'image/png', upsert:false });
    if(upErr){ alert('ERROR: ' + upErr.message); return; }
    const { data: pub } = sb.storage.from('chat-images').getPublicUrl(path);
    const imageUrl = pub.publicUrl;

    const { visibility, cleanText } = resolveVisibility(threadId, document.getElementById('chat-input').value || '');

    const { error } = await sb.from('messages').insert({
      thread_id: threadId,
      sender_id: state.profile.id,
      sender_username: state.profile.username,
      content: cleanText.trim(),
      image_url: imageUrl,
      visibility
    });
    if(error){ alert('ERROR: ' + error.message); return; }
    document.getElementById('chat-input').value = '';
    await loadMessagesForThread(threadId);
    notifyDiscord(threadId, cleanText.trim(), imageUrl, visibility);
  } finally {
    imageBtn.textContent = prevLabel;
    imageBtn.disabled = false;
    document.getElementById('chat-image-input').value = '';
  }
}

document.getElementById('chat-send-btn').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMessage(); });
document.getElementById('reply-toggle').addEventListener('change', (e)=>{
  document.getElementById('reply-toggle-wrap').classList.toggle('on', e.target.checked);
});
document.getElementById('chat-image-btn').addEventListener('click', ()=> document.getElementById('chat-image-input').click());
document.getElementById('chat-image-input').addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(file) sendImage(file);
});
document.getElementById('logout-btn').addEventListener('click', logout);

/* ============================================================================
   BOOTSTRAP
   ========================================================================== */
document.getElementById('login-btn').addEventListener('click', attemptLogin);
document.getElementById('login-password').addEventListener('keydown', (e)=>{ if(e.key==='Enter') attemptLogin(); });

window.addEventListener('load', async ()=>{
  applyTranslations();
  runBootSequence(async ()=>{
    const { data } = await sb.auth.getSession();
    if(data && data.session){
      await onAuthed(data.session);
    } else {
      document.getElementById('login-screen').classList.add('visible');
    }
  });
});
