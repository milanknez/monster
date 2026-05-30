import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.NODE_ENV === 'production' || process.env.CI === 'true';

const googleClientId = isProd
  ? '377425376218-0q87uddfld0hu98h9nt1mll67t7igfju.apps.googleusercontent.com'
  : '924150763137-pd4i32nplr27ntgmp2vs4cht1cfiufpc.apps.googleusercontent.com';

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
      serverClientId: googleClientId,
      clientId: googleClientId,
      forceCodeForRefreshToken: false,
    },
  }
};

export default config;
