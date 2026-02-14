import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

const menuItems = [
  {
    name: "El Clásico",
    description:
      "Carne asada, cilantro rice, black beans, pico de gallo, sour cream, guacamole. The OG.",
    price: "$12.99",
    tag: "BEST SELLER",
    emoji: "🥩",
  },
  {
    name: "Pollo Loco",
    description:
      "Grilled chicken, chipotle crema, roasted corn salsa, queso fresco, pickled jalapeños.",
    price: "$11.99",
    tag: "SPICY",
    emoji: "🍗",
  },
  {
    name: "El Vegano",
    description:
      "Sofritas, coconut lime rice, black beans, mango habanero salsa, cashew crema.",
    price: "$11.49",
    tag: "PLANT-BASED",
    emoji: "🌱",
  },
  {
    name: "Breakfast Beast",
    description:
      "Scrambled eggs, chorizo, crispy hash browns, melted cheese, salsa verde. Available all day.",
    price: "$10.99",
    tag: "ALL DAY",
    emoji: "🍳",
  },
  {
    name: "Mar y Tierra",
    description:
      "Grilled shrimp & steak, garlic butter rice, cabbage slaw, chipotle aioli, cotija cheese.",
    price: "$14.99",
    tag: "PREMIUM",
    emoji: "🦐",
  },
  {
    name: "El Diablo",
    description:
      "Double carne asada, ghost pepper salsa, habanero cheese, pickled onions. Sign the waiver.",
    price: "$13.99",
    tag: "🔥 EXTREME",
    emoji: "👹",
  },
];

