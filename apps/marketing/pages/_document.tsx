import Document, { Head, Html, Main, NextScript, DocumentContext } from "next/document";

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, locale: ctx.locale || 'en' };
  }

  render() {
    const locale = (this.props as any).locale || 'en';
    const isSpanish = locale === 'es';
    const canonicalDomain = isSpanish ? 'es.desktop.kitchen' : 'www.desktop.kitchen';
    const canonicalUrl = `https://${canonicalDomain}`;

    return (
      <Html lang={locale} dir="ltr">
        <Head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="canonical" href={canonicalUrl} />

          {/* hreflang for bilingual SEO */}
          <link rel="alternate" hrefLang="es" href="https://es.desktop.kitchen" />
          <link rel="alternate" hrefLang="en" href="https://www.desktop.kitchen" />
          <link rel="alternate" hrefLang="x-default" href="https://www.desktop.kitchen" />

          {/* Preconnect for performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
            rel="stylesheet"
          />

          {/* Google Search Console verification */}
          <meta name="google-site-verification" content="SM6WprNrVBO45pGacv_wzgbs8uZB1lYBAtBRfoyKGOI" />

          {/* Theme & mobile */}
          <meta name="theme-color" content="#0d9488" />
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

          {/* Geo-targeting for Mexico */}
          {isSpanish && (
            <>
              <meta name="geo.region" content="MX" />
              <meta name="geo.placename" content="Mexico" />
              <meta name="content-language" content="es-MX" />
            </>
          )}
        </Head>
        <body className="bg-neutral-950 antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
