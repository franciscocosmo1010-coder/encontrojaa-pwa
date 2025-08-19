// EncontroJá PWA — versão dark completa
const $ = (q) => document.querySelector(q);

// Estado
let state = {
  me: null,
  subscription: 'free',
  filters: { minAge:18, maxAge:60, km:100, country:'Todos', pref:'A', interests:[] },
  pool: [],
  index: 0,
  likedBy: [],
  likes: [],
  visited: [],
  matches: [],
  lastAction: null,
  quotas: { messagesToday:0, chatRequestsToday:0, lastReset:0, lockUntil:0 },
  policy: {
    free: { dailyMsgLimit: 20, cooldownHours: 8, chatRequestsPerDay: 0 },
    plus: { dailyMsgLimit: 30, cooldownHours: 6, chatRequestsPerDay: 0 },
    premium: { dailyMsgLimit: Infinity, cooldownHours: 0, chatRequestsPerDay: 5 }
  },
  boosts: { last:0, activeUntil:0, weeklyCount:0, weekRef:'' }
};

const KEY = 'ej_pwa_dark_state';
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function load(){ const raw = localStorage.getItem(KEY); if(raw) Object.assign(state, JSON.parse(raw)); }

function show(id){ 
  ['#viewAuth','#viewDiscover','#viewMatches','#viewChat','#viewLikes','#viewVisited','#viewMyLikes']
    .forEach(v => document.querySelector(v).classList.add('hidden')); 
  document.querySelector(id).classList.remove('hidden'); 
}
function toast(msg){ alert(msg); }

// Seed perfis fake
function seedPool(){
  const names = ['Ana','Bruno','Carla','Diego','Elaine','Felipe','Gisele','Henrique','Iara','João','Karen','Luiz','Marina','Nando','Olivia','Paulo','Rafa','Sofia','Tiago','Vitor','Wesley','Yasmin','Zeca'];
  const bios = ['Amo trilhas','Séries e pizza','Música ao vivo','Viajar é vida','Cozinho bem','Pets são tudo'];
  const pics = [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&fit=crop',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=800&fit=crop',
    'https://images.unsplash.com/photo-1541216970279-affbfdd55aa8?q=80&w=800&fit=crop'
  ];
  const interests = ['Música','Viagens','Esportes','Filmes','Tecnologia','Pets'];
  const pool=[];
  for(let i=0;i<40;i++){
    const n=names[Math.floor(Math.random()*names.length)];
    const age=18+Math.floor(Math.random()*40);
    const bio=bios[Math.floor(Math.random()*bios.length)];
    const photo=pics[Math.floor(Math.random()*pics.length)];
    const gender=Math.random()>0.5?'M':'F';
    const ints=interests.filter(_=>Math.random()>0.5);
    pool.push({uid:'u'+i, name:n, age, bio, photo, gender, country:'Brasil', interests:ints});
  }
  state.pool=pool;
}

// Aplicar filtros
function applyFilters(){
  state.pool=state.pool.filter(p=>{
    if(p.age<state.filters.minAge||p.age>state.filters.maxAge) return false;
    if(state.filters.pref!=='A'&&p.gender!==state.filters.pref) return false;
    return true;
  });
}

// Render perfis
function renderDiscover(){
  const p=state.pool[state.index];
  $('#profiles').innerHTML='';
  if(!p){ $('#profiles').innerHTML='<div class="card">Sem perfis no momento.</div>'; return; }
  const card=document.createElement('div');
  card.className='card';
  card.innerHTML=`
    <img src="${p.photo}" style="width:100%;height:280px;object-fit:cover;border-radius:12px">
    <h2>${p.name}, ${p.age}</h2>
    <p>${p.bio}</p>
    <div class="chips">${p.interests.map(i=>`<span class="chip">${i}</span>`).join('')}</div>`;
  $('#profiles').appendChild(card);
  // registrar visita
  if(!state.visited.find(v=>v.uid===p.uid)) state.visited.push(p);
  save();
}

// Render matches
function renderMatches(){
  const list=$('#matches'); list.innerHTML='';
  if(state.matches.length===0){ list.innerHTML='<div class="card">Sem matches ainda.</div>'; return; }
  for(const m of state.matches){
    const el=document.createElement('div');
    el.className='item';
    el.innerHTML=`<img src="${m.photo}"><div class="meta"><h3>${m.name}</h3><div class="small">${m.bio}</div><button class="btn soft" data-open="${m.uid}">Abrir chat</button></div>`;
    list.appendChild(el);
  }
  list.querySelectorAll('[data-open]').forEach(b=>b.onclick=(e)=>openChat(e.target.getAttribute('data-open')));
}

