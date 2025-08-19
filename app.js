// EncontroJá PWA — com planos e limites (sem backend).
// Perfis "descobrir" são gerados localmente; matches e mensagens ficam no localStorage.

const $ = (q) => document.querySelector(q);

// App state
let state = {
  me: null,
  subscription: 'free', // 'free'|'plus'|'premium'
  filters: { minAge: 18, maxAge: 60, km: 100, pref: 'A', interests: [] },
  pool: [],
  index: 0,
  likedBy: [], // simula "quem curtiu você"
  likes: [],
  matches: [], // {uid, name, bio, photo, thread: [{from:'me'|'them', text, ts}]}
  lastAction: null, // {type:'like'|'pass', profile}
  quotas: {
    messagesToday: 0,
    chatRequestsToday: 0,
    lastReset: 0,
    lockUntil: 0 // timestamp quando libera mensagens (Grátis/Plus) após atingir limite
  },
  policy: {
    free: { dailyMsgLimit: 20, cooldownHours: 8, chatRequestsPerDay: 0 },
    plus: { dailyMsgLimit: 30, cooldownHours: 6, chatRequestsPerDay: 0 },
    premium: { dailyMsgLimit: Infinity, cooldownHours: 0, chatRequestsPerDay: 5 } // conforme ajuda Jaumo
  },
  boosts: { last: 0, activeUntil: 0, weeklyCount: 0, weekRef: '' } // 1 por semana no Premium
};

// Storage helpers
const KEY = 'ej_pwa_state_v2';
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function load() { const raw = localStorage.getItem(KEY); if (raw) Object.assign(state, JSON.parse(raw)); }

// UI helpers
function show(id) { ['#viewAuth','#viewDiscover','#viewMatches','#viewChat','#viewLikes'].forEach(v => document.querySelector(v).classList.add('hidden')); document.querySelector(id).classList.remove('hidden'); }
function toast(msg) { alert(msg); }

