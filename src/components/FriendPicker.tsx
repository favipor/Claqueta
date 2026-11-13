"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { Avatar } from "./Avatar";

export type PickFriend = { id: string; username: string; display_name: string | null; avatar_url: string | null };

const QUICK = 5;
// Un color propio para cada amigo (siempre el mismo, según su nombre de usuario)
const TONES = ["from-rose-400 to-fuchsia-600", "from-sky-400 to-indigo-600", "from-amber-400 to-orange-600", "from-emerald-400 to-teal-700", "from-violet-400 to-purple-700", "from-lime-400 to-green-700"];
const toneOf = (u: string) => TONES[[...u].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

// Selector de amigo: unos pocos accesos directos y un desplegable con buscador para todos
export function FriendPicker({ friends, current }: { friends: PickFriend[]; current: string | null }) {
  const { lang } = useI18n();
  const L = lang === "en";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const name = (f: PickFriend) => f.display_name ?? `@${f.username}`;

  // El elegido siempre está entre los accesos directos
  const quick = friends.slice(0, QUICK);
  const sel = friends.find((f) => f.username === current);
  if (sel && !quick.includes(sel)) quick.splice(QUICK - 1, 1, sel);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = friends.filter((f) => !q.trim() || `${f.display_name ?? ""} ${f.username}`.toLowerCase().includes(q.trim().toLowerCase()));
  const chip = (on: boolean) =>
    `flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold ring-1 transition ${
      on ? "bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white ring-transparent shadow-md shadow-fuchsia-500/30" : "bg-white ring-neutral-200 hover:-translate-y-0.5 hover:ring-brand-fg dark:bg-neutral-900 dark:ring-neutral-700"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quick.map((f) => (
        <Link key={f.id} href={`/juntos?con=${f.username}`} scroll={false} aria-current={f.username === current ? "true" : undefined} className={chip(f.username === current)}>
          <span className={`rounded-full bg-gradient-to-br p-[2px] ${toneOf(f.username)}`}>
            <span className="block rounded-full bg-white p-[1px] dark:bg-neutral-900">
              <Avatar url={f.avatar_url} size={28} />
            </span>
          </span>
          {name(f)}
        </Link>
      ))}
      {friends.length > QUICK && (
        <div ref={box} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold transition hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-fg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            {L ? `All (${friends.length})` : `Todos (${friends.length})`}
            <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <div className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
                <input
                  autoFocus
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={L ? "Search friend…" : "Buscar amigo…"}
                  aria-label={L ? "Search friend" : "Buscar amigo"}
                  className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-fg dark:bg-neutral-800"
                />
              </div>
              <ul className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
                {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-neutral-500">{L ? "No matches" : "Sin resultados"}</li>}
                {filtered.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        router.push(`/juntos?con=${f.username}`, { scroll: false });
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${f.username === current ? "bg-brand/10" : ""}`}
                    >
                      <Avatar url={f.avatar_url} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{name(f)}</span>
                        <span className="block truncate text-xs text-neutral-500">@{f.username}</span>
                      </span>
                      {f.username === current && <span className="text-brand-fg">✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
