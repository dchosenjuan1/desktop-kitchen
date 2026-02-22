import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

import en from "../messages/en.json";
import es from "../messages/es.json";

const messages: Record<string, typeof en> = { en, es };

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

/* ── Inline SVG Icons for Features ── */

function IconPOS() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function IconKitchen() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconDelivery() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 0V6.75a2.25 2.25 0 00-2.25-2.25H6.375a2.25 2.25 0 00-2.25 2.25v7.5" />
    </svg>
  );
}

function IconInventory() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function IconLoyalty() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function IconAI() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

const featureIcons = [IconPOS, IconKitchen, IconDelivery, IconInventory, IconLoyalty, IconAI];

/* ── Pricing Card ── */

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  badge,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  badge?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg p-8 flex flex-col ${
        highlighted
          ? "bg-teal-600/10 border-2 border-teal-500/40 ring-1 ring-teal-500/20"
          : "bg-white/[0.03] border border-white/10"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-xs font-semibold px-4 py-1 rounded-full uppercase tracking-wider">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-bold text-white">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-black text-white">{price}</span>
        <span className="text-sm text-white/40">{period}</span>
      </div>
      <ul className="mt-8 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-white/60">
            <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <a
        href="https://pos.desktop.kitchen"
        className={`mt-8 block text-center py-3 px-6 rounded text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${
          highlighted
            ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]"
            : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

/* ── Page ── */

const Home: NextPage = () => {
  const { locale } = useRouter();
  const t = messages[locale || "en"];
  const otherLocale = locale === "es" ? "en" : "es";

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const featureKeys = [1, 2, 3, 4, 5, 6] as const;

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta name="description" content={t.description} />
        <meta property="og:site_name" content="Desktop Kitchen" />
        <meta property="og:description" content={t.ogDescription} />
        <meta property="og:title" content={t.ogTitle} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.ogTitle} />
        <meta name="twitter:description" content={t.twitterDescription} />
      </Head>

      {/* Top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-teal-600 z-50" />

      {/* Language switcher — links between subdomains */}
      <a
        href={`https://${t.langSwitchDomain}`}
        className="fixed top-4 right-6 z-50 text-[11px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors duration-200 font-mono"
      >
        {t.langSwitch}
      </a>

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* ─── HERO ─── */}
      <header
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden hero-bg"
      >
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease }}
            className="mb-10"
          >
            <img
              src="/logo.svg"
              alt="Desktop Kitchen"
              className="mx-auto w-16 h-16"
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-[0.85] tracking-tighter text-white"
          >
            {t.heroHeadline1}
            <br />
            <span className="text-teal-500">{t.heroHeadline2}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease }}
            className="mt-8 text-base sm:text-lg md:text-xl text-white/40 font-medium max-w-2xl mx-auto"
          >
            {t.heroSub}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="https://pos.desktop.kitchen"
              className="bg-teal-600 text-white font-semibold px-8 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-teal-700 active:scale-[0.98]"
            >
              {t.heroCta}
            </a>
            <a
              href="#features"
              className="text-white/40 font-medium text-sm uppercase tracking-wider hover:text-white/60 transition-colors duration-200"
            >
              {t.heroCtaSecondary} &darr;
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" />
        </motion.div>
      </header>

      <main>
        {/* ─── FEATURES ─── */}
        <section id="features" className="py-24 md:py-40 px-6 bg-neutral-950">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
                {t.featuresLabel}
              </p>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
                {t.featuresHeadline}
              </h2>
              <p className="mt-6 text-lg text-white/40 max-w-xl">
                {t.featuresSub}
              </p>
            </FadeIn>

            <div className="mt-16 md:mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureKeys.map((n, i) => {
                const Icon = featureIcons[i];
                const title = t[`feature${n}Title` as keyof typeof t] as string;
                const desc = t[`feature${n}Desc` as keyof typeof t] as string;
                return (
                  <FadeIn key={n} delay={i * 0.08}>
                    <div className="group bg-white/[0.03] border border-white/5 rounded-lg p-6 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                      <div className="w-12 h-12 rounded-lg bg-teal-600/10 flex items-center justify-center text-teal-500 mb-5 group-hover:bg-teal-600/20 transition-colors duration-300">
                        <Icon />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-24 md:py-40 px-6 bg-neutral-900">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
                {t.howLabel}
              </p>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
                {t.howHeadline}
              </h2>
              <p className="mt-6 text-lg text-white/40 max-w-xl">
                {t.howSub}
              </p>
            </FadeIn>

            <div className="mt-16 md:mt-20 grid md:grid-cols-3 gap-12">
              {([1, 2, 3] as const).map((n, i) => {
                const title = t[`howStep${n}Title` as keyof typeof t] as string;
                const desc = t[`howStep${n}Desc` as keyof typeof t] as string;
                return (
                  <FadeIn key={n} delay={i * 0.12}>
                    <div>
                      <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 flex items-center justify-center text-teal-500 font-bold text-lg mb-6">
                        {n}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section id="pricing" className="py-24 md:py-40 px-6 bg-neutral-950">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
                  {t.pricingLabel}
                </p>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
                  {t.pricingHeadline}
                </h2>
                <p className="mt-6 text-lg text-white/40 max-w-xl mx-auto">
                  {t.pricingSub}
                </p>
              </div>
            </FadeIn>

            <div className="mt-16 md:mt-20 grid md:grid-cols-3 gap-6">
              <FadeIn delay={0}>
                <PricingCard
                  name={t.pricingTrial}
                  price={t.pricingTrialPrice}
                  period={t.pricingTrialPeriod}
                  features={t.pricingTrialFeatures}
                  cta={t.pricingTrialCta}
                />
              </FadeIn>
              <FadeIn delay={0.1}>
                <PricingCard
                  name={t.pricingStarter}
                  price={t.pricingStarterPrice}
                  period={t.pricingStarterPeriod}
                  features={t.pricingStarterFeatures}
                  cta={t.pricingStarterCta}
                  badge={t.pricingStarterBadge}
                  highlighted
                />
              </FadeIn>
              <FadeIn delay={0.2}>
                <PricingCard
                  name={t.pricingPro}
                  price={t.pricingProPrice}
                  period={t.pricingProPeriod}
                  features={t.pricingProFeatures}
                  cta={t.pricingProCta}
                />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-24 md:py-32 px-6 bg-teal-600">
          <div className="max-w-4xl mx-auto text-center">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
                {t.ctaHeadline}
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto">
                {t.ctaSub}
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <a
                href="https://pos.desktop.kitchen"
                className="mt-10 inline-block bg-white text-teal-700 font-semibold px-10 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
              >
                {t.ctaButton}
              </a>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-6 bg-neutral-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.svg" alt="Desktop Kitchen" className="w-8 h-8" />
            <p className="text-xl font-black tracking-tighter text-white">
              {t.footerBrand}
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <a
              href="https://docs.desktop.kitchen"
              className="hover:text-teal-500 transition-colors duration-200"
            >
              {t.footerDocs}
            </a>
            <span className="text-white/10">|</span>
            <a
              href="https://pos.desktop.kitchen"
              className="hover:text-teal-500 transition-colors duration-200"
            >
              {t.footerDemo}
            </a>
          </div>
          <p className="mt-6 text-xs text-white/15">
            &copy; {new Date().getFullYear()} Desktop Kitchen. {t.footerRights}
          </p>
        </div>
      </footer>
    </>
  );
};

export default Home;
