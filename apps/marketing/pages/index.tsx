import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";

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

function IconAssistant() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

function IconFinancing() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

const featureIcons = [IconPOS, IconKitchen, IconDelivery, IconInventory, IconLoyalty, IconAI, IconAssistant, IconFinancing];

/* ── Demo Modal ── */

function DemoModal({
  open,
  onClose,
  t,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof en;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !restaurant.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          restaurant_name: restaurant.trim(),
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.existing) {
        setError("existing");
        setLoading(false);
        return;
      }
      if (res.status === 429) {
        setError("rate_limit");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("generic");
        setLoading(false);
        return;
      }

      // Redirect to demo POS
      window.location.href = `https://${data.subdomain}.desktop.kitchen/?demo_token=${data.demo_token}`;
    } catch {
      setError("generic");
      setLoading(false);
    }
  };

  const tAny = t as any;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease }}
            className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-black tracking-tight text-white mb-2">
              {tAny.demoModalTitle}
            </h3>
            <p className="text-sm text-white/40 mb-6">
              {tAny.demoModalSub}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tAny.demoModalName}
                required
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500 text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder={tAny.demoModalEmail}
                required
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500 text-sm"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={tAny.demoModalPhone}
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500 text-sm"
              />
              <input
                type="text"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                placeholder={tAny.demoModalRestaurant}
                required
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-500 text-sm"
              />

              {error === "existing" && (
                <p className="text-sm text-amber-400">
                  {tAny.demoModalExisting}{" "}
                  <a href="https://pos.desktop.kitchen/#/" className="underline hover:text-amber-300">
                    {tAny.demoModalExistingLink}
                  </a>
                </p>
              )}
              {error === "rate_limit" && (
                <p className="text-sm text-red-400">{tAny.demoModalRateLimit}</p>
              )}
              {error === "generic" && (
                <p className="text-sm text-red-400">{tAny.demoModalError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl text-sm uppercase tracking-wider transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {tAny.demoModalLoading}
                  </>
                ) : (
                  tAny.demoModalSubmit
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Pricing helpers ── */

const MXN_RATE = 17.1;

function formatMXN(usd: number) {
  if (usd === 0) return "Gratis";
  const mxn = Math.round(usd * MXN_RATE);
  // Manual thousands formatting — avoids hydration mismatch between
  // Node.js (build) and browser (client) locale implementations
  const str = mxn.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${str} MXN`;
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
  onCtaClick,
  badge,
  highlighted,
  currency,
  billing,
  annualUsd,
  t,
}: {
  name: string;
  tagline: string;
  monthlyUsd: number;
  limits: string;
  features: string[];
  missing: string[];
  cta: string;
  onCtaClick: () => void;
  badge?: string;
  highlighted?: boolean;
  currency: string;
  billing: "monthly" | "annual";
  annualUsd: number;
  t: any;
}) {
  const isAnnual = billing === "annual" && monthlyUsd > 0;
  const effectiveMonthly = isAnnual ? Math.round((annualUsd / 12) * 100) / 100 : monthlyUsd;

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
        {isAnnual && (
          <span className="text-lg text-white/30 line-through mr-2">
            {currency === "USD" ? formatUSD(monthlyUsd) : formatMXN(monthlyUsd)}
          </span>
        )}
        <span className="text-4xl font-extrabold text-white">
          {currency === "USD" ? formatUSD(effectiveMonthly) : formatMXN(effectiveMonthly)}
        </span>
        {effectiveMonthly > 0 && (
          <span className="text-white/30 text-sm ml-1">/mo</span>
        )}
      </div>

      {effectiveMonthly > 0 && (
        <p className="text-white/30 text-xs mb-1">
          {currency === "USD"
            ? `≈ ${formatMXN(effectiveMonthly)}/mes`
            : `≈ ${formatUSD(effectiveMonthly)}/mo`}
        </p>
      )}

      {isAnnual && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-green-400">
            {(t.pricingAnnualBilled || "").replace("${amount}", String(annualUsd))}
          </span>
          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold">
            {t.pricingAnnualFree}
          </span>
        </div>
      )}

      {!isAnnual && effectiveMonthly > 0 && <div className="mb-4" />}

      <div className="mb-6">
        <span className="text-xs text-teal-400 bg-teal-400/10 border border-teal-400/20 px-3 py-1 rounded-full">
          {limits}
        </span>
      </div>

      <button
        onClick={onCtaClick}
        className={`block w-full text-center font-semibold py-3 rounded-xl transition-colors cursor-pointer ${
          highlighted
            ? "bg-teal-600 hover:bg-teal-700 text-white"
            : monthlyUsd === 0
            ? "bg-white/5 hover:bg-white/10 text-white"
            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
        }`}
      >
        {cta}
      </button>
      {monthlyUsd > 0 && (
        <p className="text-[11px] text-white/25 text-center mt-2 mb-4">{t.pricingComingSoon}</p>
      )}
      {monthlyUsd === 0 && <div className="mb-6" />}

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
  { key: "free", usd: 0, annualUsd: 0, highlight: false },
  { key: "pro", usd: 60, annualUsd: 540, highlight: true },
] as const;

function PricingSection({ t, onCtaClick }: { t: typeof en; onCtaClick: () => void }) {
  const [currency, setCurrency] = useState("USD");
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const tAny = t as any;

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

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  billing === "monthly"
                    ? "bg-teal-600 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {tAny.pricingMonthly}
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                  billing === "annual"
                    ? "bg-teal-600 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {tAny.pricingAnnual}
                <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                  {tAny.pricingAnnualSave}
                </span>
              </button>
            </div>

            {/* Currency toggle */}
            <div className="mt-3 inline-flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1">
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

        <div className="mt-16 md:mt-20 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <FadeIn key={plan.key} delay={i * 0.1}>
              <PricingCard
                name={t[`pricing_${plan.key}_name` as keyof typeof t] as string}
                tagline={t[`pricing_${plan.key}_tagline` as keyof typeof t] as string}
                monthlyUsd={plan.usd}
                annualUsd={plan.annualUsd}
                limits={t[`pricing_${plan.key}_limits` as keyof typeof t] as string}
                features={t[`pricing_${plan.key}_features` as keyof typeof t] as string[]}
                missing={t[`pricing_${plan.key}_missing` as keyof typeof t] as string[]}
                cta={t[`pricing_${plan.key}_cta` as keyof typeof t] as string}
                onCtaClick={onCtaClick}
                badge={t[`pricing_${plan.key}_badge` as keyof typeof t] as string | undefined}
                highlighted={plan.highlight}
                currency={currency}
                billing={billing}
                t={tAny}
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
        name: isSpanish ? "Gratis para Siempre" : "Free for Life",
        description: isSpanish ? "50 transacciones/día, 1 marca virtual" : "50 transactions/day, 1 virtual brand",
      },
      {
        "@type": "Offer",
        price: "60",
        priceCurrency: "USD",
        name: "Pro",
        priceValidUntil: "2027-12-31",
        description: isSpanish
          ? "Todo ilimitado: marcas, sucursales, IA, delivery, lealtad y más"
          : "Unlimited everything: brands, locations, AI, delivery, loyalty and more",
      },
    ],
    featureList: isSpanish
      ? "Punto de Venta, Pantalla de Cocina, Inteligencia de Delivery, Gestión de Inventario, Lealtad y CRM, Inteligencia Artificial, Asistente IA, Financiamiento"
      : "Point of Sale, Kitchen Display, Delivery Intelligence, Inventory Management, Loyalty & CRM, AI Intelligence, AI Assistant, Financing",
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

  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const featureKeys = [1, 2, 3, 4, 5, 6, 7, 8] as const;

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
        <meta property="og:image" content={`https://${isSpanish ? "es" : "www"}.desktop.kitchen/api/og?locale=${locale}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.ogTitle} />
        <meta name="twitter:description" content={t.twitterDescription} />
        <meta name="twitter:image" content={`https://${isSpanish ? "es" : "www"}.desktop.kitchen/api/og?locale=${locale}`} />

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
            <button
              onClick={openDemo}
              className="bg-teal-600 text-white font-semibold px-8 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-teal-700 active:scale-[0.98]"
            >
              {t.heroCta}
            </button>
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

            <div className="mt-16 md:mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <button
                  onClick={openDemo}
                  className="inline-block bg-teal-600 text-white font-semibold px-8 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-teal-700 active:scale-[0.98]"
                >
                  {t.comparisonCtaButton}
                </button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <PricingSection t={t} onCtaClick={openDemo} />

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
              <button
                onClick={openDemo}
                className="mt-10 inline-block bg-white text-teal-700 font-semibold px-10 py-4 rounded text-sm uppercase tracking-wider transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
              >
                {t.ctaButton}
              </button>
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
            <button
              onClick={openDemo}
              className="hover:text-teal-500 transition-colors duration-200"
            >
              {t.footerDemo}
            </button>
          </nav>
          <p className="mt-6 text-xs text-white/15" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Desktop Kitchen. {t.footerRights}
          </p>
        </div>
      </footer>

      {/* Demo Lead Capture Modal */}
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} t={t} />
    </>
  );
};

export default Home;
