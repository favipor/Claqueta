"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { swipeInfo, type SwipeInfo } from "@/app/swipe-actions";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";

export type SheetItem = { id: number; media_type: MediaType; title: string; poster_path: string | null; year?: string };

// Lo ya pedido se guarda mientras dure la visita: abrir otra vez la misma es instantáneo
const cache = new Map<string, SwipeInfo | null>();

// Hoja que sube desde abajo con «de qué va»: sinopsis, nota, géneros y plataformas.
// Se cierra tocando fuera, arrastrándola hacia abajo, con Escape o con el botón.
export function SynopsisSheet({ item, onClose }: { item: SheetItem | null; onClose: () => void }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const reduce = !!useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [info, setInfo] = useState<SwipeInfo | null | "loading">("loading");
  const k = item ? `${item.media_type}-${item.id}` : null;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!item || !k) return;
    if (cache.has(k)) {
      setInfo(cache.get(k)!);
      return;
    }
    let alive = true;
    setInfo("loading");
    swipeInfo(item.media_type, item.id)
      .catch(() => null)
      .then((r) => {
        cache.set(k, r);
        if (alive) setInfo(r);
      });
    return () => {
      alive = false;
    };
  }, [item, k]);

  useEffect(() => {
    if (!item) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    // En fase de captura: así Escape cierra solo la hoja y no también la ventana que haya debajo
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [item, onClose]);

  if (!mounted) return null;
  const data = info === "loading" ? null : info;
  const year = item?.year || data?.year || "";

  return createPortal(
    <AnimatePresence>
      {item && (
        <>
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[94] bg-black/55" onClick={onClose} aria-hidden="true" />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, d) => {
              if (d.offset.y > 90) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-[95] mx-auto max-h-[75dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-8 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100"
          >
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />
            <div className="flex gap-4">
              {item.poster_path && (
                <span className="relative h-32 w-[5.4rem] shrink-0 overflow-hidden rounded-xl shadow-md">
                  <Image src={img(item.poster_path, "w185")!} alt="" fill sizes="88px" className="object-cover" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold leading-tight">{item.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {item.media_type === "movie" ? (L ? "Movie" : "Película") : L ? "Series" : "Serie"}
                  {year ? ` · ${year}` : ""}
                  {data && data.runtime && item.media_type === "movie" ? ` · ${data.runtime} min` : ""}
                  {data && data.seasons ? ` · ${data.seasons} ${L ? (data.seasons === 1 ? "season" : "seasons") : data.seasons === 1 ? "temporada" : "temporadas"}` : ""}
                </p>
                {data && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {data.vote > 0 && (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                        <span className="text-amber-400 dark:text-amber-500">★</span> {data.vote.toLocaleString(lang, { maximumFractionDigits: 1 })}
                      </span>
                    )}
                    {data.genres.map((g) => (
                      <span key={g} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {info === "loading" ? (
              <div className="mt-4 space-y-2" aria-label={L ? "Loading" : "Cargando"}>
                {[100, 92, 70].map((w) => (
                  <span key={w} className="block h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{data?.overview || (L ? "No synopsis available yet." : "Todavía no hay sinopsis disponible.")}</p>
            )}
            {data && data.providers.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500">{L ? "Streaming on" : "Disponible en"}</span>
                {data.providers.map((pr) =>
                  pr.logo_path ? (
                    <span key={pr.name} title={pr.name} className="relative h-7 w-7 overflow-hidden rounded-lg">
                      <Image src={img(pr.logo_path, "w92")!} alt={pr.name} fill sizes="28px" className="object-cover" />
                    </span>
                  ) : null
                )}
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark">
                {L ? "Back" : "Volver"}
              </button>
              <Link href={`/titulo/${item.media_type}/${item.id}`} className="rounded-xl px-4 py-3 text-sm font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-100 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800">
                {L ? "Full page" : "Ver ficha"}
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
