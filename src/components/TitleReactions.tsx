"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "./I18nProvider";
import { Avatar } from "./Avatar";

export type TitleReaction = { emoji: string; username: string; display_name: string | null; avatar_url: string | null; created_at: string };

// Reacciones de tus amigos a lo que marcaste de este título: insignia arriba a la derecha de la ficha.
// Al pulsarla (o al llegar desde el aviso) se abre la lista de quién ha reaccionado, al estilo Instagram.
export function TitleReactions({ reactions }: { reactions: TitleReaction[] }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fromNotice, setFromNotice] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("reacciones") === "1") {
      setOpen(true);
      setFromNotice(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!reactions.length) return null;
  // Emojis más usados primero
  const counts = new Map<string, number>();
  reactions.forEach((r) => counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={L ? `${reactions.length} reactions from your friends` : `${reactions.length} reacciones de tus amigos`}
        className={`absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white/15 py-1.5 pl-1.5 pr-3 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition hover:scale-105 hover:bg-white/25 sm:right-6 sm:top-6 ${
          fromNotice ? "react-badge-new" : ""
        }`}
      >
        <span className="flex -space-x-1.5">
          {top.slice(0, 3).map((e) => (
            <span key={e} className="grid h-7 w-7 place-items-center rounded-full bg-neutral-950/70 text-base ring-2 ring-white/20">
              {e}
            </span>
          ))}
        </span>
        {reactions.length}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={L ? "Reactions" : "Reacciones"}
              onClick={(e) => e.stopPropagation()}
              className="react-sheet w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                <div>
                  <p className="font-bold">{L ? "Reactions" : "Reacciones"}</p>
                  <p className="text-xs text-neutral-500">{L ? "To what you marked of this title" : "A lo que marcaste de este título"}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label={L ? "Close" : "Cerrar"} className="grid h-9 w-9 place-items-center rounded-full text-2xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  ×
                </button>
              </div>
              {/* Resumen por emoji */}
              <div className="flex gap-2 overflow-x-auto px-5 pt-3 no-scrollbar">
                {top.map((e) => (
                  <span key={e} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm font-bold dark:bg-neutral-800">
                    {e} {counts.get(e)}
                  </span>
                ))}
              </div>
              <ul className="max-h-[50dvh] overflow-y-auto overscroll-contain p-2">
                {reactions.map((r) => (
                  <li key={r.username}>
                    <Link href={`/u/${r.username}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <span className="relative">
                        <Avatar url={r.avatar_url} size={44} />
                        <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-sm shadow ring-1 ring-black/5 dark:bg-neutral-900">{r.emoji}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.display_name ?? `@${r.username}`}</span>
                        <span className="block truncate text-xs text-neutral-500">@{r.username}</span>
                      </span>
                      <span className="text-xs text-neutral-400">
                        {new Date(r.created_at).toLocaleDateString(L ? "en-GB" : "es-ES", { day: "numeric", month: "short" })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
