import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "pantalla-cocina-eficiente",
  title: "Kitchen Display: The Secret to Eliminating Lost Tickets",
  excerpt:
    "Discover how a Kitchen Display System (KDS) eliminates paper tickets, reduces errors, and improves prep times in your restaurant.",
  category: "operaciones",
  date: "2026-01-20",
  readTime: 7,
  author: {
    name: "Desktop Kitchen Team",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Everyone who has worked in a kitchen knows the scene: a paper ticket that falls on the floor, another that gets smeared with grease, one more that gets lost between the bar and the grill. The result is forgotten orders, duplicated dishes, frustrated customers, and lost revenue. The Kitchen Display System, or KDS, is the solution to a problem that has plagued restaurants for decades.",
    },
    {
      type: "stats",
      items: [
        { value: "85%", label: "Reduction in order errors with KDS vs paper tickets" },
        { value: "23%", label: "Average improvement in prep times" },
        { value: "0", label: "Lost tickets with a digital system" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "The problem with paper tickets",
      id: "problema-tickets-papel",
    },
    {
      type: "paragraph",
      text: "Paper tickets seem to work fine until they do not. During a rush hour with 30 simultaneous orders, the margin for error is enormous. Tickets pile up, get out of order, the ink fades from heat, and nobody knows for sure which order should go out first. If you are also handling delivery orders alongside dine-in, the chaos multiplies. Tickets fall or get wet, thermal printer text becomes illegible, orders get prepared out of sequence, modifications are not communicated properly, and there is zero history once the ticket hits the trash.",
    },
    {
      type: "heading",
      level: 2,
      text: "What is a KDS and how does it work",
      id: "que-es-kds",
    },
    {
      type: "paragraph",
      text: "A KDS replaces the ticket printer with a digital screen in the kitchen. When an order is entered into the POS -- whether from the cashier, a delivery platform, or an online order -- it automatically appears on the kitchen display with all the necessary information: items, modifications, elapsed time, and priority. The cook marks each dish as ready and the system updates the order status in real time.",
    },
    {
      type: "callout",
      variant: "info",
      title: "No special equipment needed",
      text: "Unlike traditional KDS systems that require expensive industrial screens, Desktop Kitchen works on any tablet or monitor you already have. All you need is a web browser and an internet connection.",
    },
    {
      type: "heading",
      level: 2,
      text: "Station management",
      id: "gestion-estaciones",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Set up your kitchen stations in the system (grill, cold prep, drinks, desserts)",
        "Assign each menu category to its corresponding station",
        "Each screen shows only the items for its station",
        "When all items in an order are ready, the system notifies for dispatch",
        "The expeditor sees the complete order and confirms everything is correct before it goes out",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Real-time tracking and prioritization",
      id: "seguimiento-tiempo-real",
    },
    {
      type: "paragraph",
      text: "One of the biggest advantages of a KDS is visibility. Each order displays a timer showing how long it has been in preparation. Colors change automatically: green when it is within the expected time, yellow when it is running long, and red when it has exceeded the limit. This allows the kitchen team to prioritize without a manager hovering over every dish.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Smart prioritization",
      text: "Desktop Kitchen lets you configure automatic priorities. For example, delivery orders can have higher priority because the driver is already waiting, or takeout orders can jump ahead of dine-in when the customer has already paid.",
    },
    {
      type: "heading",
      level: 2,
      text: "Real impact on operations",
      id: "impacto-operacion",
    },
    {
      type: "stats",
      items: [
        { value: "3 min", label: "Average reduction in dispatch time per order" },
        { value: "94%", label: "Order accuracy with KDS (vs 78% with paper tickets)" },
        { value: "15%", label: "Less waste from incorrectly prepared dishes" },
      ],
    },
    {
      type: "quote",
      text: "The first week without tickets felt a bit strange, but by Friday nobody wanted to go back to paper. Errors dropped dramatically and the kitchen atmosphere is much less stressful.",
      author: "Executive chef in Monterrey",
    },
    {
      type: "heading",
      level: 2,
      text: "Desktop Kitchen's KDS",
      id: "kds-desktop-kitchen",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Works on tablets, monitors, or any screen with a browser",
        "Station view or full view of all orders",
        "Color-coded timers to keep prep times under control",
        "Clear identification of order source: dine-in, takeout, Uber Eats, Rappi, DiDi",
        "Modifications and special notes highlighted visually",
        "Complete order history for analysis and continuous improvement",
      ],
    },
    {
      type: "cta",
      title: "Eliminate lost tickets from your kitchen",
      text: "Modernize your kitchen with Desktop Kitchen's Kitchen Display System. No special hardware, no complicated setup. Just open your browser and start receiving orders.",
      buttonText: "Start for free",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["guia-completa-desktop-kitchen", "reducir-merma-restaurante", "pos-tradicional-vs-moderno"],
};
