import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monster.collector',
  appName: 'Monstero - Lovci příšer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '924150763137-pd4i32nplr27ntgmp2vs4cht1cfiufpc.apps.googleusercontent.com',
      clientId: '924150763137-pd4i32nplr27ntgmp2vs4cht1cfiufpc.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
  }
};

export default config;
