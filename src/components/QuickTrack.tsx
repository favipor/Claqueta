"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { updateEntry } from "@/app/actions";
import { STATUSES, type Status } from "@/lib/dict";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { StarRating } from "./StarRating";
import { setMyTitle, type MyTitle } from "./MyTitles";

const ACTIVE: Record<Status, string> = {
  pendiente: "bg-orange-500 text-white border-orange-500",
  viendo: "bg-amber-500 text-neutral-950 border-amber-500",
  visto: "bg-emerald-600 text-white border-emerald-600",
  volver_a_ver: "bg-sky-600 text-white border-sky-600",
};

// Ventana rápida para marcar estado y nota sin entrar en la ficha.
// Se abre con el botón de la carátula (ordenador) o dejando el dedo pulsado (móvil).
export function QuickTrackSheet({
  open,
  onClose,
  id,
  type,
  title,
  posterPath,
  current,
}: {
  open: boolean;
  onClose: () => void;
  id: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  current: MyTitle | undefined;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status | null>(current?.status ?? null);
  const [rating, setRating] = useState<number | null>(current?.rating ?? null);
  const [, start] = useTransition();
  const [failed, setFailed] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setStatus(current?.status ?? null);
      setRating(current?.rating ?? null);
      setFailed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function save(patch: { status?: Status | null; rating?: number | null }) {
    const before = { status, rating };
    if ("status" in patch) setStatus(patch.status ?? null);
    if ("rating" in patch) setRating(patch.rating ?? null);
    setMyTitle(type, id, patch); // la carátula cambia al instante
    start(async () => {
      const res = await updateEntry({ tmdb_id: id, media_type: type, title, poster_path: posterPath, patch }).catch(() => ({
        ok: false,
      }));
      if (!res.ok) {
        // Si falla se deshace
        setStatus(before.status);
        setRating(before.rating);
        setMyTitle(type, id, before);
        setFailed(true);
      } else if (pathname.startsWith("/mi-lista") || pathname.startsWith("/u/")) {
        router.refresh();
      }
    });
  }

  if (!mounted) return null;
  const poster = img(posterPath, "w185");

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-md rounded-3xl bg-white p-5 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                {poster && <Image src={poster} alt="" fill sizes="56px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-extrabold">{title}</p>
                <p className="text-xs text-neutral-500">{t(`kind.${type}` as const)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("install.close")}
                className="self-start rounded-full px-2 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ×
              </button>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("detail.myStatus")}</p>
            <div className="mb-5 grid grid-cols-2 gap-2" role="group" aria-label={t("detail.myStatus")}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => save({ status: status === s ? null : s })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                    status === s
                      ? ACTIVE[s]
                      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                >
                  {t(`status.${s}` as const)}
                </button>
              ))}
            </div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("detail.myRating")}</p>
            <StarRating value={rating} onChange={(v) => save({ rating: v })} />

            {failed && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {t("tv.errorSave")}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              {t("quick.done")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
