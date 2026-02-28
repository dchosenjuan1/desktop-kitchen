import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "pantalla-cocina-eficiente",
  title: "Pantalla de Cocina: El Secreto para Eliminar Tickets Perdidos",
  excerpt:
    "Descubre como un sistema de pantalla de cocina (KDS) elimina los tickets de papel, reduce errores y mejora los tiempos de preparacion en tu restaurante.",
  category: "operaciones",
  date: "2026-01-20",
  readTime: 7,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Todos los que han trabajado en una cocina conocen la escena: un ticket de papel que se cae al piso, otro que se mancha de grasa, uno mas que se traspapela entre la barra y la plancha. El resultado son pedidos olvidados, platillos duplicados, clientes molestos y perdida de dinero. La pantalla de cocina, o KDS (Kitchen Display System), es la solucion a este problema que ha plagado a los restaurantes durante decadas.",
    },
    {
      type: "stats",
      items: [
        { value: "85%", label: "Reduccion en errores de pedido con KDS vs tickets de papel" },
        { value: "23%", label: "Mejora promedio en tiempos de preparacion" },
        { value: "0", label: "Tickets perdidos con un sistema digital" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "El problema de los tickets de papel",
      id: "problema-tickets-papel",
    },
    {
      type: "paragraph",
      text: "Los tickets de papel parecen funcionar hasta que no funcionan. En una hora pico con 30 pedidos simultaneos, el margen de error es enorme. Los tickets se acumulan, se desordenan, la tinta se borra con el calor, y nadie sabe con certeza cual pedido va primero. Si ademas manejas pedidos de delivery junto con los de salon, el caos se multiplica. Tickets que se caen o se mojan, letra ilegible de la impresora termica, pedidos preparados fuera de orden, modificaciones que no se comunican correctamente, y cero historial una vez que el ticket se tira a la basura.",
    },
    {
      type: "heading",
      level: 2,
      text: "Que es un KDS y como funciona",
      id: "que-es-kds",
    },
    {
      type: "paragraph",
      text: "Un KDS reemplaza la impresora de tickets con una pantalla digital en la cocina. Cuando un pedido se registra en el POS (ya sea del cajero, de una plataforma de delivery o de un pedido en linea), aparece automaticamente en la pantalla de cocina con toda la informacion necesaria: productos, modificaciones, tiempo transcurrido y prioridad. El cocinero marca cada platillo como listo y el sistema actualiza el estado del pedido en tiempo real.",
    },
    {
      type: "callout",
      variant: "info",
      title: "No necesitas equipo especial",
      text: "A diferencia de los KDS tradicionales que requieren pantallas industriales costosas, Desktop Kitchen funciona en cualquier tablet o monitor que ya tengas. Solo necesitas un navegador web y conexion a internet.",
    },
    {
      type: "heading",
      level: 2,
      text: "Gestion por estaciones",
      id: "gestion-estaciones",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Configura las estaciones de tu cocina en el sistema (plancha, frios, bebidas, postres)",
        "Asigna cada categoria de tu menu a la estacion correspondiente",
        "Cada pantalla muestra solo los productos de su estacion",
        "Cuando todos los productos de un pedido estan listos, el sistema notifica para el despacho",
        "El expedidor ve el pedido completo y confirma que todo esta correcto antes de entregar",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Seguimiento en tiempo real y priorizacion",
      id: "seguimiento-tiempo-real",
    },
    {
      type: "paragraph",
      text: "Una de las ventajas mas grandes del KDS es la visibilidad. Cada pedido muestra un cronometro que indica cuanto tiempo lleva en preparacion. Los colores cambian automaticamente: verde cuando esta dentro del tiempo esperado, amarillo cuando se esta tardando, y rojo cuando ya paso el limite. Esto permite al equipo de cocina priorizar sin que un gerente tenga que estar encima de cada platillo.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Prioridad inteligente",
      text: "Desktop Kitchen permite configurar prioridades automaticas. Por ejemplo, los pedidos de delivery pueden tener mayor prioridad porque el repartidor ya esta esperando, o los pedidos para llevar pueden adelantarse a los de salon cuando el cliente ya pago.",
    },
    {
      type: "heading",
      level: 2,
      text: "Impacto real en la operacion",
      id: "impacto-operacion",
    },
    {
      type: "stats",
      items: [
        { value: "3 min", label: "Reduccion promedio en tiempo de despacho por pedido" },
        { value: "94%", label: "Precision en pedidos con KDS (vs 78% con tickets de papel)" },
        { value: "15%", label: "Menos desperdicio por platillos preparados incorrectamente" },
      ],
    },
    {
      type: "quote",
      text: "La primera semana sin tickets fue un poco rara, pero para el viernes ya nadie queria volver al papel. Los errores bajaron drasticamente y el ambiente en la cocina es mucho menos estresante.",
      author: "Chef ejecutivo en Monterrey",
    },
    {
      type: "heading",
      level: 2,
      text: "El KDS de Desktop Kitchen",
      id: "kds-desktop-kitchen",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Funciona en tablets, monitores o cualquier pantalla con navegador",
        "Vista por estaciones o vista completa de todos los pedidos",
        "Cronometros con codigo de colores para controlar tiempos",
        "Identificacion clara del origen: salon, para llevar, Uber Eats, Rappi, DiDi",
        "Modificaciones y notas especiales destacadas visualmente",
        "Historial completo de pedidos para analisis y mejora continua",
      ],
    },
    {
      type: "cta",
      title: "Elimina los tickets perdidos de tu cocina",
      text: "Moderniza tu cocina con la pantalla de cocina de Desktop Kitchen. Sin hardware especial, sin instalacion complicada. Solo abre tu navegador y empieza a recibir pedidos.",
      buttonText: "Empieza gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["guia-completa-desktop-kitchen", "reducir-merma-restaurante", "pos-tradicional-vs-moderno"],
};
