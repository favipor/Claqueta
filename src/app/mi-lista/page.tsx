import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { MyListGrid } from "@/components/MyListGrid";
import { STATUSES, type Status } from "@/lib/dict";
import { getTvSeasons, type TvSeason } from "@/lib/tmdb";
import { ListControls } from "@/components/ListControls";
import { SORTS, type Sort } from "@/lib/list-sort";
import { genreName } from "@/lib/genres";
import { readWatchedForTitles } from "@/lib/tv-state";

export const metadata = { title: "Mi lista", robots: { index: false } };

export default async function MyListPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string; orden?: string; genero?: string }>;
}) {
  const sp = await searchParams;
  const { t } = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const estado = STATUSES.includes(sp.estado as Status) ? (sp.estado as Status) : null;
  const tipo = sp.tipo === "movie" || sp.tipo === "tv" ? sp.tipo : null;

  const orden: Sort = SORTS.includes(sp.orden as Sort) ? (sp.orden as Sort) : "reciente";
  const genero = /^\d+$/.test(sp.genero ?? "") ? Number(sp.genero) : null;

  let query = supabase
    .from("user_titles")
    .select("tmdb_id, media_type, title, poster_path, status, rating, updated_at, runtime_min, genres")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (tipo) query = query.eq("media_type", tipo);
  const { data: typeRows } = await query;
  // Se trae todo el tipo elegido para poder contar cuántos hay de cada estado
  const allRows = (typeRows ?? []).filter((r) => !estado || r.status === estado);

  // Géneros presentes en tu lista (antes de filtrar por género) y orden elegido
  const genreIds = new Set<number>();
  for (const r of allRows ?? []) for (const g of (r.genres as number[] | null) ?? []) genreIds.add(g);
  const { lang: uiLang } = await getT();
  const genreOptions = [...genreIds]
    .map((id) => ({ id, name: genreName(id, uiLang) }))
    .sort((a, b) => a.name.localeCompare(b.name, uiLang));

  // Cuántos títulos hay en cada pestaña de estado (con el tipo y el género elegidos)
  const byGenre = (r: { genres: unknown }) => genero === null || ((r.genres as number[] | null) ?? []).includes(genero);
  const counts = { all: 0, pendiente: 0, viendo: 0, visto: 0, volver_a_ver: 0 } as Record<Status | "all", number>;
  for (const r of typeRows ?? []) {
    if (!byGenre(r)) continue;
    counts.all++;
    if (r.status && STATUSES.includes(r.status as Status)) counts[r.status as Status]++;
  }

  const rows = (allRows ?? [])
    .filter((r) => genero === null || ((r.genres as number[] | null) ?? []).includes(genero))
    .sort((a, b) => {
      const ra = a.rating === null ? null : Number(a.rating);
      const rb = b.rating === null ? null : Number(b.rating);
      switch (orden) {
        case "nota_alta":
          return (rb ?? -1) - (ra ?? -1);
        case "nota_baja":
          return (ra ?? 99) - (rb ?? 99);
        case "titulo":
          return String(a.title).localeCompare(String(b.title), uiLang);
        case "duracion":
          return ((b.runtime_min as number | null) ?? -1) - ((a.runtime_min as number | null) ?? -1);
        default:
          return String(b.updated_at).localeCompare(String(a.updated_at));
      }
    });

  // Barra de progreso para las series que estás viendo.
  const progress = new Map<number, { value: number; total: number; label: string }>();
  const watching = (rows ?? []).filter((r) => r.media_type === "tv" && r.status === "viendo");
  if (watching.length > 0) {
    try {
      const { lang } = await getT();
      const ids = watching.map((r) => r.tmdb_id as number);
      const [watched, seasonLists] = await Promise.all([
        readWatchedForTitles(supabase, user.id, ids),
        Promise.all(ids.map((id) => getTvSeasons(id, lang).catch(() => [] as TvSeason[]))),
      ]);
      ids.forEach((id, i) => {
        const seasons = seasonLists[i].filter((s) => s.season_number >= 1 && s.episode_count > 0);
        const bySeason = new Map<number, number>();
        for (const w of watched) {
          if (w.tmdb_id === id && w.season_number >= 1) {
            bySeason.set(w.season_number, (bySeason.get(w.season_number) ?? 0) + 1);
          }
        }
        const total = seasons.reduce((a, s) => a + s.episode_count, 0);
        const value = [...bySeason.values()].reduce((a, n) => a + n, 0);
        if (total === 0) return;
        // Temporada actual: la más alta con algún capítulo visto (o la primera).
        const current = Math.max(0, ...bySeason.keys()) || seasons[0]?.season_number || 1;
        const cs = seasons.find((s) => s.season_number === current);
        const label = cs
          ? `${t("tv.seasonShort")} ${current} · ${Math.min(bySeason.get(current) ?? 0, cs.episode_count)} ${t("tv.of")} ${cs.episode_count}`
          : `${value} ${t("tv.of")} ${total}`;
        progress.set(id, { value, total, label });
      });
    } catch {
      // sin phase2.sql ejecutado simplemente no se muestran barras
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("list.title")}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/importar"
            title={t("imp.link")}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 15V3M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>
            {t("imp.link")}
          </Link>
          <a
            href="/api/exportar"
            download
            title={t("list.export")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>
            {t("list.export")}
          </a>
        </div>
      </div>

      <ListControls estado={estado} tipo={tipo} orden={orden} genero={genero} genres={genreOptions} counts={counts} />

      {rows.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">
          {counts.all === 0 && !tipo && genero === null ? t("list.empty") : t("list.noMatch")}
        </p>
      ) : (
        <MyListGrid
          key={`${estado}-${tipo}-${orden}-${genero}`}
          rows={rows.map((r) => ({
            tmdb_id: r.tmdb_id as number,
            media_type: r.media_type as "movie" | "tv",
            title: r.title as string,
            poster_path: r.poster_path as string | null,
            status: r.status as Status | null,
            rating: r.rating === null ? null : Number(r.rating),
            progress: r.media_type === "tv" ? progress.get(r.tmdb_id as number) : undefined,
          }))}
        />
      )}
    </div>
  );
}
