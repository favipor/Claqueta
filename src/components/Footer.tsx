import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { ClapperIcon } from "./ClapperIcon";
import { LEGAL } from "@/lib/legal";

// Pie de página: marca, enlaces útiles, textos legales y crédito de TMDB.
export async function Footer() {
  const { t } = await getT();
  const year = new Date().getFullYear();

  const link =
    "text-neutral-300 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded";

  const cols: { title: string; items: [string, string][] }[] = [
    {
      title: t("footer.explore"),
      items: [
        ["/peliculas", t("nav.movies")],
        ["/series", t("nav.series")],
        ["/descubrir", t("nav.discover")],
        ["/buscar", t("footer.search")],
      ],
    },
    {
      title: t("footer.community"),
      items: [
        ["/guia", t("footer.guide")],
        ["/mi-lista", t("nav.myList")],
        ["/mensajes", t("footer.messages")],
        ["/ajustes", t("footer.settings")],
      ],
    },
    {
      title: t("footer.legal"),
      items: [
        ["/privacidad", t("footer.privacyShort")],
        ["/cookies", t("footer.cookiesShort")],
        ["/aviso-legal", t("footer.terms")],
      ],
    },
  ];

  return (
    <footer className="mt-10 bg-gradient-to-b from-neutral-900 to-neutral-950 text-sm text-neutral-300">
      <div className="h-1 bg-gradient-to-r from-teal-400 via-brand to-emerald-500" aria-hidden="true" />
      {/* En el móvil: marca centrada y las tres columnas de enlaces a la par, compactas */}
      <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 text-center sm:py-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10 lg:py-12 lg:text-left">
        <div className="flex flex-col items-center gap-3 lg:items-start lg:gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold text-white lg:text-2xl">
            <ClapperIcon className="h-7 w-7 text-teal-300 lg:h-8 lg:w-8" />
            Claqueta
          </Link>
          <p className="max-w-xs text-neutral-400">{t("app.tagline")}</p>
          <a href={`mailto:${LEGAL.email}`} className={`${link} inline-flex items-center gap-2`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            {LEGAL.email}
          </a>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[13px] sm:text-sm lg:contents">
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-white sm:text-xs lg:mb-3">{c.title}</h2>
            <ul className="space-y-1.5 lg:space-y-2">
              {c.items.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className={link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-16 pb-36 pt-4 lg:px-4 text-center text-[11px] leading-relaxed text-neutral-500 sm:text-xs lg:flex-row lg:items-center lg:justify-between lg:pb-5 lg:pt-5 lg:text-left lg:text-neutral-400">
          <p>
            © {year} Claqueta. {t("footer.rights")}
          </p>
          <p className="mx-auto max-w-xl lg:mx-0 lg:text-right">{t("footer.tmdb")}</p>
        </div>
      </div>
    </footer>
  );
}
