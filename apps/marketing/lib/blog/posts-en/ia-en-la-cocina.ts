import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ia-en-la-cocina",
  title: "How AI Is Revolutionizing Kitchen Operations",
  excerpt:
    "Discover how artificial intelligence is already transforming real restaurants in Mexico: from smart upselling to shrinkage detection, with practical examples from Desktop Kitchen.",
  category: "ia-tecnologia",
  date: "2026-02-20",
  readTime: 9,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "When you hear \"artificial intelligence in restaurants,\" you probably think of robots flipping burgers or sci-fi systems. The reality is much more practical and accessible. The AI that is actually changing kitchen operations in Mexico is not flashy: it is a system that analyzes your sales data, detects patterns you cannot see, and tells you exactly what to do to sell more and waste less. At Desktop Kitchen, we have been integrating these capabilities for months and the results speak for themselves.",
    },
    {
      type: "stats",
      items: [
        { value: "12--18%", label: "Average ticket increase with AI-powered upselling" },
        { value: "25%", label: "Shrinkage reduction with smart detection" },
        { value: "8%", label: "Sales increase with dynamic pricing" },
        { value: "3x", label: "Faster identification of underperforming products" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Smart Upselling: Suggest What the Customer Wants to Buy",
      id: "upselling-inteligente",
    },
    {
      type: "paragraph",
      text: "Traditional upselling depends on your cashier remembering to offer \"would you like to add a drink?\" with every order. It is inconsistent and depends on the employee. Desktop Kitchen's AI analyzes the actual purchase patterns of your business -- not assumptions, but data -- and suggests the add-on that statistically has the highest probability of acceptance based on what the customer already has in their order.",
    },
    {
      type: "paragraph",
      text: "For example, if your data shows that 40% of customers who order tacos al pastor also order horchata water, the system automatically suggests the cashier offer the horchata. But if the customer ordered a milanesa torta, maybe the data says the most popular add-on is a grapefruit soda. Each suggestion is specific to your business, not a generic recommendation.",
    },
    {
      type: "callout",
      variant: "info",
      title: "How it works in practice",
      text: "On the cashier screen, a discreet badge appears next to the cart that says something like \"Customers who ordered this also add: Horchata water ($25).\" One tap and it is added to the order. No pressure, no memorizing scripts -- the AI does the heavy lifting.",
    },
    {
      type: "heading",
      level: 2,
      text: "Dynamic Pricing: Adjust Without Guessing",
      id: "precios-dinamicos",
    },
    {
      type: "paragraph",
      text: "Pricing in most restaurants is based on intuition: \"I feel like this dish is too cheap\" or \"the competition charges more.\" Desktop Kitchen's AI analyzes the real elasticity of each product -- what happens to sales when you raise or lower the price -- and suggests specific adjustments. If a product sells the same at $85 as at $95, you are leaving $10 per sale on the table. If another product drops dramatically when going from $60 to $70, the AI alerts you before you lose volume.",
    },
    {
      type: "paragraph",
      text: "Price adjustments are not automatic -- you always have the final word. The system presents the suggestion with the data that backs it up: sales history, current margin, estimated impact. You decide whether to apply it or not.",
    },
    {
      type: "heading",
      level: 2,
      text: "Inventory Prediction: Buy Just the Right Amount",
      id: "prediccion-inventario",
    },
    {
      type: "paragraph",
      text: "One of the biggest headaches of running a kitchen is figuring out how much to buy. Buy too much and you throw product away. Buy too little and you run out of ingredients on a Friday night at 8 PM. The AI analyzes your sales history by day of the week, by time of day, by season, and by special events to accurately predict how much you will need of each ingredient.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Inventory velocity",
      text: "The system calculates the speed at which each ingredient is consumed and alerts you when the available stock is not enough to cover projected demand for the coming days. This way you can place your orders in advance, not in a rush.",
    },
    {
      type: "heading",
      level: 2,
      text: "Shrinkage Detection: Find the Waste Before It Costs You",
      id: "deteccion-merma",
    },
    {
      type: "paragraph",
      text: "Shrinkage is the silent enemy of any restaurant. A 5% shrinkage rate may seem small, but in a business that brings in $300,000 MXN per month, that is $15,000 literally going in the trash. Desktop Kitchen's AI compares your theoretical inventory (what you should have based on sales) against your physical inventory (what you actually have) and detects discrepancies that indicate waste, theft, or portioning errors.",
    },
    {
      type: "stat",
      value: "4--10%",
      label: "Percentage of revenue the average restaurant loses to undetected shrinkage",
    },
    {
      type: "paragraph",
      text: "The system does not just detect that there is shrinkage -- it identifies which specific products it is occurring with and suggests possible causes. If avocados are disappearing faster than your guacamole sales justify, it could be a portioning issue, a storage problem, or diversion. With that information, you can investigate and correct quickly instead of discovering it at month-end when it is too late.",
    },
    {
      type: "heading",
      level: 2,
      text: "Smart Combos and Promotions",
      id: "combos-inteligentes",
    },
    {
      type: "paragraph",
      text: "Creating profitable combos is not as simple as putting three products together and setting a lower price. The AI analyzes which products are frequently bought together (item pairs), which have good margins, and which need a sales boost to generate combo suggestions that actually make financial sense. An ideal combo pairs a star product (that attracts the customer) with a high-margin product (that generates profit) and a slow-moving product (that needs rotation).",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Identifies product pairs that are frequently bought together.",
        "Calculates the combined margin of the proposed combo vs. the individual products.",
        "Suggests a combo price that is attractive to the customer but maintains or improves your margin.",
        "Alerts you if a combo includes products with high shrinkage or low inventory.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "AI Does Not Replace the Operator -- It Empowers Them",
      id: "ia-complemento",
    },
    {
      type: "quote",
      text: "The best AI for restaurants is not the one that makes decisions for you, but the one that gives you the right information at the right time so you can make better decisions.",
      author: "Product team, Desktop Kitchen",
    },
    {
      type: "paragraph",
      text: "It is important to clarify that Desktop Kitchen's AI does not run your kitchen for you. It does not change prices automatically, it does not order inventory without your approval, and it does not modify your menu while you sleep. What it does is analyze massive amounts of data that would be impossible to process manually and turn them into actionable suggestions. You always have control. The AI is your 24/7 data analyst, not your boss.",
    },
    {
      type: "cta",
      title: "Activate AI in Your Kitchen",
      text: "Desktop Kitchen includes artificial intelligence from the free plan. Start receiving upselling suggestions, shrinkage detection, and menu optimization from day one.",
      buttonText: "Start for free",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["automatizar-inventario-ia", "guia-completa-desktop-kitchen", "reducir-merma-restaurante"],
};
