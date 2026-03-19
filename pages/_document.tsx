import { Html, Head, Main, NextScript } from "next/document";

const themeScript = `(function(){try{
  var s=localStorage.getItem('theme');
  var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-bs-theme',s||(d?'dark':'light'));
}catch(e){}})();`;

export default function Document() {
  return (
    <Html>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta property="og:title" content="Web Finance App" />
        <meta
          property="og:description"
          content="Free calculators for paycheck, retirement, and investing"
        />
        <meta
          property="og:image"
          content="https://adamwlui.com/web-finance-app/og-image.png"
        />
        <meta
          property="og:url"
          content="https://adamwlui.com/web-finance-app"
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://adamwlui.com/web-finance-app/og-image.png"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
