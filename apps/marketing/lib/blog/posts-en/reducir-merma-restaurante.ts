import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "reducir-merma-restaurante",
  title: "7 Strategies to Reduce Food Waste in Your Restaurant",
  excerpt:
    "Food waste can cost you up to 10% of your revenue. These 7 practical strategies help you reduce food waste, control costs, and improve your kitchen's profitability.",
  category: "operaciones",
  date: "2026-02-22",
  readTime: 8,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Food waste -- the loss of ingredients and prepared food that never reaches the customer's plate -- is one of the most costly and least visible problems in the restaurant industry. In Mexico, the average restaurant loses between 4% and 10% of total revenue to waste. For a business that bills $400,000 MXN per month, that means between $16,000 and $40,000 per month literally going in the trash. The good news is that with the right strategies, you can reduce that number dramatically.",
    },
    {
      type: "stats",
      items: [
        { value: "4--10%", label: "Revenue lost to food waste in Mexican restaurants" },
        { value: "20M tons", label: "Food wasted annually in Mexico" },
        { value: "$40,000", label: "Potential monthly loss in a $400K restaurant" },
        { value: "30--50%", label: "Possible reduction with the right strategies" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "1. Implement the FIFO System Rigorously",
      id: "fifo-peps",
    },
    {
      type: "paragraph",
      text: "FIFO -- First In, First Out -- is the basic principle of inventory rotation. The ingredients that arrived first get used first. It sounds obvious, but in the daily reality of a busy kitchen, it is easy for the team to grab whatever is most accessible, leaving older products at the back of the refrigerator until they spoil.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Label every product with the receiving date using a marker and adhesive tape. Do not rely on memory.",
        "Organize your refrigerator and storage with older products in front and newer ones in back.",
        "Designate one person per shift as responsible for verifying rotation. Make it part of their daily checklist.",
        "Conduct a weekly review of products nearing expiration and prioritize them in daily specials or preparations.",
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "Practical trick",
      text: "Use transparent containers instead of opaque ones. When you can see the contents without opening them, it is much easier to identify what needs to be used first. The investment in polycarbonate containers pays for itself in waste reduction.",
    },
    {
      type: "heading",
      level: 2,
      text: "2. Standardize Portions with Measured Recipes",
      id: "porciones-estandar",
    },
    {
      type: "paragraph",
      text: "If every cook serves different portions, your actual cost per dish is unpredictable. A taco with 120g of meat vs. one with 80g is a 50% difference in protein cost. The solution is to document recipes with exact weights and use scales at prep stations. This is not about distrusting your team -- it is about giving them tools to be consistent.",
    },
    {
      type: "stat",
      value: "15--25%",
      label: "Typical portion variation when there are no standardized recipes",
    },
    {
      type: "heading",
      level: 2,
      text: "3. Design Your Menu Around Shared Ingredients",
      id: "menu-ingredientes-compartidos",
    },
    {
      type: "paragraph",
      text: "One of the main causes of food waste is having too many unique ingredients -- products that are only used in one or two dishes. If that dish does not sell well in a given week, the ingredient goes to waste. Smart menu engineering designs dishes that share base ingredients. A roasted chicken can be the protein for tacos, salads, tortas, and soups. The same cheese can work in quesadillas, salads, and pastas.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Make a list of all your ingredients and mark how many dishes use each one.",
        "Identify ingredients that only appear in 1 or 2 preparations -- those are your waste candidates.",
        "Reformulate dishes to use shared ingredients, or remove low-selling items that depend on exclusive ingredients.",
        "Every time you add a new dish to the menu, check if you can build it with ingredients you already stock.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "4. Use AI to Detect Waste Before It Becomes a Loss",
      id: "ia-deteccion-merma",
    },
    {
      type: "paragraph",
      text: "Manual waste detection has a fundamental problem: by the time you discover a product has been wasted, you have already lost the money. Artificial intelligence can compare your theoretical inventory (what you should have based on sales) against your recorded purchases in real time and identify discrepancies before they accumulate. Desktop Kitchen does this automatically, analyzing the consumption rate of each ingredient and alerting you when something does not add up.",
    },
    {
      type: "callout",
      variant: "info",
      title: "Smart detection",
      text: "Desktop Kitchen's AI module runs waste analysis every shift. If it detects that you are consuming avocado 30% faster than your guacamole sales justify, you receive an alert to investigate. It could be over-portioning, storage deterioration, or diversion.",
    },
    {
      type: "heading",
      level: 2,
      text: "5. Train Your Team (and Make Them Part of the Solution)",
      id: "capacitacion-equipo",
    },
    {
      type: "paragraph",
      text: "Your kitchen team handles ingredients every day. If they do not understand the financial impact of waste, they will not prioritize it. Dedicate 15 minutes a week to sharing concrete data: \"This week we threw away $3,200 in tomatoes that spoiled. That is the equivalent of what we earn from 40 tacos.\" When waste is translated into lost sales, the team understands it viscerally.",
    },
    {
      type: "quote",
      text: "The day I showed the team that the month's food waste was equivalent to two paychecks, things changed. It was not a scolding -- it was information. And information motivates more than any threat.",
      author: "Executive chef, restaurant in Monterrey",
    },
    {
      type: "heading",
      level: 2,
      text: "6. Negotiate with Suppliers: More Frequent Deliveries, Smaller Batches",
      id: "proveedores-frecuencia",
    },
    {
      type: "paragraph",
      text: "Many restaurants buy in large quantities to get better prices per kilo. But if 10% of that purchase goes to waste, the \"savings\" were illusory. Evaluate whether it is better to request more frequent deliveries with smaller batches, even if the per-unit price is slightly higher. A supplier that delivers three times a week instead of once lets you work with fresher inventory and less risk of expiration.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Calculate the real cost including waste: if you buy 100 kg at $50/kg and throw away 10 kg, your real cost is $55.5/kg, not $50.",
        "Negotiate partial deliveries: many suppliers at the Central de Abastos offer daily deliveries at no extra cost if you meet a minimum.",
        "Diversify suppliers for perishable products -- do not depend on a single one that only delivers on Mondays.",
        "Establish a fixed day for inventory review to place orders based on data, not guesswork.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "7. Implement Real-Time Waste Tracking",
      id: "seguimiento-tiempo-real",
    },
    {
      type: "paragraph",
      text: "You cannot improve what you do not measure. The first step to reducing waste is recording it systematically. Every time you discard an ingredient, note what it was, how much, and why (expired, burned, over-prepared, damaged in storage). After two weeks of tracking, you will have a clear map of where your main leaks are.",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen automates much of this process. The inventory system records inputs and outputs, and the AI calculates discrepancies automatically. Weekly reports show you trends: if waste on a specific ingredient is increasing, you know before it becomes a chronic problem. You can also set waste targets by category and receive alerts when you exceed them.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Common mistake",
      text: "Do not classify all waste as \"normal shrinkage.\" Differentiate between unavoidable waste (peels, bones, trimmings) and avoidable waste (expired product, over-preparation, errors). You can only reduce what you correctly identify.",
    },
    {
      type: "heading",
      level: 2,
      text: "The Cumulative Impact Is Enormous",
      id: "impacto-acumulado",
    },
    {
      type: "paragraph",
      text: "No single strategy will transform your business on its own. But implementing them together can reduce your waste by 30% to 50%. In a restaurant that loses $30,000 MXN per month to waste, that means recovering between $9,000 and $15,000 per month -- money that goes straight to your bottom line without needing to sell a single additional dish. Over a year, we are talking about more than $100,000 MXN in pure savings.",
    },
    {
      type: "cta",
      title: "Control Waste with Data, Not Intuition",
      text: "Desktop Kitchen gives you full visibility of your inventory, smart waste detection, and actionable reports. Start for free and recover what you have been losing.",
      buttonText: "Start for free",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["ia-en-la-cocina", "automatizar-inventario-ia", "pantalla-cocina-eficiente"],
};
