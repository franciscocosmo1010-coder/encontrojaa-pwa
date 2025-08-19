// EncontroJá - Perfis fake + Auto-like + Monetização (planos <= R$20) - corrigido
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

let state = {
  me: null,
  subscription: 'free', // 'free' | 'premium'
  filters: { minAge: 18, maxAge: 60, km: 100 },
  bots: [],
  queue: [],
  likesIncoming: [],
  myLikes: [],
  passes: [],
  matches: [],         // {id, ts}
  chats: {},           // { [id]: [{from:'me'|'them', text, ts}] }
  monet: {
    freeMaxLikesPerDay: 20,
    freeMaxMsgsPerDay: 10,
    cooldownHours: 12,
    dayLikesUsed: 0,
    dayMsgsUsed: 0,
    lastRefillAt: 0,
    nextRefillAt: 0
  }
};

const KEY = 'ej_pwa_monet_v7';
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function load(){ const raw = localStorage.getItem(KEY); if(raw){ try{ Object.assign(state, JSON.parse(raw)); }catch(e){} } }
function now(){ return Date.now(); }

function show(id){
  ['#viewAuth','#viewDiscover','#viewProfile','#viewFilters','#viewPremium','#viewLikes','#viewMatches'].forEach(v=>{
    const el = document.querySelector(v); if(el) el.classList.add('hidden');
  });
  const target = document.querySelector(id);
  if(target) target.classList.remove('hidden');
}

