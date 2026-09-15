import type { CapacitorConfig } from '@capacitor/cli';

const isDevServer = process.env.CAPACITOR_ANDROID_STUDIO_VERSION !== undefined ||
                   process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.investments.app',
  appName: 'InvestmentApp',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    // For development: connect to localhost:3000
    // For production: use the webDir
    ...(isDevServer && {
      url: 'http://192.168.1.X:3000',  // Replace X with your machine's IP
      cleartext: true
    }),
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
