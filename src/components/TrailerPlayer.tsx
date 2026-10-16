"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useI18n } from "./I18nProvider";

// Tráiler centrado en la ficha. Al pulsar play se abre en "modo cine":
// el vídeo aparece en el centro de la pantalla y el resto de la página se oscurece y se difumina.
// El vídeo de YouTube solo se carga al abrirlo (más ligero y más privado).
export function TrailerPlayer({ videoKey, title }: { videoKey: string; title: string }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const playRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const trigger = playRef.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const label = `${t("detail.trailer")} ${title}`;

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <button
          ref={playRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${t("trailer.play")}: ${label}`}
          className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition duration-300 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${videoKey}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-white shadow-xl ring-4 ring-white/40 transition duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current sm:h-9 sm:w-9" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      </div>

      {/* Se pinta en <body> para que ningún contenedor con transformaciones lo descoloque */}
      {mounted &&
        createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="cinema"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-md"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="relative w-[min(1000px,92vw)]"
              initial={reduce ? false : { scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("trailer.close")}
                className="absolute -top-12 right-0 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                ✕
              </button>
              <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/20">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
                  title={label}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body
        )}
    </>
  );
}