// ----------------- Perfis fake -----------------
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function sample(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function generateBots(n=100){
  const namesM = ["Lucas","Mateus","Gustavo","Felipe","João","Pedro","Bruno","Rafael","Thiago","Henrique","Diego","Leandro","Daniel","Vitor"];
  const namesF = ["Ana","Julia","Mariana","Beatriz","Camila","Larissa","Carolina","Fernanda","Patrícia","Natália","Aline","Bruna","Carla","Amanda"];
  const bios = ["Amo praia e trilhas","Café, livros e bons papos","Cozinho bem e rio fácil","Fotografia e filmes antigos","Mundo gamer e séries","Crossfit e viagens","Música ao vivo sempre","Pet lover assumido(a)","Empreendedor(a) curioso(a)","Arte, museus e vinho"];
  const signs = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
  const bodies = ["Magro","Normal","Atlético","Forte"];

  const arr = [];
  for(let i=0;i<n;i++){
    const gender = Math.random() < 0.5 ? 'M' : 'F';
    const name = (gender==='M'?sample(namesM):sample(namesF)) + ' ' + ['S.','A.','M.','P.','C.'][rand(0,4)];
    const age = rand(19,55);
    const km = rand(1,120);
    const online = Math.random() < 0.6;
    const bio = sample(bios);
    const sign = sample(signs);
    const body = sample(bodies);
    const id = 'b'+(1000+i);
    const img = `https://picsum.photos/seed/ej${i}/640/480`;
    arr.push({ id, gender, name, age, km, online, bio, sign, body, photos:[img] });
  }
  return arr;
}

// ----------------- Monetização helpers -----------------
function refillIfNeeded(){
  const m = state.monet;
  if(!m.nextRefillAt || m.nextRefillAt < now()){
    m.dayLikesUsed = 0;
    m.dayMsgsUsed = 0;
    m.lastRefillAt = now();
    m.nextRefillAt = now() + m.cooldownHours*60*60*1000;
    save();
  }
}
function requirePremium(message){
  alert(message + '\\n\\nAssine o Premium para liberar.');
  show('#viewPremium');
}
function canLike(){
  if(state.subscription==='premium') return true;
  refillIfNeeded();
  return state.monet.dayLikesUsed < state.monet.freeMaxLikesPerDay;
}
function consumeLike(){
  if(state.subscription==='premium') return;
  state.monet.dayLikesUsed++;
  save();
}
function canSendMessage(){
  if(state.subscription==='premium') return true;
  refillIfNeeded();
  return state.monet.dayMsgsUsed < state.monet.freeMaxMsgsPerDay;
}
function consumeMessage(){
  if(state.subscription==='premium') return;
  state.monet.dayMsgsUsed++;
  save();
}
function timeLeftToRefill(){
  const ms = Math.max(0, state.monet.nextRefillAt - now());
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  return `${h}h ${m}m`;
}

// ----------------- Renderização -----------------
function updateRangeBadges(){
  $('#ageRange') && ($('#ageRange').textContent = `${state.filters.minAge}-${state.filters.maxAge}`);
  $('#kmRange') && ($('#kmRange').textContent = `${state.filters.km}km`);
  const badge = $('#planBadge'); if(badge){
    if(state.subscription==='premium') badge.classList.remove('hidden'); else badge.classList.add('hidden');
  }
  const likesBtn = $('#btnLikesYou');
  if(likesBtn){
    likesBtn.textContent = state.subscription==='premium' ? 'Quem curtiu você' : 'Quem curtiu (Premium)';
  }
}

function buildQueue(){
  if(!state.me){ state.queue=[]; return; }
  let pref = state.me.pref || 'A';
  state.queue = state.bots.filter(p=>{
    if(state.passes.includes(p.id) || state.myLikes.includes(p.id) || state.matches.find(m=>m.id===p.id)) return false;
    if(pref!=='A' && p.gender!==pref) return false;
    if(p.age<state.filters.minAge || p.age>state.filters.maxAge) return false;
    if(p.km>state.filters.km) return false;
    return true;
  });
}

function renderDeck(){
  const deck = $('#profiles');
  if(!deck) return;
  deck.innerHTML = '';
  updateRangeBadges();
  buildQueue();
  if(state.queue.length===0){
    deck.innerHTML = `<div class="card">Sem mais perfis nestes filtros. Tente ampliar a idade/raio.</div>`;
    return;
  }
  const p = state.queue[0];
  const el = document.createElement('div');
  el.className='card-profile';
  el.innerHTML = `
    <img src="${p.photos[0]}" alt="${p.name}">
    <div class="meta">
      <h3>${p.name}, ${p.age}</h3>
      <div class="row">
        <span class="pill">${p.km} km</span>
        <span class="pill">${p.online?'Online':'Offline'}</span>
        <span class="pill">${p.sign}</span>
      </div>
      <div>${p.bio}</div>
    </div>`;
  deck.appendChild(el);
}

function renderMatches(){
  const box = $('#matchesList'); if(!box) return;
  box.innerHTML='';
  if(state.matches.length===0){
    box.innerHTML='<div class="card">Você ainda não tem matches.</div>';
    return;
  }
  state.matches.forEach(m=>{
    const p = state.bots.find(b=>b.id===m.id);
    if(!p) return;
    const chat = state.chats[m.id] || [];
    const last = chat[chat.length-1];
    const lastText = last ? (last.from==='me'?'Você: ':'Ela/Ele: ')+last.text : 'Diga oi!';
    const div = document.createElement('div');
    div.className='card';
    div.innerHTML = `
      <div class="row" style="align-items:center;gap:12px">
        <img src="${p.photos[0]}" style="width:60px;height:60px;object-fit:cover;border-radius:12px">
        <div style="flex:1">
          <div style="font-weight:700">${p.name}</div>
          <div style="opacity:.8;font-size:12px">${lastText}</div>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <input id="msg_${p.id}" placeholder="Enviar mensagem..." />
        <button class="btn" data-id="${p.id}" data-name="${p.name}">Enviar</button>
      </div>`;
    box.appendChild(div);
  });
  $$('#matchesList .btn').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.id;
      const input = document.getElementById('msg_'+id);
      const txt = (input?.value||'').trim();
      if(!txt) return;
      if(!canSendMessage()){
        const left = timeLeftToRefill();
        return requirePremium(`Limite de mensagens atingido (${state.monet.freeMaxMsgsPerDay}/dia). Próximo recarregamento em ${left}.`);
      }
      sendMessageTo(id, txt);
      input.value='';
      renderMatches();
    };
  });
}

