// EncontroJá - v8.1: Perfis fake + Auto-like + Monetização + ativação ?paid=1
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

let state = {
  me: null,
  subscription: 'free',
  filters: { minAge: 18, maxAge: 60, km: 100 },
  bots: [], queue: [], likesIncoming: [], myLikes: [], passes: [], matches: [], chats: {},
  monet: { freeMaxLikesPerDay: 20, freeMaxMsgsPerDay: 10, cooldownHours: 12, dayLikesUsed: 0, dayMsgsUsed: 0, lastRefillAt: 0, nextRefillAt: 0 }
};

const KEY = 'ej_pwa_monet_v8_1';
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function load(){ const raw = localStorage.getItem(KEY); if(raw){ try{ Object.assign(state, JSON.parse(raw)); }catch(e){} } }
function now(){ return Date.now(); }
function show(id){['#viewAuth','#viewDiscover','#viewProfile','#viewFilters','#viewPremium','#viewLikes','#viewMatches'].forEach(v=>{const el=document.querySelector(v);if(el)el.classList.add('hidden');}); const t=document.querySelector(id); if(t)t.classList.remove('hidden');}

// ---------- Helpers de bot/monetização (mesmo da v8) ----------
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function sample(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function generateBots(n=100){
  const namesM = ["Lucas","Mateus","Gustavo","Felipe","João","Pedro","Bruno","Rafael","Thiago","Henrique","Diego","Leandro","Daniel","Vitor"];
  const namesF = ["Ana","Julia","Mariana","Beatriz","Camila","Larissa","Carolina","Fernanda","Patrícia","Natália","Aline","Bruna","Carla","Amanda"];
  const bios = ["Amo praia e trilhas","Café, livros e bons papos","Cozinho bem e rio fácil","Fotografia e filmes antigos","Mundo gamer e séries","Crossfit e viagens","Música ao vivo sempre","Pet lover assumido(a)","Empreendedor(a) curioso(a)","Arte, museus e vinho"];
  const signs = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
  const bodies = ["Magro","Normal","Atlético","Forte"];
  const arr=[]; for(let i=0;i<n;i++){const g=Math.random()<0.5?'M':'F'; const name=(g==='M'?sample(namesM):sample(namesF))+' '+['S.','A.','M.','P.','C.'][rand(0,4)]; const age=rand(19,55); const km=rand(1,120); const online=Math.random()<0.6; const id='b'+(1000+i); const img=`https://picsum.photos/seed/ej${i}/640/480`; arr.push({id,gender:g,name,age,km,online,bio:sample(bios),sign:sample(signs),body:sample(bodies),photos:[img]}); } return arr;
}
function refillIfNeeded(){ const m=state.monet; if(!m.nextRefillAt||m.nextRefillAt<Date.now()){ m.dayLikesUsed=0; m.dayMsgsUsed=0; m.lastRefillAt=Date.now(); m.nextRefillAt=Date.now()+m.cooldownHours*3600000; save(); } }
function requirePremium(message){ alert(message+'\n\nAssine o Premium para liberar.'); show('#viewPremium'); }
function canLike(){ if(state.subscription==='premium')return true; refillIfNeeded(); return state.monet.dayLikesUsed<state.monet.freeMaxLikesPerDay; }
function consumeLike(){ if(state.subscription==='premium')return; state.monet.dayLikesUsed++; save(); }
function canSendMessage(){ if(state.subscription==='premium')return true; refillIfNeeded(); return state.monet.dayMsgsUsed<state.monet.freeMaxMsgsPerDay; }
function consumeMessage(){ if(state.subscription==='premium')return; state.monet.dayMsgsUsed++; save(); }
function timeLeftToRefill(){ const ms=Math.max(0,state.monet.nextRefillAt-Date.now()); const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000); return `${h}h ${m}m`; }

