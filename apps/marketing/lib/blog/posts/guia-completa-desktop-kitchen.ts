import { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "guia-completa-desktop-kitchen",
  title: "Guía Completa: Cómo Configurar tu POS con Desktop Kitchen en 15 Minutos",
  excerpt:
    "Paso a paso para configurar Desktop Kitchen desde cero: crear tu cuenta, armar tu menú, conectar plataformas de delivery, activar la pantalla de cocina y personalizar tu marca.",
  category: "guias",
  date: "2026-02-15",
  readTime: 8,
  author: {
    name: "Equipo Desktop Kitchen",
    role: { en: "Desktop Kitchen Team", es: "Equipo Desktop Kitchen" },
  },
  content: [
    {
      type: "paragraph",
      text: "Sabemos que la tecnología puede intimidar, especialmente cuando llevas años operando tu cocina con comandas de papel o un sistema anticuado. Por eso diseñamos Desktop Kitchen para que puedas configurar todo tu punto de venta en menos de 15 minutos, sin necesidad de un técnico ni conocimientos avanzados. Esta guía te lleva de la mano por cada paso.",
    },
    {
      type: "heading",
      level: 2,
      text: "Paso 1: Crea tu cuenta",
      id: "crear-cuenta",
    },
    {
      type: "paragraph",
      text: "Entra a pos.desktop.kitchen y haz clic en \"Registrarme\". Solo necesitas tu correo electrónico, el nombre de tu negocio y una contraseña. En menos de 30 segundos tendrás acceso a tu dashboard. No pedimos tarjeta de crédito para empezar — el plan gratuito incluye todo lo que necesitas para operar una cocina con hasta 50 productos en tu menú.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Consejo",
      text: "Usa el correo del negocio, no uno personal. Así podrás compartir acceso con tu socio o administrador más adelante sin complicaciones.",
    },
    {
      type: "heading",
      level: 2,
      text: "Paso 2: Configura tu menú",
      id: "configurar-menu",
    },
    {
      type: "paragraph",
      text: "Ve a la sección \"Menú\" en el panel lateral. Aquí puedes crear categorías (Entradas, Platos fuertes, Bebidas, Postres) y agregar cada producto con su nombre, precio, descripción y foto. Te recomendamos subir fotos reales de tus platillos — los negocios con fotos profesionales venden hasta un 30% más en plataformas de delivery.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Crea tus categorías principales (ejemplo: Tacos, Tortas, Bebidas, Extras).",
        "Agrega cada producto con nombre, precio en MXN y una descripción corta.",
        "Sube una foto por producto. Si no tienes fotos profesionales, un celular con buena luz natural funciona.",
        "Marca los productos que quieras destacar como \"Populares\" para que aparezcan primero.",
      ],
    },
    {
      type: "heading",
      level: 3,
      text: "Configurar modificadores",
      id: "configurar-modificadores",
    },
    {
      type: "paragraph",
      text: "Los modificadores son las opciones extras que tus clientes pueden elegir: tipo de proteína, nivel de picante, ingredientes adicionales, etc. En Desktop Kitchen puedes crear grupos de modificadores y asignarlos a los productos que apliquen. Por ejemplo, un grupo \"Proteína\" con opciones como Pollo ($0), Res (+$15), Camarón (+$25) se puede vincular a todos tus tacos y tortas de un solo clic.",
    },
    {
      type: "callout",
      variant: "info",
      title: "Grupos reutilizables",
      text: "No necesitas crear modificadores producto por producto. Crea el grupo una vez y asígnalo a todos los productos que lo necesiten. Si cambias el precio de un modificador, se actualiza en todos los productos automáticamente.",
    },
    {
      type: "heading",
      level: 2,
      text: "Paso 3: Agrega a tu equipo",
      id: "agregar-equipo",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen usa un sistema de PIN para que tus empleados inicien sesión rápidamente. Ve a \"Empleados\" y crea un perfil para cada persona con su nombre y rol: cajero, cocina, barra o gerente. Cada rol tiene permisos diferentes — un cajero puede tomar pedidos y cobrar, pero no puede modificar el menú ni ver reportes financieros. El sistema genera un PIN de 4 dígitos automáticamente para cada empleado.",
    },
    {
      type: "heading",
      level: 2,
      text: "Paso 4: Conecta tus plataformas de delivery",
      id: "conectar-delivery",
    },
    {
      type: "paragraph",
      text: "Si vendes por Rappi, Uber Eats o DiDi Food, puedes integrar los pedidos directamente en Desktop Kitchen. Los pedidos de todas las plataformas llegan a una sola pantalla de cocina, eliminando la necesidad de tener múltiples tablets abiertas. Además, puedes configurar reglas de markup por plataforma — por ejemplo, subir los precios un 20% en Uber Eats para absorber la comisión sin sacrificar tu margen.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Importante",
      text: "Cada plataforma tiene su propio proceso de integración. Te recomendamos tener a la mano tu RFC, menú actualizado y datos bancarios antes de iniciar el proceso de conexión.",
    },
    {
      type: "heading",
      level: 2,
      text: "Paso 5: Activa la pantalla de cocina",
      id: "pantalla-cocina",
    },
    {
      type: "paragraph",
      text: "La pantalla de cocina (KDS) es donde tu equipo de preparación ve los pedidos en tiempo real. Solo necesitas una tablet o monitor conectado a internet. Los pedidos aparecen automáticamente organizados por prioridad, y tu equipo puede marcar cada uno como \"preparando\" o \"listo\" con un toque. Si operas varias marcas virtuales, los pedidos se etiquetan con el nombre de la marca para evitar confusiones.",
    },
    {
      type: "heading",
      level: 2,
      text: "Paso 6: Personaliza tu marca",
      id: "personalizar-marca",
    },
    {
      type: "paragraph",
      text: "Desktop Kitchen es 100% white-label — eso significa que puedes personalizarlo con los colores y logo de tu negocio. Ve a \"Configuración > Marca\" y sube tu logotipo, selecciona tu color principal y tu color de acento. Todo el sistema — desde la pantalla de punto de venta hasta los recibos — se adapta automáticamente a tu identidad visual. Tus clientes nunca verán la marca Desktop Kitchen; solo la tuya.",
    },
    {
      type: "stats",
      items: [
        { value: "15 min", label: "Tiempo promedio de configuración inicial" },
        { value: "50+", label: "Productos incluidos en el plan gratuito" },
        { value: "3", label: "Plataformas de delivery integrables" },
        { value: "100%", label: "White-label — tu marca, tus colores" },
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "¿Y después qué?",
      id: "siguientes-pasos",
    },
    {
      type: "paragraph",
      text: "Una vez que tengas tu POS configurado, explora las funciones avanzadas: reportes de ventas en tiempo real, gestión de inventario con alertas de stock bajo, programa de lealtad con estampitas digitales y SMS automáticos, y la inteligencia artificial que analiza tus ventas para sugerirte combos y detectar desperdicios. Todo esto está incluido y listo para activarse cuando lo necesites.",
    },
    {
      type: "cta",
      title: "Configura tu POS en 15 minutos",
      text: "Crea tu cuenta gratuita y empieza a recibir pedidos hoy. Sin tarjeta de crédito, sin contratos, sin complicaciones.",
      buttonText: "Crear cuenta gratis",
      buttonUrl: "https://pos.desktop.kitchen/#/onboarding",
    },
  ],
  relatedSlugs: ["que-es-ghost-kitchen", "pantalla-cocina-eficiente", "ia-en-la-cocina"],
};
