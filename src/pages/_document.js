import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="description" content="YourVision.video — Manifest your future self in cinematic AI video." />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-YXR7G37GJ2" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-YXR7G37GJ2');
        `}} />
      </Head>
      <body className="bg-void text-white antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
