import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "comisiones-rappi-uber-didi",
  title: "How Much Do Rappi, Uber Eats, and DiDi Charge? 2026 Commission Guide",
  excerpt:
    "Complete breakdown of the commissions charged by Rappi, Uber Eats, and DiDi Food in Mexico, strategies to negotiate better rates, and how to protect your margins with smart markup.",
  category: "delivery",
  date: "2026-02-18",
  readTime: 10,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "If you sell food through delivery in Mexico, platform commissions are your second-largest cost after ingredients. And yet, most operators do not know exactly how much they are paying or how the commission is structured. In this guide, we break down what Rappi, Uber Eats, and DiDi Food charge in 2026, share real strategies to negotiate better rates, and show you how to calculate your true profitability per order.",
    },
    {
      type: "heading",
      level: 2,
      text: "How Do Delivery Commissions Work?",
      id: "como-funcionan-comisiones",
    },
    {
      type: "paragraph",
      text: "All platforms charge a percentage of each order's value before taxes. This percentage varies based on the plan you choose (basic vs. premium), your sales volume, your business category, and whether you agree to participate in the platform's promotions. Additionally, some platforms charge extra fees for services like featured placement, professional photos, or in-app marketing.",
    },
    {
      type: "heading",
      level: 2,
      text: "Rappi: Commission Structure",
      id: "comisiones-rappi",
    },
    {
      type: "stats",
      items: [
        { value: "15--30%", label: "Commission range per order" },
        { value: "25%", label: "Average commission for new restaurants" },
        { value: "~7 days", label: "Average deposit time" },
        { value: "3.5%", label: "Additional commission for card payments" },
      ],
    },
    {
      type: "paragraph",
      text: "Rappi offers three partnership tiers in Mexico. The basic plan charges around 15% commission, but gives you minimal visibility in the app -- you basically appear at the bottom of lists. The mid-tier plan runs around 22-25% and includes better placement and access to Rappi Turbo. The premium plan goes up to 30% but places you in the top positions in search results and categories. For new restaurants, Rappi generally offers the mid-tier plan as standard.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Negotiating with Rappi",
      text: "If you handle more than 300 monthly orders, you have negotiating power. Contact your account manager and request a rate review. Many operators have managed to lower their rate by 2 to 5 percentage points by presenting volume data and average ticket size.",
    },
    {
      type: "heading",
      level: 2,
      text: "Uber Eats: Commission Structure",
      id: "comisiones-uber-eats",
    },
    {
      type: "stats",
      items: [
        { value: "15--30%", label: "Commission range per order" },
        { value: "30%", label: "Standard commission with Uber delivery" },
        { value: "15%", label: "Commission for pickup (customer collects)" },
        { value: "Weekly", label: "Deposit frequency" },
      ],
    },
    {
      type: "paragraph",
      text: "Uber Eats has a relatively simple structure. If you use their delivery drivers, the standard commission is 30%. If the customer picks up the order at your location (pickup), it drops to 15%. Uber also offers a \"Lite\" plan in some cities with a reduced commission (~20%) but without access to promotions or premium placement. One advantage of Uber Eats is that their deposits tend to be more frequent and predictable than Rappi's.",
    },
    {
      type: "heading",
      level: 2,
      text: "DiDi Food: Commission Structure",
      id: "comisiones-didi-food",
    },
    {
      type: "stats",
      items: [
        { value: "15--25%", label: "Commission range per order" },
        { value: "22%", label: "Average commission in major cities" },
        { value: "Weekly", label: "Deposit frequency" },
        { value: "Lower", label: "In-app competition vs. Rappi/Uber" },
      ],
    },
    {
      type: "paragraph",
      text: "DiDi Food entered the Mexican market with aggressively low commissions to gain market share, and while they have gradually increased, they remain competitive. The average commission is around 22% for restaurants with delivery included. DiDi Food has lower penetration than Rappi and Uber Eats, which means fewer orders but also less competition within the app -- your restaurant gets more organic visibility.",
    },
    {
      type: "heading",
      level: 2,
      text: "Direct Comparison: Which One Is Best for You?",
      id: "comparacion-plataformas",
    },
    {
      type: "paragraph",
      text: "The honest answer is: it depends on your area, your volume, and your type of food. In Mexico City, Rappi dominates in neighborhoods like Condesa, Roma, and Polanco. Uber Eats has strong penetration in broader residential zones. DiDi Food is strong in mid-sized cities like Puebla, Leon, and Queretaro where competition is lower. The ideal strategy for most operators is to be on all three platforms and use data to optimize.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Watch out for mandatory promotions",
      text: "Some platforms \"suggest\" you participate in 20-30% discounts that you absorb. Before accepting, calculate whether your margin can handle it. A 25% discount on an order where you already pay 25% commission means you are giving away 50% of the order value.",
    },
    {
      type: "heading",
      level: 2,
      text: "Strategies to Protect Your Margins",
      id: "estrategias-margenes",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Apply differentiated markup by platform. If Uber Eats charges you 30%, raise your prices 25-30% on that platform. Most consumers compare options within the app, not against your dine-in menu.",
        "Negotiate by volume. If you exceed 200-300 monthly orders on a platform, request a rate review. Prepare a report of your monthly sales and average ticket size.",
        "Optimize your menu for delivery. Dishes that travel well and have good margins should be your stars. Remove or modify products that deteriorate in transit.",
        "Incentivize direct orders. Include a card in every delivery order with a discount code to order directly via WhatsApp. That way you save the full commission.",
        "Use strategic combos. A combo with a drink and side has low incremental cost but raises your average ticket, which dilutes the percentage impact of the commission.",
      ],
    },
    {
      type: "quote",
      text: "Do not be afraid to charge differently on each platform. The Uber Eats customer is not comparing against your Rappi menu -- they are comparing against the other restaurants within Uber Eats.",
      author: "Multi-brand operator, Guadalajara",
    },
    {
      type: "heading",
      level: 2,
      text: "How Desktop Kitchen Helps You Track Your Real Profitability",
      id: "desktop-kitchen-rentabilidad",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen includes a Delivery Intelligence module that shows you exactly how much you earn (or lose) on each platform after commissions. You can configure the commission percentage for each platform and the system automatically calculates your net revenue per order, per product, and per virtual brand. Additionally, markup rules let you raise prices by platform automatically -- no need to manually update each menu.",
    },
    {
      type: "stat",
      value: "18--23%",
      label: "Average margin restaurants lose by not adjusting prices per platform",
    },
    {
      type: "cta",
      title: "Know your real profitability by platform",
      text: "Set up Desktop Kitchen and activate Delivery Intelligence to see exactly how much you earn on Rappi, Uber Eats, and DiDi Food after commissions.",
      buttonText: "Try for free",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["que-es-ghost-kitchen", "marcas-virtuales-delivery", "reducir-merma-restaurante"],
};