function updateRangeBadges(){ $('#ageRange')&&($('#ageRange').textContent=`${state.filters.minAge}-${state.filters.maxAge}`); $('#kmRange')&&($('#kmRange').textContent=`${state.filters.km}km`); const badge=$('#planBadge'); if(badge){ state.subscription==='premium'?badge.classList.remove('hidden'):badge.classList.add('hidden'); } const likesBtn=$('#btnLikesYou'); if(likesBtn){ likesBtn.textContent=state.subscription==='premium'?'Quem curtiu você':'Quem curtiu (Premium)'; } }
function buildQueue(){ if(!state.me){state.queue=[];return;} let pref=state.me.pref||'A'; state.queue=state.bots.filter(p=>{ if(state.passes.includes(p.id)||state.myLikes.includes(p.id)||state.matches.find(m=>m.id===p.id))return false; if(pref!=='A'&&p.gender!==pref)return false; if(p.age<state.filters.minAge||p.age>state.filters.maxAge)return false; if(p.km>state.filters.km)return false; return true; }); }
function renderDeck(){ const deck=$('#profiles'); if(!deck)return; deck.innerHTML=''; updateRangeBadges(); buildQueue(); if(state.queue.length===0){ deck.innerHTML=`<div class="card">Sem mais perfis nestes filtros. Tente ampliar a idade/raio.</div>`; return; } const p=state.queue[0]; const el=document.createElement('div'); el.className='card-profile'; el.innerHTML=`<img src="${p.photos[0]}" alt="${p.name}"><div class="meta"><h3>${p.name}, ${p.age}</h3><div class="row"><span class="pill">${p.km} km</span><span class="pill">${p.online?'Online':'Offline'}</span><span class="pill">${p.sign}</span></div><div>${p.bio}</div></div>`; deck.appendChild(el); }
function renderMatches(){ const box=$('#matchesList'); if(!box)return; box.innerHTML=''; if(state.matches.length===0){ box.innerHTML='<div class="card">Você ainda não tem matches.</div>'; return; } state.matches.forEach(m=>{ const p=state.bots.find(b=>b.id===m.id); if(!p)return; const chat=state.chats[m.id]||[]; const last=chat[chat.length-1]; const lastText= last ? (last.from==='me'?'Você: ':'Ela/Ele: ')+last.text : 'Diga oi!'; const div=document.createElement('div'); div.className='card'; div.innerHTML=`<div class="row" style="align-items:center;gap:12px"><img src="${p.photos[0]}" style="width:60px;height:60px;object-fit:cover;border-radius:12px"><div style="flex:1"><div style="font-weight:700">${p.name}</div><div style="opacity:.8;font-size:12px">${lastText}</div></div></div><div class="row" style="margin-top:8px"><input id="msg_${p.id}" placeholder="Enviar mensagem..." /><button class="btn" data-id="${p.id}" data-name="${p.name}">Enviar</button></div>`; box.appendChild(div); }); $$('#matchesList .btn').forEach(btn=>{ btn.onclick=()=>{ const id=btn.dataset.id; const input=document.getElementById('msg_'+id); const txt=(input?.value||'').trim(); if(!txt)return; if(!canSendMessage()){ const left=timeLeftToRefill(); return requirePremium(`Limite de mensagens atingido (${state.monet.freeMaxMsgsPerDay}/dia). Próximo recarregamento em ${left}.`); } sendMessageTo(id, txt); input.value=''; renderMatches(); }; }); }
function renderLikes(){ const wrap=$('#likesList'); if(!wrap)return; wrap.innerHTML=''; if(state.subscription!=='premium'){ wrap.innerHTML=`<div class="card"><b>Recurso Premium</b><br/>Veja quem curtiu você e dê like de volta instantaneamente.<div class="row" style="margin-top:8px"><button class="btn" id="upsellLikes">Assinar Premium</button></div></div>`; $('#upsellLikes').onclick=()=>show('#viewPremium'); return; } if(state.likesIncoming.length===0){ wrap.innerHTML='<div class="card">Ninguém curtiu você ainda. Faça um Boost! 🚀</div>'; return; } state.likesIncoming.forEach(id=>{ const p=state.bots.find(b=>b.id===id); if(!p)return; const div=document.createElement('div'); div.className='tile'; div.innerHTML=`<img src="${p.photos[0]}"><div class="info"><div class="name">${p.name}, ${p.age}</div><div class="row"><button class="btn btn-like" data-id="${p.id}">Curtir de volta</button></div></div>`; wrap.appendChild(div); }); $$('#likesList .btn-like').forEach(btn=>btn.onclick=()=>likeById(btn.dataset.id,true)); }

