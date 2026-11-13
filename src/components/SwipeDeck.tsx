"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { updateEntry } from "@/app/actions";
import { loadSwipe, swipeInfo, type SwipeInfo } from "@/app/swipe-actions";
import { img, type TmdbItem } from "@/lib/tmdb";
import type { SwipeKind } from "@/lib/swipe";
import { setMyTitle } from "./MyTitles";
import { useI18n } from "./I18nProvider";
import { SwipeCard, RatePanel, type Choice } from "./SwipeCard";

type Counts = Record<Choice, number>;
const ZERO: Counts = { visto: 0, viendo: 0, pendiente: 0, skip: 0 };
const key = (it: TmdbItem) => `${it.media_type}-${it.id}`;

// «Desliza»: carátulas sin fin para ir marcando lo que quieras. Paras cuando quieras.
// Cada vez que entras el orden es otro, y no se repite lo que ya ha salido ni lo que ya tienes.
export function SwipeDeck() {
  const { lang } = useI18n();
  const L = lang === "en";
  const reduce = !!useReducedMotion();
  const [kind, setKind] = useState<SwipeKind>("all");
  const [deck, setDeck] = useState<TmdbItem[]>([]);
  const [i, setI] = useState(0);
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [exitTo, setExitTo] = useState<Choice>("skip");
  const [rateFor, setRateFor] = useState<TmdbItem | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sheet, setSheet] = useState<{ item: TmdbItem; info: SwipeInfo | null | "loading" } | null>(null);
  const infoCache = useRef(new Map<string, SwipeInfo | null>());
  const shown = useRef(new Set<string>());
  const gen = useRef(0); // para descartar lotes de un filtro anterior

  const fetchMore = useCallback(async (k: SwipeKind) => {
    const g = gen.current;
    setLoading(true);
    try {
      const more = await loadSwipe(k, [...shown.current]);
      if (g !== gen.current) return;
      const fresh = more.filter((it) => !shown.current.has(key(it)));
      fresh.forEach((it) => shown.current.add(key(it)));
      if (fresh.length) setDeck((d) => [...d, ...fresh]);
      else setEmpty(true);
    } finally {
      if (g === gen.current) setLoading(false);
    }
  }, []);

  // Primer lote y cada vez que cambias Todo / Películas / Series
  useEffect(() => {
    gen.current++;
    setDeck([]);
    setI(0);
    setEmpty(false);
    fetchMore(kind);
  }, [kind, fetchMore]);

  // Cuando quedan pocas, se piden más por detrás
  useEffect(() => {
    if (!loading && !empty && deck.length > 0 && deck.length - i < 8) fetchMore(kind);
  }, [i, deck.length, loading, empty, kind, fetchMore]);

  const current = deck[i];

  async function openInfo(item: TmdbItem) {
    const k = key(item);
    if (infoCache.current.has(k)) return setSheet({ item, info: infoCache.current.get(k)! });
    setSheet({ item, info: "loading" });
    const info = await swipeInfo(item.media_type, item.id).catch(() => null);
    infoCache.current.set(k, info);
    setSheet((s) => (s && key(s.item) === k ? { item, info } : s));
  }

  // Cerrar la hoja con Escape
  useEffect(() => {
    if (!sheet) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [sheet]);

  const advance = useCallback((c: Choice) => {
    setExitTo(c);
    setCounts((n) => ({ ...n, [c]: n[c] + 1 }));
    setI((k) => k + 1);
  }, []);

  const choose = useCallback(
    (c: Choice) => {
      if (!current || locked || rateFor || sheet) return;
      setLocked(true);
      setTimeout(() => setLocked(false), 350);
      const item = current;
      if (c !== "skip") {
        setMyTitle(item.media_type, item.id, { status: c });
        updateEntry({ tmdb_id: item.id, media_type: item.media_type, title: item.title, poster_path: item.poster_path, patch: { status: c } }).catch(() => {});
      }
      // Si la has visto, primero la nota: la tarjeta se queda hasta que puntúes
      if (c === "visto") setRateFor(item);
      else advance(c);
    },
    [current, locked, rateFor, sheet, advance]
  );

  function rate(n: number) {
    if (!rateFor) return;
    const item = rateFor;
    setMyTitle(item.media_type, item.id, { rating: n });
    updateEntry({ tmdb_id: item.id, media_type: item.media_type, title: item.title, poster_path: item.poster_path, patch: { rating: n } }).catch(() => {});
    setRateFor(null);
    setLocked(true);
    setTimeout(() => setLocked(false), 350);
    advance("visto");
  }

  // Teclado: → visto, ← paso, ↑ pendiente, ↓ viendo
  useEffect(() => {
    if (finished) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const map: Record<string, Choice> = { ArrowRight: "visto", ArrowLeft: "skip", ArrowUp: "pendiente", ArrowDown: "viendo" };
      const c = map[e.key];
      if (c) {
        e.preventDefault();
        choose(c);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [finished, choose]);

  const marked = counts.visto + counts.viendo + counts.pendiente;

  // ---------- Resumen al terminar ----------
  if (finished) {
    const rows: [string, string, number][] = [
      ["✓", L ? "Watched" : "Vistas", counts.visto],
      ["▶", L ? "Watching" : "Viendo", counts.viendo],
      ["📌", L ? "Pending" : "Pendientes", counts.pendiente],
      ["✕", L ? "Skipped" : "Pasadas", counts.skip],
    ];
    return (
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-2xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
        <div className="bg-gradient-to-br from-teal-500 via-teal-700 to-neutral-950 px-8 pb-8 pt-10 text-white">
          <p className="text-6xl" aria-hidden="true">
            {marked ? "🎉" : "👋"}
          </p>
          <h1 className="mt-3 text-2xl font-extrabold">{marked ? (L ? `${marked} titles marked` : `Has marcado ${marked} títulos`) : L ? "See you soon" : "¡Hasta la próxima!"}</h1>
        </div>
        <div className="p-7">
          <ul className="grid grid-cols-4 gap-2">
            {rows.map(([icon, label, n]) => (
              <li key={label} className="rounded-2xl bg-neutral-100 px-2 py-3 dark:bg-neutral-800">
                <span className="block text-lg" aria-hidden="true">
                  {icon}
                </span>
                <span className="block text-xl font-black tabular-nums">{n}</span>
                <span className="block text-[11px] font-semibold text-neutral-500">{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setCounts(ZERO);
                setFinished(false);
              }}
              className="rounded-xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
            >
              {L ? "Keep swiping" : "Seguir deslizando"}
            </button>
            <Link href="/mi-lista" className="rounded-xl px-6 py-3 font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              {L ? "Go to my list" : "Ver mi lista"} →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Tarjetas ----------
  const next = deck[i + 1];
  const info = sheet && sheet.info !== "loading" ? sheet.info : null;
  const btn = "flex flex-col items-center gap-1 rounded-2xl py-3 text-[11px] font-bold transition hover:-translate-y-0.5 disabled:opacity-40 sm:text-xs";
  const kinds: [SwipeKind, string][] = [
    ["all", L ? "All" : "Todo"],
    ["movie", L ? "Movies" : "Películas"],
    ["tv", L ? "Series" : "Series"],
  ];
  return (
    // Ancho atado al alto de la pantalla: filtros, carátula y botones caben sin bajar
    <div className="swipe-page mx-auto w-full select-none sm:w-[clamp(15rem,calc((100dvh-24rem)*0.6667),24rem)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-neutral-200/70 p-1 dark:bg-neutral-800" role="radiogroup" aria-label={L ? "Type" : "Tipo"}>
          {kinds.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              disabled={!!rateFor}
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${kind === k ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!!rateFor}
          onClick={() => setFinished(true)}
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {L ? "Done" : "Terminar"}
        </button>
      </div>

      <p className="mb-2 text-center text-xs font-semibold text-neutral-500" aria-live="polite">
        ✓ {counts.visto} · ▶ {counts.viendo} · 📌 {counts.pendiente} · ✕ {counts.skip}
      </p>

      <div className="relative h-[calc(100dvh-17.5rem)] max-h-[calc((100vw-2rem)*1.5)] min-h-[18rem] w-full sm:aspect-[2/3] sm:h-auto sm:max-h-none sm:min-h-0">
        {next?.poster_path && (
          <div className="absolute inset-0 translate-y-3 scale-[.94] overflow-hidden rounded-3xl opacity-60 shadow-lg" aria-hidden="true">
            <Image src={img(next.poster_path, "w500")!} alt="" fill sizes="384px" className="object-cover" />
          </div>
        )}
        {current ? (
          <AnimatePresence initial={false} custom={exitTo}>
            <SwipeCard key={key(current)} item={current} onChoose={choose} reduce={reduce || !!rateFor} L={L} onTap={rateFor ? undefined : () => openInfo(current)} />
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 grid place-items-center rounded-3xl bg-neutral-100 text-center dark:bg-neutral-900">
            {empty ? (
              <p className="px-6 text-sm text-neutral-500">{L ? "You've gone through everything for now. Come back later!" : "Por ahora lo has visto todo. ¡Vuelve más tarde!"}</p>
            ) : (
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-brand" aria-label={L ? "Loading" : "Cargando"} />
            )}
          </div>
        )}
        <AnimatePresence>{rateFor && <RatePanel title={rateFor.title} onRate={rate} L={L} />}</AnimatePresence>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4">
        <button type="button" disabled={locked || !!rateFor || !current} onClick={() => choose("skip")} className={`${btn} bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700`}>
          <span className="text-xl" aria-hidden="true">✕</span>
          {L ? "Not for me" : "No me interesa"}
        </button>
        <button type="button" disabled={locked || !!rateFor || !current} onClick={() => choose("pendiente")} className={`${btn} bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300`}>
          <span className="text-xl" aria-hidden="true">📌</span>
          {L ? "Pending" : "Pendiente"}
        </button>
        <button type="button" disabled={locked || !!rateFor || !current} onClick={() => choose("viendo")} className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300`}>
          <span className="text-xl" aria-hidden="true">▶</span>
          {L ? "Watching" : "Viendo"}
        </button>
        <button type="button" disabled={locked || !!rateFor || !current} onClick={() => choose("visto")} className={`${btn} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300`}>
          <span className="text-xl" aria-hidden="true">✓</span>
          {L ? "Watched" : "Visto"}
        </button>
      </div>
      <p className="mt-2 hidden text-center text-xs text-neutral-500 sm:block">{L ? "Tap the poster for the synopsis · swipe or use the arrow keys" : "Toca la carátula para ver de qué va · desliza o usa las flechas"}</p>

      {/* Hoja con la sinopsis al tocar la carátula (se cierra tocando fuera, arrastrando hacia abajo o con Escape) */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[94] bg-black/55" onClick={() => setSheet(null)} aria-hidden="true" />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={sheet.item.title}
              initial={reduce ? { opacity: 0 } : { y: "100%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              exit={reduce ? { opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              drag={reduce ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90) setSheet(null);
              }}
              className="fixed inset-x-0 bottom-0 z-[95] mx-auto max-h-[75dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-8 shadow-2xl dark:bg-neutral-900"
            >
              <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />
              <div className="flex gap-4">
                {sheet.item.poster_path && (
                  <span className="relative h-32 w-[5.4rem] shrink-0 overflow-hidden rounded-xl shadow-md">
                    <Image src={img(sheet.item.poster_path, "w185")!} alt="" fill sizes="88px" className="object-cover" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold leading-tight">{sheet.item.title}</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {sheet.item.media_type === "movie" ? (L ? "Movie" : "Película") : L ? "Series" : "Serie"}
                    {sheet.item.year ? ` · ${sheet.item.year}` : ""}
                    {info && info.runtime && sheet.item.media_type === "movie" ? ` · ${info.runtime} min` : ""}
                    {info && info.seasons ? ` · ${info.seasons} ${L ? (info.seasons === 1 ? "season" : "seasons") : info.seasons === 1 ? "temporada" : "temporadas"}` : ""}
                  </p>
                  {info && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {info.vote > 0 && (
                        <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                          <span className="text-amber-400 dark:text-amber-500">★</span> {info.vote.toLocaleString(lang, { maximumFractionDigits: 1 })}
                        </span>
                      )}
                      {info.genres.map((g) => (
                        <span key={g} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {sheet.info === "loading" ? (
                <div className="mt-4 space-y-2" aria-label={L ? "Loading" : "Cargando"}>
                  {[100, 92, 70].map((w) => (
                    <span key={w} className="block h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{info?.overview || (L ? "No synopsis available yet." : "Todavía no hay sinopsis disponible.")}</p>
              )}
              {info && info.providers.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500">{L ? "Streaming on" : "Disponible en"}</span>
                  {info.providers.map((pr) =>
                    pr.logo_path ? (
                      <span key={pr.name} title={pr.name} className="relative h-7 w-7 overflow-hidden rounded-lg">
                        <Image src={img(pr.logo_path, "w92")!} alt={pr.name} fill sizes="28px" className="object-cover" />
                      </span>
                    ) : null
                  )}
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setSheet(null)} className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark">
                  {L ? "Back to the cards" : "Volver a las carátulas"}
                </button>
                <Link href={`/titulo/${sheet.item.media_type}/${sheet.item.id}`} className="rounded-xl px-4 py-3 text-sm font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-100 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800">
                  {L ? "Full page" : "Ver ficha"}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