function renderLikes(){
  const wrap = $('#likesList'); if(!wrap) return;
  wrap.innerHTML = '';
  if(state.subscription!=='premium'){
    wrap.innerHTML = `<div class="card">
      <b>Recurso Premium</b><br/>Veja quem curtiu você e dê like de volta instantaneamente.
      <div class="row" style="margin-top:8px"><button class="btn" id="upsellLikes">Assinar Premium</button></div>
    </div>`;
    $('#upsellLikes').onclick=()=>show('#viewPremium');
    return;
  }
  if(state.likesIncoming.length===0){
    wrap.innerHTML = '<div class="card">Ninguém curtiu você ainda. Faça um Boost! 🚀</div>';
    return;
  }
  state.likesIncoming.forEach(id=>{
    const p = state.bots.find(b=>b.id===id);
    if(!p) return;
    const div = document.createElement('div');
    div.className='tile';
    div.innerHTML = `<img src="${p.photos[0]}"><div class="info">
      <div class="name">${p.name}, ${p.age}</div>
      <div class="row"><button class="btn btn-like" data-id="${p.id}">Curtir de volta</button></div>
    </div>`;
    wrap.appendChild(div);
  });
  $$('#likesList .btn-like').forEach(btn=>btn.onclick=()=>likeById(btn.dataset.id,true));
}

// ----------------- Ações -----------------
function pass(){
  if(state.queue.length===0) return;
  const p = state.queue.shift();
  state.passes.push(p.id);
  save(); renderDeck();
}
function like(){
  if(state.queue.length===0) return;
  if(!canLike()){
    const left = timeLeftToRefill();
    return requirePremium(`Limite de likes atingido (${state.monet.freeMaxLikesPerDay}/dia). Próximo recarregamento em ${left}.`);
  }
  consumeLike();
  const p = state.queue.shift();
  likeById(p.id, false);
}
function likeById(id, fromLikesList){
  if(!state.myLikes.includes(id)) state.myLikes.push(id);
  const likedMe = state.likesIncoming.includes(id);
  if(likedMe){
    state.matches.push({id, ts: Date.now()});
    state.likesIncoming = state.likesIncoming.filter(x=>x!==id);
    state.chats[id] = (state.chats[id]||[]);
    state.chats[id].push({from:'them', text:'Oi! 😄', ts:now()});
  }
  save();
  if(fromLikesList){ renderLikes(); renderMatches(); } else { renderDeck(); renderMatches(); }
}
function rewind(){
  const last = state.passes.pop() || state.myLikes.pop();
  if(!last) return;
  const prof = state.bots.find(p=>p.id===last);
  if(prof) state.queue.unshift(prof);
  save(); renderDeck();
}

function sendMessageTo(id, text){
  if(!state.chats[id]) state.chats[id]=[];
  state.chats[id].push({from:'me', text, ts:now()});
  consumeMessage();
  save();
}

// ----------------- Auto-like -----------------
function botsAutoLikeMe(){
  if(!state.me) return;
  const howMany = rand(30, 60);
  const shuffled = state.bots.slice().sort(()=>Math.random()-0.5).slice(0, howMany);
  state.likesIncoming = Array.from(new Set([...(state.likesIncoming||[]), ...shuffled.map(p=>p.id)]));
}

// ----------------- Upload/Galeria -----------------
$('#photoUpload')?.addEventListener('change',(e)=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = (ev)=>{ state.me.photos = state.me.photos||[]; state.me.photos.push(ev.target.result); save(); renderGallery(); };
  r.readAsDataURL(f);
});
function renderGallery(){
  const gal = $('#photoGallery'); if(!gal || !state.me) return;
  gal.innerHTML=''; (state.me.photos||[]).forEach(src=>{ const i=document.createElement('img'); i.src=src; gal.appendChild(i); });
}

