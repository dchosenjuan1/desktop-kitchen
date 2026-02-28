import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "guia-completa-desktop-kitchen",
  title: "Complete Guide: Set Up Your POS with Desktop Kitchen in 15 Minutes",
  excerpt:
    "Step-by-step guide to set up Desktop Kitchen from scratch: create your account, build your menu, connect delivery platforms, activate the kitchen display, and customize your brand.",
  category: "guias",
  date: "2026-02-15",
  readTime: 8,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "We know technology can be intimidating, especially when you have been running your kitchen with paper tickets or an outdated system for years. That is why we designed Desktop Kitchen so you can set up your entire point of sale in less than 15 minutes, without needing a technician or advanced technical knowledge. This guide walks you through every step.",
    },
    {
      type: "heading",
      level: 2,
      text: "Step 1: Create Your Account",
      id: "crear-cuenta",
    },
    {
      type: "paragraph",
      text: "Go to pos.desktop.kitchen and click \"Sign Up.\" You only need your email address, your business name, and a password. In less than 30 seconds you will have access to your dashboard. We do not ask for a credit card to get started -- the free plan includes everything you need to operate a kitchen with up to 50 products on your menu.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Tip",
      text: "Use your business email, not a personal one. That way you can share access with your partner or manager later without complications.",
    },
    {
      type: "heading",
      level: 2,
      text: "Step 2: Set Up Your Menu",
      id: "configurar-menu",
    },
    {
      type: "paragraph",
      text: "Go to the \"Menu\" section in the side panel. Here you can create categories (Appetizers, Main Courses, Drinks, Desserts) and add each product with its name, price, description, and photo. We recommend uploading real photos of your dishes -- businesses with professional photos sell up to 30% more on delivery platforms.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Create your main categories (example: Tacos, Tortas, Drinks, Extras).",
        "Add each product with its name, price in MXN, and a short description.",
        "Upload one photo per product. If you do not have professional photos, a phone with good natural light works great.",
        "Mark the products you want to highlight as \"Popular\" so they appear first.",
      ],
    },
    {
      type: "heading",
      level: 3,
      text: "Set Up Modifiers",
      id: "configurar-modificadores",
    },
    {
      type: "paragraph",
      text: "Modifiers are the extra options your customers can choose: protein type, spice level, additional ingredients, etc. In Desktop Kitchen, you can create modifier groups and assign them to the products they apply to. For example, a \"Protein\" group with options like Chicken ($0), Beef (+$15), Shrimp (+$25) can be linked to all your tacos and tortas with a single click.",
    },
    {
      type: "callout",
      variant: "info",
      title: "Reusable groups",
      text: "You do not need to create modifiers product by product. Create the group once and assign it to all the products that need it. If you change the price of a modifier, it updates across all products automatically.",
    },
    {
      type: "heading",
      level: 2,
      text: "Step 3: Add Your Team",
      id: "agregar-equipo",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen uses a PIN system so your employees can log in quickly. Go to \"Employees\" and create a profile for each person with their name and role: cashier, kitchen, bar, or manager. Each role has different permissions -- a cashier can take orders and process payments, but cannot modify the menu or view financial reports. The system automatically generates a 4-digit PIN for each employee.",
    },
    {
      type: "heading",
      level: 2,
      text: "Step 4: Connect Your Delivery Platforms",
      id: "conectar-delivery",
    },
    {
      type: "paragraph",
      text: "If you sell through Rappi, Uber Eats, or DiDi Food, you can integrate the orders directly into Desktop Kitchen. Orders from all platforms arrive on a single kitchen display, eliminating the need to have multiple tablets open. Additionally, you can set up per-platform markup rules -- for example, raise prices 20% on Uber Eats to absorb the commission without sacrificing your margin.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Important",
      text: "Each platform has its own integration process. We recommend having your RFC (tax ID), updated menu, and bank details ready before starting the connection process.",
    },
    {
      type: "heading",
      level: 2,
      text: "Step 5: Activate the Kitchen Display",
      id: "pantalla-cocina",
    },
    {
      type: "paragraph",
      text: "The kitchen display (KDS) is where your prep team sees orders in real time. You just need a tablet or monitor connected to the internet. Orders appear automatically organized by priority, and your team can mark each one as \"preparing\" or \"ready\" with a single tap. If you operate multiple virtual brands, orders are labeled with the brand name to avoid confusion.",
    },
    {
      type: "heading",
      level: 2,
      text: "Step 6: Customize Your Brand",
      id: "personalizar-marca",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen is 100% white-label -- that means you can customize it with your business colors and logo. Go to \"Settings > Brand\" and upload your logo, select your primary color and accent color. The entire system -- from the POS screen to receipts -- automatically adapts to your visual identity. Your customers will never see the Desktop Kitchen brand; only yours.",
    },
    {
      type: "stats",
      items: [
        { value: "15 min", label: "Average initial setup time" },
        { value: "50+", label: "Products included in the free plan" },
        { value: "3", label: "Delivery platforms you can integrate" },
        { value: "100%", label: "White-label -- your brand, your colors" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "What Comes Next?",
      id: "siguientes-pasos",
    },
    {
      type: "paragraph",
      text: "Once you have your POS set up, explore the advanced features: real-time sales reports, inventory management with low-stock alerts, a loyalty program with digital stamp cards and automated SMS, and artificial intelligence that analyzes your sales to suggest combos and detect waste. All of this is included and ready to activate whenever you need it.",
    },
    {
      type: "cta",
      title: "Set Up Your POS in 15 Minutes",
      text: "Create your free account and start receiving orders today. No credit card, no contracts, no hassle.",
      buttonText: "Create free account",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["que-es-ghost-kitchen", "pantalla-cocina-eficiente", "ia-en-la-cocina"],
};