function pass(){ if(state.queue.length===0)return; const p=state.queue.shift(); state.passes.push(p.id); save(); renderDeck(); }
function like(){ if(state.queue.length===0)return; if(!canLike()){ const left=timeLeftToRefill(); return requirePremium(`Limite de likes atingido (${state.monet.freeMaxLikesPerDay}/dia). Próximo recarregamento em ${left}.`);} consumeLike(); const p=state.queue.shift(); likeById(p.id,false); }
function likeById(id, fromLikesList){ if(!state.myLikes.includes(id)) state.myLikes.push(id); const likedMe=state.likesIncoming.includes(id); if(likedMe){ state.matches.push({id,ts:now()}); state.likesIncoming=state.likesIncoming.filter(x=>x!==id); state.chats[id]=(state.chats[id]||[]); state.chats[id].push({from:'them', text:'Oi! 😄', ts:now()}); } save(); if(fromLikesList){ renderLikes(); renderMatches(); } else { renderDeck(); renderMatches(); } }
function rewind(){ const last=state.passes.pop()||state.myLikes.pop(); if(!last)return; const prof=state.bots.find(p=>p.id===last); if(prof) state.queue.unshift(prof); save(); renderDeck(); }
function sendMessageTo(id,text){ if(!state.chats[id]) state.chats[id]=[]; state.chats[id].push({from:'me', text, ts:now()}); consumeMessage(); save(); }

function botsAutoLikeMe(){ if(!state.me)return; const howMany=rand(30,60); const shuffled=state.bots.slice().sort(()=>Math.random()-0.5).slice(0,howMany); state.likesIncoming=Array.from(new Set([...(state.likesIncoming||[]), ...shuffled.map(p=>p.id)])); }

$('#photoUpload')?.addEventListener('change',(e)=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=(ev)=>{ state.me.photos=state.me.photos||[]; state.me.photos.push(ev.target.result); save(); renderGallery(); }; r.readAsDataURL(f); });
function renderGallery(){ const gal=$('#photoGallery'); if(!gal||!state.me)return; gal.innerHTML=''; (state.me.photos||[]).forEach(src=>{ const i=document.createElement('img'); i.src=src; gal.appendChild(i); }); }

$('#btnStart').onclick=()=>{ if(!$('#agreeTos').checked){ alert('Você precisa confirmar que é maior de idade e concorda com a política.'); return; } state.me={ name:$('#name').value||'Eu', age:parseInt($('#age').value)||25, bio:$('#bio').value||'', gender:$('#gender').value, pref:$('#pref').value, photos:[] }; if(!state.bots||state.bots.length===0){ state.bots=generateBots(100); } botsAutoLikeMe(); refillIfNeeded(); save(); show('#viewDiscover'); renderDeck(); renderMatches(); };
$('#navDiscover').onclick=()=>{ show('#viewDiscover'); renderDeck(); };
$('#navProfile').onclick=()=>{ renderGallery(); show('#viewProfile'); };
$('#navMatches').onclick=()=>{ show('#viewMatches'); renderMatches(); };

$('#btnFilters').onclick=()=>{ $('#filterMinAge').value=state.filters.minAge; $('#filterMaxAge').value=state.filters.maxAge; $('#filterKm').value=state.filters.km; show('#viewFilters'); };
$('#btnLikesYou').onclick=()=>{ renderLikes(); show('#viewLikes'); };
$('#closeLikes') && ($('#closeLikes').onclick=()=>show('#viewDiscover'));
$('#btnApplyFilters').onclick=()=>{ state.filters.minAge=parseInt($('#filterMinAge').value); state.filters.maxAge=parseInt($('#filterMaxAge').value); state.filters.km=parseInt($('#filterKm').value); save(); show('#viewDiscover'); renderDeck(); };
$('#btnCloseFilters').onclick=()=>show('#viewDiscover');
$('#btnPlans').onclick=()=>show('#viewPremium');
$('#btnClosePremium').onclick=()=>show('#viewDiscover');

// Planos (≤ R$20) - TROQUE PELOS LINKS REAIS. Os placeholders não funcionam e darão erro de DNS.
const planLinks = {
  mensal: 'https://seu-link-de-pagamento/mensal?price=9,90',
  trimestral: 'https://seu-link-de-pagamento/trimestral?price=14,90',
  anual: 'https://seu-link-de-pagamento/anual?price=19,90'
};
$('#planMensal') && ($('#planMensal').onclick=()=>window.open(planLinks.mensal,'_blank','noopener'));
$('#planTrimestral') && ($('#planTrimestral').onclick=()=>window.open(planLinks.trimestral,'_blank','noopener'));
$('#planAnual') && ($('#planAnual').onclick=()=>window.open(planLinks.anual,'_blank','noopener'));

