import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { TitleCard } from "@/components/TitleCard";
import { STATUSES, type Status } from "@/lib/dict";
import { getTvSeasons, type TvSeason } from "@/lib/tmdb";
import { readWatchedForTitles } from "@/lib/tv-state";

export default async function MyListPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string }>;
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

  let query = supabase
    .from("user_titles")
    .select("tmdb_id, media_type, title, poster_path, status, rating, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (estado) query = query.eq("status", estado);
  if (tipo) query = query.eq("media_type", tipo);
  const { data: rows } = await query;

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

  const href = (e: string | null, ty: string | null) => {
    const q = new URLSearchParams();
    if (e) q.set("estado", e);
    if (ty) q.set("tipo", ty);
    const s = q.toString();
    return `/mi-lista${s ? `?${s}` : ""}`;
  };

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "border-brand bg-brand text-white"
        : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("list.title")}</h1>
        <Link
          href="/importar"
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {t("imp.link")}
        </Link>
      </div>

      <div className="space-y-3">
        <nav className="flex flex-wrap gap-2" aria-label={t("detail.myStatus")}>
          <Link href={href(null, tipo)} className={chip(!estado)}>
            {t("list.all")}
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={href(s, tipo)} className={chip(estado === s)}>
              {t(`status.${s}` as const)}
            </Link>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-2">
          <Link href={href(estado, null)} className={chip(!tipo)}>
            {t("list.allTypes")}
          </Link>
          <Link href={href(estado, "movie")} className={chip(tipo === "movie")}>
            {t("list.movies")}
          </Link>
          <Link href={href(estado, "tv")} className={chip(tipo === "tv")}>
            {t("list.series")}
          </Link>
        </nav>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">{t("list.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((r, i) => (
            <TitleCard
              key={`${r.media_type}-${r.tmdb_id}`}
              id={r.tmdb_id}
              type={r.media_type as "movie" | "tv"}
              title={r.title}
              posterPath={r.poster_path}
              status={r.status as Status | null}
              rating={r.rating === null ? null : Number(r.rating)}
              index={i}
              progress={r.media_type === "tv" ? progress.get(r.tmdb_id as number) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
