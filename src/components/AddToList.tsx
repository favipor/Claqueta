"use client";

import { useState, useTransition } from "react";
import { createList, listsForTitle, setInList, type ListError } from "@/app/list-actions";
import { ListIcon } from "./NavIcons";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

type Meta = { tmdb_id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null };
type Row = { id: string; name: string; has: boolean };

// Botón «Añadir a lista»: marca o desmarca este título en tus listas, o crea una lista nueva.
export function AddToList({ meta }: { meta: Meta }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<ListError | null>(null);
  const [busy, start] = useTransition();

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setError(null);
      start(async () => setRows(await listsForTitle(meta.tmdb_id, meta.media_type)));
    }
  }

  function toggle(row: Row) {
    setError(null);
    const add = !row.has;
    setRows((r) => r && r.map((x) => (x.id === row.id ? { ...x, has: add } : x)));
    start(async () => {
      const res = await setInList(row.id, meta, add);
      if (!res.ok) {
        setRows((r) => r && r.map((x) => (x.id === row.id ? { ...x, has: !add } : x)));
        setError(res.error ?? "db");
      }
    });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    start(async () => {
      const res = await createList({ name, visibility: "publico" });
      if (!res.ok) return setError(res.error);
      const added = await setInList(res.id, meta, true);
      if (!added.ok) setError(added.error ?? "db");
      setName("");
      setRows(await listsForTitle(meta.tmdb_id, meta.media_type));
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        <ListIcon className="h-4 w-4" />
        {t("lists.addTo")}
      </button>

      {open && (
        <>
        {/* En el móvil: panel que sube desde abajo, con fondo oscuro para cerrarlo */}
        <div className="fixed inset-0 z-[94] bg-black/40 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
        <div role="dialog" aria-modal="false" className="fixed inset-x-3 bottom-3 z-[95] max-h-[80dvh] space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:z-30 sm:mt-2 sm:max-h-[70vh] sm:w-72 sm:shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">{t("lists.addTitle")}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("a11y.close")} className="grid h-8 w-8 place-items-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 sm:hidden">×</button>
          </div>
          {rows === null ? (
            <p className="text-sm text-neutral-500">…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("lists.noneYet")}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <input
                      type="checkbox"
                      checked={r.has}
                      onChange={() => toggle(r)}
                      className="h-4 w-4 accent-teal-700"
                    />
                    <span className="truncate">{r.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={create} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={t("lists.namePh")}
              aria-label={t("lists.name")}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              +
            </button>
          </form>
          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {t(`lists.err.${error === "auth" ? "db" : error}` as DictKey)}
            </p>
          )}
        </div>
        </>
      )}
    </div>
  );
}
