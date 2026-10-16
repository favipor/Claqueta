"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TitleCard } from "./TitleCard";
import { useI18n } from "./I18nProvider";
import type { CatalogKind, SortKey, TmdbItem } from "@/lib/tmdb";

const keyOf = (i: TmdbItem) => `${i.media_type}-${i.id}`;

// Catálogo completo: carga la primera página desde el servidor y el resto conforme se hace scroll.
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
  const [sort, setSort] = useState<SortKey>("popularity");
  const [items, setItems] = useState<TmdbItem[]>(initialItems);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, nextSort: SortKey, replace: boolean) => {
      const id = ++reqId.current;
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/discover?kind=${kind}&sort=${nextSort}&page=${nextPage}`);
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
    [kind]
  );

  function onSort(next: SortKey) {
    setSort(next);
    setItems([]);
    setPage(0);
    load(1, next, true);
  }

  // Cuando el final de la lista se acerca a la pantalla, se pide la página siguiente.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingRef.current &&
          !error &&
          page > 0 &&
          page < totalPages
        ) {
          load(page + 1, sort, false);
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [page, totalPages, sort, error, load]);

  const atEnd = page > 0 && page >= totalPages && !loading;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("home.all")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">{t("sort.label")}</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="popularity">{t("sort.popularity")}</option>
            <option value="rating">{t("sort.rating")}</option>
            <option value="recent">{t("sort.recent")}</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it, i) => (
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
        {loading && t("catalog.loading")}
        {error && (
          <span>
            {t("catalog.error")}{" "}
            <button
              type="button"
              onClick={() => load(Math.max(page, 0) + 1, sort, page === 0)}
              className="font-semibold text-brand-fg underline"
            >
              {t("catalog.retry")}
            </button>
          </span>
        )}
        {atEnd && !error && t("catalog.end")}
      </div>
    </section>
  );
}
