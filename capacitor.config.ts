import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.encontroja.app',
  appName: 'EncontroJá',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    // Se quiser apontar para o domínio online, descomente a linha abaixo
    // url: 'https://app.encontroja.com',
    // cleartext: false
  }
};
export default config;
