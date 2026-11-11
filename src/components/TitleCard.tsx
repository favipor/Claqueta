"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { ProgressBar } from "./ProgressBar";
import { useMyTitle } from "./MyTitles";
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

  return (
    <motion.div
      initial={reduce || !reveal ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35, delay: Math.min(index % 6, 5) * 0.05 }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.03 }}
    >
      <Link
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
        <div className="p-2.5">
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
    </motion.div>
  );
}
