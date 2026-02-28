import Head from "next/head";
import Link from "next/link";

export function BlogLayout({
  children,
  title,
  description,
  locale,
  langSwitchDomain,
  langSwitchLabel,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  locale: string;
  langSwitchDomain: string;
  langSwitchLabel: string;
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      {/* Top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-teal-600 z-50" />

      {/* Language switcher */}
      <a
        href={`https://${langSwitchDomain}`}
        className="fixed top-4 right-6 z-50 text-[11px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors duration-200 font-mono"
      >
        {langSwitchLabel}
      </a>

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Header */}
      <header className="sticky top-1 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <a className="flex items-center gap-2">
                <img src="/logo.svg" alt="Desktop Kitchen" className="w-8 h-8" />
                <span className="text-white font-black tracking-tight text-lg hidden sm:inline">
                  Desktop Kitchen
                </span>
              </a>
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/blog">
              <a className="text-sm font-semibold text-teal-500 hover:text-teal-400 transition-colors">
                Blog
              </a>
            </Link>
          </div>
          <a
            href="https://pos.desktop.kitchen/#/onboarding"
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            {locale === "es" ? "Prueba Gratis" : "Start Free"}
          </a>
        </div>
      </header>

      <main className="min-h-screen bg-neutral-950">{children}</main>

      {/* Footer */}
      <footer className="py-12 px-6 bg-neutral-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.svg" alt="Desktop Kitchen" className="w-8 h-8" />
            <p className="text-xl font-black tracking-tighter text-white">Desktop Kitchen</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <a href="https://docs.desktop.kitchen" className="hover:text-teal-500 transition-colors">
              {locale === "es" ? "Documentación" : "Documentation"}
            </a>
            <span className="text-white/10">|</span>
            <Link href="/blog">
              <a className="hover:text-teal-500 transition-colors">Blog</a>
            </Link>
            <span className="text-white/10">|</span>
            <a href="https://pos.desktop.kitchen/#/onboarding" className="hover:text-teal-500 transition-colors">
              {locale === "es" ? "Demo en Vivo" : "Live Demo"}
            </a>
          </div>
          <p className="mt-6 text-xs text-white/15">
            &copy; {new Date().getFullYear()} Desktop Kitchen.{" "}
            {locale === "es" ? "Todos los derechos reservados." : "All rights reserved."}
          </p>
        </div>
      </footer>
    </>
  );
}
