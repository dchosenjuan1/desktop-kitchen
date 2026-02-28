import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "fidelizar-clientes-delivery",
  title: "How to Retain Customers Who Arrive Through Delivery",
  excerpt:
    "Turn customers who find you on Uber Eats or Rappi into direct, repeat buyers. Practical loyalty, CRM, and communication strategies for restaurants in Mexico.",
  category: "negocio",
  date: "2026-01-25",
  readTime: 9,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Delivery platforms are an excellent gateway for new customers. But there is a problem: those customers are not yours -- they belong to the platform. If tomorrow Uber Eats changes its algorithm or raises its commissions, your sales can drop overnight. The solution is not to abandon the platforms, but to use smart strategies to convert those customers into direct, repeat buyers.",
    },
    {
      type: "stats",
      items: [
        { value: "5x", label: "Cheaper to retain a customer than to acquire a new one" },
        { value: "25-30%", label: "Commission you save on every direct order" },
        { value: "67%", label: "Of customers reorder when they have a good loyalty experience" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "The problem: borrowed customers",
      id: "clientes-prestados",
    },
    {
      type: "paragraph",
      text: "When a customer orders your food through Rappi or Uber Eats, the platform controls the entire relationship. You do not have their phone number, you do not have their email, you do not know how many times they have ordered or what they liked most. If that customer stops ordering, you have no way to reach them. You are paying 25% to 35% in commission per order, and on top of that, you are building someone else's customer base.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "The dependency trap",
      text: "Restaurants that depend 100% on delivery platforms are at the mercy of algorithm changes, commission increases, and competitors who pay for better placement. Diversifying your sales channels is not optional -- it is survival.",
    },
    {
      type: "heading",
      level: 2,
      text: "Strategy 1: Packaging inserts",
      id: "insertos-empaque",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "A card with a QR code linking to your direct menu with a 15% discount on the first order",
        "A sticker with your WhatsApp number for direct orders",
        "A physical stamp card: 'Complete 5 direct orders and the 6th is free'",
        "A personalized handwritten note thanking them for their order (surprisingly effective)",
        "A free sample of a new item with a card inviting them to order it next time",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Strategy 2: Digital loyalty programs",
      id: "programas-lealtad",
    },
    {
      type: "paragraph",
      text: "Physical stamp cards work, but digital loyalty programs are far more powerful. They let you track customer behavior, send personalized offers, and build an ongoing relationship. A good loyalty program makes the customer think of you before they even open Uber Eats.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Register the customer with their phone number at the time of their first direct order",
        "Assign digital points or stamps for each purchase",
        "Set up attractive but sustainable rewards (e.g., a free item every 8 purchases)",
        "Send notifications when they are close to earning a reward",
        "Offer double points on slow days to balance your traffic flow",
      ],
    },
    {
      type: "quote",
      text: "Since we implemented the digital stamp program, 35% of our delivery customers converted to direct customers in less than two months. The commission savings alone pay for the system many times over.",
      author: "Restaurant owner in Mexico City",
    },
    {
      type: "heading",
      level: 2,
      text: "Strategy 3: SMS and WhatsApp campaigns",
      id: "campanas-sms",
    },
    {
      type: "paragraph",
      text: "Once you have the customer's phone number (with their consent), you have a direct communication channel that no platform can take away from you. SMS messages have a 98% open rate, far higher than email or push notifications. The key is not to overdo it: send relevant, timely messages with real value. A welcome message with a discount, a weekly reminder with the daily special, or a notification when they are one stamp away from their reward.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Respect privacy",
      text: "Always ask for permission before sending messages. In Mexico, the Federal Law for the Protection of Personal Data requires explicit consent. Besides, customers who choose to receive your messages are far more receptive than those who do not.",
    },
    {
      type: "heading",
      level: 2,
      text: "How Desktop Kitchen helps you build loyalty",
      id: "desktop-kitchen-fidelizar",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Built-in CRM that records each customer with their purchase history and preferences",
        "Configurable digital stamp program: define how many stamps and what reward",
        "Automated SMS campaigns via Twilio with personalized messages",
        "Recapture module: identifies customers who only order through platforms and sends them direct offers",
        "Retention reports showing how many delivery customers converted to direct buyers",
      ],
    },
    {
      type: "stat",
      value: "3x",
      label: "Higher purchase frequency among loyalty program members vs non-members",
    },
    {
      type: "cta",
      title: "Turn delivery customers into your own customers",
      text: "Stop giving your customers away to the platforms. With Desktop Kitchen you can build your own base of loyal customers with integrated CRM, loyalty, and SMS tools.",
      buttonText: "Try for free",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["marcas-virtuales-delivery", "comisiones-rappi-uber-didi", "pos-tradicional-vs-moderno"],
};
