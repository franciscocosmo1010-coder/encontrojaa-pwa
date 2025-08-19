
# EncontroJá – Apps Android & iOS (Capacitor)
Pronto para subir na Google Play e App Store com **assinaturas** via **RevenueCat** e tela de **Exclusão de Conta**.

## 1) Instalar
```bash
npm i -g @capacitor/cli
npm install
npm run add:android
npm run add:ios
npm run sync
```

## 2) Configurar IAP (RevenueCat)
- Crie um projeto no RevenueCat e conecte **Google Play** e **App Store Connect**.
- Crie **assinaturas** nas lojas com os IDs:
  - `premium_mensal`
  - `premium_trimestral`
  - `premium_anual`
- Em RevenueCat: crie um **Offering** (ex.: `default`) com 3 pacotes que apontam para esses IDs.
- Em `www/iap-bridge.js` troque as chaves:
  - `RC_ANDROID_API_KEY` e `RC_IOS_API_KEY`

## 3) Onde chamar a compra
- Em `www/app.js`, os botões de plano devem chamar `purchasePlan('mensal'|'trimestral'|'anual')` **quando nativo**.
- No web, continuam usando checkout externo (se quiser).

## 4) Exclusão de conta
- A tela está em **Configurações → Excluir conta** (client-side wipe + link de suporte).
- Se tiver backend, aponte o `DELETE_ACCOUNT_ENDPOINT` em `www/app.js` para efetivar no servidor.

## 5) Build
- **Android**: `npm run android` (Android Studio) → gerar **AAB** (release).
- **iOS**: `npm run ios` (Xcode) → Archive → Distribute → TestFlight.

## 6) Lojas (checklist)
- 18+, moderação, bloquear/denunciar, Política de Privacidade e Exclusão de Conta em **Configurações**.
- Em lojas, **use IAP**. Não use link externo para vender Premium.
