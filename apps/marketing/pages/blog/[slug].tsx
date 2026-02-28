import { useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetStaticPaths, GetStaticProps } from "next";
import { motion, useInView } from "framer-motion";
import { BlogLayout } from "../../components/blog/BlogLayout";
import { PostContent } from "../../components/blog/PostContent";
import { TableOfContents } from "../../components/blog/TableOfContents";
import { AuthorCard } from "../../components/blog/AuthorCard";
import { RelatedPosts } from "../../components/blog/RelatedPosts";
import { ShareButtons } from "../../components/blog/ShareButtons";
import { HeroImage } from "../../components/blog/HeroImage";
import { categories, getCategoryColors } from "../../lib/blog/categories";
import { getPostsForLocale } from "../../lib/blog/posts";
import { postsEs } from "../../lib/blog/posts";
import { formatDate, getHeadings, getRelatedPosts } from "../../lib/blog/helpers";
import { BlogPost } from "../../lib/blog/types";

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

interface PostPageProps {
  slug: string;
}

export default function PostPage({ slug }: PostPageProps) {
  const { locale } = useRouter();
  const t = msgs[locale || "en"];
  const posts = getPostsForLocale(locale || "en");
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <BlogLayout
        title="Not Found"
        description=""
        locale={locale || "en"}
        langSwitchDomain={t.langSwitchDomain}
        langSwitchLabel={t.langSwitch}
      >
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Post not found</h1>
          <Link href="/blog">
            <a className="text-teal-500 hover:text-teal-400">{t.blogBack}</a>
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const cat = categories[post.category];
  const colors = getCategoryColors(cat.color);
  const headings = getHeadings(post);
  const related = getRelatedPosts(posts, post.slug, post.relatedSlugs);
  const postUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <BlogLayout
      title={`${post.title} — Desktop Kitchen Blog`}
      description={post.excerpt}
      locale={locale || "en"}
      langSwitchDomain={t.langSwitchDomain}
      langSwitchLabel={t.langSwitch}
    >
      {/* Hero */}
      <div className="relative">
        <HeroImage category={post.category} size="lg" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent px-6 pt-20 pb-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors.bgLight} ${colors.text} border ${colors.border}`}
                >
                  {cat.label[(locale || "en") as "en" | "es"]}
                </span>
                <span className="text-xs text-white/30">
                  {post.readTime} {t.blogReadTime}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                {post.title}
              </h1>
              <div className="mt-4 flex items-center gap-4 text-sm text-white/30">
                <span>{post.author.name}</span>
                <span>&middot;</span>
                <span>{formatDate(post.date, locale || "en")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1fr_3fr_1fr] gap-8">
          {/* Share buttons (left sidebar on lg) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <ShareButtons
                url={postUrl}
                title={post.title}
                shareLabel={t.blogShareTitle}
                copyLabel={t.blogShareCopy}
                copiedLabel={t.blogShareCopied}
              />
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-3xl">
            <FadeIn>
              <PostContent blocks={post.content} />
            </FadeIn>

            {/* Mobile share buttons */}
            <div className="lg:hidden mt-10 flex gap-3">
              <ShareButtons
                url={postUrl}
                title={post.title}
                shareLabel={t.blogShareTitle}
                copyLabel={t.blogShareCopy}
                copiedLabel={t.blogShareCopied}
              />
            </div>

            {/* Author */}
            <FadeIn>
              <div className="mt-12">
                <AuthorCard
                  name={post.author.name}
                  role={post.author.role[(locale || "en") as "en" | "es"]}
                />
              </div>
            </FadeIn>
          </div>

          {/* TOC (right sidebar on lg) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents headings={headings} label={t.blogToc} />
            </div>
          </div>
        </div>

        {/* Related posts */}
        <FadeIn>
          <RelatedPosts
            posts={related}
            locale={locale || "en"}
            label={t.blogRelated}
            readMoreLabel={t.blogReadMore}
            readTimeLabel={t.blogReadTime}
          />
        </FadeIn>

        {/* CTA */}
        <FadeIn>
          <div className="mt-16 bg-teal-600/10 border border-teal-500/20 rounded-2xl p-10 md:p-14 text-center">
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

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link href="/blog">
            <a className="text-sm text-white/30 hover:text-teal-500 transition-colors">
              &larr; {t.blogBack}
            </a>
          </Link>
        </div>
      </div>
    </BlogLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = postsEs.map((p) => p.slug);
  const paths: { params: { slug: string }; locale: string }[] = [];

  for (const slug of slugs) {
    paths.push({ params: { slug }, locale: "en" });
    paths.push({ params: { slug }, locale: "es" });
  }

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<PostPageProps> = async ({ params }) => {
  return {
    props: {
      slug: params?.slug as string,
    },
  };
};
