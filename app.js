// EncontroJá - app com perfis fake e auto-like
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

let state = {
  me: null,
  subscription: 'free',
  filters: { minAge: 18, maxAge: 60, km: 100, online: false, countryOnly: false, religion: '', sign: '', body: '' },
  bots: [],
  queue: [],
  likesIncoming: [],      // ids de bots que me curtiram
  myLikes: [],            // ids que eu curti
  passes: [],             // ids que passei
  matches: []             // {id, ts}
};

const KEY = 'ej_pwa_final_v2';
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function load(){ const raw = localStorage.getItem(KEY); if(raw){ try{ Object.assign(state, JSON.parse(raw)); }catch(e){} } }

function show(id){
  ['#viewAuth','#viewDiscover','#viewProfile','#viewFilters','#viewPremium','#viewLikes','#viewMatches'].forEach(v=>{
    const el = document.querySelector(v); if(el) el.classList.add('hidden');
  });
  document.querySelector(id).classList.remove('hidden');
}

// ----------------- Perfis fake -----------------
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function sample(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function generateBots(n=100){
  const namesM = ["Lucas","Mateus","Gustavo","Felipe","João","Pedro","Bruno","Rafael","Thiago","Henrique","Cauã","Diego","Leandro","Daniel","Vitor","André","Eduardo","Leo","Marcelo","Rodrigo"];
  const namesF = ["Ana","Julia","Mariana","Beatriz","Camila","Larissa","Carolina","Fernanda","Patrícia","Natália","Luana","Isabela","Bianca","Aline","Letícia","Bruna","Carla","Amanda","Gabriela","Renata"];
  const bios = ["Amo praia e trilhas","Café, livros e bons papos","Cozinho bem e rio fácil","Fotografia e filmes antigos","Mundo gamer e séries","Crossfit e viagens","Música ao vivo sempre","Pet lover assumido(a)","Empreendedor(a) curioso(a)","Arte, museus e vinho"];
  const religions = ["Cristão","Ateu","Espírita","Católico","Evangélico","Outros"];
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
    const religion = sample(religions);
    const sign = sample(signs);
    const body = sample(bodies);
    const id = 'b'+(1000+i);
    // Imagens únicas via picsum com seed estável
    const img = `https://picsum.photos/seed/ej${i}/640/480`;
    arr.push({ id, gender, name, age, km, online, bio, religion, sign, body, photos:[img] });
  }
  return arr;
}

// ----------------- Renderização -----------------
function updateRangeBadges(){
  $('#ageRange').textContent = `${state.filters.minAge}-${state.filters.maxAge}`;
  $('#kmRange').textContent = `${state.filters.km}km`;
}

function buildQueue(){
  if(!state.me){ state.queue=[]; return; }
  let pref = state.me.pref || 'A';
  const minA = state.filters.minAge, maxA = state.filters.maxAge;
  state.queue = state.bots.filter(p=>{
    if(state.passes.includes(p.id) || state.myLikes.includes(p.id) || state.matches.find(m=>m.id===p.id)) return false;
    if(pref!=='A' && p.gender!==pref) return false;
    if(p.age<minA || p.age>maxA) return false;
    if(p.km>state.filters.km) return false;
    if(state.filters.online && !p.online) return false;
    if(state.filters.religion && p.religion!==state.filters.religion) return false;
    if(state.filters.sign && p.sign!==state.filters.sign) return false;
    if(state.filters.body && p.body!==state.filters.body) return false;
    return true;
  });
}

