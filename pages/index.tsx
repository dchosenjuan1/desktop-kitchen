import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

const LAUNCH_DATE = new Date("2025-09-15T00:00:00");

const ease = [0.25, 0.4, 0.25, 1];

const Home: NextPage = () => {
  const countdown = useCountdown(LAUNCH_DATE);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <>
      <Head>
        <title>Juanbertos | Coming Soon to Mexico City</title>
      </Head>

      <div className="noise-overlay" />

      {/* Full-screen coming soon */}
      <main className="hero-gradient relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        {/* Floating background elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute top-16 left-[8%] text-8xl opacity-10">
            🌶️
          </div>
          <div className="animate-float-delayed absolute top-32 right-[12%] text-7xl opacity-10">
            🥑
          </div>
          <div className="animate-float absolute bottom-40 left-[15%] text-6xl opacity-10">
            🍅
          </div>
          <div className="animate-float-delayed absolute bottom-24 right-[20%] text-9xl opacity-10">
            🌯
          </div>
          <div className="animate-float absolute top-1/2 left-[4%] text-5xl opacity-5">
            🧅
          </div>
          <div className="animate-float-delayed absolute top-1/4 right-[6%] text-6xl opacity-5">
            🌽
          </div>
          <div className="animate-float absolute bottom-1/3 right-[40%] text-7xl opacity-[0.04]">
            🇲🇽
          </div>
        </div>

        {/* Radial gradient orbs */}
        <div className="animate-pulse-slow absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-brand-orange/5 blur-3xl" />
        <div className="animate-pulse-slow absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-brand-red/5 blur-3xl" />
        <div className="animate-pulse-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-green/[0.03] blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease }}
            className="mb-8 flex items-center justify-center gap-4"
          >
            <span className="text-6xl md:text-7xl">🌯</span>
            <span className="font-display text-4xl font-black tracking-tight text-white md:text-5xl">
              JUANBERTOS
            </span>
          </motion.div>

          {/* Coming Soon badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-5 py-2.5 text-sm font-semibold uppercase tracking-widest text-brand-green">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
              </span>
              Coming Soon
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease }}
            className="font-display mt-8 text-5xl font-black leading-[0.9] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
          >
            WE&apos;RE BRINGING
            <br />
            <span className="text-gradient">THE HEAT</span>
            <br />
            TO CDMX
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease }}
            className="mx-auto mt-8 max-w-2xl text-lg text-white/50 md:text-xl"
          >
            Massive burritos. Bold flavors. Zero compromise.
            <br className="hidden sm:block" />
            Mexico City, get ready for the burrito revolution.
          </motion.p>

          {/* Location pin */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85, ease }}
            className="mt-6 flex items-center justify-center gap-2 text-white/40"
          >
            <svg className="h-5 w-5 text-brand-red" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-sm font-medium tracking-wider uppercase">
              Ciudad de M&eacute;xico, M&eacute;xico
            </span>
          </motion.div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1, ease }}
            className="mx-auto mt-14 grid max-w-lg grid-cols-4 gap-4"
          >
            {[
              { value: countdown.days, label: "Days" },
              { value: countdown.hours, label: "Hours" },
              { value: countdown.minutes, label: "Minutes" },
              { value: countdown.seconds, label: "Seconds" },
            ].map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-2 py-5 backdrop-blur-sm"
              >
                <div className="text-gradient font-display text-4xl font-black md:text-5xl">
                  {String(unit.value).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-white/30 md:text-xs">
                  {unit.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Email signup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2, ease }}
            className="mt-14"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto max-w-md rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6"
              >
                <span className="text-4xl">🎉</span>
                <p className="mt-3 font-display text-xl font-bold text-white">
                  You&apos;re on the list!
                </p>
                <p className="mt-1 text-sm text-white/50">
                  We&apos;ll let you know the moment we open our doors in CDMX.
                </p>
              </motion.div>
            ) : (
              <>
                <p className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
                  Be the first to know
                </p>
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-white placeholder-white/30 outline-none backdrop-blur-sm transition-colors focus:border-brand-orange/50 focus:bg-white/10"
                  />
                  <button
                    type="submit"
                    className="btn-primary !rounded-xl !px-8 !py-4 whitespace-nowrap"
                  >
                    Notify Me
                  </button>
                </form>
              </>
            )}
          </motion.div>

          {/* Socials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5, ease }}
            className="mt-16 flex items-center justify-center gap-6"
          >
            {/* Instagram */}
            <a
              href="#"
              className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-300 hover:border-brand-orange/30 hover:bg-brand-orange/10"
              aria-label="Instagram"
            >
              <svg
                className="h-5 w-5 text-white/40 transition-colors group-hover:text-brand-orange"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="#"
              className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-300 hover:border-brand-orange/30 hover:bg-brand-orange/10"
              aria-label="TikTok"
            >
              <svg
                className="h-5 w-5 text-white/40 transition-colors group-hover:text-brand-orange"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.2V11.2a4.85 4.85 0 01-3.77-1.74V6.69h3.77z" />
              </svg>
            </a>

            {/* X / Twitter */}
            <a
              href="#"
              className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-300 hover:border-brand-orange/30 hover:bg-brand-orange/10"
              aria-label="X"
            >
              <svg
                className="h-5 w-5 text-white/40 transition-colors group-hover:text-brand-orange"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </motion.div>
        </div>

        {/* Scrolling marquee at bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden border-t border-white/5 py-4">
          <div className="flex animate-[scroll_25s_linear_infinite] whitespace-nowrap">
            {[...Array(10)].map((_, i) => (
              <span
                key={i}
                className="mx-8 font-display text-sm font-black uppercase tracking-[0.3em] text-white/[0.06]"
              >
                JUANBERTOS ★ COMING SOON ★ MEXICO CITY ★ CDMX ★ BURRITOS ★
              </span>
            ))}
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}} />
        </div>

        {/* Footer line */}
        <div className="absolute bottom-14 left-0 right-0 text-center">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Juanbertos. All rights reserved.
          </p>
        </div>
      </main>
    </>
  );
};

export default Home;
