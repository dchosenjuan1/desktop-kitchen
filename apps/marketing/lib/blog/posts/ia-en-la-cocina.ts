import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ia-en-la-cocina",
  title: "Cómo la IA Está Revolucionando las Operaciones de Cocina",
  excerpt:
    "Descubre cómo la inteligencia artificial ya está transformando restaurantes reales en México: desde upselling inteligente hasta detección de merma, con ejemplos prácticos de Desktop Kitchen.",
  category: "ia-tecnologia",
  date: "2026-02-20",
  readTime: 9,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Cuando escuchas \"inteligencia artificial en restaurantes\", probablemente piensas en robots preparando hamburguesas o sistemas de ciencia ficción. La realidad es mucho más práctica y accesible. La IA que realmente está cambiando las operaciones de cocina en México no es llamativa: es un sistema que analiza tus datos de ventas, detecta patrones que tú no puedes ver, y te dice exactamente qué hacer para vender más y desperdiciar menos. En Desktop Kitchen, llevamos meses integrando estas capacidades y los resultados hablan por sí solos.",
    },
    {
      type: "stats",
      items: [
        { value: "12–18%", label: "Aumento promedio en ticket con upselling por IA" },
        { value: "25%", label: "Reducción de merma con detección inteligente" },
        { value: "8%", label: "Incremento en ventas con precios dinámicos" },
        { value: "3x", label: "Más rápido para identificar productos de bajo rendimiento" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Upselling inteligente: sugiere lo que el cliente quiere comprar",
      id: "upselling-inteligente",
    },
    {
      type: "paragraph",
      text: "El upselling tradicional depende de que tu cajero recuerde ofrecer \"¿le agrego una bebida?\" en cada pedido. Es inconsistente y depende del empleado. La IA de Desktop Kitchen analiza los patrones de compra reales de tu negocio — no suposiciones, sino datos — y sugiere el complemento que estadísticamente tiene mayor probabilidad de aceptación según lo que el cliente ya tiene en su pedido.",
    },
    {
      type: "paragraph",
      text: "Por ejemplo, si tus datos muestran que el 40% de los clientes que piden tacos al pastor también piden agua de horchata, el sistema le sugiere al cajero ofrecer la horchata automáticamente. Pero si el cliente pidió una torta de milanesa, tal vez el dato dice que el complemento más popular es un refresco de toronja. Cada sugerencia es específica a tu negocio, no una recomendación genérica.",
    },
    {
      type: "callout",
      variant: "info",
      title: "Cómo funciona en la práctica",
      text: "En la pantalla del cajero aparece un badge discreto junto al carrito que dice algo como \"Clientes que pidieron esto también agregan: Agua de horchata ($25)\". Un toque y se agrega al pedido. Sin presión, sin memorizar scripts — la IA hace el trabajo pesado.",
    },
    {
      type: "heading",
      level: 2,
      text: "Precios dinámicos: ajusta sin adivinar",
      id: "precios-dinamicos",
    },
    {
      type: "paragraph",
      text: "La fijación de precios en la mayoría de los restaurantes se basa en intuición: \"siento que este platillo está barato\" o \"la competencia cobra más\". La IA de Desktop Kitchen analiza la elasticidad real de cada producto — qué pasa con las ventas cuando subes o bajas el precio — y te sugiere ajustes concretos. Si un producto se vende igual a $85 que a $95, estás dejando $10 por venta sobre la mesa. Si otro producto cae drásticamente al pasar de $60 a $70, la IA te alerta antes de que pierdas volumen.",
    },
    {
      type: "paragraph",
      text: "Los ajustes de precio no son automáticos — tú siempre tienes la última palabra. El sistema te presenta la sugerencia con los datos que la respaldan: historial de ventas, margen actual, impacto estimado. Tú decides si la aplicas o no.",
    },
    {
      type: "heading",
      level: 2,
      text: "Predicción de inventario: compra lo justo",
      id: "prediccion-inventario",
    },
    {
      type: "paragraph",
      text: "Uno de los dolores más grandes de operar una cocina es calcular cuánto comprar. Compras de más y tiras producto. Compras de menos y te quedas sin ingredientes un viernes a las 8 de la noche. La IA analiza tu historial de ventas por día de la semana, por horario, por temporada y por eventos especiales para predecir con precisión cuánto vas a necesitar de cada insumo.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Velocidad de inventario",
      text: "El sistema calcula la velocidad a la que cada ingrediente se consume y te alerta cuando el stock disponible no alcanza para cubrir la demanda proyectada de los próximos días. Así puedes hacer tus compras con anticipación, no con urgencia.",
    },
    {
      type: "heading",
      level: 2,
      text: "Detección de merma: encuentra el desperdicio antes de que te cueste",
      id: "deteccion-merma",
    },
    {
      type: "paragraph",
      text: "La merma es el enemigo silencioso de cualquier restaurante. Un 5% de merma puede parecer poco, pero en un negocio que factura $300,000 MXN al mes, son $15,000 que se van a la basura literalmente. La IA de Desktop Kitchen compara tu inventario teórico (lo que deberías tener según las ventas) contra tu inventario físico (lo que realmente tienes) y detecta discrepancias que indican desperdicio, robo o errores en porciones.",
    },
    {
      type: "stat",
      value: "4–10%",
      label: "Porcentaje de ingresos que el restaurante promedio pierde por merma no detectada",
    },
    {
      type: "paragraph",
      text: "El sistema no solo detecta que hay merma, sino que identifica en qué productos específicos está ocurriendo y sugiere posibles causas. Si los aguacates desaparecen más rápido de lo que tus ventas justifican, puede ser un problema de porcionado, de almacenamiento o de desvío. Con esa información, puedes investigar y corregir rápidamente en lugar de descubrirlo al cierre del mes cuando ya es tarde.",
    },
    {
      type: "heading",
      level: 2,
      text: "Combos y promociones inteligentes",
      id: "combos-inteligentes",
    },
    {
      type: "paragraph",
      text: "Crear combos rentables no es tan simple como juntar tres productos y ponerles un precio menor. La IA analiza qué productos se compran frecuentemente juntos (pares de ítems), cuáles tienen buen margen y cuáles necesitan impulso en ventas para generar sugerencias de combos que realmente hagan sentido financiero. Un combo ideal junta un producto estrella (que atrae al cliente) con un producto de alto margen (que genera la ganancia) y un producto de bajo movimiento (que necesita rotación).",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Identifica pares de productos que se compran juntos frecuentemente.",
        "Calcula el margen combinado del combo propuesto vs. los productos individuales.",
        "Sugiere un precio de combo que sea atractivo para el cliente pero que mantenga o mejore tu margen.",
        "Te alerta si un combo incluye productos con alta merma o bajo inventario.",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "La IA no reemplaza al operador, lo potencia",
      id: "ia-complemento",
    },
    {
      type: "quote",
      text: "La mejor IA para restaurantes no es la que toma decisiones por ti, sino la que te da la información correcta en el momento correcto para que tú tomes mejores decisiones.",
      author: "Equipo de producto, Desktop Kitchen",
    },
    {
      type: "paragraph",
      text: "Es importante aclarar que la IA de Desktop Kitchen no opera tu cocina por ti. No cambia precios automáticamente, no ordena inventario sin tu aprobación, no modifica tu menú mientras duermes. Lo que hace es analizar cantidades masivas de datos que serían imposibles de procesar manualmente y convertirlos en sugerencias accionables. Tú siempre tienes el control. La IA es tu analista de datos disponible las 24 horas, no tu jefe.",
    },
    {
      type: "cta",
      title: "Activa la IA en tu cocina",
      text: "Desktop Kitchen incluye inteligencia artificial desde el plan gratuito. Empieza a recibir sugerencias de upselling, detección de merma y optimización de menú desde el primer día.",
      buttonText: "Empezar gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["automatizar-inventario-ia", "guia-completa-desktop-kitchen", "reducir-merma-restaurante"],
};
