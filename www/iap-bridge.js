
// iap-bridge.js – RevenueCat Capacitor helper
const isNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web';

async function initRevenueCat(){
  if(!isNative) return;
  try{
    const { Purchases } = window.Capacitor.Plugins;
    const RC_ANDROID_API_KEY = 'COLOQUE_SUA_RC_ANDROID_API_KEY';
    const RC_IOS_API_KEY = 'COLOQUE_SUA_RC_IOS_API_KEY';
    const platform = window.Capacitor.getPlatform();
    await Purchases.configure({ apiKey: platform==='android' ? RC_ANDROID_API_KEY : RC_IOS_API_KEY });
  }catch(e){ console.log('RC init error', e); }
}

async function purchasePlan(alias){
  if(!isNative){ console.log('não-nativo: ignorando purchasePlan'); return false; }
  try{
    const { Purchases } = window.Capacitor.Plugins;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const mapName = { mensal:'premium_mensal', trimestral:'premium_trimestral', anual:'premium_anual' };
    let chosen = null;
    if(current && current.availablePackages && current.availablePackages.length){
      chosen = current.availablePackages.find(p => p.product && p.product.identifier === mapName[alias]) || current.availablePackages[0];
    }
    if(!chosen){ alert('Plano indisponível. Tente novamente.'); return false; }
    const result = await Purchases.purchasePackage({ aPackage: chosen });
    // Ativa flag local – o backend/RevenueCat é a fonte de verdade
    if(result){ window.__setPremium && window.__setPremium(true); }
    alert('Premium ativado!');
    return true;
  }catch(e){
    console.log('Compra cancelada/erro', e);
    return false;
  }
}

initRevenueCat();
