import { Category, CategorySlug } from "./types";

export const categories: Record<CategorySlug, Category> = {
  guias: {
    slug: "guias",
    label: { en: "Guides", es: "Guías" },
    color: "teal",
  },
  "ghost-kitchens": {
    slug: "ghost-kitchens",
    label: { en: "Ghost Kitchens", es: "Ghost Kitchens" },
    color: "purple",
  },
  "ia-tecnologia": {
    slug: "ia-tecnologia",
    label: { en: "AI & Technology", es: "IA y Tecnología" },
    color: "blue",
  },
  operaciones: {
    slug: "operaciones",
    label: { en: "Operations", es: "Operaciones" },
    color: "amber",
  },
  delivery: {
    slug: "delivery",
    label: { en: "Delivery", es: "Delivery" },
    color: "rose",
  },
  negocio: {
    slug: "negocio",
    label: { en: "Business", es: "Negocio" },
    color: "green",
  },
};

export const categoryList = Object.values(categories);

export const categoryColorMap: Record<string, { bg: string; text: string; border: string; bgLight: string }> = {
  teal: { bg: "bg-teal-600", text: "text-teal-400", border: "border-teal-500/30", bgLight: "bg-teal-500/10" },
  purple: { bg: "bg-purple-600", text: "text-purple-400", border: "border-purple-500/30", bgLight: "bg-purple-500/10" },
  blue: { bg: "bg-blue-600", text: "text-blue-400", border: "border-blue-500/30", bgLight: "bg-blue-500/10" },
  amber: { bg: "bg-amber-600", text: "text-amber-400", border: "border-amber-500/30", bgLight: "bg-amber-500/10" },
  rose: { bg: "bg-rose-600", text: "text-rose-400", border: "border-rose-500/30", bgLight: "bg-rose-500/10" },
  green: { bg: "bg-green-600", text: "text-green-400", border: "border-green-500/30", bgLight: "bg-green-500/10" },
};

export function getCategoryColors(color: string) {
  return categoryColorMap[color] || categoryColorMap.teal;
}
