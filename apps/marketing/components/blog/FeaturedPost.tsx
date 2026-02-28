import Link from "next/link";
import { BlogPost } from "../../lib/blog/types";
import { categories, getCategoryColors } from "../../lib/blog/categories";
import { formatDate } from "../../lib/blog/helpers";
import { HeroImage } from "./HeroImage";

export function FeaturedPost({
  post,
  locale,
  featuredLabel,
  readMoreLabel,
  readTimeLabel,
}: {
  post: BlogPost;
  locale: string;
  featuredLabel: string;
  readMoreLabel: string;
  readTimeLabel: string;
}) {
  const cat = categories[post.category];
  const colors = getCategoryColors(cat.color);

  return (
    <Link href={`/blog/${post.slug}`}>
      <a className="group block">
        <div className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="grid md:grid-cols-2 gap-0">
            <HeroImage category={post.category} size="lg" />
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-600 text-white uppercase tracking-wider">
                  {featuredLabel}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors.bgLight} ${colors.text} border ${colors.border}`}
                >
                  {cat.label[locale as "en" | "es"]}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4 group-hover:text-teal-400 transition-colors leading-tight">
                {post.title}
              </h2>
              <p className="text-white/40 leading-relaxed mb-6 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-white/30">
                <span>{formatDate(post.date, locale)}</span>
                <span>&middot;</span>
                <span>
                  {post.readTime} {readTimeLabel}
                </span>
              </div>
              <div className="mt-6">
                <span className="text-sm text-teal-500 font-semibold group-hover:text-teal-400 transition-colors">
                  {readMoreLabel} &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </a>
    </Link>
  );
}
