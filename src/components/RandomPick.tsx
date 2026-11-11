"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";

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

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
      active ? "bg-brand text-white shadow" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
    }`;

  const poster = pick ? img(pick.poster_path, "w342") : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3.5 py-2 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-hover"
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

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {(["all", "movie", "tv"] as Kind[]).map((k) => (
                      <button key={k} type="button" onClick={() => setKind(k)} className={chip(kind === k)} aria-pressed={kind === k}>
                        {k === "all" ? t("list.all") : k === "movie" ? t("list.movies") : t("list.series")}
                      </button>
                    ))}
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {(["any", "short", "medium"] as Length[]).map((l) => (
                      <button key={l} type="button" onClick={() => setLength(l)} className={chip(length === l)} aria-pressed={length === l}>
                        {t(`pick.len.${l}` as const)}
                      </button>
                    ))}
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
