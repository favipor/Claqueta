"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/profile-actions";
import { useI18n } from "./I18nProvider";

// Ajustes → «Eliminar cuenta»: hay que escribir el @usuario para confirmar
export function DeleteAccount({ username }: { username: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ok = value.trim().replace(/^@/, "").toLowerCase() === username.toLowerCase();

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deleteMyAccount(value);
      if (res.ok) window.location.href = "/?cuenta=eliminada";
      else setError(res.error === "confirm" ? t("del.wrong") : t("del.error"));
    });
  }

  return (
    <section className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
      <h2 className="text-lg font-bold text-red-700 dark:text-red-400">{t("del.title")}</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{t("del.hint")}</p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          {t("del.button")}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            {t("del.type")} <strong>@{username}</strong>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              className="mt-1.5 w-full rounded-lg border border-red-300 bg-white px-3 py-2 outline-none focus:border-red-500 dark:border-red-800 dark:bg-neutral-950"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!ok || pending}
              onClick={confirm}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {pending ? t("del.deleting") : t("del.confirm")}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setValue(""); setError(null); }}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {t("del.cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
