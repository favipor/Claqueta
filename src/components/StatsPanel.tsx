import type { ProfileStats } from "@/lib/profile";
import { genreName } from "@/lib/genres";
import { getT } from "@/lib/i18n-server";
import { CountUp } from "./CountUp";

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-3xl font-extrabold text-brand-fg">{children}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
    </div>
  );
}

export async function StatsPanel({ stats }: { stats: ProfileStats }) {
  const { t, lang } = await getT();
  const hours = Math.round(((stats.movie_minutes ?? 0) + (stats.tv_minutes ?? 0)) / 60);
  const maxGenre = Math.max(1, ...stats.genres.map((g) => g.n));

  return (
    <section aria-label={t("profile.stats")} className="space-y-4">
      <h2 className="text-lg font-bold">{t("profile.stats")}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label={t("profile.moviesSeen")}>
          <CountUp value={stats.movies_seen} />
        </Tile>
        <Tile label={t("profile.seriesSeen")}>
          <CountUp value={stats.series_seen} />
        </Tile>
        <Tile label={t("profile.episodes")}>
          <CountUp value={stats.episodes} />
        </Tile>
        <Tile label={t("profile.hours")}>
          <CountUp value={hours} />
        </Tile>
        <Tile label={t("profile.avgRating")}>
          {stats.avg_rating !== null && stats.avg_rating !== undefined ? (
            <CountUp value={Number(stats.avg_rating)} decimals={1} />
          ) : (
            "—"
          )}
        </Tile>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("profile.topGenres")}
        </h3>
        {stats.genres.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("profile.noGenres")}</p>
        ) : (
          <ul className="space-y-2.5">
            {stats.genres.map((g) => (
              <li key={g.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{genreName(g.id, lang)}</span>
                  <span className="text-neutral-500">{g.n}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={genreName(g.id, lang)}
                  aria-valuemin={0}
                  aria-valuemax={maxGenre}
                  aria-valuenow={g.n}
                  className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-teal-400"
                    style={{ width: `${Math.round((g.n / maxGenre) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
