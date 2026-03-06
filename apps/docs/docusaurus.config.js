// @ts-check

import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Desktop Kitchen Docs',
  tagline: 'Multi-tenant restaurant POS platform documentation',
  favicon: 'img/favicon.ico',

  url: 'https://docs.desktop.kitchen',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    },
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Desktop Kitchen Docs',
        logo: {
          alt: 'Desktop Kitchen Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://pos.desktop.kitchen',
            label: 'Open POS',
            position: 'right',
            className: 'navbar__item--pos',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Getting Started', to: '/getting-started/overview' },
              { label: 'Feature Guides', to: '/feature-guides/pos-operations' },
              { label: 'Admin Guide', to: '/admin-guide/billing' },
              { label: 'Tenant Management', to: '/admin-guide/tenant-management' },
            ],
          },
          {
            title: 'Product',
            items: [
              { label: 'Website', href: 'https://www.desktop.kitchen' },
              { label: 'POS App', href: 'https://pos.desktop.kitchen' },
            ],
          },
          {
            title: 'Legal',
            items: [
              { label: 'Privacy Policy', to: '/privacy-policy' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Desktop Kitchen`,
      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      prism: {
        theme: prismThemes.vsDark,
      },
    }),
};

export default config;
