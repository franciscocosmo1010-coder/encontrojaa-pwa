const $=(q)=>document.querySelector(q);
let state={me:null,subscription:'free',filters:{minAge:18,maxAge:60,km:100}};
const KEY='ej_pwa_final';function save(){localStorage.setItem(KEY,JSON.stringify(state));}function load(){const raw=localStorage.getItem(KEY);if(raw)Object.assign(state,JSON.parse(raw));}
function show(id){['#viewAuth','#viewDiscover','#viewProfile','#viewFilters','#viewPremium'].forEach(v=>document.querySelector(v).classList.add('hidden'));document.querySelector(id).classList.remove('hidden');}

$('#btnStart').onclick=()=>{state.me={name:$('#name').value,age:$('#age').value,bio:$('#bio').value,gender:$('#gender').value,pref:$('#pref').value,photos:[]};save();show('#viewDiscover');};
$('#navDiscover').onclick=()=>show('#viewDiscover');$('#navProfile').onclick=()=>{renderGallery();show('#viewProfile');};$('#btnFilters').onclick=()=>show('#viewFilters');$('#btnPlans').onclick=()=>show('#viewPremium');

$('#btnApplyFilters').onclick=()=>{state.filters.minAge=parseInt($('#filterMinAge').value);state.filters.maxAge=parseInt($('#filterMaxAge').value);state.filters.km=parseInt($('#filterKm').value);save();show('#viewDiscover');};
$('#btnCloseFilters').onclick=()=>show('#viewDiscover');
$('#btnClosePremium').onclick=()=>show('#viewDiscover');$('#btnBuyPremium').onclick=()=>{state.subscription='premium';save();alert('Premium ativo!');show('#viewDiscover');};

$('#photoUpload').onchange=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{state.me.photos.push(ev.target.result);save();renderGallery();};r.readAsDataURL(f);};
function renderGallery(){const gal=$('#photoGallery');gal.innerHTML='';(state.me.photos||[]).forEach(s=>{const i=document.createElement('img');i.src=s;gal.appendChild(i);});}

function init(){load();if(!state.me)show('#viewAuth');else show('#viewDiscover');}init();
