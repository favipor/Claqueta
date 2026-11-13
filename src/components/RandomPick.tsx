"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { FilmIcon, TvIcon } from "./NavIcons";

type Pending = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  runtime_min: number | null;
};

type Kind = "all" | MediaType;
type Length = "any" | "short" | "medium";
const MAX: Record<Length, number> = { any: Infinity, short: 95, medium: 125 };
const LENGTHS: Length[] = ["any", "medium", "short"]; // de más largo a más corto en el deslizador

// «¿Qué veo hoy?»: elige al azar algo de tus pendientes, con filtros de tipo y duración.
export function RandomPick() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [all, setAll] = useState<Pending[] | null>(null);
  const [kind, setKind] = useState<Kind>("all");
  const [length, setLength] = useState<Length>("any");
  const [pick, setPick] = useState<Pending | null>(null);
  const [spin, setSpin] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || all) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_titles")
        .select("tmdb_id, media_type, title, poster_path, runtime_min")
        .eq("status", "pendiente")
        .limit(2000);
      setAll((data ?? []) as Pending[]);
    })();
  }, [open, all]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const pool = useMemo(
    () =>
      (all ?? []).filter(
        (p) =>
          (kind === "all" || p.media_type === kind) &&
          (length === "any" || (p.runtime_min !== null && p.runtime_min <= MAX[length]))
      ),
    [all, kind, length]
  );

  function roll() {
    if (pool.length === 0) {
      setPick(null);
      return;
    }
    let next = pool[Math.floor(Math.random() * pool.length)];
    // Si hay más de uno, que no repita el mismo seguido
    if (pool.length > 1 && pick && next.tmdb_id === pick.tmdb_id && next.media_type === pick.media_type) {
      next = pool[(pool.indexOf(next) + 1) % pool.length];
    }
    setPick(next);
    setSpin((s) => s + 1);
  }

  // Al abrir o cambiar los filtros se elige uno nuevo
  useEffect(() => {
    if (open && all) roll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, all, kind, length]);


  const poster = pick ? img(pick.poster_path, "w342") : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-hover sm:flex-none"
      >
        <DiceIcon className="h-4 w-4 transition-transform duration-500 group-hover:rotate-[200deg]" />
        {t("pick.button")}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={t("pick.title")}
                  className="w-full max-w-sm rounded-3xl bg-white p-5 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-extrabold">
                      <DiceIcon className="h-5 w-5 text-fuchsia-500" />
                      {t("pick.title")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label={t("install.close")}
                      className="rounded-full px-2 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      ×
                    </button>
                  </div>

                  {/* Tipo: selector segmentado con iconos */}
                  <div role="radiogroup" aria-label={t("list.allTypes")} className="mb-4 grid grid-cols-3 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
                    {(["all", "movie", "tv"] as Kind[]).map((k) => {
                      const active = kind === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setKind(k)}
                          className={`relative flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                            active ? "text-neutral-950 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="pick-kind"
                              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 34 }}
                              className="absolute inset-0 rounded-lg bg-white shadow ring-1 ring-black/5 dark:bg-neutral-950 dark:ring-white/10"
                            />
                          )}
                          <span className={`relative ${active ? "text-brand-fg" : ""}`}>
                            {k === "all" ? <GridIcon className="h-4 w-4" /> : k === "movie" ? <FilmIcon className="h-4 w-4" /> : <TvIcon className="h-4 w-4" />}
                          </span>
                          <span className="relative">{k === "all" ? t("list.all") : k === "movie" ? t("list.movies") : t("list.series")}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Duración: deslizador de 3 posiciones */}
                  <div className="mb-4 rounded-xl border border-neutral-200 px-3 pb-2 pt-2.5 dark:border-neutral-800">
                    <label htmlFor="pick-length" className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-neutral-600 dark:text-neutral-300">
                        <ClockIcon className="h-4 w-4 text-brand-fg" />
                        {t("pick.length")}
                      </span>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand-fg">{t(`pick.len.${length}` as const)}</span>
                    </label>
                    <input
                      id="pick-length"
                      type="range"
                      min={0}
                      max={2}
                      step={1}
                      value={LENGTHS.indexOf(length)}
                      onChange={(e) => setLength(LENGTHS[Number(e.target.value)])}
                      aria-valuetext={t(`pick.len.${length}` as const)}
                      className="w-full cursor-pointer accent-teal-600"
                    />
                    <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-neutral-400" aria-hidden="true">
                      <span>{t("pick.tick.any")}</span>
                      <span>2 h</span>
                      <span>1 h 35</span>
                    </div>
                  </div>

                  <div className="relative grid min-h-[22rem] place-items-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                    {all === null ? (
                      <p className="text-sm text-neutral-500">{t("catalog.loading")}</p>
                    ) : !pick ? (
                      <p className="px-6 text-center text-sm text-neutral-500">
                        {(all ?? []).length === 0 ? t("pick.emptyAll") : t("pick.empty")}
                      </p>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={spin}
                          initial={reduce ? false : { rotateY: 90, opacity: 0, scale: 0.9 }}
                          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                          exit={reduce ? undefined : { rotateY: -90, opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className="flex w-full flex-col items-center p-4 text-center"
                        >
                          <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-xl bg-neutral-300 shadow-xl dark:bg-neutral-700">
                            {poster && <Image src={poster} alt={pick.title} fill sizes="160px" className="object-cover" />}
                          </div>
                          <p className="mt-3 line-clamp-2 text-lg font-extrabold">{pick.title}</p>
                          <p className="text-xs text-neutral-500">
                            {t(`kind.${pick.media_type}` as const)}
                            {pick.runtime_min ? ` · ${pick.runtime_min} min${pick.media_type === "tv" ? ` / ${t("pick.episode")}` : ""}` : ""}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={roll}
                      disabled={pool.length < 2}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-bold hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      <DiceIcon className="h-4 w-4" />
                      {t("pick.again")}
                    </button>
                    {pick ? (
                      <Link
                        href={`/titulo/${pick.media_type}/${pick.tmdb_id}`}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-dark"
                      >
                        {t("pick.go")}
                      </Link>
                    ) : (
                      <span />
                    )}
                  </div>
                  {pool.length > 0 && (
                    <p className="mt-3 text-center text-xs text-neutral-500">
                      {pool.length} {t("pick.among")}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
