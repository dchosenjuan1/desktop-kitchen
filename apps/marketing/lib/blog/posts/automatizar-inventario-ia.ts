import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "automatizar-inventario-ia",
  title: "Automatiza tu Inventario con Inteligencia Artificial",
  excerpt:
    "Descubre como la inteligencia artificial transforma la gestion de inventario en restaurantes: prediccion de demanda, puntos de reorden automaticos, reduccion de merma y optimizacion de proveedores.",
  category: "ia-tecnologia",
  date: "2026-01-10",
  readTime: 8,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "El inventario es uno de los dolores de cabeza mas grandes de cualquier restaurante. Compras de mas y el producto se echa a perder. Compras de menos y te quedas sin ingredientes a media tarde. Llevas el control en una libreta o en un Excel que nadie actualiza. Y al final del mes, la merma se come tus ganancias sin que puedas explicar exactamente donde se fue el dinero. La inteligencia artificial esta cambiando radicalmente esta realidad.",
    },
    {
      type: "stats",
      items: [
        { value: "4-10%", label: "De los ingresos de un restaurante se pierden en merma" },
        { value: "35%", label: "Reduccion en desperdicio con gestion de inventario basada en IA" },
        { value: "20%", label: "Ahorro promedio en costos de insumos con reorden inteligente" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "El problema del inventario manual",
      id: "problema-inventario-manual",
    },
    {
      type: "paragraph",
      text: "La mayoria de los restaurantes en Mexico todavia manejan su inventario de forma manual o semi-manual. Alguien cuenta los insumos una vez a la semana (si bien le va), anota en una libreta o en una hoja de calculo, y hace los pedidos a proveedores basandose en la intuicion o en la experiencia. Este metodo tiene un problema fundamental: no puede procesar la cantidad de variables que afectan tu demanda.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "El clima cambia y la demanda de ciertos platillos sube o baja sin previo aviso",
        "Los dias festivos, puentes y eventos locales alteran drasticamente los patrones de consumo",
        "Las promociones en plataformas de delivery generan picos que nadie anticipo",
        "Los desperdicios por sobrepreparacion se acumulan sin que nadie los registre",
        "Los proveedores cambian precios y disponibilidad sin notificar con tiempo",
      ],
    },
    {
      type: "callout",
      variant: "warning",
      title: "El costo real de la merma",
      text: "Un restaurante con ventas mensuales de $300,000 MXN puede estar perdiendo entre $12,000 y $30,000 al mes solo en merma. En un ano, eso equivale a lo que cuesta un empleado de tiempo completo o la renta de un local.",
    },
    {
      type: "heading",
      level: 2,
      text: "Prediccion de demanda con IA",
      id: "prediccion-demanda",
    },
    {
      type: "paragraph",
      text: "La inteligencia artificial hace algo que ningun humano puede hacer de forma consistente: analizar miles de datos historicos, identificar patrones y predecir la demanda futura con precision. El sistema analiza tus ventas historicas por dia de la semana, hora del dia, temporada, clima y eventos especiales. Con esos datos, genera predicciones de cuanto vas a vender de cada platillo en los proximos dias. Si el viernes lluvioso tus ventas de sopa suben un 40%, el sistema lo sabe y te avisa con anticipacion.",
    },
    {
      type: "heading",
      level: 3,
      text: "Puntos de reorden automaticos",
      id: "puntos-reorden",
    },
    {
      type: "paragraph",
      text: "En lugar de revisar manualmente que insumos te faltan, la IA calcula automaticamente cuando necesitas reordenar cada ingrediente. Toma en cuenta tu consumo promedio, el tiempo de entrega de cada proveedor, y la demanda proyectada. Cuando un insumo esta por llegar a su punto critico, el sistema te alerta o incluso puede generar la orden de compra automaticamente.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "El sistema registra automaticamente cada ingrediente usado en cada venta",
        "Calcula la velocidad de consumo (unidades por dia) para cada insumo",
        "Considera el tiempo de entrega de tus proveedores",
        "Genera alertas cuando un insumo esta por llegar al minimo",
        "Sugiere cantidades optimas de compra basadas en la demanda proyectada",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Deteccion de merma y desperdicios",
      id: "deteccion-merma",
    },
    {
      type: "paragraph",
      text: "Uno de los usos mas valiosos de la IA en inventario es detectar anomalias. Si el sistema sabe que vendiste 100 hamburguesas pero tu inventario de carne bajo como si hubieras hecho 130, algo esta mal. Puede ser desperdicio en la preparacion, porciones inconsistentes, robo hormiga o simplemente un error de registro. Sin IA, estas diferencias pasan desapercibidas durante semanas o meses.",
    },
    {
      type: "quote",
      text: "La IA nos detecto que estabamos usando un 25% mas de queso del que deberiamos. Resulta que un cocinero del turno de la noche ponia porciones dobles. Corregir eso solo nos ahorro $4,500 pesos al mes.",
      author: "Gerente de pizzeria en Leon",
    },
    {
      type: "heading",
      level: 2,
      text: "Como funciona en Desktop Kitchen",
      id: "desktop-kitchen-inventario-ia",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Descuento automatico de inventario con cada venta (por receta e ingrediente)",
        "Prediccion de demanda basada en historico de ventas y patrones estacionales",
        "Alertas de reorden configurables por insumo y proveedor",
        "Deteccion de merma con comparacion automatica entre consumo teorico y real",
        "Velocidad de inventario: sabe exactamente cuanto dura cada insumo",
        "Sugerencias de IA para optimizar compras y reducir desperdicio",
        "Reportes de costo de producto y margen por platillo en tiempo real",
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "Empieza con lo basico",
      text: "No necesitas tener un inventario perfecto para empezar a usar IA. Comienza registrando tus compras y tus ventas. Con 4-6 semanas de datos, el sistema ya puede hacer predicciones utiles. Entre mas datos tenga, mejores seran sus sugerencias.",
    },
    {
      type: "cta",
      title: "Pon tu inventario en piloto automatico",
      text: "Deja que la inteligencia artificial se encargue de tu inventario mientras tu te enfocas en lo que importa: cocinar y atender a tus clientes. Prueba Desktop Kitchen gratis.",
      buttonText: "Empieza gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["ia-en-la-cocina", "reducir-merma-restaurante", "guia-completa-desktop-kitchen"],
};
