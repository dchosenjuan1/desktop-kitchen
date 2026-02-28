import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { motion, useInView } from "framer-motion";
import { BlogLayout } from "../../components/blog/BlogLayout";
import { FeaturedPost } from "../../components/blog/FeaturedPost";
import { BlogCard } from "../../components/blog/BlogCard";
import { CategoryFilter } from "../../components/blog/CategoryFilter";
import { getPostsForLocale, featuredSlug } from "../../lib/blog/posts";
import { getPostsByCategory } from "../../lib/blog/helpers";

import en from "../../messages/en.json";
import es from "../../messages/es.json";

const msgs: Record<string, typeof en> = { en, es };
const ease = [0.25, 0.4, 0.25, 1];

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function BlogIndex() {
  const { locale } = useRouter();
  const t = msgs[locale || "en"];
  const posts = getPostsForLocale(locale || "en");
  const [activeCategory, setActiveCategory] = useState("all");

  const featured = posts.find((p) => p.slug === featuredSlug);
  const otherPosts = posts.filter((p) => p.slug !== featuredSlug);
  const filteredPosts = getPostsByCategory(otherPosts, activeCategory);

  return (
    <BlogLayout
      title={t.blogTitle}
      description={t.blogDescription}
      locale={locale || "en"}
      langSwitchDomain={t.langSwitchDomain}
      langSwitchLabel={t.langSwitch}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        {/* Page header */}
        <FadeIn>
          <div className="mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-4">
              {t.blogHeadline}
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
              {t.blogSub}
            </h1>
          </div>
        </FadeIn>

        {/* Featured post */}
        {featured && (
          <FadeIn delay={0.1}>
            <div className="mb-16">
              <FeaturedPost
                post={featured}
                locale={locale || "en"}
                featuredLabel={t.blogFeatured}
                readMoreLabel={t.blogReadMore}
                readTimeLabel={t.blogReadTime}
              />
            </div>
          </FadeIn>
        )}

        {/* Category filter */}
        <FadeIn delay={0.15}>
          <div className="mb-10">
            <CategoryFilter
              active={activeCategory}
              onChange={setActiveCategory}
              locale={locale || "en"}
              allLabel={t.blogAllCategories}
            />
          </div>
        </FadeIn>

        {/* Post grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, i) => (
            <FadeIn key={post.slug} delay={i * 0.05}>
              <BlogCard
                post={post}
                locale={locale || "en"}
                readMoreLabel={t.blogReadMore}
                readTimeLabel={t.blogReadTime}
              />
            </FadeIn>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/30 text-lg">
              {locale === "es"
                ? "No hay artículos en esta categoría todavía."
                : "No articles in this category yet."}
            </p>
          </div>
        )}

        {/* CTA */}
        <FadeIn>
          <div className="mt-20 bg-teal-600/10 border border-teal-500/20 rounded-2xl p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {t.blogCtaTitle}
            </h2>
            <p className="text-white/50 mb-8 max-w-lg mx-auto">{t.blogCtaSub}</p>
            <a
              href="https://pos.desktop.kitchen/#/onboarding"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-4 rounded text-sm uppercase tracking-wider transition-colors"
            >
              {t.blogCtaButton}
            </a>
          </div>
        </FadeIn>
      </div>
    </BlogLayout>
  );
}