function todayKey() { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function resetDailyIfNeeded() {
  const key = todayKey();
  if (state.quotas.lastReset !== key) {
    state.quotas.lastReset = key;
    state.quotas.messagesToday = 0;
    state.quotas.chatRequestsToday = 0;
    state.quotas.lockUntil = 0;
  }
}

function updatePlanBadge() {
  const badge = document.getElementById('planBadge');
  badge.textContent = state.subscription.charAt(0).toUpperCase() + state.subscription.slice(1);
  badge.classList.toggle('hidden', state.subscription==='free');
}

// Seed profiles
function seedPool() {
  const names = ['Ana','Bruno','Carla','Diego','Elaine','Felipe','Gisele','Henrique','Iara','João','Karen','Luiz','Marina','Nando','Olivia','Paulo','Quezia','Rafa','Sofia','Tiago','Ursula','Vitor','Wesley','Xenia','Yasmin','Zeca'];
  const bios = ['Amo trilhas e cafés','Maratonas de séries e pizza','Música ao vivo sempre','Viajar é meu hobby','Cozinho muito bem','Apaixonado por tecnologia','Pets são tudo pra mim'];
  const pics = [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541216970279-affbfdd55aa8?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=800&auto=format&fit=crop',
  ];
  const interests = ['Música','Viagens','Esportes','Filmes','Tecnologia','Pets'];
  const pool = [];
  for (let i=0;i<40;i++) {
    const n = names[Math.floor(Math.random()*names.length)];
    const age = 18 + Math.floor(Math.random()*40);
    const bio = bios[Math.floor(Math.random()*bios.length)];
    const photo = pics[Math.floor(Math.random()*pics.length)] + '&crop=faces&fit=crop';
    const gender = Math.random()>0.5?'M':'F';
    const ints = interests.filter(_ => Math.random()>0.5);
    pool.push({ uid:'u'+i, name:n, age, bio, photo, gender, interests:ints });
  }
  state.pool = pool;
}

function chanceScore(profile) {
  const overlap = (state.me?.interests || []).filter(i => profile.interests.includes(i)).length;
  return Math.min(95, 40 + overlap * 15);
}

// Rendering
function renderDiscover() {
  const p = state.pool[state.index];
  $('#profiles').innerHTML = '';
  if (!p) { $('#profiles').innerHTML = '<div class="card">Sem perfis no momento.</div>'; return; }
  const card = document.createElement('div');
  card.className = 'card';
  const showChance = state.subscription==='premium';
  const chance = chanceScore(p);
  card.innerHTML = `
    <img src="${p.photo}" style="width:100%; height:300px; object-fit:cover; border-radius:12px">
    <h2>${p.name}, ${p.age}</h2>
    <div class="meta-row">${showChance?`<span class='score'>Chances: ${chance}%</span>`:''}</div>
    <p>${p.bio}</p>
    <div class="chips">${p.interests.map(i=>`<span class="chip">${i}</span>`).join('')}</div>
  `;
  $('#profiles').appendChild(card);
}

function renderMatches() {
  const list = $('#matches');
  list.innerHTML = '';
  if (state.matches.length === 0) { list.innerHTML = '<div class="card">Sem matches ainda.</div>'; return; }
  for (const m of state.matches) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <img src="${m.photo}" alt="${m.name}">
      <div class="meta">
        <h3>${m.name}</h3>
        <div class="small">${m.bio}</div>
        <div class="row"><button class="btn soft" data-open="${m.uid}">Abrir chat</button></div>
      </div>
    `;
    list.appendChild(el);
  }
  list.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', (e)=> openChat(e.target.getAttribute('data-open'))));
}

function renderLikesYou() {
  const list = $('#likesList');
  list.innerHTML = '';
  if (state.likedBy.length === 0) { list.innerHTML = '<div class="card">Ninguém curtiu você (ainda!).</div>'; return; }
  for (const p of state.likedBy) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <img src="${p.photo}" alt="${p.name}">
      <div class="meta">
        <h3>${p.name}, ${p.age}</h3>
        <div class="small">${p.bio}</div>
      </div>
    `;
    list.appendChild(el);
  }
}

// Chat helpers
function canSendMessage() {
  resetDailyIfNeeded();
  const now = Date.now();
  if (state.subscription !== 'premium') {
    if (state.quotas.lockUntil && now < state.quotas.lockUntil) {
      toast('Você atingiu o limite diário. Libera às ' + new Date(state.quotas.lockUntil).toLocaleTimeString());
      return false;
    }
    const limit = state.policy[state.subscription].dailyMsgLimit;
    if (state.quotas.messagesToday >= limit) {
      const hrs = state.policy[state.subscription].cooldownHours;
      state.quotas.lockUntil = now + hrs*3600*1000;
      save();
      toast('Você atingiu o limite de mensagens de hoje. Tente novamente em algumas horas.');
      return false;
    }
  }
  return true;
}

function openChat(uid) {
  const m = state.matches.find(x => x.uid === uid);
  if (!m) return;
  $('#chatTitle').textContent = 'Chat com ' + m.name;
  const list = document.getElementById('chatMessages');
  list.innerHTML = '';
  for (const msg of m.thread || []) {
    const el = document.createElement('div');
    el.className = 'bubble' + (msg.from==='me'?' me':'');
    el.textContent = msg.text;
    list.appendChild(el);
  }
  show('#viewChat');
  document.getElementById('btnSendChat').onclick = () => {
    const t = document.getElementById('chatInput').value.trim();
    if (!t) return;
    if (!canSendMessage()) return;
    m.thread = m.thread || [];
    m.thread.push({ from:'me', text:t, ts: Date.now() });
    state.quotas.messagesToday++;
    document.getElementById('chatInput').value = '';
    save();
    openChat(uid);
  };
}

