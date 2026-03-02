import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
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

/* ── Pricing helpers ── */

const MXN_RATE = 19.5;

function formatMXN(usd: number) {
  if (usd === 0) return "Gratis";
  return `${Math.round(usd * MXN_RATE).toLocaleString("es-MX")} MXN`;
}

function formatUSD(usd: number) {
  if (usd === 0) return "Free";
  return `$${usd} USD`;
}

/* ── Pricing Card ── */

function PricingCard({
  name,
  tagline,
  monthlyUsd,
  limits,
  features,
  missing,
  cta,
  ctaLink,
  badge,
  highlighted,
  currency,
}: {
  name: string;
  tagline: string;
  monthlyUsd: number;
  limits: string;
  features: string[];
  missing: string[];
  cta: string;
  ctaLink: string;
  badge?: string;
  highlighted?: boolean;
  currency: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        highlighted
          ? "bg-teal-600/10 border-teal-500 ring-1 ring-teal-500/40"
          : "bg-white/[0.03] border-white/10"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-white font-bold text-lg">{name}</h3>
        <p className="text-white/40 text-sm mt-1">{tagline}</p>
      </div>

      <div className="mb-2">
        <span className="text-4xl font-extrabold text-white">
          {currency === "USD" ? formatUSD(monthlyUsd) : formatMXN(monthlyUsd)}
        </span>
        {monthlyUsd > 0 && (
          <span className="text-white/30 text-sm ml-1">/mo</span>
        )}
      </div>

      {monthlyUsd > 0 && (
        <p className="text-white/30 text-xs mb-4">
          {currency === "USD"
            ? `≈ ${formatMXN(monthlyUsd)}/mes`
            : `≈ ${formatUSD(monthlyUsd)}/mo`}
        </p>
      )}

      <div className="mb-6">
        <span className="text-xs text-teal-400 bg-teal-400/10 border border-teal-400/20 px-3 py-1 rounded-full">
          {limits}
        </span>
      </div>

      <a
        href={ctaLink}
        className={`block text-center font-semibold py-3 rounded-xl mb-6 transition-colors ${
          highlighted
            ? "bg-teal-600 hover:bg-teal-700 text-white"
            : monthlyUsd === 0
            ? "bg-white/5 hover:bg-white/10 text-white"
            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
        }`}
      >
        {cta}
      </a>

      <ul className="space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="text-white/60">{f}</span>
          </li>
        ))}
        {missing.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span className="text-white/10 mt-0.5 shrink-0">&#10007;</span>
            <span className="text-white/20">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Pricing Section ── */

const pricingPlans = [
  { key: "free", usd: 0, highlight: false, ctaLink: "https://pos.desktop.kitchen/#/onboarding" },
  { key: "starter", usd: 29, highlight: false, ctaLink: "https://pos.desktop.kitchen/#/onboarding" },
  { key: "pro", usd: 79, highlight: true, ctaLink: "https://pos.desktop.kitchen/#/onboarding" },
  { key: "ghost", usd: 129, highlight: false, ctaLink: "https://pos.desktop.kitchen/#/onboarding" },
] as const;

function PricingSection({ t }: { t: typeof en }) {
  const [currency, setCurrency] = useState("USD");

  return (
    <section id="precios" className="py-24 md:py-40 px-6 bg-neutral-950" aria-labelledby="pricing-heading">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
              {t.pricingLabel}
            </p>
            <h2 id="pricing-heading" className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
              {t.pricingHeadline}
            </h2>
            <p className="mt-6 text-lg text-white/40 max-w-xl mx-auto">
              {t.pricingSub}
            </p>

            <div className="mt-8 inline-flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setCurrency("USD")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currency === "USD"
                    ? "bg-teal-600 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency("MXN")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currency === "MXN"
                    ? "bg-teal-600 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                MXN
              </button>
            </div>
          </div>
        </FadeIn>

        <div className="mt-16 md:mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan, i) => (
            <FadeIn key={plan.key} delay={i * 0.1}>
              <PricingCard
                name={t[`pricing_${plan.key}_name` as keyof typeof t] as string}
                tagline={t[`pricing_${plan.key}_tagline` as keyof typeof t] as string}
                monthlyUsd={plan.usd}
                limits={t[`pricing_${plan.key}_limits` as keyof typeof t] as string}
                features={t[`pricing_${plan.key}_features` as keyof typeof t] as string[]}
                missing={t[`pricing_${plan.key}_missing` as keyof typeof t] as string[]}
                cta={t[`pricing_${plan.key}_cta` as keyof typeof t] as string}
                ctaLink={plan.ctaLink}
                badge={t[`pricing_${plan.key}_badge` as keyof typeof t] as string | undefined}
                highlighted={plan.highlight}
                currency={currency}
              />
            </FadeIn>
          ))}
        </div>

        <div className="mt-12 text-center text-white/30 text-sm space-y-1">
          <p>{t.pricingFooter1}</p>
          <p>{t.pricingFooter2}</p>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ Section ── */

