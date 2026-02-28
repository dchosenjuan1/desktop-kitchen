import { BlogPost } from "../../lib/blog/types";
import { BlogCard } from "./BlogCard";

export function RelatedPosts({
  posts,
  locale,
  label,
  readMoreLabel,
  readTimeLabel,
}: {
  posts: BlogPost[];
  locale: string;
  label: string;
  readMoreLabel: string;
  readTimeLabel: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-8">{label}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogCard
            key={post.slug}
            post={post}
            locale={locale}
            readMoreLabel={readMoreLabel}
            readTimeLabel={readTimeLabel}
          />
        ))}
      </div>
    </section>
  );
}
