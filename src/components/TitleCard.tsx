"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { ProgressBar } from "./ProgressBar";
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
  index?: number;
  reveal?: boolean;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const src = img(posterPath, "w342");

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
          {status && (
            <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${badgeColor[status]}`}>
              {t(`status.${status}` as const)}
            </span>
          )}
          {rating !== null && rating !== undefined && (
            <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold text-white">
              ★ {rating}
            </span>
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
