import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "reducir-merma-restaurante",
  title: "7 Estrategias para Reducir la Merma en tu Restaurante",
  excerpt:
    "La merma puede costarte hasta el 10% de tus ingresos. Estas 7 estrategias prácticas te ayudan a reducir el desperdicio de alimentos, controlar costos y mejorar la rentabilidad de tu cocina.",
  category: "operaciones",
  date: "2026-02-22",
  readTime: 8,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "La merma — el desperdicio de ingredientes y alimentos preparados que nunca llegan al plato del cliente — es uno de los problemas más costosos y menos visibles de la industria restaurantera. En México, el restaurante promedio pierde entre el 4% y el 10% de sus ingresos totales por merma. Para un negocio que factura $400,000 MXN al mes, eso significa entre $16,000 y $40,000 mensuales que se van literalmente a la basura. La buena noticia es que con las estrategias correctas, puedes reducir esa cifra drásticamente.",
    },
    {
      type: "stats",
      items: [
        { value: "4–10%", label: "Ingresos perdidos por merma en restaurantes mexicanos" },
        { value: "20M ton", label: "Alimentos desperdiciados anualmente en México" },
        { value: "$40,000", label: "Pérdida mensual potencial en un restaurante de $400K" },
        { value: "30–50%", label: "Reducción posible con estrategias adecuadas" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "1. Implementa el sistema PEPS (FIFO) de forma rigurosa",
      id: "fifo-peps",
    },
    {
      type: "paragraph",
      text: "PEPS — Primeras Entradas, Primeras Salidas — es el principio básico de rotación de inventario. Los ingredientes que llegaron primero se usan primero. Suena obvio, pero en la práctica diaria de una cocina ocupada, es fácil que el equipo agarre lo que tiene más a la mano, dejando productos más viejos al fondo del refrigerador hasta que se echan a perder.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Etiqueta cada producto con la fecha de recepción usando marcador y cinta adhesiva. No confíes en la memoria.",
        "Organiza tu refrigerador y almacén con los productos más antiguos al frente y los nuevos atrás.",
        "Designa a una persona por turno como responsable de verificar la rotación. Que sea parte de su checklist diario.",
        "Realiza una revisión semanal de productos próximos a caducar y priorízalos en preparaciones o especiales del día.",
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "Truco práctico",
      text: "Usa contenedores transparentes en lugar de opacos. Cuando puedes ver el contenido sin abrir, es mucho más fácil identificar qué necesita usarse primero. La inversión en contenedores de policarbonato se paga sola en reducción de merma.",
    },
    {
      type: "heading",
      level: 2,
      text: "2. Estandariza las porciones con recetas medidas",
      id: "porciones-estandar",
    },
    {
      type: "paragraph",
      text: "Si cada cocinero sirve porciones diferentes, tu costo real por platillo es impredecible. Un taco con 120g de carne vs. uno con 80g es una diferencia del 50% en costo de proteína. La solución es documentar recetas con gramajes exactos y usar básculas en estaciones de preparación. No se trata de desconfiar de tu equipo — se trata de darles herramientas para ser consistentes.",
    },
    {
      type: "stat",
      value: "15–25%",
      label: "Variación típica en porciones cuando no hay recetas estandarizadas",
    },
    {
      type: "heading",
      level: 2,
      text: "3. Diseña tu menú pensando en ingredientes compartidos",
      id: "menu-ingredientes-compartidos",
    },
    {
      type: "paragraph",
      text: "Una de las causas principales de merma es tener demasiados ingredientes únicos — productos que solo se usan en uno o dos platillos. Si ese platillo no se vende bien una semana, el ingrediente se desperdicia. La ingeniería de menú inteligente diseña platillos que comparten ingredientes base. Un pollo rostizado puede ser la proteína de tacos, ensaladas, tortas y sopas. Un mismo queso puede funcionar en quesadillas, ensaladas y pastas.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Haz una lista de todos tus ingredientes y marca cuántos platillos usan cada uno.",
        "Identifica los ingredientes que solo aparecen en 1 o 2 preparaciones — esos son tus candidatos de merma.",
        "Reformula platillos para usar ingredientes compartidos o elimina los productos de baja venta que dependen de ingredientes exclusivos.",
        "Cada vez que agregues un platillo nuevo al menú, revisa si puedes armarlo con ingredientes que ya manejas.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "4. Usa IA para detectar merma antes de que sea pérdida",
      id: "ia-deteccion-merma",
    },
    {
      type: "paragraph",
      text: "La detección manual de merma tiene un problema fundamental: para cuando descubres que un producto se desperdició, ya perdiste el dinero. La inteligencia artificial puede comparar en tiempo real tu inventario teórico (lo que deberías tener según tus ventas) contra tus compras registradas e identificar discrepancias antes de que se acumulen. Desktop Kitchen hace esto automáticamente, analizando la velocidad de consumo de cada ingrediente y alertándote cuando algo no cuadra.",
    },
    {
      type: "callout",
      variant: "info",
      title: "Detección inteligente",
      text: "El módulo de IA de Desktop Kitchen corre análisis de merma cada turno. Si detecta que estás consumiendo aguacate un 30% más rápido de lo que tus ventas de guacamole justifican, recibes una alerta para investigar. Puede ser sobre-porcionado, deterioro en almacenamiento o desvío.",
    },
    {
      type: "heading",
      level: 2,
      text: "5. Capacita a tu equipo (y hazlos parte de la solución)",
      id: "capacitacion-equipo",
    },
    {
      type: "paragraph",
      text: "Tu equipo de cocina maneja los ingredientes todos los días. Si no entienden el impacto financiero de la merma, no van a priorizarla. Dedica 15 minutos a la semana para compartir datos concretos: \"Esta semana tiramos $3,200 en jitomate que se echó a perder. Eso equivale a lo que ganamos con 40 tacos.\" Cuando el desperdicio se traduce a ventas perdidas, el equipo lo entiende de forma visceral.",
    },
    {
      type: "quote",
      text: "El día que le mostré al equipo que la merma del mes equivalía a dos quincenas de sueldo, las cosas cambiaron. No fue regaño — fue información. Y la información motiva más que cualquier amenaza.",
      author: "Chef ejecutivo, restaurante en Monterrey",
    },
    {
      type: "heading",
      level: 2,
      text: "6. Negocia con proveedores: entregas más frecuentes, lotes más chicos",
      id: "proveedores-frecuencia",
    },
    {
      type: "paragraph",
      text: "Muchos restaurantes compran en grandes cantidades para obtener mejores precios por kilo. Pero si el 10% de esa compra se desperdicia, el \"ahorro\" fue ilusorio. Evalúa si te conviene pedir entregas más frecuentes con lotes más pequeños, incluso si el precio por unidad es ligeramente mayor. Un proveedor que te entrega tres veces por semana en lugar de una te permite trabajar con inventario más fresco y menos riesgo de caducidad.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Calcula el costo real incluyendo merma: si compras 100 kg a $50/kg y tiras 10 kg, tu costo real es $55.5/kg, no $50.",
        "Negocia entregas parciales: muchos proveedores en la Central de Abastos ofrecen entregas diarias sin costo extra si superas un mínimo.",
        "Diversifica proveedores para productos perecederos — no dependas de uno solo que solo entrega los lunes.",
        "Establece un día fijo de revisión de inventario para hacer pedidos basados en datos, no en corazonadas.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "7. Implementa seguimiento de merma en tiempo real",
      id: "seguimiento-tiempo-real",
    },
    {
      type: "paragraph",
      text: "No puedes mejorar lo que no mides. El primer paso para reducir la merma es registrarla de forma sistemática. Cada vez que tires un ingrediente, anota qué fue, cuánto y por qué (caducó, se quemó, se preparó de más, se dañó en almacenamiento). Después de dos semanas de registro, tendrás un mapa claro de dónde están tus fugas principales.",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen automatiza gran parte de este proceso. El sistema de inventario registra entradas y salidas, y la IA calcula las discrepancias automáticamente. Los reportes semanales te muestran tendencias: si la merma de un ingrediente específico va en aumento, lo sabes antes de que se convierta en un problema crónico. Además, puedes fijar metas de merma por categoría y recibir alertas cuando las superes.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Error común",
      text: "No clasifiques toda la merma como \"desperdicio normal\". Diferencia entre merma inevitable (cáscaras, huesos, recortes) y merma evitable (producto caducado, sobre-preparación, errores). Solo puedes reducir lo que identificas correctamente.",
    },
    {
      type: "heading",
      level: 2,
      text: "El impacto acumulado es enorme",
      id: "impacto-acumulado",
    },
    {
      type: "paragraph",
      text: "Ninguna de estas estrategias por sí sola va a transformar tu negocio. Pero implementarlas en conjunto puede reducir tu merma entre un 30% y un 50%. En un restaurante que pierde $30,000 MXN mensuales por merma, eso significa recuperar entre $9,000 y $15,000 al mes — dinero que va directo a tu utilidad sin necesidad de vender un solo platillo más. A lo largo de un año, estamos hablando de más de $100,000 MXN en ahorro puro.",
    },
    {
      type: "cta",
      title: "Controla la merma con datos, no con intuición",
      text: "Desktop Kitchen te da visibilidad total de tu inventario, detección inteligente de merma y reportes accionables. Empieza gratis y recupera lo que estás perdiendo.",
      buttonText: "Empezar gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["ia-en-la-cocina", "automatizar-inventario-ia", "pantalla-cocina-eficiente"],
};
