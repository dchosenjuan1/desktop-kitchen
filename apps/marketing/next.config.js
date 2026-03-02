/** @type {import('next').NextConfig} */
module.exports = {
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    localeDetection: false,
    domains: [
      { domain: 'www.desktop.kitchen', defaultLocale: 'en' },
      { domain: 'es.desktop.kitchen', defaultLocale: 'es' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirect non-www to www for English
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'desktop.kitchen' }],
        destination: 'https://www.desktop.kitchen/:path*',
        permanent: true,
      },
    ];
  },
};
