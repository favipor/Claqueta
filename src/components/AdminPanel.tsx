"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResolve, adminUnblock } from "@/app/admin-actions";
import { useI18n } from "./I18nProvider";

export type ReportItem = {
  comment_id: string;
  body: string;
  visibility: string;
  tmdb_id: number;
  media_type: string;
  author: { id: string; username: string | null; display_name: string | null } | null;
  reasons: string[];
  count: number;
};

export type BlockedItem = { user_id: string; username: string | null; display_name: string | null };

export function AdminPanel({
  reports,
  blocked,
}: {
  reports: ReportItem[];
  blocked: BlockedItem[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [reportList, setReportList] = useState(reports);
  const [blockedList, setBlockedList] = useState(blocked);

  function resolve(id: string, action: "dismiss" | "delete" | "delete_block") {
    startTransition(async () => {
      const res = await adminResolve(id, action);
      if (res.ok) {
        setReportList((l) => l.filter((r) => r.comment_id !== id));
        router.refresh();
      }
    });
  }

  function unblock(userId: string) {
    startTransition(async () => {
      const res = await adminUnblock(userId);
      if (res.ok) {
        setBlockedList((l) => l.filter((b) => b.user_id !== userId));
        router.refresh();
      }
    });
  }

  const card =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
  const btn =
    "rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-fg";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-extrabold">{t("admin.title")}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          {t("admin.reports")} ({reportList.length})
        </h2>
        {reportList.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("admin.noReports")}</p>
        ) : (
          <ul className="space-y-3">
            {reportList.map((r) => (
              <li key={r.comment_id} className={`${card} space-y-3`}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  {r.author?.username ? (
                    <Link href={`/u/${r.author.username}`} className="font-semibold text-brand-fg hover:underline">
                      @{r.author.username}
                    </Link>
                  ) : (
                    <span>?</span>
                  )}
                  <span>· {r.visibility}</span>
                  <span>· {r.count} {t("admin.reportsCount")}</span>
                  <Link
                    href={`/titulo/${r.media_type}/${r.tmdb_id}`}
                    className="ml-auto text-brand-fg hover:underline"
                  >
                    {t("admin.goTitle")} →
                  </Link>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-lg bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
                  {r.body}
                </p>
                {r.reasons.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-neutral-600 dark:text-neutral-400">
                    {r.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => resolve(r.comment_id, "dismiss")}
                    className={`${btn} border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`}
                  >
                    {t("admin.dismiss")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => resolve(r.comment_id, "delete")}
                    className={`${btn} bg-red-600 text-white hover:bg-red-700`}
                  >
                    {t("admin.delete")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => resolve(r.comment_id, "delete_block")}
                    className={`${btn} bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900`}
                  >
                    {t("admin.deleteBlock")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          {t("admin.blocked")} ({blockedList.length})
        </h2>
        {blockedList.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("admin.noBlocked")}</p>
        ) : (
          <ul className="space-y-2">
            {blockedList.map((b) => (
              <li key={b.user_id} className={`${card} flex items-center justify-between gap-3`}>
                <span className="text-sm font-medium">
                  {b.display_name ?? b.username ?? "?"}
                  {b.username && <span className="text-neutral-500"> @{b.username}</span>}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => unblock(b.user_id)}
                  className={`${btn} border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`}
                >
                  {t("admin.unblock")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
