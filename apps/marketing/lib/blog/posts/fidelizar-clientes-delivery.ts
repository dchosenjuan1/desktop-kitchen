import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "fidelizar-clientes-delivery",
  title: "Como Fidelizar Clientes que Llegan por Delivery",
  excerpt:
    "Convierte a los clientes que te encuentran en Uber Eats o Rappi en clientes directos y recurrentes. Estrategias practicas de lealtad, CRM y comunicacion para restaurantes en Mexico.",
  category: "negocio",
  date: "2026-01-25",
  readTime: 9,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Las plataformas de delivery son una excelente puerta de entrada para nuevos clientes. Pero hay un problema: esos clientes no son tuyos, son de la plataforma. Si manana Uber Eats cambia su algoritmo o sube sus comisiones, tus ventas pueden caer de un dia para otro. La solucion no es dejar las plataformas, sino usar estrategias inteligentes para convertir a esos clientes en compradores directos y recurrentes.",
    },
    {
      type: "stats",
      items: [
        { value: "5x", label: "Mas barato retener un cliente que adquirir uno nuevo" },
        { value: "25-30%", label: "De comision que te ahorras por cada pedido directo" },
        { value: "67%", label: "De clientes repiten si reciben una buena experiencia de fidelidad" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "El problema: clientes prestados",
      id: "clientes-prestados",
    },
    {
      type: "paragraph",
      text: "Cuando un cliente pide tu comida por Rappi o Uber Eats, la plataforma controla toda la relacion. Tu no tienes su telefono, no tienes su correo, no sabes cuantas veces ha pedido ni que le gusto mas. Si ese cliente deja de pedir, no tienes forma de contactarlo. Estas pagando entre el 25% y el 35% de comision por cada pedido, y ademas estas construyendo la base de clientes de alguien mas.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "La trampa de la dependencia",
      text: "Los restaurantes que dependen al 100% de plataformas de delivery estan a merced de cambios en algoritmos, incrementos de comisiones y competencia que paga por mejor posicionamiento. Diversificar tus canales de venta no es opcional, es supervivencia.",
    },
    {
      type: "heading",
      level: 2,
      text: "Estrategia 1: Insertos en el empaque",
      id: "insertos-empaque",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Tarjeta con un codigo QR que lleve a tu menu directo con un 15% de descuento en el primer pedido",
        "Calcomania con tu numero de WhatsApp para pedidos directos",
        "Tarjeta de sellos fisica: 'Completa 5 pedidos directos y el 6to es gratis'",
        "Nota personalizada escrita a mano agradeciendo el pedido (sorprendentemente efectivo)",
        "Muestra gratis de un producto nuevo con una tarjeta invitando a pedirlo la proxima vez",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Estrategia 2: Programas de lealtad digitales",
      id: "programas-lealtad",
    },
    {
      type: "paragraph",
      text: "Las tarjetas de sellos fisicas funcionan, pero los programas de lealtad digitales son mucho mas poderosos. Te permiten rastrear el comportamiento del cliente, enviar ofertas personalizadas y crear una relacion continua. Un buen programa de lealtad hace que el cliente piense en ti antes de abrir Uber Eats.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Registra al cliente con su numero de telefono al momento de su primer pedido directo",
        "Asigna puntos o sellos digitales por cada compra",
        "Configura recompensas atractivas pero sostenibles (ej. producto gratis cada 8 compras)",
        "Envia notificaciones cuando esten cerca de una recompensa",
        "Ofrece puntos dobles en dias de baja demanda para equilibrar tu flujo",
      ],
    },
    {
      type: "quote",
      text: "Desde que implementamos el programa de sellos digitales, el 35% de nuestros clientes de delivery se convirtieron en clientes directos en menos de dos meses. La comision que nos ahorramos paga el sistema con creces.",
      author: "Restaurantero en CDMX",
    },
    {
      type: "heading",
      level: 2,
      text: "Estrategia 3: Campanas de SMS y WhatsApp",
      id: "campanas-sms",
    },
    {
      type: "paragraph",
      text: "Una vez que tienes el telefono del cliente (con su consentimiento), tienes un canal directo de comunicacion que ninguna plataforma puede quitarte. Los mensajes SMS tienen una tasa de apertura del 98%, muy superior al email o a las notificaciones push. La clave es no abusar: envia mensajes relevantes, oportunos y con valor real. Un mensaje de bienvenida con descuento, un recordatorio semanal con la promocion del dia, o una notificacion cuando estan a un sello de su recompensa.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Respeta la privacidad",
      text: "Siempre pide permiso antes de enviar mensajes. En Mexico, la Ley Federal de Proteccion de Datos Personales exige consentimiento explicito. Ademas, los clientes que eligen recibir tus mensajes son mucho mas receptivos que los que no.",
    },
    {
      type: "heading",
      level: 2,
      text: "Como Desktop Kitchen te ayuda a fidelizar",
      id: "desktop-kitchen-fidelizar",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "CRM integrado que registra cada cliente con su historial de compras y preferencias",
        "Programa de sellos digitales configurable: define cuantos sellos y que recompensa",
        "Campanas de SMS automatizadas via Twilio con mensajes personalizados",
        "Modulo de recaptura: identifica clientes que solo piden por plataformas y les envia ofertas directas",
        "Reportes de retencion que muestran cuantos clientes de delivery se convirtieron en directos",
      ],
    },
    {
      type: "stat",
      value: "3x",
      label: "Mayor frecuencia de compra en clientes dentro de programas de lealtad vs clientes sin programa",
    },
    {
      type: "cta",
      title: "Convierte clientes de delivery en clientes propios",
      text: "Deja de regalar tus clientes a las plataformas. Con Desktop Kitchen puedes construir tu propia base de clientes leales con herramientas de CRM, lealtad y SMS integradas.",
      buttonText: "Prueba gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["marcas-virtuales-delivery", "comisiones-rappi-uber-didi", "pos-tradicional-vs-moderno"],
};
