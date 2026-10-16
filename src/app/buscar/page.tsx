import Link from "next/link";
import { searchTitles } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { getT } from "@/lib/i18n-server";
import { TitleCard } from "@/components/TitleCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { lang, t } = await getT();
  const items = await searchTitles(q.replace(/^@/, ""), lang).catch(() => []);

  // Personas (por @usuario o nombre)
  let people: { id: string; username: string; display_name: string | null; avatar_url: string | null }[] = [];
  const term = q.trim().replace(/^@/, "");
  if (term.length >= 2) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("search_people", { p_q: term });
      people = (data ?? []) as typeof people;
    } catch {
      // sin phase3.sql ejecutado no hay búsqueda de personas
    }
  }

  return (
    <div className="space-y-6">
      <form action="/buscar" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("nav.search")}
          aria-label={t("nav.search")}
          className="w-full max-w-xl rounded-full border border-neutral-300 bg-white px-5 py-3 outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>

      {q && (
        <h1 className="text-xl font-bold">
          {t("search.results")} «{q}»
        </h1>
      )}

      {people.length > 0 && (
        <section aria-label={t("search.people")} className="space-y-3">
          <h2 className="text-lg font-bold">{t("search.people")}</h2>
          <ul className="flex flex-wrap gap-3">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/u/${p.username}`}
                  className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <Avatar url={p.avatar_url} size={40} />
                  <span className="min-w-0">
                    <span className="block max-w-40 truncate text-sm font-semibold">
                      {p.display_name ?? p.username}
                    </span>
                    <span className="block max-w-40 truncate text-xs text-neutral-500">@{p.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && items.length === 0 ? (
        <p className="text-neutral-500">{t("search.none")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it, i) => (
            <TitleCard
              key={`${it.media_type}-${it.id}`}
              id={it.id}
              type={it.media_type}
              title={it.title}
              posterPath={it.poster_path}
              year={it.year}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
