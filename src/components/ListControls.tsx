"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "./I18nProvider";
import { FilmIcon, TvIcon } from "./NavIcons";
import { FilterSelect } from "./FilterSelect";
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
              className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold sm:px-4 sm:py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-fg ${
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

      <div className="flex flex-col gap-2.5 p-3 md:flex-row md:items-center md:gap-3">
        {/* Selector segmentado de tipo (en el móvil ocupa todo el ancho) */}
        <div role="radiogroup" aria-label={t("list.allTypes")} className="grid grid-cols-3 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800 md:flex">
          {types.map(({ key, label, icon }) => {
            const active = tipo === key;
            return (
              <button
                key={key ?? "all"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => go({ tipo: key })}
                className={`relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-fg ${
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

        {/* Orden y género: a la par en el móvil, a la derecha en pantallas grandes */}
        <div className="grid grid-cols-2 gap-2 md:ml-auto md:flex">
          <FilterSelect label={t("list.sortBy")} icon="sort" value={orden} onChange={(v) => go({ orden: v })} className="md:w-52">
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`list.sort.${s}` as DictKey)}
              </option>
            ))}
          </FilterSelect>
          {genres.length > 0 && (
            <FilterSelect label={t("list.genre")} icon="genre" value={genero ? String(genero) : ""} onChange={(v) => go({ genero: v })} className="md:w-52">
              <option value="">
                {t("list.genre")}: {t("list.allGenres")}
              </option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </FilterSelect>
          )}
        </div>
      </div>
    </div>
  );
}
