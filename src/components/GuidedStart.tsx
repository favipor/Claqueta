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

const GOAL = 10;
type Choice = "seen" | "want" | "skip";

// Visita guiada: pregunta inicial (sí / no) y tarjetas para marcar de un toque o deslizando
export function GuidedStart({ pool, username, direct = false }: { pool: TmdbItem[]; username: string | null; direct?: boolean }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const router = useRouter();
  const reduce = useReducedMotion();
  // Desde la Guía se entra directo a las tarjetas (ya has dicho que sí al pulsar el botón)
  const [stage, setStage] = useState<"ask" | "cards" | "done">(direct ? "cards" : "ask");
  const [i, setI] = useState(0);
  const [marked, setMarked] = useState(0);
  const [exit, setExit] = useState<Choice>("skip");
  const [rateFor, setRateFor] = useState<TmdbItem | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const seenOpacity = useTransform(x, [30, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -30], [1, 0]);
  const wantOpacity = useTransform(y, [-140, -30], [1, 0]);

  const current = pool[i];
  const finish = useCallback(() => setStage("done"), []);
  const leave = () => {
    router.push(username ? `/u/${username}` : "/");
    router.refresh();
  };

  const choose = useCallback(
    (c: Choice) => {
      if (!current) return;
      setExit(c);
      if (c !== "skip") {
        const status = c === "seen" ? "visto" : "pendiente";
        setMyTitle(current.media_type, current.id, { status });
        updateEntry({ tmdb_id: current.id, media_type: current.media_type, title: current.title, poster_path: current.poster_path, patch: { status } }).catch(() => {});
        setMarked((m) => m + 1);
        if (c === "seen") setRateFor(current); // nota opcional, sin bloquear la siguiente tarjeta
      }
      x.set(0);
      y.set(0);
      if (i + 1 >= pool.length) finish();
      else setI(i + 1);
    },
    [current, i, pool.length, finish, x, y]
  );

  function rate(n: number) {
    if (!rateFor) return;
    setMyTitle(rateFor.media_type, rateFor.id, { rating: n });
    updateEntry({ tmdb_id: rateFor.id, media_type: rateFor.media_type, title: rateFor.title, poster_path: rateFor.poster_path, patch: { rating: n } }).catch(() => {});
    setRateFor(null);
  }

  // Teclado: → la he visto, ↑ la quiero ver, ← no la he visto
  useEffect(() => {
    if (stage !== "cards") return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") choose("seen");
      else if (e.key === "ArrowLeft") choose("skip");
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        choose("want");
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [stage, choose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 110) choose("seen");
    else if (info.offset.x < -110) choose("skip");
    else if (info.offset.y < -110) choose("want");
  }

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
                ? "In one minute we'll mark a few movies and shows you already know, so your recommendations are spot on from day one."
                : "En un minuto marcamos algunas pelis y series que ya conoces, para que tus recomendaciones acierten desde el primer día."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setStage("cards")}
                className="rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                {L ? "Yes, let's go!" : "¡Sí, vamos!"}
              </button>
              <button
                type="button"
                onClick={leave}
                className="rounded-xl px-6 py-3 font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {L ? "No thanks, I'll explore" : "No, gracias"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- Final ----------
  if (stage === "done" || !current) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
        <motion.div initial={reduce ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="text-6xl" aria-hidden="true">
          🎉
        </motion.div>
        <h1 className="mt-4 text-2xl font-extrabold">{L ? "All set!" : "¡Listo!"}</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          {marked
            ? L
              ? `You've marked ${marked} titles. Your recommendations are ready.`
              : `Has marcado ${marked} títulos. Tus recomendaciones ya están listas.`
            : L
              ? "You can mark titles anytime from any movie or show."
              : "Puedes marcar títulos cuando quieras desde cualquier peli o serie."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            className="rounded-xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
          >
            {L ? "See my recommendations" : "Ver mis recomendaciones"} →
          </button>
          {username && (
            <button type="button" onClick={leave} className="rounded-xl px-6 py-3 font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              {L ? "Go to my profile" : "Ir a mi perfil"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------- Tarjetas ----------
  const poster = img(current.poster_path, "w500");
  const next = pool[i + 1];
  return (
    <div className="mx-auto max-w-sm select-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-neutral-500">
            <span>{L ? `${marked} of ${GOAL} marked` : `${marked} de ${GOAL} marcados`}</span>
            <span>{marked >= GOAL ? "🎯" : ""}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" animate={{ width: `${Math.min(100, (marked / GOAL) * 100)}%` }} />
          </div>
        </div>
        <button type="button" onClick={finish} className="rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white">
          {marked >= GOAL ? (L ? "Finish" : "Terminar") : L ? "Skip" : "Saltar"}
        </button>
      </div>

      <div className="relative aspect-[2/3] w-full">
        {/* La siguiente, asomando detrás */}
        {next?.poster_path && (
          <div className="absolute inset-0 translate-y-3 scale-[.94] overflow-hidden rounded-3xl opacity-60 shadow-lg">
            <Image src={img(next.poster_path, "w500")!} alt="" fill sizes="384px" className="object-cover" />
          </div>
        )}
        <AnimatePresence mode="popLayout" custom={exit}>
          <motion.div
            key={current.id + current.media_type}
            drag={!reduce}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
            style={{ x, y, rotate }}
            initial={reduce ? false : { scale: 0.94, y: 12, opacity: 0.6 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: exit === "seen" ? 420 : exit === "skip" ? -420 : 0, y: exit === "want" ? -520 : 0, opacity: 0, rotate: exit === "seen" ? 18 : exit === "skip" ? -18 : 0, transition: { duration: 0.3 } }}
            className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl bg-neutral-800 shadow-2xl active:cursor-grabbing"
          >
            {poster && <Image src={poster} alt={current.title} fill sizes="384px" priority className="pointer-events-none object-cover" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-20 text-white">
              <p className="text-2xl font-extrabold leading-tight drop-shadow">{current.title}</p>
              <p className="mt-1 text-sm text-white/80">
                {current.media_type === "movie" ? (L ? "Movie" : "Película") : L ? "Series" : "Serie"}
                {current.year ? ` · ${current.year}` : ""}
              </p>
            </div>
            {/* Sellos al deslizar */}
            <motion.span style={{ opacity: seenOpacity }} className="absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400">
              {L ? "SEEN" : "VISTA"}
            </motion.span>
            <motion.span style={{ opacity: skipOpacity }} className="absolute right-5 top-6 rotate-12 rounded-xl border-4 border-neutral-300 px-3 py-1 text-2xl font-black text-neutral-200">
              {L ? "NOPE" : "NO"}
            </motion.span>
            <motion.span style={{ opacity: wantOpacity }} className="absolute inset-x-0 top-1/3 mx-auto w-max rounded-xl border-4 border-amber-400 px-3 py-1 text-2xl font-black text-amber-400">
              {L ? "WANT IT" : "LA QUIERO VER"}
            </motion.span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <button type="button" onClick={() => choose("skip")} className="flex flex-col items-center gap-1 rounded-2xl bg-neutral-100 py-3 text-xs font-bold text-neutral-600 transition hover:-translate-y-0.5 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
          <span className="text-2xl" aria-hidden="true">✕</span>
          {L ? "Haven't seen" : "No la he visto"}
        </button>
        <button type="button" onClick={() => choose("want")} className="flex flex-col items-center gap-1 rounded-2xl bg-amber-100 py-3 text-xs font-bold text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300">
          <span className="text-2xl" aria-hidden="true">📌</span>
          {L ? "Want to watch" : "Quiero verla"}
        </button>
        <button type="button" onClick={() => choose("seen")} className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-100 py-3 text-xs font-bold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300">
          <span className="text-2xl" aria-hidden="true">✓</span>
          {L ? "I've seen it" : "La he visto"}
        </button>
      </div>
      <p className="mt-3 hidden text-center text-xs text-neutral-500 sm:block">{L ? "Tip: swipe the card or use ← ↑ → keys" : "Truco: desliza la tarjeta o usa las teclas ← ↑ →"}</p>

      {/* Nota rápida de lo que acabas de marcar como visto (opcional) */}
      <AnimatePresence>
        {rateFor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-neutral-950 p-4 text-white shadow-2xl ring-1 ring-white/15"
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