function FAQSection({ t, locale }: { t: any; locale: string }) {
  const faqItems = t.faqItems;
  if (!faqItems || !Array.isArray(faqItems)) return null;

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="preguntas-frecuentes" className="py-24 md:py-40 px-6 bg-neutral-900" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
              {t.faqLabel}
            </p>
            <h2 id="faq-heading" className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
              {t.faqHeadline}
            </h2>
          </div>
        </FadeIn>

        <div className="space-y-4">
          {faqItems.map((item: { q: string; a: string }, i: number) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                  aria-expanded={openIndex === i}
                >
                  <h3 className="text-white font-semibold text-base sm:text-lg pr-4">{item.q}</h3>
                  <svg
                    className={`w-5 h-5 text-teal-500 shrink-0 transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-5">
                    <p className="text-white/50 text-sm sm:text-base leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Structured Data (JSON-LD) ── */

function StructuredData({ locale, t }: { locale: string; t: typeof en }) {
  const isSpanish = locale === "es";
  const domain = isSpanish ? "es.desktop.kitchen" : "www.desktop.kitchen";
  const url = `https://${domain}`;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Desktop Kitchen",
    url: "https://www.desktop.kitchen",
    logo: `${url}/logo.svg`,
    description: isSpanish
      ? "Software punto de venta para restaurantes y ghost kitchens en México"
      : "POS software for restaurants and ghost kitchens",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      availableLanguage: ["Spanish", "English"],
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Desktop Kitchen POS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    url: url,
    description: t.description,
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        name: isSpanish ? "Plan Gratis" : "Free Plan",
        description: isSpanish ? "50 transacciones/día, 1 marca virtual" : "50 transactions/day, 1 virtual brand",
      },
      {
        "@type": "Offer",
        price: "29",
        priceCurrency: "USD",
        name: "Starter",
        priceValidUntil: "2026-12-31",
        description: isSpanish
          ? "Transacciones ilimitadas, integración con Rappi, Uber Eats y DiDi"
          : "Unlimited transactions, Rappi, Uber Eats & DiDi integration",
      },
      {
        "@type": "Offer",
        price: "79",
        priceCurrency: "USD",
        name: "Pro",
        priceValidUntil: "2026-12-31",
        description: isSpanish
          ? "IA, marcas virtuales, P&L multi-marca por plataforma"
          : "AI, virtual brands, multi-brand P&L by platform",
      },
    ],
    featureList: isSpanish
      ? "Punto de Venta, Pantalla de Cocina, Inteligencia de Delivery, Gestión de Inventario, Lealtad y CRM, Inteligencia Artificial"
      : "Point of Sale, Kitchen Display, Delivery Intelligence, Inventory Management, Loyalty & CRM, AI Intelligence",
    screenshot: `${url}/logo.svg`,
    aggregateRating: undefined,
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t.title,
    description: t.description,
    url: url,
    inLanguage: isSpanish ? "es-MX" : "en",
    isPartOf: {
      "@type": "WebSite",
      name: "Desktop Kitchen",
      url: "https://www.desktop.kitchen",
    },
  };

  // FAQ schema for Spanish (where we have FAQ items)
  const tAny = t as any;
  const faqSchema = tAny.faqItems
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: tAny.faqItems.map((item: { q: string; a: string }) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      }
    : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Desktop Kitchen",
        item: "https://www.desktop.kitchen",
      },
      ...(isSpanish
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: "Sistema Punto de Venta para Restaurantes en México",
              item: "https://es.desktop.kitchen",
            },
          ]
        : []),
    ],
  };

  const schemas: Record<string, any>[] = [organizationSchema, softwareSchema, webPageSchema, breadcrumbSchema];
  if (faqSchema) schemas.push(faqSchema);

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

/* ── Page ── */

