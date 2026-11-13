"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { updateEntry } from "@/app/actions";
import { img, type TmdbItem } from "@/lib/tmdb";
import { setMyTitle } from "./MyTitles";
import { useI18n } from "./I18nProvider";
import { ClapperIcon } from "./ClapperIcon";
import { startTour } from "./TourCoach";

const GOAL = 5;
// Las mismas opciones que en cualquier ficha (más «no me interesa» para pasar a la siguiente)
type Choice = "visto" | "viendo" | "pendiente" | "skip";

// Hacia dónde sale cada tarjeta según lo elegido
const OUT: Record<Choice, { x: number; y: number; rotate: number }> = {
  visto: { x: 460, y: 0, rotate: 18 },
  skip: { x: -460, y: 0, rotate: -18 },
  pendiente: { x: 0, y: -560, rotate: 0 },
  viendo: { x: 0, y: 560, rotate: 0 },
};

// Una tarjeta con su PROPIA posición: así la que sale y la que entra nunca se mezclan
function SwipeCard({ item, onChoose, reduce, L }: { item: TmdbItem; onChoose: (c: Choice) => void; reduce: boolean; L: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const seen = useTransform(x, [30, 140], [0, 1]);
  const skip = useTransform(x, [-140, -30], [1, 0]);
  const want = useTransform(y, [-140, -30], [1, 0]);
  const watching = useTransform(y, [30, 140], [0, 1]);
  const poster = img(item.poster_path, "w500");

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 110) onChoose("visto");
    else if (info.offset.x < -110) onChoose("skip");
    else if (info.offset.y < -110) onChoose("pendiente");
    else if (info.offset.y > 110) onChoose("viendo");
  }

  return (
    <motion.div
      drag={!reduce}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      style={{ x, y, rotate }}
      initial={reduce ? false : { scale: 0.94, y: 14, opacity: 0.5 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      // La dirección de salida llega por «custom» desde AnimatePresence (la tarjeta que sale ya no recibe props nuevas)
      variants={{ out: (c: Choice) => (reduce ? { opacity: 0 } : { ...OUT[c ?? "skip"], opacity: 0, transition: { duration: 0.32, ease: "easeIn" } }) }}
      exit="out"
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl bg-neutral-800 shadow-2xl active:cursor-grabbing"
    >
      {poster && <Image src={poster} alt={item.title} fill sizes="384px" priority className="pointer-events-none object-cover" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-20 text-white">
        <p className="text-2xl font-extrabold leading-tight drop-shadow">{item.title}</p>
        <p className="mt-1 text-sm text-white/80">
          {item.media_type === "movie" ? (L ? "Movie" : "Película") : L ? "Series" : "Serie"}
          {item.year ? ` · ${item.year}` : ""}
        </p>
      </div>
      <motion.span style={{ opacity: seen }} className="absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400">
        {L ? "WATCHED" : "VISTO"}
      </motion.span>
      <motion.span style={{ opacity: skip }} className="absolute right-5 top-6 rotate-12 rounded-xl border-4 border-neutral-300 px-3 py-1 text-2xl font-black text-neutral-200">
        {L ? "NOPE" : "PASO"}
      </motion.span>
      <motion.span style={{ opacity: want }} className="absolute inset-x-0 top-1/3 mx-auto w-max rounded-xl border-4 border-orange-400 px-3 py-1 text-2xl font-black text-orange-400">
        {L ? "PENDING" : "PENDIENTE"}
      </motion.span>
      <motion.span style={{ opacity: watching }} className="absolute inset-x-0 top-1/3 mx-auto w-max rounded-xl border-4 border-amber-300 px-3 py-1 text-2xl font-black text-amber-300">
        {L ? "WATCHING" : "VIENDO"}
      </motion.span>
    </motion.div>
  );
}

// Visita guiada: pregunta inicial (sí / no), tarjetas para marcar 5 títulos y, al final, un recorrido por la web
export function GuidedStart({ pool, username, direct = false }: { pool: TmdbItem[]; username: string | null; direct?: boolean }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const router = useRouter();
  const reduce = !!useReducedMotion();
  // Desde la Guía se entra directo a las tarjetas (ya has dicho que sí al pulsar el botón)
  const [stage, setStage] = useState<"ask" | "cards" | "done">(direct ? "cards" : "ask");
  const [i, setI] = useState(0);
  const [marked, setMarked] = useState(0);
  const [exitTo, setExitTo] = useState<Choice>("skip");
  const [rateFor, setRateFor] = useState<TmdbItem | null>(null);
  const [locked, setLocked] = useState(false);

  const current = pool[i];
  const leave = () => {
    router.push(username ? `/u/${username}` : "/");
    router.refresh();
  };

  const choose = useCallback(
    (c: Choice) => {
      // Bloqueo breve: un doble toque no puede marcar la tarjeta siguiente sin querer
      if (!current || locked) return;
      setLocked(true);
      setTimeout(() => setLocked(false), 350);
      setExitTo(c);
      const item = current; // la tarjeta que se ve ahora, no la siguiente
      if (c !== "skip") {
        setMyTitle(item.media_type, item.id, { status: c });
        updateEntry({ tmdb_id: item.id, media_type: item.media_type, title: item.title, poster_path: item.poster_path, patch: { status: c } }).catch(() => {});
        if (c === "visto") setRateFor(item);
        setMarked((m) => {
          const n = m + 1;
          if (n >= GOAL) setTimeout(() => setStage("done"), 450);
          return n;
        });
      }
      if (i + 1 >= pool.length) setTimeout(() => setStage("done"), 450);
      setI((k) => k + 1);
    },
    [current, locked, i, pool.length]
  );

  function rate(n: number) {
    if (!rateFor) return;
    const item = rateFor;
    setMyTitle(item.media_type, item.id, { rating: n });
    updateEntry({ tmdb_id: item.id, media_type: item.media_type, title: item.title, poster_path: item.poster_path, patch: { rating: n } }).catch(() => {});
    setRateFor(null);
  }

  // Teclado: → visto, ← paso, ↑ pendiente, ↓ viendo
  useEffect(() => {
    if (stage !== "cards") return;
    const on = (e: KeyboardEvent) => {
      const map: Record<string, Choice> = { ArrowRight: "visto", ArrowLeft: "skip", ArrowUp: "pendiente", ArrowDown: "viendo" };
      const c = map[e.key];
      if (c) {
        e.preventDefault();
        choose(c);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [stage, choose]);

  // ---------- Pregunta inicial ----------
  if (stage === "ask") {
    return (
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="relative h-44 overflow-hidden bg-gradient-to-br from-teal-500 via-teal-700 to-neutral-950">
            <div className="absolute inset-0 flex -rotate-6 scale-125 gap-3 opacity-40">
              {pool.slice(0, 8).map((p) => (
                <div key={p.id} className="relative h-44 w-28 shrink-0 overflow-hidden rounded-xl">
                  {p.poster_path && <Image src={img(p.poster_path, "w185")!} alt="" fill sizes="112px" className="object-cover" />}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
                <ClapperIcon className="h-11 w-11" />
              </span>
            </div>
          </div>
          <div className="p-7 text-center">
            <h1 className="text-2xl font-extrabold">{L ? "Want a quick guided start?" : "¿Quieres una visita guiada?"}</h1>
            <p className="mx-auto mt-2 max-w-sm text-neutral-600 dark:text-neutral-300">
              {L
                ? "Mark 5 titles you know and we'll show you around the site in a minute."
                : "Marca 5 títulos que conozcas y te enseño la web en un minuto."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => setStage("cards")} className="rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark">
                {L ? "Yes, let's go!" : "¡Sí, vamos!"}
              </button>
              <button type="button" onClick={leave} className="rounded-xl px-6 py-3 font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                {L ? "No thanks" : "No, gracias"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- Hecho: paso al recorrido ----------
  if (stage === "done" || !current) {
    return (
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-2xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
        <div className="bg-gradient-to-br from-teal-500 via-teal-700 to-neutral-950 px-8 pb-8 pt-10 text-white">
          <motion.div initial={reduce ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="text-6xl" aria-hidden="true">
            🎉
          </motion.div>
          <h1 className="mt-3 text-2xl font-extrabold">{L ? "Great start!" : "¡Genial!"}</h1>
          <p className="mt-1 text-teal-50">
            {marked ? (L ? `${marked} titles marked.` : `Has marcado ${marked} títulos.`) : L ? "You can mark titles anytime." : "Puedes marcar títulos cuando quieras."}
          </p>
        </div>
        <div className="p-7">
          <p className="font-semibold">{L ? "Now a 1-minute tour:" : "Ahora un recorrido de 1 minuto:"}</p>
          <ol className="mx-auto mt-3 max-w-xs space-y-2 text-left text-sm text-neutral-600 dark:text-neutral-300">
            {(L ? ["📚 Your list", "✨ Recommendations for you", "👥 Friends", "📅 Release calendar", "🏆 Your profile and achievements"] : ["📚 Tu lista", "✨ Recomendaciones para ti", "👥 Amigos", "📅 Calendario de estrenos", "🏆 Tu perfil y tus logros"]).map((s) => (
              <li key={s} className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                startTour(username);
                router.push("/mi-lista");
              }}
              className="rounded-xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
            >
              {L ? "Start the tour" : "Empezar el recorrido"} →
            </button>
            <button type="button" onClick={leave} className="rounded-xl px-6 py-3 font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              {L ? "Skip, I'll explore" : "Saltar, ya lo exploro yo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Tarjetas ----------
  const next = pool[i + 1];
  const btn = "flex flex-col items-center gap-1 rounded-2xl py-3 text-[11px] font-bold transition hover:-translate-y-0.5 disabled:opacity-60 sm:text-xs";
  return (
    <div className="mx-auto max-w-sm select-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-neutral-500">
            <span>{L ? `${marked} of ${GOAL} marked` : `${marked} de ${GOAL} marcados`}</span>
          </div>
          <div className="mt-1.5 flex gap-1">
            {Array.from({ length: GOAL }, (_, k) => (
              <span key={k} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${k < marked ? "bg-gradient-to-r from-teal-400 to-emerald-500" : "bg-neutral-200 dark:bg-neutral-800"}`} />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setStage("done")} className="rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white">
          {L ? "Skip" : "Saltar"}
        </button>
      </div>

      <div className="relative aspect-[2/3] w-full">
        {next?.poster_path && (
          <div className="absolute inset-0 translate-y-3 scale-[.94] overflow-hidden rounded-3xl opacity-60 shadow-lg" aria-hidden="true">
            <Image src={img(next.poster_path, "w500")!} alt="" fill sizes="384px" className="object-cover" />
          </div>
        )}
        <AnimatePresence initial={false} custom={exitTo}>
          <SwipeCard key={`${current.media_type}-${current.id}`} item={current} onChoose={choose} reduce={reduce} L={L} />
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <button type="button" disabled={locked} onClick={() => choose("skip")} className={`${btn} bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700`}>
          <span className="text-xl" aria-hidden="true">✕</span>
          {L ? "Not for me" : "No me interesa"}
        </button>
        <button type="button" disabled={locked} onClick={() => choose("pendiente")} className={`${btn} bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300`}>
          <span className="text-xl" aria-hidden="true">📌</span>
          {L ? "Pending" : "Pendiente"}
        </button>
        <button type="button" disabled={locked} onClick={() => choose("viendo")} className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300`}>
          <span className="text-xl" aria-hidden="true">▶</span>
          {L ? "Watching" : "Viendo"}
        </button>
        <button type="button" disabled={locked} onClick={() => choose("visto")} className={`${btn} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300`}>
          <span className="text-xl" aria-hidden="true">✓</span>
          {L ? "Watched" : "Visto"}
        </button>
      </div>
      <p className="mt-3 hidden text-center text-xs text-neutral-500 sm:block">{L ? "Tip: swipe the card or use the arrow keys" : "Truco: desliza la tarjeta (→ visto, ← paso, ↑ pendiente, ↓ viendo) o usa las flechas"}</p>

      {/* Nota rápida de lo que acabas de marcar como visto (opcional) */}
      <AnimatePresence>
        {rateFor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-4 z-[96] mx-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-neutral-950 p-4 text-white shadow-2xl ring-1 ring-white/15"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">
                {L ? "Rate" : "¿Qué nota le das a"} <b>{rateFor.title}</b>?
              </p>
              <button type="button" onClick={() => setRateFor(null)} className="shrink-0 text-xs text-white/60 hover:text-white">
                {L ? "Later" : "Luego"}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
                <button key={n} type="button" onClick={() => rate(n)} className="rounded-lg bg-white/10 py-1.5 text-sm font-bold transition hover:scale-110 hover:bg-amber-400 hover:text-amber-950">
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