function renderDeck(){
  const deck = $('#profiles');
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

function renderLikes(){
  const wrap = $('#likesList');
  wrap.innerHTML = '';
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

function renderMatches(){
  const box = $('#matchesList');
  box.innerHTML='';
  if(state.matches.length===0){ box.innerHTML='<div class="card">Você ainda não tem matches. Dê alguns likes!</div>'; return; }
  state.matches.forEach(m=>{
    const p = state.bots.find(b=>b.id===m.id);
    if(!p) return;
    const div = document.createElement('div');
    div.className='tile';
    div.innerHTML = `<img src="${p.photos[0]}"><div class="info">
      <div class="name">${p.name} • Match!</div>
      <div>Conversem com respeito. 💬</div>
    </div>`;
    box.appendChild(div);
  });
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
  const p = state.queue.shift();
  likeById(p.id, false);
}
function likeById(id, fromLikesList){
  if(!state.myLikes.includes(id)) state.myLikes.push(id);
  // Se o bot já curtiu você, vira match
  const likedMe = state.likesIncoming.includes(id);
  if(likedMe){
    state.matches.push({id, ts: Date.now()});
    // remove dos likes incoming
    state.likesIncoming = state.likesIncoming.filter(x=>x!==id);
  }
  save();
  if(fromLikesList){ renderLikes(); renderMatches(); } else { renderDeck(); renderMatches(); }
}
function rewind(){
  // Simples: remove último pass/like e re-insere no topo
  const last = state.passes.pop() || state.myLikes.pop();
  if(!last) return;
  const prof = state.bots.find(p=>p.id===last);
  if(prof) state.queue.unshift(prof);
  save(); renderDeck();
}

// ----------------- Auto-like de bots -----------------
function botsAutoLikeMe(){
  if(!state.me) return;
  // aproximadamente 30-60 bots curtem o novo usuário imediatamente
  const howMany = rand(30, 60);
  const candidates = state.bots.filter(p=>{
    if(state.me.pref==='M' && p.gender!=='M') return false;
    if(state.me.pref==='F' && p.gender!=='F') return false;
    // compatibilidade de idade simples
    return p.age >= state.filters.minAge && p.age <= state.filters.maxAge;
  });
  const shuffled = candidates.sort(()=>Math.random()-0.5).slice(0, howMany);
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
  // primeira vez? gerar bots
  if(!state.bots || state.bots.length===0){ state.bots = generateBots(100); }
  botsAutoLikeMe();
  save();
  show('#viewDiscover'); renderDeck(); renderMatches();
};

$('#navDiscover').onclick=()=>{ show('#viewDiscover'); renderDeck(); };
$('#navProfile').onclick=()=>{ renderGallery(); show('#viewProfile'); };
$('#navMatches').onclick=()=>{ show('#viewMatches'); renderMatches(); };

$('#btnFilters').onclick=()=>{ // popular sliders com valores atuais
  $('#filterMinAge').value = state.filters.minAge;
  $('#filterMaxAge').value = state.filters.maxAge;
  $('#filterKm').value = state.filters.km;
  $('#filterOnline').checked = !!state.filters.online;
  $('#filterCountry').checked = !!state.filters.countryOnly;
  $('#filterReligion').value = state.filters.religion||'';
  $('#filterSign').value = state.filters.sign||'';
  $('#filterBody').value = state.filters.body||'';
  show('#viewFilters');
};
$('#btnApplyFilters').onclick=()=>{
  state.filters.minAge = parseInt($('#filterMinAge').value);
  state.filters.maxAge = parseInt($('#filterMaxAge').value);
  state.filters.km = parseInt($('#filterKm').value);
  state.filters.online = $('#filterOnline').checked;
  state.filters.countryOnly = $('#filterCountry').checked;
  state.filters.religion = $('#filterReligion').value;
  state.filters.sign = $('#filterSign').value;
  state.filters.body = $('#filterBody').value;
  save(); show('#viewDiscover'); renderDeck();
};
$('#btnCloseFilters').onclick=()=>show('#viewDiscover');
$('#btnClosePremium').onclick=()=>show('#viewDiscover');
$('#btnPlans').onclick=()=>show('#viewPremium');
$('#btnLikesYou').onclick=()=>{ renderLikes(); show('#viewLikes'); };
$('#closeLikes').onclick=()=>show('#viewDiscover');

$('#btnLike').onclick=like;
$('#btnPass').onclick=pass;
$('#btnRewind').onclick=rewind;

function init(){
  load();
  if(!state.bots || state.bots.length===0){ state.bots = generateBots(100); }
  // primeiro load: se já tiver usuário, garante likes de bots pelo menos uma vez
  if(state.me && (!state.likesIncoming || state.likesIncoming.length===0)){
    botsAutoLikeMe();
  }
  save();
  if(!state.me){ show('#viewAuth'); }
  else{ show('#viewDiscover'); renderDeck(); renderMatches(); renderGallery(); }
  // badge premium
  if(state.subscription==='premium'){ $('#planBadge').classList.remove('hidden'); }
  // listeners adicionais
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
