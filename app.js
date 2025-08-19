// EncontroJá PWA — armazenamento local (sem backend).
// Perfis "descobrir" são gerados localmente; matches e mensagens ficam no localStorage.

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

// App state
let state = {
  me: null,
  premium: false,
  filters: { minAge: 18, maxAge: 60, km: 100, pref: 'A', interests: [] },
  pool: [],
  index: 0,
  likedBy: [], // simula "quem curtiu você"
  likes: [],
  matches: [], // {uid, name, bio, photo, thread: [{from:'me'|'them', text, ts}]}
  lastAction: null, // {type:'like'|'pass', profile}
};

// Storage helpers
const KEY = 'ej_pwa_state_v1';
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function load() {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...state, ...JSON.parse(raw) };
}

// UI helpers
function show(id) {
  ['viewAuth','viewDiscover','viewMatches','viewChat','viewLikes'].forEach(v => $('#' + v).classList.add('hidden'));
  $(id).classList.remove('hidden');
}
function toast(msg) {
  alert(msg);
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

// Rendering
function renderDiscover() {
  const p = state.pool[state.index];
  $('#profiles').innerHTML = '';
  if (!p) {
    $('#profiles').innerHTML = '<div class="card">Sem perfis no momento.</div>';
    return;
  }
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img src="${p.photo}" style="width:100%; height:300px; object-fit:cover; border-radius:12px">
    <h2>${p.name}, ${p.age}</h2>
    <p>${p.bio}</p>
    <div class="chips">${p.interests.map(i=>`<span class="chip">${i}</span>`).join('')}</div>
  `;
  $('#profiles').appendChild(card);
}

function renderMatches() {
  const list = $('#matches');
  list.innerHTML = '';
  if (state.matches.length === 0) {
    list.innerHTML = '<div class="card">Sem matches ainda.</div>';
    return;
  }
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
  if (state.likedBy.length === 0) {
    list.innerHTML = '<div class="card">Ninguém curtiu você (ainda!).</div>';
    return;
  }
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

// Chat
function openChat(uid) {
  const m = state.matches.find(x => x.uid === uid);
  if (!m) return;
  $('#chatTitle').textContent = 'Chat com ' + m.name;
  const list = $('#chatMessages');
  list.innerHTML = '';
  for (const msg of m.thread || []) {
    const el = document.createElement('div');
    el.className = 'bubble' + (msg.from==='me'?' me':'');
    el.textContent = msg.text;
    list.appendChild(el);
  }
  show('#viewChat');
  $('#btnSendChat').onclick = () => {
    const t = $('#chatInput').value.trim();
    if (!t) return;
    m.thread = m.thread || [];
    m.thread.push({ from:'me', text:t, ts: Date.now() });
    $('#chatInput').value = '';
    save();
    openChat(uid);
  };
}

function applyFilters() {
  // simple filter by age, pref (gender), and interests if premium
  state.pool = state.pool.filter(p => {
    if (p.age < state.filters.minAge || p.age > state.filters.maxAge) return false;
    if (state.filters.pref !== 'A' && p.gender !== state.filters.pref) return false;
    if (state.premium && state.filters.interests.length) {
      if (!state.filters.interests.some(i => p.interests.includes(i))) return false;
    }
    return true;
  });
}

// Actions
function like() {
  const p = state.pool[state.index];
  if (!p) return;
  state.likes.push(p.uid);
  state.lastAction = { type:'like', profile:p };
  // simulate: 40% chance it's mutual match
  if (Math.random() > 0.6) {
    state.matches.push({ uid:p.uid, name:p.name, bio:p.bio, photo:p.photo, thread: [{from:'them', text:'Oi! 😊', ts: Date.now()}] });
    toast('🎉 Deu match com ' + p.name + '!');
  } else {
    // also push into likedBy list (simulate that someone curtiu você)
    if (Math.random() > 0.7) state.likedBy.push(p);
  }
  state.index++;
  save();
  renderDiscover();
}

function pass() {
  const p = state.pool[state.index];
  if (!p) return;
  state.lastAction = { type:'pass', profile:p };
  state.index++;
  save();
  renderDiscover();
}

function rewind() {
  if (!state.premium) { toast('Rewind é Premium.'); return; }
  if (!state.lastAction) { toast('Nada para desfazer.'); return; }
  const a = state.lastAction;
  if (a.type === 'like') {
    // remove like and any match created
    state.likes = state.likes.filter(x => x !== a.profile.uid);
    state.matches = state.matches.filter(x => x.uid !== a.profile.uid);
  }
  // step back one card
  state.index = Math.max(0, state.index - 1);
  state.lastAction = null;
  save();
  renderDiscover();
}

// Export/Reset
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'encontroja_data.json'; a.click();
  URL.revokeObjectURL(url);
}

function resetApp() {
  localStorage.removeItem(KEY);
  location.reload();
}

// Install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#btnInstall').classList.remove('hidden');
});
$('#btnInstall').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('#btnInstall').classList.add('hidden');
});

// Init
function init() {
  load();
  if (!state.me) {
    show('#viewAuth');
  } else {
    $('#premiumBadge').classList.toggle('hidden', !state.premium);
    show('#viewDiscover');
    renderDiscover();
  }

  // Auth flow (local onboarding)
  $('#btnStart').onclick = () => {
    const me = {
      uid: 'me', name: $('#name').value.trim() || 'Você', age: parseInt($('#age').value || '25',10),
      bio: $('#bio').value.trim() || 'Gosto de bons papos.', pref: $('#pref').value
    };
    state.me = me;
    state.filters.pref = me.pref;
    state.premium = state.premium || false;
    seedPool();
    applyFilters();
    state.index = 0;
    save();
    $('#premiumBadge').classList.toggle('hidden', !state.premium);
    show('#viewDiscover');
    renderDiscover();
  };

  $('#btnTogglePremium').onclick = () => {
    state.premium = !state.premium;
    $('#premiumBadge').classList.toggle('hidden', !state.premium);
  };

  // Discover actions
  $('#btnLike').onclick = like;
  $('#btnPass').onclick = pass;
  $('#btnRewind').onclick = rewind;

  // Matches
  $('#btnBackToDiscover').onclick = () => { show('#viewDiscover'); };
  $('#btnFilters').onclick = () => {
    const ints = ['Música','Viagens','Esportes','Filmes','Tecnologia','Pets'];
    if (!state.premium) return toast('Filtros por interesse são Premium.');
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

  $('#btnLikesYou').onclick = () => {
    if (!state.premium) return toast('Ver quem curtiu você é Premium.');
    renderLikesYou();
    show('#viewLikes');
  };

  // Admin
  $('#btnExport').onclick = exportData;
  $('#btnReset').onclick = resetApp;

  // Matches view navigation
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight') like();
    if (e.key === 'ArrowLeft') pass();
  });

  // close views
  $('#btnCloseChat').onclick = () => show('#viewMatches');
  $('#btnCloseLikes').onclick = () => show('#viewDiscover');

  // open matches view when there's at least one
  const toMatches = document.createElement('button');
  toMatches.textContent = 'Ver Matches';
  toMatches.className = 'btn soft';
  toMatches.onclick = () => { renderMatches(); show('#viewMatches'); };
  document.querySelector('.container').insertBefore(toMatches, document.querySelector('#viewDiscover'));
}

init();