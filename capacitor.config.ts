import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juanbertos.pos',
  appName: 'Juanbertos POS',
  webDir: 'dist',
  server: {
    url: 'https://pos.juanbertos.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: 'mobile',
  },
};

export default config;
