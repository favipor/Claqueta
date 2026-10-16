import Link from "next/link";
import { getDiscover, getTrending, type CatalogKind, type TmdbItem } from "@/lib/tmdb";
import { getT } from "@/lib/i18n-server";
import { TitleCard } from "./TitleCard";
import { Reveal } from "./Reveal";
import { HeroBackdrop } from "./HeroBackdrop";
import { ScrollRow } from "./ScrollRow";
import { InfiniteCatalog } from "./InfiniteCatalog";
import { BookmarkIcon, FilmIcon, TvIcon } from "./NavIcons";
import { createClient } from "@/lib/supabase/server";

function TrendingRow({ title, items }: { title: string; items: TmdbItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 text-xl font-bold">{title}</h2>
      <ScrollRow label={title}>
        {items.slice(0, 16).map((it) => (
          <div key={`${it.media_type}-${it.id}`} className="w-36 shrink-0 snap-start sm:w-44">
            <TitleCard
              id={it.id}
              type={it.media_type}
              title={it.title}
              posterPath={it.poster_path}
              year={it.year}
              reveal={false}
            />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

// Botón grande del banner. El de la sección en la que estás aparece relleno de blanco.
function HeroLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2.5 rounded-2xl px-6 py-3 text-base font-bold shadow-lg ring-1 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        active
          ? "bg-white text-teal-800 ring-white"
          : "bg-white/15 text-white ring-white/40 backdrop-blur hover:bg-white/25"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

// Vista compartida por la portada (películas y series), /peliculas y /series:
// banner + Tendencias de hoy + Tendencias de la semana + catálogo completo.
export async function HomeView({ kind }: { kind: CatalogKind }) {
  const { lang, t } = await getT();
  const noItems: TmdbItem[] = [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;

  const [week, day, first] = await Promise.all([
    getTrending(lang, "week", kind).catch(() => noItems),
    getTrending(lang, "day", kind).catch(() => noItems),
    getDiscover(kind, "popularity", 1, lang).catch(() => ({ items: noItems, totalPages: 1 })),
  ]);

  // Carátulas del fondo del banner: se mezclan varias listas para tener variedad
  const posters = Array.from(
    new Set(
      [...week, ...day, ...first.items]
        .map((i) => i.poster_path)
        .filter((p): p is string => !!p)
    )
  ).slice(0, 36);

  return (
    <div className="space-y-10">
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl px-6 py-14 text-white sm:px-12 sm:py-20">
          <HeroBackdrop posters={posters} />
          <div className="relative z-10 text-center">
            <h1 className="text-3xl font-extrabold drop-shadow sm:text-5xl">{t("home.hero")}</h1>
            <p className="mx-auto mt-3 max-w-xl text-white/90 drop-shadow">{t("home.heroSub")}</p>
            <form action="/buscar" role="search" className="mx-auto mt-6 max-w-xl">
              <input
                type="search"
                name="q"
                placeholder={t("nav.search")}
                aria-label={t("nav.search")}
                className="w-full rounded-full px-5 py-3 text-neutral-900 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              />
            </form>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <HeroLink href="/peliculas" active={kind === "movie"} icon={<FilmIcon className="h-6 w-6" />}>
                {t("nav.movies")}
              </HeroLink>
              <HeroLink href="/series" active={kind === "tv"} icon={<TvIcon className="h-6 w-6" />}>
                {t("nav.series")}
              </HeroLink>
              {loggedIn && (
                <HeroLink href="/mi-lista" active={false} icon={<BookmarkIcon className="h-6 w-6" />}>
                  {t("nav.myList")}
                </HeroLink>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      <TrendingRow title={t("home.trendingToday")} items={day} />
      <TrendingRow title={t("home.trending")} items={week} />

      <InfiniteCatalog kind={kind} initialItems={first.items} initialTotalPages={first.totalPages} />
    </div>
  );
}
