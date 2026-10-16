"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondFollowRequest } from "@/app/profile-actions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

export type Person = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// Solicitudes pendientes para seguir a un perfil privado: se aceptan o se rechazan.
export function RequestsPanel({ requests }: { requests: Person[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [list, setList] = useState(requests);
  const [busy, startTransition] = useTransition();

  if (list.length === 0) return null;

  function answer(id: string, accept: boolean) {
    startTransition(async () => {
      const res = await respondFollowRequest(id, accept);
      if (res.ok) {
        setList((l) => l.filter((p) => p.id !== id));
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-500/10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        {t("profile.requests")} ({list.length})
      </h2>
      <ul className="space-y-3">
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3">
            <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar url={p.avatar_url} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {p.display_name ?? p.username}
                </span>
                <span className="block truncate text-xs text-neutral-500">@{p.username}</span>
              </span>
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => answer(p.id, true)}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {t("profile.accept")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => answer(p.id, false)}
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium hover:bg-white disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-800"
              >
                {t("profile.reject")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
