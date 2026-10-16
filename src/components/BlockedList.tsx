"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unblockUser } from "@/app/social-actions";
import { Avatar } from "./Avatar";
import { useI18n } from "./I18nProvider";

type P = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

export function BlockedList({ people }: { people: P[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [list, setList] = useState(people);
  const [busy, start] = useTransition();

  return (
    <section className="mx-auto mt-6 max-w-xl space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("block.title")}</h2>
      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("block.none")}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar url={p.avatar_url} size={36} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {p.display_name ?? p.username}
                <span className="ml-2 font-normal text-neutral-500">@{p.username}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const res = await unblockUser(p.id);
                    if (res.ok) {
                      setList((l) => l.filter((x) => x.id !== p.id));
                      router.refresh();
                    }
                  })
                }
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t("block.unblock")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
