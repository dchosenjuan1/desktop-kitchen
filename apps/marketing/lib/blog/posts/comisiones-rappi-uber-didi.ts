import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "comisiones-rappi-uber-didi",
  title: "¿Cuánto te Cobran Rappi, Uber Eats y DiDi? Guía de Comisiones 2026",
  excerpt:
    "Desglose completo de las comisiones que cobran Rappi, Uber Eats y DiDi Food en México, estrategias para negociar mejores tarifas y cómo proteger tus márgenes con markup inteligente.",
  category: "delivery",
  date: "2026-02-18",
  readTime: 10,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Si vendes comida por delivery en México, las comisiones de las plataformas son tu segundo costo más grande después de los insumos. Y sin embargo, la mayoría de los operadores no conocen exactamente cuánto están pagando ni cómo se estructura la comisión. En esta guía desglosamos lo que cobran Rappi, Uber Eats y DiDi Food en 2026, te compartimos estrategias reales para negociar mejores tarifas, y te mostramos cómo calcular tu rentabilidad real por pedido.",
    },
    {
      type: "heading",
      level: 2,
      text: "¿Cómo funcionan las comisiones de delivery?",
      id: "como-funcionan-comisiones",
    },
    {
      type: "paragraph",
      text: "Todas las plataformas cobran un porcentaje sobre el valor de cada pedido antes de impuestos. Este porcentaje varía según el plan que elijas (básico vs. premium), tu volumen de ventas, tu categoría de negocio y si aceptas participar en promociones de la plataforma. Además, algunas plataformas cobran tarifas adicionales por servicios como posicionamiento destacado, fotos profesionales o marketing dentro de la app.",
    },
    {
      type: "heading",
      level: 2,
      text: "Rappi: Estructura de comisiones",
      id: "comisiones-rappi",
    },
    {
      type: "stats",
      items: [
        { value: "15–30%", label: "Rango de comisión por pedido" },
        { value: "25%", label: "Comisión promedio para restaurantes nuevos" },
        { value: "~7 días", label: "Tiempo promedio de depósito" },
        { value: "3.5%", label: "Comisión adicional por pago con tarjeta" },
      ],
    },
    {
      type: "paragraph",
      text: "Rappi ofrece tres niveles de asociación en México. El plan básico cobra alrededor del 15% de comisión, pero te da visibilidad mínima en la app — básicamente apareces al final de las listas. El plan intermedio ronda el 22-25% e incluye mejor posicionamiento y acceso a Rappi Turbo. El plan premium llega hasta el 30% pero te coloca en las primeras posiciones de búsqueda y categorías. Para restaurantes nuevos, Rappi generalmente ofrece el plan intermedio como estándar.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Negociación con Rappi",
      text: "Si manejas más de 300 pedidos mensuales, tienes poder de negociación. Contacta a tu account manager y pide una revisión de tarifa. Muchos operadores han logrado bajar entre 2 y 5 puntos porcentuales presentando datos de volumen y ticket promedio.",
    },
    {
      type: "heading",
      level: 2,
      text: "Uber Eats: Estructura de comisiones",
      id: "comisiones-uber-eats",
    },
    {
      type: "stats",
      items: [
        { value: "15–30%", label: "Rango de comisión por pedido" },
        { value: "30%", label: "Comisión estándar con delivery de Uber" },
        { value: "15%", label: "Comisión por pickup (cliente recoge)" },
        { value: "Semanal", label: "Frecuencia de depósitos" },
      ],
    },
    {
      type: "paragraph",
      text: "Uber Eats tiene una estructura relativamente simple. Si usas sus repartidores, la comisión estándar es del 30%. Si el cliente recoge el pedido en tu local (pickup), baja al 15%. Uber también ofrece un plan \"Lite\" en algunas ciudades con comisión reducida (~20%) pero sin acceso a promociones ni posicionamiento premium. Una ventaja de Uber Eats es que sus depósitos suelen ser más frecuentes y predecibles que los de Rappi.",
    },
    {
      type: "heading",
      level: 2,
      text: "DiDi Food: Estructura de comisiones",
      id: "comisiones-didi-food",
    },
    {
      type: "stats",
      items: [
        { value: "15–25%", label: "Rango de comisión por pedido" },
        { value: "22%", label: "Comisión promedio en ciudades principales" },
        { value: "Semanal", label: "Frecuencia de depósitos" },
        { value: "Menor", label: "Competencia dentro de la app vs. Rappi/Uber" },
      ],
    },
    {
      type: "paragraph",
      text: "DiDi Food entró al mercado mexicano con comisiones agresivamente bajas para ganar participación, y aunque han subido gradualmente, siguen siendo competitivas. La comisión promedio ronda el 22% para restaurantes con delivery incluido. DiDi Food tiene menor penetración que Rappi y Uber Eats, lo que significa menos pedidos pero también menos competencia dentro de la app — tu restaurante tiene más visibilidad orgánica.",
    },
    {
      type: "heading",
      level: 2,
      text: "Comparación directa: ¿Cuál te conviene más?",
      id: "comparacion-plataformas",
    },
    {
      type: "paragraph",
      text: "La respuesta honesta es: depende de tu zona, tu volumen y tu tipo de comida. En CDMX, Rappi domina en colonias como Condesa, Roma y Polanco. Uber Eats tiene buena penetración en zonas residenciales más amplias. DiDi Food es fuerte en ciudades medianas como Puebla, León y Querétaro donde la competencia es menor. La estrategia ideal para la mayoría de los operadores es estar en las tres plataformas y usar los datos para optimizar.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Cuidado con las promociones obligatorias",
      text: "Algunas plataformas te \"sugieren\" participar en descuentos del 20-30% que tú absorbes. Antes de aceptar, calcula si tu margen lo soporta. Un descuento del 25% sobre un pedido donde ya pagas 25% de comisión significa que estás regalando el 50% del valor del pedido.",
    },
    {
      type: "heading",
      level: 2,
      text: "Estrategias para proteger tus márgenes",
      id: "estrategias-margenes",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Aplica markup diferenciado por plataforma. Si Uber Eats te cobra 30%, sube tus precios un 25-30% en esa plataforma. La mayoría de los consumidores comparan opciones dentro de la app, no contra tu menú de local.",
        "Negocia por volumen. Si superas los 200-300 pedidos mensuales en una plataforma, solicita una revisión de tarifa. Prepara un reporte de tus ventas mensuales y ticket promedio.",
        "Optimiza tu menú para delivery. Los platillos que viajan bien y tienen buen margen deben ser tus protagonistas. Elimina o modifica los productos que se deterioran en tránsito.",
        "Incentiva los pedidos directos. Incluye una tarjeta en cada pedido de delivery con un código de descuento para pedir directo por WhatsApp. Así te ahorras la comisión completa.",
        "Usa combos estratégicos. Un combo con bebida y complemento tiene un costo incremental bajo pero sube tu ticket promedio, lo que diluye el impacto porcentual de la comisión.",
      ],
    },
    {
      type: "quote",
      text: "No le tengas miedo a cobrar diferente en cada plataforma. El cliente de Uber Eats no está comparando con tu menú de Rappi — está comparando con los otros restaurantes dentro de Uber Eats.",
      author: "Operador multi-marca, Guadalajara",
    },
    {
      type: "heading",
      level: 2,
      text: "Cómo Desktop Kitchen te ayuda a rastrear tu rentabilidad real",
      id: "desktop-kitchen-rentabilidad",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen incluye un módulo de Delivery Intelligence que te muestra exactamente cuánto ganas (o pierdes) en cada plataforma después de comisiones. Puedes configurar el porcentaje de comisión de cada plataforma y el sistema calcula automáticamente tu ingreso neto por pedido, por producto y por marca virtual. Además, las reglas de markup te permiten subir precios por plataforma de forma automática — sin necesidad de actualizar manualmente cada menú.",
    },
    {
      type: "stat",
      value: "18–23%",
      label: "Margen promedio que pierden los restaurantes por no ajustar precios por plataforma",
    },
    {
      type: "cta",
      title: "Conoce tu rentabilidad real por plataforma",
      text: "Configura Desktop Kitchen y activa Delivery Intelligence para ver exactamente cuánto ganas en Rappi, Uber Eats y DiDi Food después de comisiones.",
      buttonText: "Probar gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["que-es-ghost-kitchen", "marcas-virtuales-delivery", "reducir-merma-restaurante"],
};
