"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "./I18nProvider";
import { FilmIcon, TvIcon } from "./NavIcons";
import { STATUSES, type DictKey, type Status } from "@/lib/dict";
import { SORTS, type Sort } from "@/lib/list-sort";

const DOT: Record<Status, string> = {
  pendiente: "bg-orange-500",
  viendo: "bg-amber-500",
  visto: "bg-emerald-600",
  volver_a_ver: "bg-sky-600",
};

// Filtros de «Mi lista», cada uno con su propio tipo de control:
//  · Estado → pestañas con subrayado que se desliza, punto de color y cuántos títulos hay
//  · Tipo   → selector segmentado con iconos
//  · Orden y género → desplegables compactos con icono
// Todos mantienen el resto de filtros en la dirección.
export function ListControls({
  estado,
  tipo,
  orden,
  genero,
  genres,
  counts,
}: {
  estado: Status | null;
  tipo: "movie" | "tv" | null;
  orden: Sort;
  genero: number | null;
  genres: { id: number; name: string }[];
  counts: Record<Status | "all", number>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, start] = useTransition();

  function go(next: { estado?: Status | null; tipo?: string | null; orden?: string; genero?: string }) {
    const q = new URLSearchParams();
    const e = next.estado !== undefined ? next.estado : estado;
    const ty = next.tipo !== undefined ? next.tipo : tipo;
    const o = next.orden ?? orden;
    const g = next.genero ?? (genero ? String(genero) : "");
    if (e) q.set("estado", e);
    if (ty) q.set("tipo", ty);
    if (o && o !== "reciente") q.set("orden", o);
    if (g) q.set("genero", g);
    const s = q.toString();
    start(() => router.push(`/mi-lista${s ? `?${s}` : ""}`, { scroll: false }));
  }

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 450, damping: 34 };

  const tabs: { key: Status | null; label: string; count: number }[] = [
    { key: null, label: t("list.all"), count: counts.all },
    ...STATUSES.map((s) => ({ key: s, label: t(`status.${s}` as const), count: counts[s] })),
  ];

  const types: { key: "movie" | "tv" | null; label: string; icon: React.ReactNode }[] = [
    {
      key: null,
      label: t("list.allTypes"),
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    { key: "movie", label: t("list.movies"), icon: <FilmIcon className="h-4 w-4" /> },
    { key: "tv", label: t("list.series"), icon: <TvIcon className="h-4 w-4" /> },
  ];

  const selectWrap =
    "relative flex items-center rounded-xl bg-neutral-100 text-sm transition-colors focus-within:ring-2 focus-within:ring-brand-fg hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80";
  const selectCls =
    "w-full cursor-pointer appearance-none bg-transparent py-2 pl-9 pr-8 font-semibold text-neutral-900 outline-none dark:text-neutral-100 [&>option]:bg-white [&>option]:text-neutral-900 dark:[&>option]:bg-neutral-900 dark:[&>option]:text-neutral-100";
  const chevron = (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-opacity dark:border-neutral-800 dark:bg-neutral-900 ${
        pending ? "opacity-70" : ""
      }`}
    >
      {/* Pestañas de estado */}
      <nav aria-label={t("detail.myStatus")} className="no-scrollbar flex overflow-x-auto border-b border-neutral-200 px-2 dark:border-neutral-800">
        {tabs.map(({ key, label, count }) => {
          const active = estado === key;
          return (
            <button
              key={key ?? "all"}
              type="button"
              onClick={() => go({ estado: key })}
              aria-current={active ? "page" : undefined}
              className={`relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-fg ${
                active ? "text-neutral-950 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              {key && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[key]}`} />}
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none ${
                  active ? "bg-brand text-white" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {count}
              </span>
              {active && (
                <motion.span
                  layoutId="mylist-tab"
                  transition={spring}
                  className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-3 p-3">
        {/* Selector segmentado de tipo */}
        <div role="radiogroup" aria-label={t("list.allTypes")} className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          {types.map(({ key, label, icon }) => {
            const active = tipo === key;
            return (
              <button
                key={key ?? "all"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => go({ tipo: key })}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-fg ${
                  active ? "text-neutral-950 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="mylist-type"
                    transition={spring}
                    className="absolute inset-0 rounded-lg bg-white shadow ring-1 ring-black/5 dark:bg-neutral-950 dark:ring-white/10"
                  />
                )}
                <span className={`relative ${active ? "text-brand-fg" : ""}`}>{icon}</span>
                <span className="relative">{key === null ? t("list.all") : label}</span>
              </button>
            );
          })}
        </div>

        {/* Orden y género */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <label className={selectWrap}>
            <span className="sr-only">{t("list.sortBy")}</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 h-4 w-4 text-brand-fg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
            </svg>
            <select value={orden} onChange={(e) => go({ orden: e.target.value })} className={selectCls} title={t("list.sortBy")}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`list.sort.${s}` as DictKey)}
                </option>
              ))}
            </select>
            {chevron}
          </label>
          {genres.length > 0 && (
            <label className={selectWrap}>
              <span className="sr-only">{t("list.genre")}</span>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 h-4 w-4 text-brand-fg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </svg>
              <select value={genero ?? ""} onChange={(e) => go({ genero: e.target.value })} className={selectCls} title={t("list.genre")}>
                <option value="">
                  {t("list.genre")}: {t("list.allGenres")}
                </option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {chevron}
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