const Home: NextPage = () => {
  const { locale } = useRouter();
  const t = messages[locale || "en"];
  const isSpanish = locale === "es";
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
        <meta property="og:type" content="website" />
        <meta property="og:url" content={isSpanish ? "https://es.desktop.kitchen" : "https://www.desktop.kitchen"} />
        <meta property="og:locale" content={isSpanish ? "es_MX" : "en_US"} />
        <meta property="og:locale:alternate" content={isSpanish ? "en_US" : "es_MX"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.ogTitle} />
        <meta name="twitter:description" content={t.twitterDescription} />

        {/* Additional SEO meta tags for Spanish page targeting Mexico */}
        {isSpanish && (
          <>
            <meta name="keywords" content="sistema punto de venta, POS restaurante, software punto de venta México, ghost kitchen, cocina fantasma, punto de venta para restaurantes, POS delivery, Rappi Uber Eats DiDi, software restaurante México, sistema POS, punto de venta gratis" />
          </>
        )}
      </Head>

      {/* Structured Data */}
      <StructuredData locale={locale || "en"} t={t} />

      {/* Top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-teal-600 z-50" aria-hidden="true" />

      {/* Navigation with language switcher */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between" aria-label={isSpanish ? "Navegación principal" : "Main navigation"}>
        <a href={isSpanish ? "https://es.desktop.kitchen" : "https://www.desktop.kitchen"} className="flex items-center gap-2" aria-label="Desktop Kitchen - Inicio">
          <img src="/logo.svg" alt="Desktop Kitchen" className="w-8 h-8" width={32} height={32} />
          <span className="text-white font-bold text-sm tracking-tight hidden sm:inline">Desktop Kitchen</span>
        </a>
        <div className="flex items-center gap-4">
          {isSpanish && (
            <div className="hidden sm:flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] text-white/30">
              <a href="#funciones" className="hover:text-white/60 transition-colors">Funciones</a>
              <a href="#precios" className="hover:text-white/60 transition-colors">Precios</a>
              <a href="/blog" className="hover:text-white/60 transition-colors">Blog</a>
            </div>
          )}
          <a
            href={`https://${(t as any).langSwitchDomain}`}
            className="text-[11px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors duration-200 font-mono"
            hrefLang={otherLocale}
          >
            {t.langSwitch}
          </a>
        </div>
      </nav>

      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

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
              alt="Desktop Kitchen — Sistema Punto de Venta para Restaurantes"
              className="mx-auto w-16 h-16"
              width={64}
              height={64}
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
              href="https://pos.desktop.kitchen/#/onboarding"
              className="bg-teal-600 text-white font-semibold px-8 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-teal-700 active:scale-[0.98]"
            >
              {t.heroCta}
            </a>
            <a
              href={isSpanish ? "#funciones" : "#features"}
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
          aria-hidden="true"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" />
        </motion.div>
      </header>

      <main>
        {/* ─── FEATURES ─── */}
        <section id={isSpanish ? "funciones" : "features"} className="py-24 md:py-40 px-6 bg-neutral-950" aria-labelledby="features-heading">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
                {t.featuresLabel}
              </p>
              <h2 id="features-heading" className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
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
                    <article className="group bg-white/[0.03] border border-white/5 rounded-lg p-6 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                      <div className="w-12 h-12 rounded-lg bg-teal-600/10 flex items-center justify-center text-teal-500 mb-5 group-hover:bg-teal-600/20 transition-colors duration-300" aria-hidden="true">
                        <Icon />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                    </article>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id={isSpanish ? "como-funciona" : "how-it-works"} className="py-24 md:py-40 px-6 bg-neutral-900" aria-labelledby="how-heading">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
                {t.howLabel}
              </p>
              <h2 id="how-heading" className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
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
                    <article>
                      <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 flex items-center justify-center text-teal-500 font-bold text-lg mb-6" aria-hidden="true">
                        {n}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                    </article>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── COMPARISON ─── */}
        <section id={isSpanish ? "comparacion" : "comparison"} className="py-24 md:py-40 px-6 bg-neutral-950" aria-labelledby="comparison-heading">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <p className="text-xs uppercase tracking-[0.3em] text-teal-500/60 font-mono mb-6">
                  {t.comparisonLabel}
                </p>
                <h2 id="comparison-heading" className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-[0.85]">
                  {t.comparisonHeadline}
                </h2>
                <p className="mt-6 text-lg text-white/40 max-w-2xl mx-auto">
                  {t.comparisonSub}
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="rounded-2xl overflow-hidden border border-white/10">
                {/* Table Header */}
                <div className="grid grid-cols-2 bg-white/[0.06]">
                  <div className="px-6 sm:px-8 py-4 text-white/40 font-semibold text-sm uppercase tracking-wider border-r border-white/10">
                    {t.comparisonTraditional}
                  </div>
                  <div className="px-6 sm:px-8 py-4 text-teal-500 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                    <span>{t.comparisonDesktopKitchen}</span>
                    <span className="hidden sm:inline bg-teal-600/10 text-teal-500 text-xs px-2 py-0.5 rounded-full border border-teal-500/20">
                      {t.comparisonBadge}
                    </span>
                  </div>
                </div>

                {/* Rows */}
                {t.comparisonPains.map((pain: string, i: number) => (
                  <div
                    key={i}
                    className={`grid grid-cols-2 border-t border-white/10 ${
                      i % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.015]"
                    }`}
                  >
                    <div className="px-6 sm:px-8 py-5 flex items-start gap-3 border-r border-white/10">
                      <span className="text-red-400 text-lg flex-shrink-0 leading-6" aria-hidden="true">&#10007;</span>
                      <span className="text-white/40 text-sm sm:text-base">{pain}</span>
                    </div>
                    <div className="px-6 sm:px-8 py-5 flex items-start gap-3">
                      <span className="text-teal-500 text-lg flex-shrink-0 leading-6" aria-hidden="true">&#10003;</span>
                      <span className="text-white text-sm sm:text-base">{(t.comparisonDesktop as string[])[i]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Pull Quote */}
            <FadeIn delay={0.2}>
              <blockquote className="mt-12 bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-8 text-center">
                <p className="text-lg sm:text-xl text-white font-medium max-w-3xl mx-auto leading-relaxed">
                  &ldquo;{t.comparisonQuote}&rdquo;
                </p>
                <footer className="text-white/30 mt-4 text-sm">
                  <cite className="not-italic">{t.comparisonQuoteAuthor}</cite>
                </footer>
              </blockquote>
            </FadeIn>

            {/* CTA */}
            <FadeIn delay={0.3}>
              <div className="mt-12 text-center">
                <p className="text-white/40 mb-6">
                  {t.comparisonCtaText}
                </p>
                <a
                  href="https://pos.desktop.kitchen/#/onboarding"
                  className="inline-block bg-teal-600 text-white font-semibold px-8 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-teal-700 active:scale-[0.98]"
                >
                  {t.comparisonCtaButton}
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <PricingSection t={t} />

        {/* ─── FAQ (Spanish only for now) ─── */}
        <FAQSection t={t} locale={locale || "en"} />

        {/* ─── FINAL CTA ─── */}
        <section className="py-24 md:py-32 px-6 bg-teal-600" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto text-center">
            <FadeIn>
              <h2 id="cta-heading" className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
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
                href="https://pos.desktop.kitchen/#/onboarding"
                className="mt-10 inline-block bg-white text-teal-700 font-semibold px-10 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
              >
                {t.ctaButton}
              </a>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-6 bg-neutral-950 border-t border-white/5" role="contentinfo">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.svg" alt="Desktop Kitchen" className="w-8 h-8" width={32} height={32} />
            <p className="text-xl font-black tracking-tighter text-white">
              {t.footerBrand}
            </p>
          </div>
          {/* Footer tagline for SEO keyword reinforcement */}
          {(t as any).footerTagline && (
            <p className="text-xs text-white/20 mb-4">{(t as any).footerTagline}</p>
          )}
          <nav className="flex items-center justify-center gap-6 text-sm text-white/40" aria-label={isSpanish ? "Enlaces del pie de página" : "Footer links"}>
            <a
              href="https://docs.desktop.kitchen"
              className="hover:text-teal-500 transition-colors duration-200"
            >
              {t.footerDocs}
            </a>
            <span className="text-white/10" aria-hidden="true">|</span>
            <a
              href="/blog"
              className="hover:text-teal-500 transition-colors duration-200"
            >
              {(t as any).footerBlog || "Blog"}
            </a>
            <span className="text-white/10" aria-hidden="true">|</span>
            <a
              href="https://pos.desktop.kitchen/#/onboarding"
              className="hover:text-teal-500 transition-colors duration-200"
            >
              {t.footerDemo}
            </a>
          </nav>
          <p className="mt-6 text-xs text-white/15">
            &copy; {new Date().getFullYear()} Desktop Kitchen. {t.footerRights}
          </p>
        </div>
      </footer>
    </>
  );
};

export default Home;
