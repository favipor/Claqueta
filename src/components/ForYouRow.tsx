"use client";

import { useState, useTransition } from "react";
import { loadRecs } from "@/app/recs-actions";
import type { RecsResult, LikedTitle } from "@/lib/recs";
import type { CatalogKind } from "@/lib/tmdb";
import { genresForKind } from "@/lib/genre-filter";
import type { DictKey } from "@/lib/dict";
import { useI18n } from "./I18nProvider";
import { FilterSelect } from "./FilterSelect";
import { ScrollRow } from "./ScrollRow";
import { TitleCard } from "./TitleCard";

// «Para ti» con su propia barra: elegir en qué basar las recomendaciones (mezcla de tus
// favoritas, un título concreto o un género) o pedir una sorpresa al azar.
export function ForYouRow({ kind, initial, liked }: { kind: CatalogKind; initial: RecsResult; liked: LikedTitle[] }) {
  const { t } = useI18n();
  const [res, setRes] = useState(initial);
  const [pending, start] = useTransition();
  const [spin, setSpin] = useState(0);

  const run = (source: string) =>
    start(async () => {
      const next = await loadRecs(kind, source);
      setRes(next);
    });

  const genre = res.source.startsWith("g:") ? res.source.slice(2) : null;
  const sub =
    res.source === "mix"
      ? t("recs.mixSub")
      : genre
        ? `${t("recs.genreSub")} ${t(`genre.${genre}` as DictKey)}`
        : res.because
          ? `${t("recs.because")} ${res.because}`
          : "";
  // Si el título elegido ya no está entre tus favoritas, se añade a la lista para que se vea seleccionado
  const titles = liked.some((l) => l.key === res.source) || !res.source.startsWith("t:")
    ? liked
    : [...liked, { key: res.source, title: res.because ?? "…", media_type: "movie" as const, tmdb_id: 0 }];

  return (
    <section>
      <div className="relative z-10 mb-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="min-w-0 text-xl font-bold">
          {t("recs.title")}
          {sub && <span className="font-semibold text-neutral-500 dark:text-neutral-400"> · {sub}</span>}
        </h2>
        <div className="flex shrink-0 gap-2">
          <FilterSelect label={t("recs.basedOn")} icon="spark" value={res.source} onChange={run} className="min-w-0 flex-1 md:w-64 md:flex-none">
            <option value="mix">{t("recs.mix")}</option>
            {titles.length > 0 && (
              <optgroup label={t("recs.byTitle")}>
                {titles.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t("recs.byGenre")}>
              {genresForKind(kind).map((g) => (
                <option key={g} value={`g:${g}`}>
                  {t(`genre.${g}` as DictKey)}
                </option>
              ))}
            </optgroup>
          </FilterSelect>
          <button
            type="button"
            onClick={() => {
              setSpin((s) => s + 1);
              run(`random:${res.source}`);
            }}
            disabled={pending}
            title={t("recs.surprise")}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-neutral-100 px-3.5 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg disabled:opacity-70 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700/80 sm:py-2"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-brand-fg transition-transform duration-500"
              style={{ transform: `rotate(${spin * 360}deg)` }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
              <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
              <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
              <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
            </svg>
            {t("recs.surprise")}
          </button>
        </div>
      </div>
      <div className={`transition-opacity ${pending ? "pointer-events-none opacity-40" : ""}`} aria-busy={pending}>
        {res.items.length > 0 ? (
          <ScrollRow key={res.source + res.items[0]?.id} label={t("recs.title")}>
            {res.items.map((it) => (
              <div key={`${it.media_type}-${it.id}`} className="w-36 shrink-0 snap-start sm:w-44">
                <TitleCard
                  id={it.id}
                  type={it.media_type}
                  title={it.title}
                  posterPath={it.poster_path}
                  tmdbRating={it.vote_average}
                  year={it.year}
                  reveal={false}
                />
              </div>
            ))}
          </ScrollRow>
        ) : (
          <p className="my-6 rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {t("recs.empty")}
          </p>
        )}
      </div>
    </section>
  );
}
