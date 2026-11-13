"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { img, type MediaType } from "@/lib/tmdb";
import { useI18n } from "./I18nProvider";
import { Avatar } from "./Avatar";
import { TitleCard } from "./TitleCard";
import { PlanButton } from "./PlanButton";

export type TogetherItem = { tmdb_id: number; media_type: MediaType; title: string; poster_path: string | null; who: "both" | "me" | "friend" };
type Kind = "all" | MediaType;

// Resultado de cruzar vuestros pendientes + ruleta que elige por vosotros
export function WatchTogether({ items, friendName, friendAvatar, friendId }: { items: TogetherItem[]; friendName: string; friendAvatar: string | null; friendId: string }) {
  const { t, lang } = useI18n();
  const reduce = useReducedMotion();
  const L = lang === "en";
  const [kind, setKind] = useState<Kind>("all");
  const [pick, setPick] = useState<TogetherItem | null>(null);
  const [spin, setSpin] = useState(0);
  const [more, setMore] = useState<Record<string, boolean>>({});

  const list = useMemo(() => (kind === "all" ? items : items.filter((i) => i.media_type === kind)), [items, kind]);
  const groups = {
    both: list.filter((i) => i.who === "both"),
    friend: list.filter((i) => i.who === "friend"),
    me: list.filter((i) => i.who === "me"),
  };

  function roll() {
    // Se prefiere lo que queréis ver los dos; si no hay, cualquiera de las dos listas
    const pool = groups.both.length ? groups.both : list;
    if (!pool.length) return;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && next === pick) next = pool[(pool.indexOf(next) + 1) % pool.length];
    setPick(next);
    setSpin((s) => s + 1);
  }

  const section = (id: keyof typeof groups, title: string, icon: React.ReactNode) => {
    const rows = groups[id];
    if (!rows.length) return null;
    const shown = more[id] ? rows : rows.slice(0, 10);
    const STYLE = {
      both: "rounded-3xl bg-gradient-to-br from-rose-50 to-fuchsia-50 p-4 ring-1 ring-rose-200 dark:from-rose-950/40 dark:to-fuchsia-950/30 dark:ring-rose-900 sm:p-5",
      friend: "rounded-3xl bg-sky-50/70 p-4 ring-1 ring-sky-100 dark:bg-sky-950/20 dark:ring-sky-900/60 sm:p-5",
      me: "rounded-3xl bg-amber-50/70 p-4 ring-1 ring-amber-100 dark:bg-amber-950/20 dark:ring-amber-900/60 sm:p-5",
    } as const;
    return (
      <section className={`space-y-3 ${STYLE[id]}`}>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {icon}
          {title}
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{rows.length}</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {shown.map((it) =>
            id === "both" ? (
              <div key={`${it.media_type}-${it.tmdb_id}`} className="relative space-y-2">
                <span className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-md">💞 Match</span>
                <TitleCard id={it.tmdb_id} type={it.media_type} title={it.title} posterPath={it.poster_path} reveal={false} />
                <PlanButton friendId={friendId} friendName={friendName} meta={{ tmdb_id: it.tmdb_id, media_type: it.media_type, title: it.title, poster_path: it.poster_path }} />
              </div>
            ) : (
              <TitleCard key={`${it.media_type}-${it.tmdb_id}`} id={it.tmdb_id} type={it.media_type} title={it.title} posterPath={it.poster_path} reveal={false} />
            )
          )}
        </div>
        {rows.length > 10 && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMore((m) => ({ ...m, [id]: !m[id] }))}
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {more[id] ? (L ? "Show less" : "Ver menos") : L ? `See all ${rows.length}` : `Ver las ${rows.length}`}
            </button>
          </div>
        )}
      </section>
    );
  };

  const poster = pick ? img(pick.poster_path, "w342") : null;

  return (
    <div className="space-y-8">
      {/* Ruleta */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-800 to-neutral-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-200">
              {groups.both.length > 0
                ? L
                  ? `${groups.both.length} in common with ${friendName}`
                  : `${groups.both.length} en común con ${friendName}`
                : L
                  ? `Nothing in common yet with ${friendName}`
                  : `Aún no tenéis pendientes en común`}
            </p>
            <AnimatePresence mode="wait">
              {pick ? (
                <motion.div
                  key={`${pick.tmdb_id}-${spin}`}
                  initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="mt-3"
                >
                  <p className="text-sm text-teal-100">{L ? "Tonight you're watching…" : "Esta noche toca…"}</p>
                  <Link href={`/titulo/${pick.media_type}/${pick.tmdb_id}`} className="mt-1 block text-3xl font-black leading-tight hover:underline sm:text-4xl">
                    {pick.title}
                  </Link>
                  <div className="mt-3">
                    <PlanButton key={`${pick.tmdb_id}-${spin}`} friendId={friendId} friendName={friendName} tone="dark" meta={{ tmdb_id: pick.tmdb_id, media_type: pick.media_type, title: pick.title, poster_path: pick.poster_path }} />
                  </div>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">
                    {pick.who === "both" ? "💞 " + (L ? "You both want to watch it" : "Los dos la queréis ver") : pick.who === "friend" ? (L ? `On ${friendName}'s list` : `En la lista de ${friendName}`) : L ? "On your list" : "En tu lista"}
                  </p>
                </motion.div>
              ) : (
                <motion.p key="idle" initial={false} className="mt-3 text-2xl font-extrabold leading-snug sm:text-3xl">
                  {L ? "Can't agree? Let fate decide." : "¿No os ponéis de acuerdo? Que decida el azar."}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={roll}
              disabled={!list.length}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-base font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:opacity-50"
            >
              <motion.span animate={{ rotate: spin * 360 }} transition={{ duration: reduce ? 0 : 0.6 }} aria-hidden="true">
                🎲
              </motion.span>
              {pick ? (L ? "Another one" : "Otra") : L ? "Pick for us" : "Elegid por nosotros"}
            </button>
          </div>
          <div className="mx-auto w-36 sm:w-44">
            <AnimatePresence mode="wait">
              <motion.div
                key={pick ? `${pick.tmdb_id}-${spin}` : "none"}
                initial={reduce ? false : { rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white/10 shadow-2xl ring-4 ring-amber-300/70"
              >
                {poster ? (
                  <Image src={poster} alt="" fill sizes="176px" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-6xl" aria-hidden="true">
                    🍿
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filtro de tipo */}
      <div className="flex gap-2" role="group" aria-label={L ? "Type" : "Tipo"}>
        {(["all", "movie", "tv"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
              kind === k ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white" : "ring-neutral-300 hover:ring-neutral-500 dark:ring-neutral-700"
            }`}
          >
            {k === "all" ? t("list.all") : k === "movie" ? t("nav.movies") : t("nav.series")}
          </button>
        ))}
      </div>

      {section("both", L ? "You both want to watch" : "Los dos queréis verla", <span aria-hidden="true">💞</span>)}
      {section("friend", L ? `${friendName} wants to watch` : `Quiere verla ${friendName}`, <Avatar url={friendAvatar} size={24} />)}
      {section("me", L ? "You want to watch" : "Quieres verla tú", <span aria-hidden="true">📌</span>)}
      {list.length === 0 && <p className="py-8 text-center text-neutral-500">{L ? "No pending titles here." : "No hay pendientes por aquí."}</p>}
    </div>
  );
}