// Actions
function like() {
  const p = state.pool[state.index];
  if (!p) return;
  state.likes.push(p.uid);
  state.lastAction = { type:'like', profile:p };
  // simulate: base 40% chance (boost eleva para 80%)
  const boosted = Date.now() < state.boosts.activeUntil;
  const chance = boosted ? 0.2 : 0.6;
  if (Math.random() > chance) {
    state.matches.push({ uid:p.uid, name:p.name, bio:p.bio, photo:p.photo, thread: [{from:'them', text:'Oi! 😊', ts: Date.now()}] });
    toast('🎉 Deu match com ' + p.name + '!');
  } else {
    if (Math.random() > 0.7) state.likedBy.push(p);
  }
  state.index++;
  save();
  renderDiscover();
}

function pass() { const p = state.pool[state.index]; if (!p) return; state.lastAction = { type:'pass', profile:p }; state.index++; save(); renderDiscover(); }
function rewind() {
  if (state.subscription!=='premium') { toast('Rewind é Premium.'); return; }
  if (!state.lastAction) { toast('Nada para desfazer.'); return; }
  const a = state.lastAction;
  if (a.type === 'like') {
    state.likes = state.likes.filter(x => x !== a.profile.uid);
    state.matches = state.matches.filter(x => x.uid !== a.profile.uid);
  }
  state.index = Math.max(0, state.index - 1);
  state.lastAction = null;
  save();
  renderDiscover();
}

function chatRequest() {
  resetDailyIfNeeded();
  const policy = state.policy[state.subscription];
  if (policy.chatRequestsPerDay <= 0) { return toast('Chat Request é Premium (5/dia). Assine em Planos.'); }
  if (state.quotas.chatRequestsToday >= policy.chatRequestsPerDay) { return toast('Você atingiu o limite diário de Chat Requests.'); }
  const p = state.pool[state.index]; if (!p) return;
  const exists = state.matches.find(x=>x.uid===p.uid);
  if (!exists) { state.matches.push({ uid:p.uid, name:p.name, bio:p.bio, photo:p.photo, thread: [{from:'me', text:'Oi! 🙂', ts: Date.now()}] }); }
  state.quotas.chatRequestsToday++;
  save();
  toast('Chat Request enviado para ' + p.name);
  openChat(p.uid);
}

// Export/Reset
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'encontroja_data.json'; a.click();
  URL.revokeObjectURL(url);
}
function resetApp() { localStorage.removeItem(KEY); location.reload(); }

// Install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('btnInstall').classList.remove('hidden'); });
document.getElementById('btnInstall').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('btnInstall').classList.add('hidden');
});

