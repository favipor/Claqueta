"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "./I18nProvider";

export const EMOJIS = ["👍", "🔥", "😂", "😮", "❤️"] as const;
export type ReactionSummary = { counts: Record<string, number>; mine: string | null };

// Reacciones rápidas a una entrada de la actividad de un amigo (una por persona; pulsar la tuya la quita)
export function Reactions({
  ownerId,
  tmdbId,
  mediaType,
  meId,
  value,
  onChange,
}: {
  ownerId: string;
  tmdbId: number;
  mediaType: string;
  meId: string | null;
  value: ReactionSummary;
  onChange: (v: ReactionSummary) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState<string | null>(null);
  const own = meId === ownerId;

  async function choose(e: string) {
    if (!meId || own) return;
    const prev = value;
    const next: ReactionSummary = { counts: { ...value.counts }, mine: value.mine === e ? null : e };
    if (value.mine) next.counts[value.mine] = Math.max(0, (next.counts[value.mine] ?? 1) - 1);
    if (next.mine) next.counts[next.mine] = (next.counts[next.mine] ?? 0) + 1;
    onChange(next); // al momento; si falla se deshace
    setOpen(false);
    setPop(next.mine);
    setTimeout(() => setPop(null), 600);
    const supabase = createClient();
    const key = { reactor_id: meId, owner_id: ownerId, tmdb_id: tmdbId, media_type: mediaType };
    const { error } = next.mine
      ? await supabase.from("activity_reactions").upsert({ ...key, emoji: next.mine }, { onConflict: "reactor_id,owner_id,tmdb_id,media_type" })
      : await supabase.from("activity_reactions").delete().match(key);
    if (error) onChange(prev);
  }

  const used = EMOJIS.filter((e) => (value.counts[e] ?? 0) > 0);
  if (own && !used.length) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {used.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => choose(e)}
          disabled={own}
          aria-pressed={value.mine === e}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 transition ${
            value.mine === e
              ? "bg-brand/10 text-brand-fg ring-brand/40"
              : "bg-neutral-100 text-neutral-600 ring-transparent hover:ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300"
          } ${pop === e ? "scale-125" : ""}`}
        >
          <span className="text-sm">{e}</span>
          {value.counts[e]}
        </button>
      ))}
      {!own && meId && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={t("react.add")}
            title={t("react.add")}
            className="grid h-6 w-8 place-items-center rounded-full bg-neutral-100 text-xs text-neutral-500 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
            </svg>
          </button>
          {open && (
            <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full bg-white p-1.5 shadow-xl ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/15">
              {EMOJIS.map((e, i) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => choose(e)}
                  aria-label={e}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`react-pop grid h-9 w-9 place-items-center rounded-full text-xl transition hover:scale-125 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${value.mine === e ? "bg-brand/15" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
