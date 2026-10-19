import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Lexend } from "next/font/google";
import { A11yPanel } from "@/components/A11yPanel";
import { ScrollTop } from "@/components/ScrollTop";
import { Splash } from "@/components/Splash";
import { I18nProvider } from "@/components/I18nProvider";
import { getT } from "@/lib/i18n-server";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Claqueta", template: "%s · Claqueta" },
  description: "Lleva el seguimiento de lo que ves, puntúalo y coméntalo con tus amigos.",
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
      </head>
      <body className="flex min-h-screen flex-col">
        <I18nProvider lang={lang}>
          <Splash />
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800">
            <p>
              <a href="/guia" className="font-semibold underline-offset-2 hover:underline">
                {t("footer.guide")}
              </a>
            </p>
            <p className="mt-1">{t("footer.tmdb")}</p>
            <p className="mt-1">Claqueta · {t("app.tagline")}</p>
          </footer>
          <A11yPanel />
          <ScrollTop />
        </I18nProvider>
      </body>
    </html>
  );
}
