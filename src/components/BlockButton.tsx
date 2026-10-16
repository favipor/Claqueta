"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/social-actions";
import { useI18n } from "./I18nProvider";

export function BlockButton({ targetId, initialBlocked }: { targetId: string; initialBlocked: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();

  const base =
    "rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg disabled:opacity-60";

  function run(next: boolean) {
    start(async () => {
      const res = next ? await blockUser(targetId) : await unblockUser(targetId);
      if (res.ok) {
        setBlocked(next);
        setConfirm(false);
        router.refresh();
      }
    });
  }

  if (blocked) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => run(false)}
        className={`${base} border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`}
      >
        {t("block.unblock")}
      </button>
    );
  }

  if (confirm) {
    return (
      <div className="flex max-w-sm flex-col gap-2 rounded-2xl border border-red-300 bg-red-50 p-3 text-left text-sm dark:border-red-500/40 dark:bg-red-500/10">
        <p>{t("block.confirm")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(true)}
            className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {t("block.confirmYes")}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("cm.cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className={`${base} border-neutral-300 text-neutral-600 hover:border-red-400 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-red-400`}
    >
      {t("block.block")}
    </button>
  );
}