// Init
function init() {
  load();
  if (!state.me) {
    show('#viewAuth');
  } else {
    updatePlanBadge();
    show('#viewDiscover');
    renderDiscover();
  }

  // Auth flow
  document.getElementById('btnStart').onclick = () => {
    const me = {
      uid: 'me',
      name: document.getElementById('name').value.trim() || 'Você',
      age: parseInt(document.getElementById('age').value || '25',10),
      bio: document.getElementById('bio').value.trim() || 'Gosto de bons papos.',
      pref: document.getElementById('pref').value,
      interests: Array.from(document.querySelectorAll('.chips .chip')).slice(0,3).map(el=>el.textContent)
    };
    state.me = me;
    state.filters.pref = me.pref;
    seedPool();
    applyFilters();
    state.index = 0;
    save();
    updatePlanBadge();
    show('#viewDiscover');
    renderDiscover();
  };

  // Discover actions
  document.getElementById('btnLike').onclick = like;
  document.getElementById('btnPass').onclick = pass;
  document.getElementById('btnRewind').onclick = rewind;
  document.getElementById('btnChatRequest').onclick = chatRequest;

  // Matches
  document.getElementById('btnBackToDiscover').onclick = () => { show('#viewDiscover'); };

  document.getElementById('btnFilters').onclick = () => {
    const ints = ['Música','Viagens','Esportes','Filmes','Tecnologia','Pets'];
    if (!(state.subscription==='plus' || state.subscription==='premium')) return toast('Filtros por interesse estão no Plus/Premium.');
    const inp = prompt('Digite interesses separados por vírgula (opções: ' + ints.join(', ') + ')', state.filters.interests.join(', '));
    if (inp !== null) {
      state.filters.interests = inp.split(',').map(x=>x.trim()).filter(Boolean);
      seedPool();
      applyFilters();
      state.index = 0;
      save();
      renderDiscover();
    }
  };

  document.getElementById('btnLikesYou').onclick = () => {
    if (state.subscription!=='premium') return toast('Ver quem curtiu você é Premium.');
    renderLikesYou(); show('#viewLikes');
  };

  // Admin
  document.getElementById('btnExport').onclick = exportData;
  document.getElementById('btnReset').onclick = resetApp;

  // Keyboard
  document.addEventListener('keydown', (e)=>{ if (e.key === 'ArrowRight') like(); if (e.key === 'ArrowLeft') pass(); });

  // close views
  document.getElementById('btnCloseChat').onclick = () => show('#viewMatches');
  document.getElementById('btnCloseLikes').onclick = () => show('#viewDiscover');

  // Shortcut to Matches
  const toMatches = document.createElement('button');
  toMatches.textContent = 'Ver Matches';
  toMatches.className = 'btn soft';
  toMatches.onclick = () => { renderMatches(); show('#viewMatches'); };
  document.querySelector('.container').insertBefore(toMatches, document.querySelector('#viewDiscover'));

  // Plans modal
  document.getElementById('btnPlans').onclick = () => { document.getElementById('plansModal').style.display='flex'; };
  document.getElementById('closePlans').onclick = () => { document.getElementById('plansModal').style.display='none'; };
  document.getElementById('chooseFree').onclick = () => { state.subscription='free'; updatePlanBadge(); save(); alert('Plano grátis ativo.'); document.getElementById('plansModal').style.display='none'; };
  document.getElementById('choosePlus').onclick = () => { state.subscription='plus'; updatePlanBadge(); save(); alert('Plus ativo por R$ 14,90/mês.'); document.getElementById('plansModal').style.display='none'; };
  document.getElementById('choosePremium').onclick = () => { state.subscription='premium'; updatePlanBadge(); save(); alert('Premium ativo por R$ 19,90/mês.'); document.getElementById('plansModal').style.display='none'; };

  // Boost (1/semana — Premium)
  document.getElementById('btnBoost').onclick = () => {
    const now = new Date();
    const weekRef = now.getFullYear()+'-W'+String(Math.ceil((now.getDate() + (new Date(now.getFullYear(), now.getMonth(), 1).getDay()))/7)).padStart(2,'0');
    if (state.subscription!=='premium') return toast('Boost é Premium.');
    if (state.boosts.weekRef !== weekRef) { state.boosts.weekRef = weekRef; state.boosts.weeklyCount = 0; }
    if (state.boosts.weeklyCount >= 1) return toast('Você já usou o Boost gratuito desta semana.');
    state.boosts.weeklyCount++;
    state.boosts.activeUntil = Date.now() + 60*60*1000; // 1h
    save();
    toast('🚀 Boost ativado por 1 hora!');
  };
}

function applyFilters() {
  // filtro simples por idade, pref (gênero) e interesses (Plus/Premium)
  state.pool = state.pool.filter(p => {
    if (p.age < state.filters.minAge || p.age > state.filters.maxAge) return false;
    if (state.filters.pref !== 'A' && p.gender !== state.filters.pref) return false;
    if ((state.subscription==='plus' || state.subscription==='premium') && state.filters.interests.length) {
      if (!state.filters.interests.some(i => p.interests.includes(i))) return false;
    }
    return true;
  });
}

init();
