"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { EMOJIS } from "./Reactions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

type Friend = { user_id: string; username: string; display_name: string | null; avatar_url: string | null; status: string | null; rating: number | string | null };

const PILL: Record<string, string> = {
  pendiente: "bg-orange-500",
  viendo: "bg-amber-500",
  visto: "bg-emerald-600",
  volver_a_ver: "bg-sky-600",
};

// Amigo en «Tus amigos» de una ficha: un toque abre su perfil; dejando pulsado (o clic derecho) se reacciona
export function FriendReactTile({ f, tmdbId, mediaType, meId, initial, statusLabel }: { f: Friend; tmdbId: number; mediaType: string; meId: string; initial: string | null; statusLabel: string | null }) {
  const { lang } = useI18n();
  const [mine, setMine] = useState<string | null>(initial);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [pop, setPop] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const long = useRef(false);
  const tile = useRef<HTMLAnchorElement>(null);
  const fmt = (n: number) => n.toLocaleString(lang, { maximumFractionDigits: 1 });

  const openPicker = () => {
    const r = tile.current?.getBoundingClientRect();
    if (!r) return;
    long.current = true;
    navigator.vibrate?.(15);
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130), y: r.top });
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  async function choose(e: string) {
    setPos(null);
    const next = mine === e ? null : e;
    const prev = mine;
    setMine(next);
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 500);
    }
    const supabase = createClient();
    const key = { reactor_id: meId, owner_id: f.user_id, tmdb_id: tmdbId, media_type: mediaType };
    const { error } = next
      ? await supabase.from("activity_reactions").upsert({ ...key, emoji: next }, { onConflict: "reactor_id,owner_id,tmdb_id,media_type" })
      : await supabase.from("activity_reactions").delete().match(key);
    if (error) setMine(prev);
  }

  return (
    <>
      <Link
        ref={tile}
        href={`/u/${f.username}`}
        onPointerDown={() => {
          long.current = false;
          timer.current = setTimeout(openPicker, 450);
        }}
        onPointerUp={() => clearTimeout(timer.current)}
        onPointerLeave={() => clearTimeout(timer.current)}
        onPointerCancel={() => clearTimeout(timer.current)}
        onContextMenu={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          openPicker();
        }}
        onClick={(e) => {
          // tras dejar pulsado no se abre el perfil
          if (long.current) {
            e.preventDefault();
            long.current = false;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            openPicker();
          }
        }}
        className="flex w-28 select-none flex-col items-center rounded-xl p-2 text-center transition [-webkit-touch-callout:none] hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <span className="relative">
          <Avatar url={f.avatar_url} size={56} />
          {f.rating !== null && (
            <span className="absolute -bottom-1 -right-2 inline-flex items-center gap-0.5 rounded-full bg-black/85 px-1.5 py-0.5 text-[11px] font-bold text-white ring-2 ring-white dark:ring-neutral-900">
              <span className="text-amber-400">★</span>
              {fmt(Number(f.rating))}
            </span>
          )}
          {mine && (
            <span className={`absolute -left-2 -top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-base shadow-md ring-1 ring-black/5 transition-transform dark:bg-neutral-900 ${pop ? "scale-150" : ""}`}>
              {mine}
            </span>
          )}
        </span>
        <span className="mt-2 w-full truncate text-sm font-semibold">{f.display_name ?? `@${f.username}`}</span>
        {f.status && statusLabel && <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${PILL[f.status] ?? "bg-neutral-500"}`}>{statusLabel}</span>}
      </Link>

      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[98]" onClick={() => setPos(null)} onContextMenu={(e) => { e.preventDefault(); setPos(null); }} />
            <div
              role="menu"
              aria-label={lang === "en" ? "React" : "Reaccionar"}
              className="fixed z-[99] flex -translate-x-1/2 -translate-y-full gap-1 rounded-full bg-white p-1.5 shadow-2xl ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/15"
              style={{ left: pos.x, top: pos.y - 8 }}
            >
              {EMOJIS.map((e, i) => (
                <button
                  key={e}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(e)}
                  aria-label={e}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`react-pop grid h-11 w-11 place-items-center rounded-full text-2xl transition hover:scale-125 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${mine === e ? "bg-brand/15" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
