/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/overview',
        'getting-started/system-requirements',
        'getting-started/onboarding',
        'getting-started/first-order',
      ],
    },
    {
      type: 'category',
      label: 'Feature Guides',
      items: [
        'feature-guides/pos-operations',
        'feature-guides/kitchen-display',
        'feature-guides/menu-management',
        'feature-guides/inventory-management',
        'feature-guides/delivery-setup',
        'feature-guides/delivery-intelligence',
        'feature-guides/loyalty-crm',
        'feature-guides/ai-features',
        'feature-guides/printer-setup',
        'feature-guides/employee-management',
        'feature-guides/reports',
      ],
    },
    {
      type: 'category',
      label: 'Admin / Owner Guide',
      items: [
        'admin-guide/billing',
        'admin-guide/branding',
        'admin-guide/multi-brand',
        'admin-guide/api-overview',
      ],
    },
  ],
};

export default sidebars;
