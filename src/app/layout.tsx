import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Lexend } from "next/font/google";
import { A11yPanel } from "@/components/A11yPanel";
import { ScrollTop } from "@/components/ScrollTop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MyTitlesSync } from "@/components/MyTitles";
import { Telemetry } from "@/components/Telemetry";
import { Footer } from "@/components/Footer";
import { Splash } from "@/components/Splash";
import { I18nProvider } from "@/components/I18nProvider";
import { getT } from "@/lib/i18n-server";
import { SITE_URL } from "@/lib/site";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

const DESCRIPTION = "Lleva el seguimiento de lo que ves, puntúalo y coméntalo con tus amigos.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Claqueta · Tus pelis y series", template: "%s · Claqueta" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Claqueta",
    locale: "es_ES",
    title: "Claqueta · Tus pelis y series",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  keywords: ["películas", "series", "seguimiento", "qué ver", "lista de pelis", "red social de cine", "Claqueta", "miclaqueta"],
  // Código de Google Search Console (se pone en Vercel como NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION)
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  applicationName: "Claqueta",
  appleWebApp: { capable: true, title: "Claqueta", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// 1) Aplica el tema guardado antes de pintar (evita el parpadeo).
// 2) Marca si toca mostrar la intro: solo una vez por sesión y no con "reducir movimiento".
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}try{if(!sessionStorage.getItem('splash')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-splash','1')}catch(e){}try{var a=JSON.parse(localStorage.getItem('a11y')||'{}'),h=document.documentElement,c=h.classList;if(a.contrast)c.add('a11y-contrast');if(a.dyslexia)c.add('a11y-dyslexia');if(a.motion)c.add('a11y-motion');if(a.underline)c.add('a11y-underline');var z=['100%','112.5%','125%','150%'][a.size|0];if(z)h.style.fontSize=z}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { lang, t } = await getT();

  return (
    <html lang={lang} className={lexend.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Datos para Google: nombre del sitio, logo y buscador (puede mostrar la caja de búsqueda en los resultados) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Claqueta",
                alternateName: ["miclaqueta", "Mi Claqueta", "miclaqueta.com"],
                url: `${SITE_URL}/`,
                inLanguage: "es",
                potentialAction: {
                  "@type": "SearchAction",
                  target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/buscar?q={search_term_string}` },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Claqueta",
                url: `${SITE_URL}/`,
                logo: `${SITE_URL}/icons/icon-512.png`,
                email: "contacto@miclaqueta.com",
              },
            ]),
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-clip">
        <I18nProvider lang={lang}>
          <Splash />
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <Footer />
          <ScrollTop />
          <ThemeToggle />
          <A11yPanel />
          <MyTitlesSync />
          <Telemetry />
        </I18nProvider>
      </body>
    </html>
  );
}
