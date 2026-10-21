import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { ClapperIcon } from "./ClapperIcon";

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
        ["/buscar", t("nav.search")],
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
        ["/privacidad", t("footer.privacy")],
        ["/cookies", t("footer.cookies")],
        ["/aviso-legal", t("footer.terms")],
      ],
    },
  ];

  return (
    <footer className="mt-12 bg-gradient-to-b from-neutral-900 to-neutral-950 text-sm text-neutral-300">
      <div className="h-1 bg-gradient-to-r from-teal-400 via-brand to-emerald-500" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-extrabold text-white">
            <ClapperIcon className="h-8 w-8 text-teal-300" />
            Claqueta
          </Link>
          <p className="max-w-xs text-neutral-400">{t("app.tagline")}</p>
        </div>

        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">{c.title}</h2>
            <ul className="space-y-2">
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

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Claqueta. {t("footer.rights")}
          </p>
          <p className="max-w-xl sm:text-right">{t("footer.tmdb")}</p>
        </div>
      </div>
    </footer>
  );
}
