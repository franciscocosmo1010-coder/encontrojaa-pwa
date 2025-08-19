# EncontroJá — Empacotar PWA com Capacitor

## Pré-requisitos
- Node 18+ e NPM
- Java / Android Studio (Android)
- Xcode (macOS) para iOS

## Passos
1. Entre na pasta `capacitor`:
   ```bash
   cd capacitor
   npm install
   ```
2. Copie os arquivos do PWA para `www/` e adicione as plataformas:
   ```bash
   npm run build
   npm run cap:add:android
   npm run cap:add:ios   # opcional, apenas em macOS
   ```
3. Sincronize e abra o projeto nativo:
   ```bash
   npm run cap:copy
   npm run cap:open:android
   npm run cap:open:ios
   ```

> Dica: Se preferir servir do seu domínio, edite `capacitor.config.ts`:
>
> ```ts
> // server: { url: 'https://SEU-DOMINIO', cleartext: true }
> ```
