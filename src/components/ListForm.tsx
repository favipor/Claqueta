"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createList, updateList, type ListError } from "@/app/list-actions";
import { VISIBILITIES, type Visibility } from "@/lib/comments";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/dict";

// Formulario para crear una lista nueva o editar una existente (nombre, descripción y visibilidad).
export function ListForm({
  listId,
  initial,
  onDone,
}: {
  listId?: string;
  initial?: { name: string; description: string; visibility: Visibility };
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "publico");
  const [error, setError] = useState<ListError | null>(null);
  const [busy, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      if (listId) {
        const res = await updateList(listId, { name, description, visibility });
        if (!res.ok) return setError(res.error ?? "db");
      } else {
        const res = await createList({ name, description, visibility });
        if (!res.ok) return setError(res.error);
        setName("");
        setDescription("");
        router.push(`/listas/${res.id}`);
      }
      router.refresh();
      onDone?.();
    });
  }

  const input =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-fg dark:border-neutral-700 dark:bg-neutral-950";

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="block space-y-1 text-sm font-medium">
        {t("lists.name")}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t("lists.namePh")}
          className={input}
        />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        {t("lists.desc")}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          className={input}
        />
      </label>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">{t("cm.visibility")}</legend>
        <div className="flex flex-wrap gap-2">
          {VISIBILITIES.map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                visibility === v
                  ? "border-brand bg-brand text-white"
                  : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                className="sr-only"
              />
              {t(`cm.vis.${v}` as DictKey)}
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">{t(`cm.visHint.${visibility}` as DictKey)}</p>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`lists.err.${error === "auth" ? "db" : error}` as DictKey)}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || name.trim() === ""}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {listId ? t("lists.save") : t("lists.create")}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("cm.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
