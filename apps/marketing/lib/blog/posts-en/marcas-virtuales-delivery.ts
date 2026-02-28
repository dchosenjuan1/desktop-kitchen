import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "marcas-virtuales-delivery",
  title: "Virtual Brands: How to Sell 3 Concepts From a Single Kitchen",
  excerpt:
    "Learn how to create and manage virtual brands from your existing kitchen. Discover how to choose concepts, share ingredients, and multiply your delivery sales across platforms.",
  category: "ghost-kitchens",
  date: "2026-01-28",
  readTime: 10,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Imagine your kitchen makes burgers, but it could also sell wings, salad bowls, or loaded fries without opening a second location. That is exactly what virtual brands allow: restaurant concepts that exist only on delivery platforms, operated from your same kitchen with your same team. Across Mexico, this strategy is transforming how restaurants generate revenue and maximize their existing infrastructure.",
    },
    {
      type: "heading",
      level: 2,
      text: "What are virtual brands and why do they work",
      id: "que-son-marcas-virtuales",
    },
    {
      type: "paragraph",
      text: "A virtual brand is a restaurant that exists solely on platforms like Uber Eats, Rappi, or DiDi Food. It has no storefront, no tables, no sign on the street. It only has a menu, a visual identity, and a digital presence. But behind that brand is a real kitchen -- yours -- that already has the equipment, staff, and many of the ingredients needed to operate an additional concept. The key to success is efficiency: you do not need to duplicate your investment in rent, equipment, or payroll. You just need to design smart concepts that leverage what you already have.",
    },
    {
      type: "stats",
      items: [
        { value: "40%", label: "Average sales increase when adding a virtual brand" },
        { value: "2-3", label: "Virtual brands an average kitchen can handle" },
        { value: "70%", label: "Of ingredients shared between successful brands" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "How to choose concepts that share ingredients",
      id: "elegir-conceptos-ingredientes",
    },
    {
      type: "paragraph",
      text: "The most common mistake when creating virtual brands is choosing concepts that are too different from each other. If your kitchen makes tacos al pastor and you decide to open a sushi brand, you will need completely different ingredients, new equipment, and additional training. On the other hand, if you sell tacos and open a Mexican bowl or gourmet quesadilla brand, you can reuse your proteins, salsas, vegetables, and even your tortillas.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Take inventory of your main ingredients and their purchase volumes",
        "Identify what dishes you could create with those same ingredients in different combinations",
        "Research trends in your area: what type of food sells well on delivery but lacks strong competition",
        "Confirm that your kitchen team can handle the additional prep without affecting ticket times",
        "Design a short, focused menu (8-12 items) that is easy to execute consistently",
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "The 70% Rule",
      text: "A successful virtual brand should share at least 70% of its ingredients with your main menu. If you need to purchase too many new supplies, your margins shrink and operations get complicated.",
    },
    {
      type: "heading",
      level: 2,
      text: "Real examples of virtual brands in Mexico",
      id: "ejemplos-reales-mexico",
    },
    {
      type: "paragraph",
      text: "In cities like Mexico City, Guadalajara, and Monterrey, hundreds of kitchens are already operating multiple brands. A typical case: a taqueria that sells birria tacos as its main brand, but also operates a birria ramen and consome brand, plus a tortas ahogadas brand. All three concepts use the same birria as a base, the same onions, cilantro, and limes. The difference is in the presentation and packaging.",
    },
    {
      type: "quote",
      text: "We started selling only burgers. When we launched our second brand of wings using the same fryers and sauces, our sales grew 45% without hiring a single extra person.",
      author: "Ghost kitchen operator in Guadalajara",
    },
    {
      type: "heading",
      level: 2,
      text: "Branding and platform presence",
      id: "branding-plataformas",
    },
    {
      type: "paragraph",
      text: "Each virtual brand needs its own identity. This does not mean spending thousands on branding: you need an attractive name, a simple logo, professional photos of your dishes, and a description that connects with the customer. Delivery platforms allow you to register each brand separately, with its own menu, schedule, and coverage area. Use descriptive names that communicate the concept instantly, invest in product photography since it is the first thing customers see in the app, and set strategic hours so each brand operates during peak demand for its food type.",
    },
    {
      type: "heading",
      level: 2,
      text: "How Desktop Kitchen makes multi-brand operations easy",
      id: "desktop-kitchen-multi-marca",
    },
    {
      type: "paragraph",
      text: "Managing multiple brands from a single kitchen without a proper system is a recipe for chaos. Orders get mixed up, inventory does not add up, and your team does not know which brand they are preparing for. Desktop Kitchen solves this with its virtual brand module built directly into the POS.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Each virtual brand has its own menu and pricing within the same system",
        "Orders arrive at the kitchen display tagged by brand and platform",
        "Inventory is automatically deducted regardless of which brand the order comes from",
        "Reports show you the profitability of each brand separately",
        "Markup rules let you adjust prices by platform and by brand",
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: "Everything in one place",
      text: "With Desktop Kitchen you do not need a different system for each brand. One POS, one kitchen display, one inventory. But with the flexibility to operate each brand as if it were an independent business.",
    },
    {
      type: "cta",
      title: "Multiply your sales with virtual brands",
      text: "Set up and manage all your virtual brands from a single system. Desktop Kitchen gives you the tools to operate multiple concepts without the headaches.",
      buttonText: "Start for free",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["que-es-ghost-kitchen", "comisiones-rappi-uber-didi", "fidelizar-clientes-delivery"],
};
