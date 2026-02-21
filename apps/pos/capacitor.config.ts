import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juanbertos.pos',
  appName: 'Juanbertos POS',
  webDir: 'dist',
  // No server.url — app loads from local dist/ for offline support.
  // API calls go to pos.juanbertos.com via src/api/index.ts base URL detection.
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: 'mobile',
  },
};

export default config;
