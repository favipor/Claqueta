"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { TitleCard } from "./TitleCard";
import { useI18n } from "./I18nProvider";
import type { CatalogKind, SortKey, TmdbItem } from "@/lib/tmdb";
import { genresForKind, type GenreKey } from "@/lib/genre-filter";
import type { DictKey } from "@/lib/dict";

const SORT_OPTIONS: SortKey[] = ["popularity", "rating", "rating_low", "recent", "oldest"];

const PAGE = 20; // títulos que se muestran de golpe
const keyOf = (i: TmdbItem) => `${i.media_type}-${i.id}`;

// ---------- Volver atrás sin perder el sitio ----------
// Se guarda en la sesión lo que llevabas cargado (títulos, orden, género...) y la posición del scroll.
// Al volver con el botón «atrás» se restaura todo, aunque estuvieras en el título número 200.
type Snapshot = {
  items: TmdbItem[];
  page: number;
  totalPages: number;
  shown: number;
  started: boolean;
  sort: SortKey;
  genre: GenreKey | "";
  onlyMine?: boolean;
  scrollY: number;
  at: number;
};

// «Atrás/adelante» del navegador activa la marca; cualquier navegación normal (pulsar un enlace
// o un cambio de página por código) la quita. No depende del tiempo que tarde la página en cargar.
let popPending = false;
let firstMount = true;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popPending = true;
  });
  document.addEventListener(
    "click",
    (e) => {
      if ((e.target as Element | null)?.closest?.("a")) popPending = false;
    },
    true
  );
  const push = history.pushState.bind(history);
  history.pushState = (...args: Parameters<History["pushState"]>) => {
    popPending = false;
    return push(...args);
  };
}

function cameBack() {
  if (popPending) return true;
  // Recarga completa desde el historial (por ejemplo, si el navegador descartó la página)
  if (firstMount) {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "back_forward";
  }
  return false;
}

function readSnap(key: string): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Snapshot;
    return Date.now() - snap.at < 60 * 60 * 1000 ? snap : null;
  } catch {
    return null;
  }
}

// Catálogo completo: la primera tanda viene del servidor y el resto solo se carga al pulsar «Ver más»
// (así la página carga rápido y se llega al pie sin que la lista crezca sola).
export function InfiniteCatalog({
  kind,
  initialItems,
  initialTotalPages,
  myProviders = null,
}: {
  kind: CatalogKind;
  initialItems: TmdbItem[];
  initialTotalPages: number;
  // Tus plataformas (null = sin sesión: no se enseña el interruptor)
  myProviders?: number[] | null;
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
  const pathname = usePathname();
  const snapKey = `catalog:${pathname}:${kind}`;
  const [restoreY, setRestoreY] = useState<number | null>(null); // posición a la que hay que volver
  // No se guarda nada hasta haber decidido si se restaura (si no, el estado vacío del primer
  // pintado pisaría lo guardado antes de poder leerlo)
  const [ready, setReady] = useState(false);

  // «Solo en mis plataformas»
  const [onlyMine, setOnlyMine] = useState(false);
  const onlyMineRef = useRef(false);
  const hasProviders = !!myProviders && myProviders.length > 0;

  const loadingRef = useRef(false);
  const reqId = useRef(0);

  const load = useCallback(
    async (nextPage: number, nextSort: SortKey, replace: boolean, nextGenre: GenreKey | "" = genre) => {
      const id = ++reqId.current;
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      try {
        const prov = onlyMineRef.current && myProviders?.length ? `&providers=${myProviders.join(",")}` : "";
        const res = await fetch(`/api/discover?kind=${kind}&sort=${nextSort}&page=${nextPage}${nextGenre ? `&genre=${nextGenre}` : ""}${prov}`);
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
    [kind, genre, myProviders]
  );

  function refetch(nextSort: SortKey, nextGenre: GenreKey | "", nextOnlyMine: boolean = onlyMineRef.current) {
    onlyMineRef.current = nextOnlyMine;
    setOnlyMine(nextOnlyMine);
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

  // Al montar: si se ha vuelto atrás, se recupera el estado guardado
  useLayoutEffect(() => {
    const back = cameBack();
    firstMount = false;
    const snap = back ? readSnap(snapKey) : null;
    if (snap && snap.items.length > 0) {
      setItems(snap.items);
      setPage(snap.page);
      setTotalPages(snap.totalPages);
      setShown(snap.shown);
      setStarted(snap.started);
      setSort(snap.sort);
      setGenre(snap.genre);
      onlyMineRef.current = !!snap.onlyMine && hasProviders;
      setOnlyMine(onlyMineRef.current);
      setRestoreY(snap.scrollY);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tras pintar los títulos restaurados se baja hasta donde estabas (varios intentos por si
  // la página aún está creciendo o el navegador mueve el scroll por su cuenta)
  useEffect(() => {
    const y = restoreY;
    if (y === null) return;
    const go = () => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    go();
    const timers = [50, 150, 350, 700].map((ms) => setTimeout(go, ms));
    // Si la persona empieza a mover la página, se deja de forzar la posición
    const stop = () => timers.forEach(clearTimeout);
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
    };
  }, [restoreY]);

  // Se guarda el estado cada vez que cambia...
  const save = useCallback(
    (scrollY?: number) => {
      if (!ready) return;
      try {
        const prev = readSnap(snapKey);
        const snap: Snapshot = {
          items,
          page,
          totalPages,
          shown,
          started,
          sort,
          genre,
          onlyMine,
          scrollY: scrollY ?? prev?.scrollY ?? 0,
          at: Date.now(),
        };
        sessionStorage.setItem(snapKey, JSON.stringify(snap));
      } catch {}
    },
    [ready, snapKey, items, page, totalPages, shown, started, sort, genre, onlyMine]
  );

  useEffect(() => {
    if (!loading) save();
  }, [save, loading]);

  // ...y la posición justo al pulsar un enlace (antes de que la página cambie)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("a")) save(window.scrollY);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [save]);

  const atEnd = page > 0 && page >= totalPages && shown >= items.length && !loading;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("home.all")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {myProviders !== null &&
            (hasProviders ? (
              <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-full border border-neutral-300 bg-white py-1 pl-3 pr-1.5 text-sm font-semibold dark:border-neutral-700 dark:bg-neutral-900">
                {t("prov.onlyMine")}
                <input
                  type="checkbox"
                  role="switch"
                  checked={onlyMine}
                  onChange={(e) => refetch(sort, genre, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-6 w-11 rounded-full bg-neutral-300 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand-fg peer-focus-visible:ring-offset-2 dark:bg-neutral-700 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
                />
              </label>
            ) : (
              <Link
                href="/ajustes#plataformas"
                className="rounded-full border border-dashed border-neutral-400 px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:border-brand-fg hover:text-brand-fg dark:text-neutral-300"
              >
                + {t("prov.choose")}
              </Link>
            ))}
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
            tmdbRating={it.vote_average}
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
