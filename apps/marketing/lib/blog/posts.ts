import { BlogPost } from "./types";

import { post as queEsGhostKitchen } from "./posts/que-es-ghost-kitchen";
import { post as guiaCompletaDesktopKitchen } from "./posts/guia-completa-desktop-kitchen";
import { post as comisionesRappiUberDidi } from "./posts/comisiones-rappi-uber-didi";
import { post as iaEnLaCocina } from "./posts/ia-en-la-cocina";
import { post as reducirMermaRestaurante } from "./posts/reducir-merma-restaurante";
import { post as marcasVirtualesDelivery } from "./posts/marcas-virtuales-delivery";
import { post as fidelizarClientesDelivery } from "./posts/fidelizar-clientes-delivery";
import { post as pantallaCocinaEficiente } from "./posts/pantalla-cocina-eficiente";
import { post as posTradicionalVsModerno } from "./posts/pos-tradicional-vs-moderno";
import { post as automatizarInventarioIa } from "./posts/automatizar-inventario-ia";

import { post as queEsGhostKitchenEn } from "./posts-en/que-es-ghost-kitchen";
import { post as guiaCompletaDesktopKitchenEn } from "./posts-en/guia-completa-desktop-kitchen";
import { post as comisionesRappiUberDidiEn } from "./posts-en/comisiones-rappi-uber-didi";
import { post as iaEnLaCocinaEn } from "./posts-en/ia-en-la-cocina";
import { post as reducirMermaRestauranteEn } from "./posts-en/reducir-merma-restaurante";
import { post as marcasVirtualesDeliveryEn } from "./posts-en/marcas-virtuales-delivery";
import { post as fidelizarClientesDeliveryEn } from "./posts-en/fidelizar-clientes-delivery";
import { post as pantallaCocinaEficienteEn } from "./posts-en/pantalla-cocina-eficiente";
import { post as posTradicionalVsModernoEn } from "./posts-en/pos-tradicional-vs-moderno";
import { post as automatizarInventarioIaEn } from "./posts-en/automatizar-inventario-ia";

export const postsEs: BlogPost[] = [
  queEsGhostKitchen,
  guiaCompletaDesktopKitchen,
  comisionesRappiUberDidi,
  iaEnLaCocina,
  reducirMermaRestaurante,
  marcasVirtualesDelivery,
  fidelizarClientesDelivery,
  pantallaCocinaEficiente,
  posTradicionalVsModerno,
  automatizarInventarioIa,
];

export const postsEn: BlogPost[] = [
  queEsGhostKitchenEn,
  guiaCompletaDesktopKitchenEn,
  comisionesRappiUberDidiEn,
  iaEnLaCocinaEn,
  reducirMermaRestauranteEn,
  marcasVirtualesDeliveryEn,
  fidelizarClientesDeliveryEn,
  pantallaCocinaEficienteEn,
  posTradicionalVsModernoEn,
  automatizarInventarioIaEn,
];

export function getPostsForLocale(locale: string): BlogPost[] {
  return locale === "es" ? postsEs : postsEn;
}

export const featuredSlug = "que-es-ghost-kitchen";
