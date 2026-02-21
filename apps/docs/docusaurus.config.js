// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Desktop Kitchen Docs',
  tagline: 'Multi-tenant restaurant POS platform documentation',
  favicon: 'img/favicon.ico',

  url: 'https://docs.desktop.kitchen',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

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
            ],
          },
          {
            title: 'Product',
            items: [
              { label: 'Website', href: 'https://desktop.kitchen' },
              { label: 'POS App', href: 'https://pos.desktop.kitchen' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Desktop Kitchen. Built with Docusaurus.`,
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),
};

export default config;