// ----------------- Eventos UI -----------------
$('#btnStart').onclick = ()=>{
  if(!$('#agreeTos').checked){ alert('Você precisa confirmar que é maior de idade e concorda com a política.'); return; }
  state.me = { 
    name: $('#name').value || 'Eu',
    age: parseInt($('#age').value)||25,
    bio: $('#bio').value||'',
    gender: $('#gender').value,
    pref: $('#pref').value,
    photos: []
  };
  if(!state.bots || state.bots.length===0){ state.bots = generateBots(100); }
  botsAutoLikeMe();
  refillIfNeeded();
  save();
  show('#viewDiscover'); renderDeck(); renderMatches();
};

$('#navDiscover').onclick=()=>{ show('#viewDiscover'); renderDeck(); };
$('#navProfile').onclick=()=>{ renderGallery(); show('#viewProfile'); };
$('#navMatches').onclick=()=>{ show('#viewMatches'); renderMatches(); };

$('#btnFilters').onclick=()=>{ 
  $('#filterMinAge').value = state.filters.minAge;
  $('#filterMaxAge').value = state.filters.maxAge;
  $('#filterKm').value = state.filters.km;
  show('#viewFilters'); 
};
$('#btnPlans').onclick=()=>{ show('#viewPremium'); };
$('#btnLikesYou').onclick=()=>{ renderLikes(); show('#viewLikes'); };
$('#closeLikes') && ($('#closeLikes').onclick=()=>show('#viewDiscover'));

$('#btnApplyFilters').onclick=()=>{
  state.filters.minAge = parseInt($('#filterMinAge').value);
  state.filters.maxAge = parseInt($('#filterMaxAge').value);
  state.filters.km = parseInt($('#filterKm').value);
  save(); show('#viewDiscover'); renderDeck();
};
$('#btnCloseFilters').onclick=()=>show('#viewDiscover');
$('#btnClosePremium').onclick=()=>show('#viewDiscover');

// Planos (≤ R$20) - troque pelos links reais de pagamento
const planLinks = {
  mensal: 'https://pay.encontroja.example/premium?plan=mensal&price=9,90',
  trimestral: 'https://pay.encontroja.example/premium?plan=trimestral&price=14,90',
  anual: 'https://pay.encontroja.example/premium?plan=anual&price=19,90'
};
$('#planMensal') && ($('#planMensal').onclick=()=>window.open(planLinks.mensal, '_blank', 'noopener'));
$('#planTrimestral') && ($('#planTrimestral').onclick=()=>window.open(planLinks.trimestral, '_blank', 'noopener'));
$('#planAnual') && ($('#planAnual').onclick=()=>window.open(planLinks.anual, '_blank', 'noopener'));

// Ações principais
$('#btnLike') && ($('#btnLike').onclick=like);
$('#btnPass') && ($('#btnPass').onclick=pass);
$('#btnRewind') && ($('#btnRewind').onclick=rewind);

function init(){
  load();
  if(!state.bots || state.bots.length===0){ state.bots = generateBots(100); }
  refillIfNeeded();
  updateRangeBadges();
  if(state.me && (!state.likesIncoming || state.likesIncoming.length===0)){ botsAutoLikeMe(); }
  save();
  if(!state.me){ show('#viewAuth'); }
  else{ show('#viewDiscover'); renderDeck(); renderMatches(); renderGallery(); }
  ['filterMinAge','filterMaxAge','filterKm'].forEach(id=>{
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener('input', ()=>{
      if(id!=='filterKm'){
        $('#ageRange').textContent = `${$('#filterMinAge').value}-${$('#filterMaxAge').value}`;
      }else{
        $('#kmRange').textContent = `${$('#filterKm').value}km`;
      }
    });
  });
}
init();
