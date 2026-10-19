"use client";

import { useState, useTransition } from "react";
import { updateEntry } from "@/app/actions";
import { STATUSES, type Status } from "@/lib/dict";
import type { MediaType } from "@/lib/tmdb";
import { StarRating } from "./StarRating";
import { useI18n } from "./I18nProvider";

type Initial = { status: Status | null; rating: number | null; private_note: string | null };


const activeColor: Record<Status, string> = {
  pendiente: "bg-orange-500 text-white border-orange-500",
  viendo: "bg-amber-500 text-white border-amber-500",
  visto: "bg-emerald-600 text-white border-emerald-600",
  volver_a_ver: "bg-sky-600 text-white border-sky-600",
};

export function TrackPanel({
  tmdbId,
  mediaType,
  title,
  posterPath,
  initial,
  status: statusProp,
  onStatusChange,
}: {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  initial: Initial;
  // Modo controlado (series): el estado lo gestiona el padre, que además aplica la cascada.
  status?: Status | null;
  onStatusChange?: (next: Status | null) => void;
}) {
  const { t } = useI18n();
  const [localStatus, setLocalStatus] = useState<Status | null>(initial.status);
  const controlled = onStatusChange !== undefined;
  const status = controlled ? statusProp ?? null : localStatus;
  const [rating, setRating] = useState<number | null>(initial.rating);
  const [note, setNote] = useState(initial.private_note ?? "");
  const [pending, startTransition] = useTransition();
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");

  function save(patch: Parameters<typeof updateEntry>[0]["patch"], after?: () => void) {
    startTransition(async () => {
      await updateEntry({
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        patch,
      });
      after?.();
    });
  }

  function onStatus(s: Status) {
    const next = status === s ? null : s; // pulsar de nuevo lo quita
    if (controlled) {
      onStatusChange(next);
      return;
    }
    setLocalStatus(next);
    save({ status: next });
  }

  function onSaveNote() {
    setNoteState("saving");
    save({ private_note: note }, () => {
      setNoteState("saved");
      setTimeout(() => setNoteState("idle"), 2000);
    });
  }

  return (
    <section className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("detail.myStatus")}
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("detail.myStatus")}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => onStatus(s)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg ${
                status === s
                  ? activeColor[s]
                  : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              }`}
            >
              {t(`status.${s}` as const)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 block text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("detail.myRating")}
        </h2>
        <StarRating
          value={rating}
          onChange={(v) => {
            setRating(v);
            save({ rating: v });
          }}
        />
      </div>

      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-semibold uppercase tracking-wide text-neutral-500">
          🔒 {t("detail.privateNotes")}
        </label>
        <p className="mb-2 text-xs text-neutral-500">{t("detail.privateHint")}</p>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={5000}
          className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveNote}
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {t("detail.save")}
          </button>
          <span className="text-xs text-neutral-500" aria-live="polite">
            {noteState === "saving" && t("detail.saving")}
            {noteState === "saved" && `✓ ${t("detail.saved")}`}
          </span>
        </div>
      </div>
    </section>
  );
}
