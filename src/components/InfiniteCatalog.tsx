"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TitleCard } from "./TitleCard";
import { useI18n } from "./I18nProvider";
import type { CatalogKind, SortKey, TmdbItem } from "@/lib/tmdb";
import { genresForKind, type GenreKey } from "@/lib/genre-filter";
import type { DictKey } from "@/lib/dict";

const SORT_OPTIONS: SortKey[] = ["popularity", "rating", "rating_low", "recent", "oldest"];

const PAGE = 20; // títulos que se muestran de golpe
const keyOf = (i: TmdbItem) => `${i.media_type}-${i.id}`;

// Catálogo completo: la primera tanda viene del servidor y el resto solo se carga al pulsar «Ver más»
// (así la página carga rápido y se llega al pie sin que la lista crezca sola).
export function InfiniteCatalog({
  kind,
  initialItems,
  initialTotalPages,
}: {
  kind: CatalogKind;
  initialItems: TmdbItem[];
  initialTotalPages: number;
}) {
  const { t } = useI18n();
  const [genre, setGenre] = useState<GenreKey | "">("");
  const [sort, setSort] = useState<SortKey>("popularity");
  const [items, setItems] = useState<TmdbItem[]>(initialItems);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shown, setShown] = useState(PAGE); // cuántos títulos se ven
  const [started, setStarted] = useState(false); // tras el primer «Ver más» el scroll es infinito
  const sentinel = useRef<HTMLDivElement>(null);

  const loadingRef = useRef(false);
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, nextSort: SortKey, replace: boolean, nextGenre: GenreKey | "" = genre) => {
      const id = ++reqId.current;
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/discover?kind=${kind}&sort=${nextSort}&page=${nextPage}${nextGenre ? `&genre=${nextGenre}` : ""}`);
        if (!res.ok) throw new Error("fetch");
        const data = (await res.json()) as { items: TmdbItem[]; totalPages: number };
        if (id !== reqId.current) return; // llegó una respuesta antigua: se ignora
        setItems((prev) => {
          const base = replace ? [] : prev;
          const seen = new Set(base.map(keyOf));
          return [...base, ...data.items.filter((i) => !seen.has(keyOf(i)))];
        });
        setPage(nextPage);
        setTotalPages(data.totalPages);
      } catch {
        if (id === reqId.current) setError(true);
      } finally {
        if (id === reqId.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [kind, genre]
  );

  function refetch(nextSort: SortKey, nextGenre: GenreKey | "") {
    setSort(nextSort);
    setGenre(nextGenre);
    setItems([]);
    setPage(0);
    setShown(PAGE);
    load(1, nextSort, true, nextGenre);
  }

  // Enseña 20 más; si quedan pocos ya descargados, pide la página siguiente a TMDB.
  const more = useCallback(async () => {
    if (loadingRef.current) return;
    const remaining = items.length - shown;
    if (remaining > 0) setShown((n) => n + PAGE);
    if (remaining <= PAGE && page > 0 && page < totalPages) {
      await load(page + 1, sort, false, genre);
      if (remaining <= 0) setShown((n) => n + PAGE);
    }
  }, [items.length, shown, page, totalPages, sort, genre, load]);

  // Con el scroll infinito activo, cuando el final se acerca a la pantalla se piden más.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !started) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !error && page > 0) more();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started, error, page, more]);

  const atEnd = page > 0 && page >= totalPages && shown >= items.length && !loading;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("home.all")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            {t("sort.label")}
            <select
              value={sort}
              onChange={(e) => refetch(e.target.value as SortKey, genre)}
              className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-900 outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {t(`sort.${o}` as DictKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            {t("list.genre")}
            <select
              value={genre}
              onChange={(e) => refetch(sort, e.target.value as GenreKey | "")}
              className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-900 outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">{t("list.allGenres")}</option>
              {genresForKind(kind).map((g) => (
                <option key={g} value={g}>
                  {t(`genre.${g}` as DictKey)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.slice(0, shown).map((it, i) => (
          <TitleCard
            key={keyOf(it)}
            id={it.id}
            type={it.media_type}
            title={it.title}
            posterPath={it.poster_path}
            year={it.year}
            index={i}
          />
        ))}
      </div>

      <div ref={sentinel} className="py-8 text-center text-sm text-neutral-500" aria-live="polite">
        {error && (
          <p className="mb-3">
            {t("catalog.error")}{" "}
            <button
              type="button"
              onClick={() => load(Math.max(page, 0) + 1, sort, page === 0, genre)}
              className="font-semibold text-brand-fg underline"
            >
              {t("catalog.retry")}
            </button>
          </p>
        )}
        {!started && !atEnd && !error && page > 0 && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setStarted(true);
              more();
            }}
            className="rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
          >
            {t("catalog.more")}
          </button>
        )}
        {loading && t("catalog.loading")}
        {atEnd && !error && t("catalog.end")}
      </div>
    </section>
  );
}
