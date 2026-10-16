"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TvEpisode, TvSeason } from "@/lib/tmdb";
import type { SeasonStatus, TvState } from "@/lib/series-types";
import { isAired } from "@/lib/aired";
import { useI18n } from "./I18nProvider";
import { ProgressBar } from "./ProgressBar";

const SEASON_STATUSES: SeasonStatus[] = ["pendiente", "viendo", "visto"];

const activeColor: Record<SeasonStatus, string> = {
  pendiente: "bg-orange-500 text-white border-orange-500",
  viendo: "bg-amber-500 text-white border-amber-500",
  visto: "bg-emerald-600 text-white border-emerald-600",
};

type EpState = TvEpisode[] | "loading" | "error";

export function SeasonsTracker({
  tmdbId,
  seasons,
  state,
  busy,
  onSeason,
  onEpisode,
  onUntil,
}: {
  tmdbId: number;
  seasons: TvSeason[];
  state: TvState;
  busy: boolean;
  onSeason: (season: number, status: SeasonStatus) => void;
  onEpisode: (season: number, episode: number, watched: boolean) => void;
  onUntil: (season: number, episode: number) => void;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [eps, setEps] = useState<Record<number, EpState>>({});
  const [showSpecials, setShowSpecials] = useState(false);

  const real = seasons.filter((s) => s.season_number >= 1 && s.episode_count > 0);
  const specials = seasons.find((s) => s.season_number === 0 && s.episode_count > 0);
  const list = showSpecials && specials ? [specials, ...real] : real;

  const watchedIn = (sn: number) => state.watched.filter((k) => k.startsWith(`${sn}-`)).length;

  async function load(sn: number) {
    setEps((m) => ({ ...m, [sn]: "loading" }));
    try {
      const res = await fetch(`/api/tv-season?id=${tmdbId}&season=${sn}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { episodes: TvEpisode[] };
      setEps((m) => ({ ...m, [sn]: data.episodes }));
    } catch {
      setEps((m) => ({ ...m, [sn]: "error" }));
    }
  }

  function toggleOpen(sn: number) {
    const next = !open[sn];
    setOpen((o) => ({ ...o, [sn]: next }));
    if (next && (eps[sn] === undefined || eps[sn] === "error")) load(sn);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("tv.title")}
        </h2>
        {specials && (
          <button
            type="button"
            onClick={() => setShowSpecials((v) => !v)}
            aria-pressed={showSpecials}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {showSpecials ? t("tv.hideSpecials") : t("tv.showSpecials")}
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {list.map((s) => {
          const sn = s.season_number;
          const status: SeasonStatus = state.seasons[sn] ?? "pendiente";
          const count = watchedIn(sn);
          const isOpen = !!open[sn];
          const e = eps[sn];
          const name = sn === 0 ? t("tv.specials") : `${t("tv.season")} ${sn}`;

          return (
            <li
              key={sn}
              className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleOpen(sn)}
                  aria-expanded={isOpen}
                  aria-label={`${name}: ${isOpen ? t("tv.collapse") : t("tv.expand")}`}
                  className="flex items-center gap-2 rounded-lg text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg"
                >
                  <motion.span
                    aria-hidden
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                    className="inline-block text-brand-fg"
                  >
                    ▸
                  </motion.span>
                  {name}
                  <span className="text-xs font-normal text-neutral-500">
                    {Math.min(count, s.episode_count)} {t("tv.of")} {s.episode_count}
                  </span>
                </button>

                <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
                  {SEASON_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={busy}
                      aria-pressed={status === st}
                      onClick={() => onSeason(sn, st)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:opacity-60 ${
                        status === st
                          ? activeColor[st]
                          : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {t(`status.${st}` as const)}
                    </button>
                  ))}
                </div>
              </div>

              <ProgressBar
                className="mt-3"
                value={count}
                total={s.episode_count}
                label={`${t("tv.progress")} · ${name}`}
              />

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="eps"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">
                      {e === undefined || e === "loading" ? (
                        <p className="text-sm text-neutral-500" aria-live="polite">
                          {t("tv.loadingEpisodes")}
                        </p>
                      ) : e === "error" ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {t("tv.errorEpisodes")}{" "}
                          <button type="button" onClick={() => load(sn)} className="underline">
                            {t("catalog.retry")}
                          </button>
                        </p>
                      ) : (
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {e.map((ep) => {
                            const aired = isAired(ep);
                            const seen = state.watched.includes(`${sn}-${ep.episode_number}`);
                            const id = `ep-${tmdbId}-${sn}-${ep.episode_number}`;
                            return (
                              <li key={ep.episode_number} className="flex items-center gap-3 py-2">
                                <input
                                  id={id}
                                  type="checkbox"
                                  checked={seen}
                                  disabled={!aired}
                                  onChange={(ev) =>
                                    onEpisode(sn, ep.episode_number, ev.target.checked)
                                  }
                                  className="h-5 w-5 shrink-0 cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
                                />
                                <label
                                  htmlFor={id}
                                  className={`min-w-0 flex-1 text-sm ${
                                    aired ? "cursor-pointer" : "cursor-not-allowed text-neutral-400"
                                  }`}
                                >
                                  <span className="font-medium">{ep.episode_number}.</span>{" "}
                                  {ep.name}
                                  <span className="block text-xs text-neutral-500">
                                    {aired
                                      ? [ep.air_date, ep.runtime ? `${ep.runtime} min` : ""]
                                          .filter(Boolean)
                                          .join(" · ")
                                      : `${t("tv.unaired")}${ep.air_date ? ` · ${ep.air_date}` : ""}`}
                                  </span>
                                </label>
                                {aired && !seen && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onUntil(sn, ep.episode_number)}
                                    className="shrink-0 rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                  >
                                    {t("tv.markUntil")}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