// Ativação automática de Premium via ?paid=1 (para testes com provedores que redirecionam)
function activatePremiumIfPaidParam(){
  const params = new URLSearchParams(location.search);
  if(params.get('paid')==='1'){
    state.subscription='premium';
    save();
    alert('Pagamento confirmado! Premium ativado.');
    // limpa o parâmetro da URL para não repetir a ativação
    const url = new URL(location.href);
    url.searchParams.delete('paid');
    history.replaceState({}, '', url.toString());
    show('#viewDiscover');
    renderDeck();
  }
}

// Botões principais
$('#btnLike') && ($('#btnLike').onclick=like);
$('#btnPass') && ($('#btnPass').onclick=pass);
$('#btnRewind') && ($('#btnRewind').onclick=rewind);

// Init
function init(){
  load();
  if(!state.bots||state.bots.length===0){ state.bots=generateBots(100); }
  refillIfNeeded(); updateRangeBadges();
  if(state.me && (!state.likesIncoming||state.likesIncoming.length===0)){ botsAutoLikeMe(); }
  save();
  if(!state.me){ show('#viewAuth'); } else { show('#viewDiscover'); renderDeck(); renderMatches(); renderGallery(); }
  ['filterMinAge','filterMaxAge','filterKm'].forEach(id=>{ const el=document.getElementById(id); if(!el)return; el.addEventListener('input', ()=>{ if(id!=='filterKm'){ $('#ageRange').textContent=`${$('#filterMinAge').value}-${$('#filterMaxAge').value}`; } else { $('#kmRange').textContent=`${$('#filterKm').value}km`; } }); });
  // ativa premium se vier ?paid=1
  activatePremiumIfPaidParam();
}
init();


// ===== Hooks Premium/Configurações =====
window.__setPremium = (on)=>{
  try{
    state.subscription = on ? 'premium' : 'free';
    save();
    const badge = document.getElementById('planBadge');
    if(badge){ on ? badge.classList.remove('hidden') : badge.classList.add('hidden'); }
  }catch(e){}
};

const navSettings = document.getElementById('navSettings');
if(navSettings){ navSettings.onclick = ()=> show('#viewSettings'); }
const btnCloseSettings = document.getElementById('btnCloseSettings');
if(btnCloseSettings){ btnCloseSettings.onclick = ()=> show('#viewDiscover'); }

const btnDeleteAccount = document.getElementById('btnDeleteAccount');
if(btnDeleteAccount){
  btnDeleteAccount.onclick = async ()=>{
    if(!confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível.')) return;
    try{
      // Se tiver backend, chame aqui:
      // await fetch(DELETE_ACCOUNT_ENDPOINT, { method:'DELETE', credentials:'include' });
    }catch(e){ console.log('delete API error (ignorado no cliente)', e); }
    // Limpa dados locais
    localStorage.clear();
    alert('Conta excluída e dados locais apagados.');
    location.reload();
  };
}

// Modifica o botão Premium para chamar IAP nativa quando disponível
(function wirePremiumButtons(){
  const btnOne = document.getElementById('btnBuyPremium');
  if(btnOne){
    btnOne.onclick = async ()=>{
      if(typeof purchasePlan === 'function' && window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()!=='web'){
        await purchasePlan('mensal'); // escolha padrão
      }else{
        // Web: aqui você pode abrir o checkout externo
        alert('No app: será usada a compra in-app. No web, configure seu checkout externo.');
      }
    };
  }
  const bMensal = document.getElementById('planMensal');
  const bTri = document.getElementById('planTrimestral');
  const bAnual = document.getElementById('planAnual');
  if(bMensal){ bMensal.onclick = ()=> purchasePlan && purchasePlan('mensal'); }
  if(bTri){ bTri.onclick = ()=> purchasePlan && purchasePlan('trimestral'); }
  if(bAnual){ bAnual.onclick = ()=> purchasePlan && purchasePlan('anual'); }
})();
