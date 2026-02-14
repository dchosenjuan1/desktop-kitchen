import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <meta
            name="description"
            content="Juanbertos is coming to Mexico City. Massive burritos, bold flavors, zero compromise. Sign up to be the first to know."
          />
          <meta property="og:site_name" content="juanbertos.com" />
          <meta
            property="og:description"
            content="Juanbertos is coming to Mexico City. Massive burritos, bold flavors, zero compromise."
          />
          <meta property="og:title" content="Juanbertos | Coming Soon to Mexico City" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Juanbertos | Coming Soon to Mexico City" />
          <meta
            name="twitter:description"
            content="We're bringing the heat to CDMX. Massive burritos, bold flavors, zero compromise."
          />
        </Head>
        <body className="bg-brand-dark antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