const stats = [
  { value: "2LB", label: "Average burrito weight" },
  { value: "100%", label: "Fresh ingredients daily" },
  { value: "5min", label: "Average order time" },
  { value: "50K+", label: "Burritos sold monthly" },
];

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const Home: NextPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <Head>
        <title>Juanbertos | Burritos As Big As Your Dreams</title>
      </Head>

      <div className="noise-overlay" />

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? "border-b border-white/10 bg-brand-dark/80 py-4 backdrop-blur-xl"
            : "bg-transparent py-6"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-3">
            <span className="text-4xl">🌯</span>
            <span className="font-display text-2xl font-black tracking-tight text-white">
              JUANBERTOS
            </span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#menu"
              className="text-sm font-medium uppercase tracking-wider text-white/70 transition hover:text-brand-orange"
            >
              Menu
            </a>
            <a
              href="#about"
              className="text-sm font-medium uppercase tracking-wider text-white/70 transition hover:text-brand-orange"
            >
              About
            </a>
            <a
              href="#locations"
              className="text-sm font-medium uppercase tracking-wider text-white/70 transition hover:text-brand-orange"
            >
              Locations
            </a>
            <a href="#order" className="btn-primary !px-6 !py-2.5 !text-sm">
              Order Now
            </a>
          </div>
          {/* Mobile menu button */}
          <button className="text-white md:hidden">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="hero-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      >
        {/* Floating background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute top-20 left-[10%] text-8xl opacity-10">
            🌶️
          </div>
          <div className="animate-float-delayed absolute top-40 right-[15%] text-7xl opacity-10">
            🥑
          </div>
          <div className="animate-float absolute bottom-32 left-[20%] text-6xl opacity-10">
            🍅
          </div>
          <div className="animate-float-delayed absolute bottom-20 right-[25%] text-8xl opacity-10">
            🌯
          </div>
          <div className="animate-float absolute top-1/2 left-[5%] text-5xl opacity-5">
            🧅
          </div>
          <div className="animate-float-delayed absolute top-1/3 right-[8%] text-6xl opacity-5">
            🌽
          </div>
        </div>

        {/* Radial gradient orbs */}
        <div className="animate-pulse-slow absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-orange/5 blur-3xl" />
        <div className="animate-pulse-slow absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-red/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <span className="mb-6 inline-block rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-2 text-sm font-medium tracking-wider text-brand-orange">
              NOW OPEN — FIRST 100 CUSTOMERS GET A FREE DRINK
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="font-display text-6xl font-black leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl"
          >
            BURRITOS
            <br />
            <span className="text-gradient">AS BIG AS</span>
            <br />
            YOUR DREAMS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto mt-8 max-w-2xl text-lg text-white/60 md:text-xl"
          >
            Massive flavor. Fresh ingredients. Zero compromise.
            <br className="hidden sm:block" />
            Welcome to the burrito revolution.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a href="#order" className="btn-primary">
              <span>Order Now</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
            <a href="#menu" className="btn-outline">
              View Menu
            </a>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-8 border-t border-white/10 pt-10 md:grid-cols-4"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-gradient font-display text-3xl font-black md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-white/40">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <svg
            className="h-6 w-6 text-white/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </motion.section>

      {/* Menu Section */}
      <section id="menu" className="relative py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection className="text-center">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
              Our Menu
            </span>
            <h2 className="font-display mt-4 text-5xl font-black text-white md:text-6xl">
              PICK YOUR <span className="text-gradient">WEAPON</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Every burrito is hand-rolled, loaded to the brim, and wrapped
              tight. Choose your fighter.
            </p>
            <div className="section-divider mt-8" />
          </AnimatedSection>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item, i) => (
              <AnimatedSection key={item.name} delay={i * 0.1}>
                <div className="menu-card group h-full">
                  {/* Tag */}
                  <span className="mb-4 inline-block rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange">
                    {item.tag}
                  </span>

                  {/* Emoji */}
                  <div className="mb-3 text-5xl transition-transform duration-500 group-hover:scale-110">
                    {item.emoji}
                  </div>

                  {/* Name & Price */}
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-2xl font-bold text-white">
                      {item.name}
                    </h3>
                    <span className="text-gradient font-display text-2xl font-black">
                      {item.price}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-sm leading-relaxed text-white/50">
                    {item.description}
                  </p>

                  {/* Order button */}
                  <button className="mt-6 w-full rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-all duration-300 hover:bg-brand-orange hover:text-white">
                    Add to Order
                  </button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* About / Story Section */}
      <section id="about" className="relative overflow-hidden py-32 px-6">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-orange/5 to-transparent" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <AnimatedSection>
              <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
                Our Story
              </span>
              <h2 className="font-display mt-4 text-5xl font-black leading-tight text-white md:text-6xl">
                BORN FROM
                <br />
                <span className="text-gradient">LATE-NIGHT</span>
                <br />
                CRAVINGS
              </h2>
              <div className="section-divider mt-8 !mx-0" />
              <p className="mt-8 text-lg leading-relaxed text-white/60">
                It started with a simple idea: what if a burrito spot actually
                cared about every single ingredient? No frozen meats. No
                pre-made salsas. No shortcuts. Just honest, massive, incredibly
                delicious burritos.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-white/60">
                We source from local farms, roast our peppers daily, and make
                our tortillas from scratch every morning. This isn&apos;t fast
                food — it&apos;s <em className="text-brand-orange">fresh</em>{" "}
                food, served fast.
              </p>
              <div className="mt-10 flex gap-6">
                <div className="text-center">
                  <div className="text-gradient font-display text-4xl font-black">
                    2024
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-white/40">
                    Founded
                  </div>
                </div>
                <div className="h-16 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-gradient font-display text-4xl font-black">
                    12
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-white/40">
                    Locations
                  </div>
                </div>
                <div className="h-16 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-gradient font-display text-4xl font-black">
                    1M+
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-white/40">
                    Burritos Served
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="relative">
                {/* Decorative card stack */}
                <div className="relative mx-auto aspect-square max-w-md">
                  <div className="absolute inset-4 rotate-3 rounded-3xl border border-brand-orange/20 bg-brand-orange/5" />
                  <div className="absolute inset-2 -rotate-2 rounded-3xl border border-brand-yellow/20 bg-brand-yellow/5" />
                  <div className="relative flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <div className="text-center p-8">
                      <div className="animate-float text-[120px] leading-none">
                        🌯
                      </div>
                      <p className="font-display mt-6 text-3xl font-black text-white">
                        Made Fresh
                      </p>
                      <p className="mt-2 text-white/50">
                        Every. Single. Day.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Marquee / Social Proof */}
      <section className="overflow-hidden border-y border-white/5 py-6">
        <div className="flex animate-[scroll_20s_linear_infinite] whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
            <span
              key={i}
              className="mx-8 font-display text-2xl font-black uppercase tracking-wider text-white/10"
            >
              JUANBERTOS ★ BURRITOS ★ FRESH DAILY ★ MASSIVE FLAVOR ★
            </span>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}} />
      </section>

      {/* Locations Section */}
      <section id="locations" className="relative py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection className="text-center">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">
              Find Us
            </span>
            <h2 className="font-display mt-4 text-5xl font-black text-white md:text-6xl">
              COME <span className="text-gradient">GET SOME</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Open 7 days a week. Late-night hours on Fridays and Saturdays.
            </p>
            <div className="section-divider mt-8" />
          </AnimatedSection>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Downtown",
                address: "123 Main Street, Suite 100",
                hours: "10AM - 11PM Daily",
                tag: "FLAGSHIP",
              },
              {
                name: "Westside",
                address: "456 Ocean Ave, Unit 2B",
                hours: "10AM - 10PM Daily",
                tag: "NEW",
              },
              {
                name: "University",
                address: "789 College Blvd",
                hours: "10AM - 2AM Fri-Sat",
                tag: "LATE NIGHT",
              },
            ].map((location, i) => (
              <AnimatedSection key={location.name} delay={i * 0.15}>
                <div className="menu-card text-center">
                  <span className="mb-4 inline-block rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green">
                    {location.tag}
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {location.name}
                  </h3>
                  <p className="mt-2 text-sm text-white/50">
                    {location.address}
                  </p>
                  <p className="mt-1 text-sm font-medium text-brand-orange">
                    {location.hours}
                  </p>
                  <button className="mt-6 w-full rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-all duration-300 hover:bg-brand-green hover:text-white">
                    Get Directions
                  </button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="order" className="relative py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-orange/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <AnimatedSection>
            <div className="animate-float text-8xl">🌯</div>
            <h2 className="font-display mt-8 text-5xl font-black text-white md:text-7xl">
              READY TO
              <br />
              <span className="text-gradient">GET WRAPPED?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
              Order online for pickup or delivery. Your burrito is waiting.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#" className="btn-primary text-xl">
                🛒 Order Online
              </a>
              <a href="#" className="btn-outline">
                📱 Download App
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌯</span>
                <span className="font-display text-xl font-black text-white">
                  JUANBERTOS
                </span>
              </div>
              <p className="mt-4 text-sm text-white/40">
                Burritos as big as your dreams.
                <br />
                Made fresh daily since 2024.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white/60">
                Menu
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Burritos
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Bowls
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Tacos
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Sides & Drinks
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white/60">
                Company
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Our Story
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Franchise
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Press
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white/60">
                Connect
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    TikTok
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-white/40 transition hover:text-brand-orange">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} Juanbertos. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-white/30 transition hover:text-white/60">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-white/30 transition hover:text-white/60">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Home;
