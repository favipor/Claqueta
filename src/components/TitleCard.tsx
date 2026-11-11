"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { ProgressBar } from "./ProgressBar";
import { useLoggedIn, useMyTitle } from "./MyTitles";
import { QuickTrackSheet } from "./QuickTrack";
import type { Status } from "@/lib/dict";

const badgeColor: Record<Status, string> = {
  pendiente: "bg-orange-500",
  viendo: "bg-amber-500",
  visto: "bg-emerald-600",
  volver_a_ver: "bg-sky-600",
};

export function TitleCard({
  id,
  type,
  title,
  posterPath,
  year,
  status,
  rating,
  tmdbRating,
  index = 0,
  reveal = true,
  progress,
}: {
  progress?: { value: number; total: number; label: string };
  id: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  year?: string;
  status?: Status | null;
  rating?: number | null;
  tmdbRating?: number | null;
  index?: number;
  reveal?: boolean;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const src = img(posterPath, "w342");
  // Si la página no pasa estado ni nota, se usan los tuyos (así se ven en todo el catálogo)
  const mine = useMyTitle(type, id);
  const shownStatus = status === undefined ? mine?.status ?? null : status;
  const shownRating = rating === undefined ? mine?.rating ?? null : rating;

  // Marcar y puntuar sin entrar en la ficha: botón en la carátula o dedo pulsado medio segundo (móvil)
  const loggedIn = useLoggedIn();
  const [quick, setQuick] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const pressHandlers = loggedIn
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          longPressed.current = false;
          if (e.pointerType !== "touch") return;
          cancelPress();
          pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            navigator.vibrate?.(15);
            setQuick(true);
          }, 500);
        },
        onPointerUp: cancelPress,
        onPointerLeave: cancelPress,
        onPointerCancel: cancelPress,
        onTouchMove: cancelPress,
        onContextMenu: (e: React.MouseEvent) => {
          if (longPressed.current || pressTimer.current) e.preventDefault();
        },
        onClickCapture: (e: React.MouseEvent) => {
          // tras una pulsación larga no se abre la ficha
          if (longPressed.current) {
            e.preventDefault();
            e.stopPropagation();
            longPressed.current = false;
          }
        },
      }
    : {};

  return (
    <motion.div
      initial={reduce || !reveal ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: Math.min(index % 6, 5) * 0.05 }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.03 }}
      className="group/card relative"
    >
      <Link
        {...pressHandlers}
        draggable={false}
        href={`/titulo/${type}/${id}`}
        className="group block overflow-hidden rounded-xl bg-neutral-200 shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg dark:bg-neutral-800"
      >
        <div className="relative aspect-[2/3]">
          {src ? (
            <Image src={src} alt={title} fill sizes="(max-width: 640px) 45vw, 200px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center p-3 text-center text-sm text-neutral-500">
              {title}
            </div>
          )}
          {shownStatus && (
            <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white shadow ${badgeColor[shownStatus]}`}>
              {t(`status.${shownStatus}` as const)}
            </span>
          )}
          {/* Notas arriba a la derecha: la tuya (silueta de persona, en color de la marca) y la de TMDB (estrella) */}
          {(shownRating !== null || !!tmdbRating) && (
            <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
              {shownRating !== null && (
                <span
                  className="flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white shadow ring-1 ring-white/30"
                  title={`${t("card.yourRating")}: ${shownRating}`}
                  aria-label={`${t("card.yourRating")}: ${shownRating}`}
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
                    <circle cx="12" cy="8" r="4.5" />
                    <path d="M3.5 21c0-4.6 3.8-7.5 8.5-7.5s8.5 2.9 8.5 7.5z" />
                  </svg>
                  {shownRating}
                </span>
              )}
              {!!tmdbRating && (
                <span
                  className="flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold text-white shadow backdrop-blur-sm"
                  title={`${t("card.tmdbRating")}: ${tmdbRating.toFixed(1)}`}
                  aria-label={`${t("card.tmdbRating")}: ${tmdbRating.toFixed(1)}`}
                >
                  <span className="text-amber-400" aria-hidden="true">★</span>
                  {tmdbRating.toFixed(1)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-2.5 ${loggedIn ? "pr-11" : ""}`}>
          <p className="line-clamp-1 text-sm font-semibold">{title}</p>
          <p className="text-xs text-neutral-500">
            {t(`kind.${type}` as const)}
            {year ? ` · ${year}` : ""}
          </p>
          {progress && progress.total > 0 && (
            <div className="mt-2 space-y-1">
              <ProgressBar
                value={progress.value}
                total={progress.total}
                label={`${t("tv.progress")}: ${progress.label}`}
              />
              <p className="text-xs text-neutral-500">{progress.label}</p>
            </div>
          )}
        </div>
      </Link>
      {loggedIn && (
        <>
          <button
            type="button"
            onClick={() => setQuick(true)}
            aria-label={`${t("quick.open")}: ${title}`}
            title={t("quick.open")}
            className="absolute bottom-2.5 right-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow-md transition hover:scale-110 hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
          >
            {shownStatus || shownRating !== null ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
          <QuickTrackSheet
            open={quick}
            onClose={() => setQuick(false)}
            id={id}
            type={type}
            title={title}
            posterPath={posterPath}
            current={mine /* siempre lo tuyo, aunque la carátula muestre lo de otra persona */}
          />
        </>
      )}
    </motion.div>
  );
}
