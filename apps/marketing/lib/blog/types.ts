export type CategorySlug =
  | "guias"
  | "ghost-kitchens"
  | "ia-tecnologia"
  | "operaciones"
  | "delivery"
  | "negocio";

export interface Category {
  slug: CategorySlug;
  label: { en: string; es: string };
  color: string; // tailwind color name (teal, purple, blue, amber, rose, green)
}

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "callout"; variant: "tip" | "warning" | "info"; title: string; text: string }
  | { type: "stat"; value: string; label: string }
  | { type: "stats"; items: { value: string; label: string }[] }
  | { type: "quote"; text: string; author?: string }
  | { type: "cta"; title: string; text: string; buttonText: string; buttonUrl: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: CategorySlug;
  date: string; // ISO date
  readTime: number; // minutes
  author: {
    name: string;
    role: { en: string; es: string };
    avatar?: string;
  };
  content: ContentBlock[];
  relatedSlugs: string[];
}
