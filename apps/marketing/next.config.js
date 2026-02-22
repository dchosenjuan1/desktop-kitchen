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
};
