import type { NextPage } from "next";
import Head from "next/head";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const ease = [0.25, 0.4, 0.25, 1];

const POS_URL = "https://pos.desktop.kitchen";

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
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Form state ── */

interface FormData {
  restaurant_name: string;
  name: string;
  email: string;
  phone: string;
}

const Mexico50: NextPage = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormData>({
    restaurant_name: "",
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.restaurant_name.trim() || !form.name.trim() || !form.email.trim()) {
      setError("Por favor llena los campos obligatorios.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Ingresa un email válido.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${POS_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_name: form.restaurant_name.trim(),
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          promo_code: "MEXICO50",
          source: "mexico50_flyer",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al enviar");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        {/* TODO: Create og-mexico50.png (1200x630px) with logo centered on teal
             background and text "50% de descuento tu primer año — MEXICO50" */}
        <title>50% de descuento tu primer año — Desktop Kitchen</title>
        <meta
          name="description"
          content="El POS hecho para restaurantes con delivery. Ve tu utilidad real después de comisiones de Rappi y Uber Eats. 50% off con código MEXICO50."
        />
        <meta property="og:title" content="50% de descuento tu primer año — Desktop Kitchen" />
        <meta
          property="og:description"
          content="El POS hecho para restaurantes con delivery en México. Oferta de lanzamiento: 50% off el primer año."
        />
        <meta property="og:image" content="https://desktop.kitchen/og-mexico50.png" />
        <meta property="og:url" content="https://desktop.kitchen/mexico50" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white antialiased">
        {/* ─── HERO ─── */}
        <section className="relative min-h-screen flex flex-col justify-center bg-[#1A1A2E] px-6 overflow-hidden">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="absolute top-6 left-6"
          >
            <img
              src="/logo.svg"
              alt="Desktop Kitchen"
              className="h-9 w-9 md:h-11 md:w-11"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </motion.div>

          <div className="max-w-[640px] mx-auto w-full text-center py-20">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease }}
              className="text-4xl sm:text-[52px] sm:leading-[1.1] font-extrabold text-white leading-tight tracking-tight"
            >
              ¿Cuánto te está costando realmente Rappi?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease }}
              className="mt-6 text-lg text-white/50 leading-relaxed max-w-md mx-auto"
            >
              Ve tu utilidad real después de comisiones. Recupera a tus clientes.
              Todo desde una pantalla.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9, ease }}
              className="mt-10"
            >
              <button
                onClick={scrollToForm}
                className="w-full sm:w-auto bg-[#0D7377] hover:bg-[#0b6366] text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors duration-200 active:scale-[0.98]"
                style={{ minHeight: "54px" }}
              >
                Quiero ver cómo funciona
              </button>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" />
          </motion.div>
        </section>

        {/* ─── THREE PAIN POINTS ─── */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-[640px] mx-auto">
            <FadeIn>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center mb-12">
                Lo que resuelve Desktop Kitchen
              </h2>
            </FadeIn>

            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  emoji: "📊",
                  title: "Tu utilidad real",
                  desc: "Entiende cuánto te queda después de Rappi, Uber Eats y DiDi Food en cada pedido.",
                },
                {
                  emoji: "📱",
                  title: "Una sola pantalla",
                  desc: "Todos tus pedidos de todas las plataformas y tu ventanilla en un solo lugar. Sin caos de tablets.",
                },
                {
                  emoji: "👤",
                  title: "Tus clientes son tuyos",
                  desc: "Las plataformas se quedan con tus datos. Desktop Kitchen te ayuda a recuperarlos.",
                },
              ].map((card, i) => (
                <FadeIn key={card.title} delay={i * 0.1}>
                  <div className="border border-neutral-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-3" style={{ color: "#0D7377" }}>
                      {card.emoji}
                    </div>
                    <h3 className="font-bold text-neutral-900 mb-2">{card.title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{card.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ─── */}
        <section className="py-16 px-6 bg-[#F9FAFB]">
          <div className="max-w-[640px] mx-auto">
            <FadeIn>
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-8">
                Lo que dicen los primeros operadores
              </h3>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 sm:p-8 border-l-4 border-l-[#0D7377]">
                <p className="italic text-neutral-700 leading-relaxed text-base">
                  &ldquo;Desde que uso Desktop Kitchen sé exactamente en qué pedidos estoy
                  ganando y en cuáles no. Cambió cómo manejo mis precios en plataformas.&rdquo;
                </p>
                <p className="mt-4 text-sm text-neutral-500">
                  — Operador de ghost kitchen, Roma Sur, CDMX
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ─── OFFER BLOCK ─── */}
        <section className="py-16 px-6 bg-[#0D7377] text-white">
          <div className="max-w-[640px] mx-auto text-center">
            <FadeIn>
              <p className="text-xs uppercase tracking-[0.25em] text-white/60 font-semibold mb-4">
                Oferta de lanzamiento
              </p>
              <p className="text-4xl sm:text-5xl font-extrabold leading-tight">
                50% de descuento
              </p>
              <p className="mt-2 text-lg text-white/80">en tu primer año completo</p>

              {/* Coupon code badge */}
              <div className="mt-8 inline-block">
                <span className="inline-block bg-[#1A1A2E] text-white font-mono font-bold text-xl sm:text-2xl px-6 py-3 rounded-full tracking-wider">
                  MEXICO50
                </span>
              </div>

              <p className="mt-4 text-sm text-white/70">
                El código se aplica automáticamente al registrarte desde esta página.
              </p>
              <p className="mt-2 text-xs text-white/50">
                Oferta por tiempo limitado · Solo para nuevos registros
              </p>
            </FadeIn>

            {/* Logo in offer block */}
            <FadeIn delay={0.15}>
              <div className="mt-10 flex justify-center">
                <img
                  src="/logo.svg"
                  alt="Desktop Kitchen"
                  className="h-8 w-8 opacity-50"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              </div>
            </FadeIn>

            {/* WhatsApp share nudge */}
            <FadeIn delay={0.2}>
              <div className="mt-8">
                <p className="text-sm text-white/60 mb-3">
                  Comparte con otros restauranteros &#x1F447;
                </p>
                <a
                  href="https://wa.me/?text=Encontr%C3%A9%20esto%20para%20restaurantes%20con%20delivery%20en%20M%C3%A9xico%20%F0%9F%91%87%20desktop.kitchen%2Fmexico50"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold px-6 py-3 rounded-xl transition-colors duration-200 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Compartir en WhatsApp
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ─── SIGNUP FORM ─── */}
        <section ref={formRef} className="py-20 px-6 bg-white">
          <div className="max-w-[640px] mx-auto">
            {submitted ? (
              /* ── Success message ── */
              <FadeIn>
                <div className="text-center py-8">
                  <div className="text-6xl mb-6">&#x2705;</div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-3">
                    &#x00A1;Listo! Revisa tu email
                  </h2>
                  <p className="text-neutral-600 leading-relaxed mb-6">
                    Te enviamos un enlace para activar tu cuenta. Tu descuento MEXICO50 ya
                    está guardado.
                  </p>
                  <a
                    href={`${POS_URL}/#/onboarding?promo_code=MEXICO50&email=${encodeURIComponent(form.email)}&restaurant_name=${encodeURIComponent(form.restaurant_name)}`}
                    className="inline-block bg-[#0D7377] hover:bg-[#0b6366] text-white font-semibold px-8 py-4 rounded-xl transition-colors duration-200"
                  >
                    Crear mi cuenta ahora &#x2192;
                  </a>
                  <p className="text-sm text-neutral-400 mt-6">
                    ¿No ves el email? Revisa tu carpeta de spam o escríbenos a{" "}
                    <a href="mailto:soporte@desktop.kitchen" className="text-[#0D7377] hover:underline">
                      soporte@desktop.kitchen
                    </a>
                  </p>
                </div>
              </FadeIn>
            ) : (
              /* ── Form ── */
              <>
                <FadeIn>
                  <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
                      Empieza hoy — es gratis los primeros 14 días
                    </h2>
                    <p className="text-neutral-500 text-sm leading-relaxed">
                      Sin tarjeta de crédito para el periodo de prueba. El descuento MEXICO50
                      se aplica cuando elijas tu plan.
                    </p>
                  </div>
                </FadeIn>

                <FadeIn delay={0.1}>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Nombre del restaurante <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.restaurant_name}
                        onChange={(e) => update("restaurant_name", e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377] transition-colors"
                        placeholder="Mi Cocina Express"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Tu nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377] transition-colors"
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377] transition-colors"
                        placeholder="tu@restaurante.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Teléfono{" "}
                        <span className="text-neutral-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377] transition-colors"
                        placeholder="+52 55 0000 0000"
                      />
                    </div>

                    {/* Hidden promo code */}
                    <input type="hidden" name="promo_code" value="MEXICO50" readOnly />

                    {error && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#0D7377] hover:bg-[#0b6366] text-white font-semibold text-base py-4 rounded-xl transition-colors duration-200 disabled:opacity-60 active:scale-[0.98]"
                      style={{ minHeight: "54px" }}
                    >
                      {submitting ? "Enviando..." : "Crear mi cuenta gratis \u2192"}
                    </button>

                    <p className="text-xs text-neutral-400 text-center leading-relaxed">
                      Al registrarte aceptas nuestros{" "}
                      <a href="#" className="underline hover:text-neutral-600">
                        Términos de Servicio
                      </a>{" "}
                      y{" "}
                      <a href="#" className="underline hover:text-neutral-600">
                        Política de Privacidad
                      </a>
                      .
                    </p>
                  </form>
                </FadeIn>
              </>
            )}
          </div>
        </section>

        {/* ─── SMALL PRINT ─── */}
        <footer className="py-8 px-6 bg-neutral-50 border-t border-neutral-200">
          <div className="max-w-[640px] mx-auto text-center">
            <p className="text-[13px] text-neutral-400">
              Desktop Kitchen · desktop.kitchen · soporte@desktop.kitchen
            </p>
            <p className="text-[13px] text-neutral-400 mt-1">
              &copy; 2026 Desktop Kitchen. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Mexico50;
