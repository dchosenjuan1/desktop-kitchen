import Link from "next/link";
import { BlogPost } from "../../lib/blog/types";
import { categories, getCategoryColors } from "../../lib/blog/categories";
import { formatDate } from "../../lib/blog/helpers";
import { HeroImage } from "./HeroImage";

export function BlogCard({
  post,
  locale,
  readMoreLabel,
  readTimeLabel,
}: {
  post: BlogPost;
  locale: string;
  readMoreLabel: string;
  readTimeLabel: string;
}) {
  const cat = categories[post.category];
  const colors = getCategoryColors(cat.color);

  return (
    <Link href={`/blog/${post.slug}`}>
      <a className="group block bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
        <HeroImage category={post.category} size="sm" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors.bgLight} ${colors.text} border ${colors.border}`}
            >
              {cat.label[locale as "en" | "es"]}
            </span>
            <span className="text-xs text-white/30">
              {post.readTime} {readTimeLabel}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-teal-400 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-white/40 leading-relaxed line-clamp-2 mb-4">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/20">{formatDate(post.date, locale)}</span>
            <span className="text-xs text-teal-500 font-semibold group-hover:text-teal-400 transition-colors">
              {readMoreLabel} &rarr;
            </span>
          </div>
        </div>
      </a>
    </Link>
  );
}
