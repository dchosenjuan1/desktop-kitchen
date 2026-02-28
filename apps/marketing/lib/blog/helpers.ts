import { BlogPost } from "./types";

export function formatDate(isoDate: string, locale: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(locale === "es" ? "es-MX" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getPostBySlug(posts: BlogPost[], slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getRelatedPosts(posts: BlogPost[], currentSlug: string, relatedSlugs: string[]): BlogPost[] {
  return relatedSlugs
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is BlogPost => p !== undefined)
    .slice(0, 3);
}

export function getPostsByCategory(posts: BlogPost[], category: string): BlogPost[] {
  if (!category || category === "all") return posts;
  return posts.filter((p) => p.category === category);
}

export function getHeadings(post: BlogPost): { id: string; text: string; level: 2 | 3 }[] {
  return post.content
    .filter((b): b is { type: "heading"; level: 2 | 3; text: string; id: string } => b.type === "heading")
    .map((b) => ({ id: b.id, text: b.text, level: b.level }));
}
