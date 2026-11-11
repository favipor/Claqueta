import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { genreName } from "@/lib/genres";
import { img } from "@/lib/tmdb";
import { FIRST_YEAR, loadYearSummary, parseYear, totalHours } from "@/lib/year-summary";
import { Avatar } from "@/components/Avatar";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { ShareButton } from "@/components/ShareButton";
import { YearMonths } from "@/components/YearMonths";

type Props = { params: Promise<{ username: string; year: string }> };
const clean = (raw: string) => decodeURIComponent(raw).toLowerCase();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const username = clean(p.username);
  const year = parseYear(p.year);
  if (!year) return {};
  const title = `El ${year} de @${username} en Claqueta`;
  return {
    title,
    description: `Horas vistas, películas, series, géneros favoritos y mejores notas de ${year}.`,
    openGraph: { title, type: "profile" },
    twitter: { card: "summary_large_image", title },
  };
}

// «Tu 2026 en Claqueta»: resumen del año para compartir
export default async function YearPage({ params }: Props) {
  const p = await params;
  const username = clean(p.username);
  const year = parseYear(p.year);
  if (!year) notFound();
  const { t, lang } = await getT();
  const supabase = await createClient();
  const [{ data: auth }, { profile, summary }] = await Promise.all([
    supabase.auth.getUser(),
    loadYearSummary(supabase, username, year),
  ]);
  if (!profile) notFound();
  const isOwner = auth.user?.id === profile.id;
  const name = profile.display_name ?? `@${profile.username}`;
  const now = new Date().getUTCFullYear();
  const years = Array.from({ length: now - FIRST_YEAR + 1 }, (_, i) => now - i);

  const yearNav = (
    <nav aria-label={t("year.other")} className="flex flex-wrap justify-center gap-2">
      {years.map((y) => (
        <Link
          key={y}
          href={`/u/${profile.username}/resumen/${y}`}
          aria-current={y === year ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
            y === year ? "bg-white text-teal-900 shadow" : "bg-white/15 text-white hover:bg-white/25"
          }`}
        >
          {y}
        </Link>
      ))}
    </nav>
  );

  const shell = (children: React.ReactNode) => (
    <div className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-gradient-to-br from-teal-950 via-teal-800 to-teal-600 px-4 py-12 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="relative mx-auto max-w-4xl space-y-10">{children}</div>
    </div>
  );

  if (!summary) {
    return shell(
      <div className="space-y-6 py-16 text-center">
        <p className="text-lg text-white/80">{t("year.private")}</p>
        <Link href={`/u/${profile.username}`} className="inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-teal-900">
          {t("year.backProfile")}
        </Link>
      </div>
    );
  }

  const s = summary;
  const hours = totalHours(s);
  const nothing = s.movies + s.series + s.episodes === 0;
  const best = s.months.length ? s.months.reduce((a, b) => (b.n > a.n ? b : a)) : null;
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", { month: "long" }).format(new Date(Date.UTC(2024, m - 1, 15)));

  const tile = (value: number, label: string, sub?: string) => (
    <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
      <p className="text-4xl font-extrabold tabular-nums sm:text-5xl">
        <CountUp value={value} />
      </p>
      <p className="mt-1 text-sm font-semibold text-white/85">{label}</p>
      {sub && <p className="text-xs text-white/60">{sub}</p>}
    </div>
  );

  return shell(
    <>
      <header className="space-y-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <Avatar url={profile.avatar_url} size={48} className="ring-2 ring-white/60" />
          <span className="text-left">
            <span className="block font-bold">{name}</span>
            <span className="block text-sm text-white/70">@{profile.username}</span>
          </span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
          {isOwner ? t("year.titleMine") : t("year.titleOther")} {year}
        </h1>
        <p className="text-white/80">{t("year.subtitle")}</p>
        {yearNav}
      </header>

      {nothing ? (
        <p className="rounded-3xl bg-white/10 p-8 text-center text-white/85">{t("year.empty")}</p>
      ) : (
        <>
          <Reveal>
            <section className="rounded-[2rem] bg-white/10 p-8 text-center ring-1 ring-white/15 backdrop-blur">
              <p className="text-sm font-bold uppercase tracking-widest text-teal-200">{t("year.hoursLabel")}</p>
              <p className="mt-2 text-7xl font-extrabold tabular-nums sm:text-8xl">
                <CountUp value={hours} />
              </p>
              <p className="mt-1 text-white/80">
                {t("year.hours")} · ≈ <CountUp value={Math.round(hours / 24)} /> {t("year.days")}
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tile(s.movies, t("year.movies"), `${Math.round(s.movie_minutes / 60)} h`)}
              {tile(s.series, t("year.series"))}
              {tile(s.episodes, t("year.episodes"), `${Math.round(s.tv_minutes / 60)} h`)}
              <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
                <p className="text-4xl font-extrabold tabular-nums sm:text-5xl">
                  {s.avg_rating !== null ? String(s.avg_rating).replace(".", lang === "en" ? "." : ",") : "–"}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/85">{t("year.avg")}</p>
                <p className="text-xs text-white/60">
                  {s.rated} {t("year.rated")}
                </p>
              </div>
            </section>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            {s.genres.length > 0 && (
              <Reveal>
                <section className="h-full rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur">
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-teal-200">{t("year.genres")}</h2>
                  <ol className="space-y-3">
                    {s.genres.map((g, i) => (
                      <li key={g.id} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-teal-900">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-xl font-bold">{genreName(g.id, lang)}</span>
                        <span className="text-sm text-white/70">{g.n}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </Reveal>
            )}
            <Reveal>
              <section className="h-full rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur">
                <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-teal-200">{t("year.months")}</h2>
                {best && (
                  <p className="mb-4 text-sm text-white/80">
                    {t("year.bestMonth")} <strong className="capitalize text-white">{monthName(best.m)}</strong>
                  </p>
                )}
                <YearMonths months={s.months} />
              </section>
            </Reveal>
          </div>

          {s.top.length > 0 && (
            <Reveal>
              <section>
                <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-teal-200">{t("year.top")}</h2>
                <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {s.top.map((it, i) => {
                    const src = img(it.poster_path, "w342");
                    return (
                      <li key={`${it.media_type}-${it.tmdb_id}`}>
                        <Link href={`/titulo/${it.media_type}/${it.tmdb_id}`} className="group block">
                          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/10 shadow-xl ring-1 ring-white/20 transition group-hover:-translate-y-1">
                            {src && <Image src={src} alt={it.title} fill sizes="(max-width: 640px) 30vw, 170px" className="object-cover" />}
                            <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-extrabold text-teal-900 shadow">
                              {i + 1}
                            </span>
                            <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold">
                              <span className="text-amber-400">★</span> {it.rating}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-1 text-sm font-semibold">{it.title}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </Reveal>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <ShareButton title={`${isOwner ? t("year.titleMine") : t("year.titleOther")} ${year} · Claqueta`} text={`${hours} h ${t("year.shareText")}`} />
        <Link href={`/u/${profile.username}`} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/25">
          {t("year.backProfile")}
        </Link>
      </div>
    </>
  );
}