// Render curtidas
function renderLikes(){ const list=$('#likesList'); list.innerHTML=''; if(state.likedBy.length===0){ list.innerHTML='<div class="card">Ninguém curtiu você ainda.</div>'; return;} for(const p of state.likedBy){ list.innerHTML+=`<div class="item"><img src="${p.photo}"><div class="meta"><h3>${p.name}, ${p.age}</h3><div class="small">${p.bio}</div></div></div>`; } }
function renderVisited(){ const list=$('#visitedList'); list.innerHTML=''; if(state.visited.length===0){ list.innerHTML='<div class="card">Nenhuma visita ainda.</div>'; return;} for(const p of state.visited){ list.innerHTML+=`<div class="item"><img src="${p.photo}"><div class="meta"><h3>${p.name}, ${p.age}</h3></div></div>`; } }
function renderMyLikes(){ const list=$('#myLikesList'); list.innerHTML=''; if(state.likes.length===0){ list.innerHTML='<div class="card">Você ainda não curtiu ninguém.</div>'; return;} for(const uid of state.likes){ const p=state.pool.find(x=>x.uid===uid)||{}; list.innerHTML+=`<div class="item"><div class="meta"><h3>${p.name||'Perfil'}</h3></div></div>`; } }

// Chat
function openChat(uid){
  const m=state.matches.find(x=>x.uid===uid); if(!m) return;
  $('#chatTitle').textContent='Chat com '+m.name;
  const list=$('#chatMessages'); list.innerHTML='';
  for(const msg of m.thread||[]){ const el=document.createElement('div'); el.className='bubble'+(msg.from==='me'?' me':''); el.textContent=msg.text; list.appendChild(el); }
  show('#viewChat');
  $('#btnSendChat').onclick=()=>{
    const t=$('#chatInput').value.trim(); if(!t) return;
    m.thread=m.thread||[]; m.thread.push({from:'me',text:t,ts:Date.now()});
    $('#chatInput').value=''; save(); openChat(uid);
  };
}

// Ações
function like(){
  const p=state.pool[state.index]; if(!p) return;
  state.likes.push(p.uid); state.lastAction={type:'like',profile:p};
  if(Math.random()>0.5){ state.matches.push({uid:p.uid,name:p.name,bio:p.bio,photo:p.photo,thread:[{from:'them',text:'Oi! 😊',ts:Date.now()}]}); toast('🎉 Deu match com '+p.name+'!'); } else { state.likedBy.push(p); }
  state.index++; save(); renderDiscover();
}
function pass(){ state.index++; save(); renderDiscover(); }
function rewind(){ if(state.index>0) state.index--; renderDiscover(); }

// Init
function init(){
  load();
  if(!state.me) show('#viewAuth'); else { show('#viewDiscover'); renderDiscover(); }

  $('#btnStart').onclick=()=>{
    state.me={ uid:'me', login:$('#login').value.trim(), name:$('#name').value.trim()||'Você', age:parseInt($('#age').value||'25'), bio:$('#bio').value.trim()||'Gosto de conversar.', gender:$('#gender').value, pref:$('#pref').value, interests:Array.from(document.querySelectorAll('.chips .chip')).slice(0,3).map(el=>el.textContent) };
    state.filters.pref=state.me.pref; seedPool(); applyFilters(); state.index=0; save(); show('#viewDiscover'); renderDiscover();
  };

  $('#btnLike').onclick=like; $('#btnPass').onclick=pass; $('#btnRewind').onclick=rewind;
  $('#btnBackToDiscover').onclick=()=>show('#viewDiscover');
  $('#btnLikesYou').onclick=()=>{renderLikes(); show('#viewLikes');};
  $('#btnVisited').onclick=()=>{renderVisited(); show('#viewVisited');};
  $('#btnMyLikes').onclick=()=>{renderMyLikes(); show('#viewMyLikes');};
  $('#btnCloseChat').onclick=()=>show('#viewMatches'); $('#btnCloseLikes').onclick=()=>show('#viewDiscover'); $('#btnCloseVisited').onclick=()=>show('#viewDiscover'); $('#btnCloseMyLikes').onclick=()=>show('#viewDiscover');

  // navegação
  $('#navDiscover').onclick=()=>{show('#viewDiscover'); renderDiscover();};
  $('#navMatches').onclick=()=>{renderMatches(); show('#viewMatches');};
  $('#navLikes').onclick=()=>{renderLikes(); show('#viewLikes');};
  $('#navProfile').onclick=()=>{alert('Perfil em construção');};
}

init();
