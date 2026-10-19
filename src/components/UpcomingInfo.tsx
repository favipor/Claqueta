import Link from "next/link";
import type { Upcoming } from "@/lib/tmdb";
import { getT } from "@/lib/i18n-server";

// Recuadro «¿Qué viene después?» de la ficha: próxima temporada/capítulo, estreno o secuela.
export async function UpcomingInfo({ info }: { info: Upcoming }) {
  const { lang, t } = await getT();
  const fmt = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(`${iso}T12:00:00`)
        )
      : null;
  const fill = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

  let main: React.ReactNode;
  let good = true;

  switch (info.kind) {
    case "tv_next": {
      const d = fmt(info.date);
      const head =
        info.episode === 1 && info.season > 1
          ? fill(t("up.tv_newSeason"), { s: info.season })
          : fill(t("up.tv_next"), { s: info.season, e: info.episode });
      main = (
        <>
          {head}{" "}
          <strong>{d ? `${t("up.on")} ${d}` : t("up.noDate")}</strong>
        </>
      );
      break;
    }
    case "tv_returning":
      main = t("up.tv_returning");
      break;
    case "tv_planned":
      main = t("up.tv_planned");
      break;
    case "tv_ended":
      main = t("up.tv_ended");
      good = false;
      break;
    case "tv_canceled":
      main = t("up.tv_canceled");
      good = false;
      break;
    case "movie_unreleased": {
      const d = fmt(info.date);
      main = (
        <>
          {t("up.movie_unreleased")}: <strong>{d ?? t("up.noDate")}</strong>
        </>
      );
      break;
    }
    case "movie_sequel": {
      const d = fmt(info.date);
      main = (
        <>
          {t("up.movie_sequel")}{" "}
          <Link href={`/titulo/movie/${info.id}`} className="font-semibold text-brand-fg underline">
            {info.title}
          </Link>{" "}
          · <strong>{d ?? t("up.noDate")}</strong>
        </>
      );
      break;
    }
    default:
      main = t("up.movie_none");
      good = false;
  }

  return (
    <section
      aria-label={t("up.title")}
      className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${good ? "bg-emerald-500" : "bg-neutral-400"}`}
        />
        {t("up.title")}
      </h2>
      <p className="text-sm">{main}</p>
      <p className="mt-2 text-xs text-neutral-500">{t("up.source")}</p>
    </section>
  );
}
