"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteList, moveItem, setInList } from "@/app/list-actions";
import { img } from "@/lib/tmdb";
import type { Visibility } from "@/lib/comments";
import { ListForm } from "./ListForm";
import { useI18n } from "./I18nProvider";

export type ListEntry = { tmdb_id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null };

// Gestión de una lista propia: editar datos, borrar, quitar y ordenar títulos.
export function ListEditor({
  listId,
  username,
  initial,
  items,
}: {
  listId: string;
  username: string;
  initial: { name: string; description: string; visibility: Visibility };
  items: ListEntry[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();

  const small =
    "rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditing((e) => !e)} className={small}>
          {t("lists.edit")}
        </button>
        {confirm ? (
          <>
            <span className="text-sm">{t("lists.confirmDelete")}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await deleteList(listId);
                  if (res.ok) router.push(`/u/${username}/listas`);
                })
              }
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              {t("cm.confirmDelete")}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={small}>
              {t("cm.cancel")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className={`${small} hover:!border-red-400 hover:!text-red-600`}>
            {t("lists.delete")}
          </button>
        )}
      </div>

      {editing && (
        <div className="max-w-xl">
          <ListForm listId={listId} initial={initial} onDone={() => setEditing(false)} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">{t("lists.empty")}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => {
            const src = img(it.poster_path, "w92");
            return (
              <li
                key={`${it.media_type}-${it.tmdb_id}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="w-6 text-center text-sm font-bold text-neutral-400">{i + 1}</span>
                {src ? (
                  <Image src={src} alt="" width={40} height={60} className="h-[60px] w-10 rounded object-cover" />
                ) : (
                  <div className="h-[60px] w-10 rounded bg-neutral-200 dark:bg-neutral-800" />
                )}
                <Link
                  href={`/titulo/${it.media_type}/${it.tmdb_id}`}
                  className="min-w-0 flex-1 truncate font-semibold hover:underline"
                >
                  {it.title}
                </Link>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    aria-label={t("lists.up")}
                    title={t("lists.up")}
                    onClick={() =>
                      start(async () => {
                        await moveItem(listId, it.tmdb_id, it.media_type, "up");
                        router.refresh();
                      })
                    }
                    className={small}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === items.length - 1}
                    aria-label={t("lists.down")}
                    title={t("lists.down")}
                    onClick={() =>
                      start(async () => {
                        await moveItem(listId, it.tmdb_id, it.media_type, "down");
                        router.refresh();
                      })
                    }
                    className={small}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={t("lists.remove")}
                    title={t("lists.remove")}
                    onClick={() =>
                      start(async () => {
                        await setInList(listId, { ...it, tmdb_id: it.tmdb_id }, false);
                        router.refresh();
                      })
                    }
                    className={`${small} hover:!border-red-400 hover:!text-red-600`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
