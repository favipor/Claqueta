"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

import { SORTS, type Sort } from "@/lib/list-sort";

// Selectores de orden y género de «Mi lista»: mantienen el resto de filtros de la dirección.
export function ListControls({
  estado,
  tipo,
  orden,
  genero,
  genres,
}: {
  estado: string | null;
  tipo: string | null;
  orden: Sort;
  genero: number | null;
  genres: { id: number; name: string }[];
}) {
  const { t } = useI18n();
  const router = useRouter();

  function go(next: { orden?: string; genero?: string }) {
    const q = new URLSearchParams();
    if (estado) q.set("estado", estado);
    if (tipo) q.set("tipo", tipo);
    const o = next.orden ?? orden;
    const g = next.genero ?? (genero ? String(genero) : "");
    if (o && o !== "reciente") q.set("orden", o);
    if (g) q.set("genero", g);
    const s = q.toString();
    router.push(`/mi-lista${s ? `?${s}` : ""}`);
  }

  const select =
    "rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-neutral-500">
        {t("list.sortBy")}
        <select value={orden} onChange={(e) => go({ orden: e.target.value })} className={select}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`list.sort.${s}` as DictKey)}
            </option>
          ))}
        </select>
      </label>
      {genres.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-neutral-500">
          {t("list.genre")}
          <select value={genero ?? ""} onChange={(e) => go({ genero: e.target.value })} className={select}>
            <option value="">{t("list.allGenres")}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
