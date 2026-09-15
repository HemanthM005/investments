import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.investments.app',
  appName: 'InvestmentApp',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Documents',
      iosEncryption: false,
      androidEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
