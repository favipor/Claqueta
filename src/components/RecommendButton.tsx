"use client";

import { useState, useTransition } from "react";
import { listMutualFollowers, sendRecommendation, type DmError } from "@/app/dm-actions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

type Meta = { tmdb_id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null };
type Friend = { id: string; username: string; display_name: string | null; avatar_url: string | null };

// «Recomendar»: elige a una persona con la que te sigues mutuamente y envíale el título como tarjeta en el chat.
export function RecommendButton({ meta }: { meta: Meta }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picked, setPicked] = useState<Friend | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<DmError | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    setSentTo(null);
    setError(null);
    if (next) start(async () => setFriends(await listMutualFollowers()));
  }

  function send() {
    if (!picked) return;
    setError(null);
    start(async () => {
      const res = await sendRecommendation(picked.id, meta, note);
      if (!res.ok) return setError(res.error);
      setSentTo(picked.display_name ?? picked.username);
      setPicked(null);
      setNote("");
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
        </svg>
        {t("rec.button")}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-80 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm font-bold">{t("rec.title")}</p>
          {sentTo && (
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
              {t("rec.sent")} {sentTo} ✓
            </p>
          )}
          {friends === null ? (
            <p className="text-sm text-neutral-500">…</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("rec.none")}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {friends.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(f)}
                    aria-pressed={picked?.id === f.id}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                      picked?.id === f.id
                        ? "bg-brand/10 ring-1 ring-brand"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <Avatar url={f.avatar_url} size={28} />
                    <span className="truncate">{f.display_name ?? f.username}</span>
                    <span className="truncate text-xs text-neutral-500">@{f.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder={t("rec.note")}
                aria-label={t("rec.note")}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950"
              />
              <button
                type="button"
                disabled={busy}
                onClick={send}
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {t("rec.send")}
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {t(`msg.err.${error}` as DictKey)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
